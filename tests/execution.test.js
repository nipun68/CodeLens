import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWithJudge0 } from '../server/execution.js';

test('Judge0 adapter submits real source with bounded resource settings and normalizes result fields', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    if (options.method === 'POST') return Response.json({ token: 'job-1' });
    return Response.json({ status: { id: 3, description: 'Accepted' }, stdout: 'Hello, CodeLens!\n', stderr: null, compile_output: null, exit_code: 0, time: '0.01', memory: 1024 });
  };
  const result = await executeWithJudge0({ source: 'print("Hello, CodeLens!")', language: 'python', stdin: 'input', env: { JUDGE0_URL: 'https://judge.example/api/', JUDGE0_API_KEY: 'server-secret' }, fetchImpl });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://judge.example/api/submissions?base64_encoded=false&wait=false');
  assert.equal(requests[0].options.headers['X-Auth-Token'], 'server-secret');
  const submitted = JSON.parse(requests[0].options.body);
  assert.equal(submitted.language_id, 109); assert.equal(submitted.stdin, 'input'); assert.equal(submitted.cpu_time_limit, 5);
  assert.equal(result.status, 'Accepted');
  assert.equal(result.statusId, 3);
  assert.equal(result.stdout, 'Hello, CodeLens!');
  assert.equal(result.stderr, '');
  assert.equal(result.compileOutput, null);
  assert.equal(result.exitCode, 0);
  assert.equal(result.time, '0.01');
  assert.equal(result.memory, 1024);
  assert.equal(result.hasTrace, false);
  assert.equal(result.trace, null);
});

test('Judge0 adapter requires configuration and rejects unsupported languages', async () => {
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'ruby', env: {} }), { status: 400 });
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'python', env: {} }), { status: 503 });
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'python', env: { JUDGE0_URL: 'http://judge.example' } }), { status: 503 });
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'python', env: { JUDGE0_URL: 'https://judge.example', JUDGE0_AUTH_HEADER: 'Authorization' } }), { status: 503 });
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'python', env: { JUDGE0_URL: 'https://api.onlinecompiler.io/api/judge0/' } }), { status: 503 });
});

test('Judge0 adapter sanitizes provider failures and supports RapidAPI authentication', async () => {
  let requestUrl; let requestHeaders;
  await assert.rejects(executeWithJudge0({ source: 'x', language: 'javascript', env: { JUDGE0_URL: 'https://judge.example/api', JUDGE0_API_KEY: 'server-secret', JUDGE0_AUTH_HEADER: 'X-RapidAPI-Key', JUDGE0_API_HOST: 'judge.example' }, fetchImpl: async (url, options) => { requestUrl = String(url); requestHeaders = options.headers; return new Response('provider-secret-stack-trace', { status: 401 }); } }), error => {
    assert.equal(error.status, 502); assert.equal(error.expose, true); assert.doesNotMatch(error.message, /provider-secret/); return true;
  });
  assert.equal(requestUrl, 'https://judge.example/api/submissions?base64_encoded=false&wait=false');
  assert.equal(requestHeaders['X-RapidAPI-Key'], 'server-secret'); assert.equal(requestHeaders['X-RapidAPI-Host'], 'judge.example');
});

test('Judge0 adapter bounds each provider request and caps untrusted output', async () => {
  let responseCall = 0;
  const result = await executeWithJudge0({ source: 'print(1)', language: 'python', env: { JUDGE0_URL: 'https://judge.example' }, fetchImpl: async (_url, options) => {
    if (options.method === 'POST') return Response.json({ token: 'job' });
    responseCall++;
    return Response.json({ status: { id: 3, description: 'Accepted' }, stdout: 'x'.repeat(60010), exit_code: 0 });
  } });
  assert.equal(responseCall, 1); assert.equal(result.stdout.length, 60000 + '\n[Output truncated at 60,000 characters.]'.length);
});

test('Judge0 adapter maps all four supported languages to provider runtimes', async () => {
  for (const [language, languageId] of Object.entries({ python: 109, java: 91, javascript: 102, cpp: 105 })) {
    let submitted;
    await executeWithJudge0({ source: 'int main() {}', language, env: { JUDGE0_URL: 'https://judge.example' }, pollIntervalMs: 0,
      fetchImpl: async (_url, options) => {
        if (options.method === 'POST') { submitted = JSON.parse(options.body); return Response.json({ token: 'job' }); }
        return Response.json({ status: { id: 3, description: 'Accepted' }, stdout: '', exit_code: 0 });
      } });
    assert.equal(submitted.language_id, languageId, `${language} must use its actual provider runtime`);
  }
});

test('Judge0 adapter returns explicit timeout rather than inventing program output', async () => {
  const result = await executeWithJudge0({ source: 'while true: pass', language: 'python', timeoutMs: 5, pollIntervalMs: 0, env: { JUDGE0_URL: 'https://judge.example/' }, fetchImpl: async (_url, options) => options.method === 'POST' ? Response.json({ token: 'slow' }) : Response.json({ status: { id: 2, description: 'Processing' } }) });
  // Provider status stays non-terminal until the adapter's bounded deadline.
  assert.equal(result.status, 'timeout'); assert.equal(result.stdout, ''); assert.equal(result.exitCode, null);
});
