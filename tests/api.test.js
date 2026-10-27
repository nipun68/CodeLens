import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('End-to-end API workflows, persistence, plan limits, and account isolation', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'devpulse-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  let server;
  const env = { ...process.env, PORT: String(port), MONGODB_URI: '', JWT_SECRET: 'test-secret-only-for-isolated-api-tests', NODE_ENV: 'test', DATA_FILE: path.join(directory, 'state.json'), DEMO_BILLING: 'true', STRIPE_SECRET_KEY: '', APP_URL: `http://localhost:${port}`, JUDGE0_URL: '' };
  const start = () => new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 15000);
    server.stdout.on('data', data => { log += data; if (log.includes('DevPulse API:')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { log += data; });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${log}`)); });
  });
  const stop = () => new Promise(resolve => { if (!server || server.exitCode !== null) return resolve(); server.once('exit', resolve); server.kill(); });
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  await start();
  function client() {
    let cookie = '';
    return async (url, method = 'GET', body, extra = {}) => {
      const response = await fetch(`http://127.0.0.1:${port}/api${url}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return { status: response.status, data: await response.json() };
    };
  }
  const alice = client(); const bob = client(); let aliceId; let snippetId;
  await t.test('Session creates an isolated server-persisted guest workspace', async () => {
    const a = await alice('/session'); const b = await bob('/session');
    assert.equal(a.status, 200); assert.equal(a.data.isGuest, true); assert.notEqual(a.data.id, b.data.id);
    aliceId = a.data.id; assert.equal((await alice('/session')).data.id, aliceId);
  });
  await t.test('Guest registration retains workspace, hashes credentials, and signs in securely', async () => {
    const a = await alice('/auth/register', 'POST', { name: 'Alice Builder', email: 'alice@example.com', password: 'test-password-123' });
    assert.equal(a.status, 200); assert.equal(a.data.id, aliceId); assert.equal(a.data.isGuest, false); assert.equal(a.data.password, undefined);
    assert.equal((await bob('/auth/login', 'POST', { email: 'alice@example.com', password: 'wrong-password' })).status, 401);
  });
  await t.test('Profile updates validate fields and persist', async () => {
    const profile = { name: 'Alice', handle: '@alicebuilds', bio: 'Building deliberately.', avatar: '', goals: ['Ship something good'] };
    assert.equal((await alice('/profile', 'PATCH', { ...profile, avatar: 'javascript:alert(1)' })).status, 400);
    assert.equal((await alice('/profile', 'PATCH', profile)).data.profile.name, 'Alice');
  });
  await t.test('Concurrent daily check-ins award XP exactly once', async () => {
    const results = await Promise.all([alice('/checkins', 'POST', { reflection: 'I learned about scope.', mood: 'inspired' }), alice('/checkins', 'POST', { reflection: 'A duplicate click.', mood: 'steady' })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const a = (await alice('/session')).data; assert.equal(a.xp, 10); assert.equal(a.streak, 1); assert.equal(a.checkins.length, 1);
  });
  await t.test('Snippet CRUD protects one user from another', async () => {
    const created = await alice('/snippets', 'POST', { title: 'My utility', code: 'const x = 1;', language: 'javascript', tags: ['utility'] });
    assert.equal(created.status, 201); snippetId = created.data.snippets[0].id;
    assert.equal((await bob(`/snippets/${snippetId}`, 'DELETE')).status, 404);
    assert.equal((await alice('/session')).data.snippets.some(s => s.id === snippetId), true);
  });
  await t.test('Free snippet limits are enforced by the backend', async () => {
    for (let i = 0; i < 3; i++) assert.equal((await alice('/snippets', 'POST', { title: `Snippet ${i}`, code: 'const x = 1;', language: 'javascript' })).status, 201);
    assert.equal((await alice('/snippets', 'POST', { title: 'Sixth', code: 'const x = 1;', language: 'javascript' })).status, 403);
  });
  await t.test('Daily code review quota cannot be bypassed from the frontend', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await alice('/analyze', 'POST', { code: 'const x = 1;', language: 'javascript' })).status, 200);
    assert.equal((await alice('/analyze', 'POST', { code: 'const x = 1;', language: 'javascript' })).status, 429);
    assert.equal((await alice('/analyze', 'POST', { code: 'const x = 1;', language: 'python' })).status, 400);
  });
  await t.test('Execution validates language and reports missing provider configuration honestly', async () => {
    assert.equal((await alice('/v1/execution', 'POST', { source: 'print(1)', language: 'ruby' })).status, 400);
    const unavailable = await alice('/v1/execution', 'POST', { source: 'print("Hello, CodeLens!")', language: 'python', stdin: '' });
    assert.equal(unavailable.status, 503);
    assert.match(unavailable.data.error, /JUDGE0_URL/);
  });
  await t.test('Lessons award XP once and calculate real topic progress', async () => {
    assert.equal((await alice('/topics/javascript/lessons/0', 'POST', {})).data.xp, 35);
    const duplicate = await alice('/topics/javascript/lessons/0', 'POST', {});
    assert.equal(duplicate.data.xp, 35); assert.equal(duplicate.data.topics[0].progress, 25); assert.equal(duplicate.data.solved, 1);
    assert.equal((await alice('/topics/javascript/lessons/9', 'POST', {})).status, 404);
  });
  await t.test('Demo subscriptions require consent, unlock Pro, and cancel without data loss', async () => {
    assert.equal((await alice('/topics', 'POST', { name: 'Accessibility', lessons: ['Semantics'] })).status, 403);
    assert.equal((await alice('/billing/checkout', 'POST', { interval: 'monthly' })).status, 400);
    const upgrade = await alice('/billing/checkout', 'POST', { interval: 'yearly', confirmDemo: true });
    assert.equal(upgrade.data.demo, true); assert.equal(upgrade.data.account.subscription.plan, 'pro');
    assert.equal((await alice('/analyze', 'POST', { code: 'const x = 1;', language: 'javascript' })).status, 200);
    assert.equal((await alice('/topics', 'POST', { name: 'Accessibility', lessons: ['Semantics'] })).status, 201);
    const downgrade = await alice('/billing/cancel-demo', 'POST', {});
    assert.equal(downgrade.data.subscription.plan, 'free'); assert.equal(downgrade.data.topics.length, 5); assert.equal(downgrade.data.snippets.length, 5);
  });
  await t.test('Focus logging validates duration and adds to cumulative time', async () => {
    assert.equal((await alice('/focus', 'POST', { seconds: -1 })).status, 400);
    assert.equal((await alice('/focus', 'POST', { seconds: 3601 })).status, 400);
    assert.equal((await alice('/focus', 'POST', { seconds: 120 })).data.focusSeconds, 120);
  });
  await t.test('Cross-site writes and unconfigured webhooks are rejected', async () => {
    assert.equal((await alice('/profile', 'PATCH', { name: 'Alice', handle: '@alicebuilds', bio: 'Building deliberately.', avatar: '', goals: ['Ship something good'] }, { Origin: 'http://localhost:5174' })).status, 200);
    assert.equal((await alice('/focus', 'POST', { seconds: 1 }, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await alice('/billing/webhook', 'POST', {})).status, 503);
    assert.equal((await alice('/unknown')).status, 404);
  });
  await t.test('Data and authentication survive a server restart', async () => {
    await stop(); await start();
    const a = await alice('/session'); assert.equal(a.data.id, aliceId); assert.equal(a.data.profile.name, 'Alice'); assert.equal(a.data.xp, 35); assert.equal(a.data.focusSeconds, 120);
    assert.equal((await alice(`/snippets/${snippetId}`, 'DELETE')).status, 200);
  });
  await t.test('Sign out and sign in restore the registered account', async () => {
    await alice('/auth/logout', 'POST'); const guest = await alice('/session'); assert.equal(guest.data.isGuest, true); assert.notEqual(guest.data.id, aliceId);
    const login = await alice('/auth/login', 'POST', { email: 'alice@example.com', password: 'test-password-123' }); assert.equal(login.data.id, aliceId); assert.equal(login.data.profile.name, 'Alice');
  });
});
