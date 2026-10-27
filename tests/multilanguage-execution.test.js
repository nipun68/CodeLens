import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { executeWithJudge0, prepareSourceForExecution } from '../server/execution.js';

test('Execution Contract: Normalizes executionId, duration, runtime version, and error categories', async () => {
  const fetchMock = async (url, options) => {
    if (options.method === 'POST') return Response.json({ token: 'tok-123' });
    return Response.json({
      status: { id: 3, description: 'Accepted' },
      stdout: 'Hello World\n',
      stderr: null,
      compile_output: null,
      exit_code: 0,
      time: '0.045',
      memory: 2048
    });
  };

  const result = await executeWithJudge0({
    source: 'print("Hello World")',
    language: 'python',
    env: { JUDGE0_URL: 'https://judge.example' },
    fetchImpl: fetchMock
  });

  assert.equal(result.status, 'Accepted');
  assert.equal(result.statusId, 3);
  assert.equal(result.stdout, 'Hello World');
  assert.equal(result.stderr, '');
  assert.equal(result.compileOutput, null);
  assert.equal(result.exitCode, 0);
  assert.equal(result.time, '0.045');
  assert.equal(result.duration, '0.045s');
  assert.equal(result.memory, 2048);
  assert.equal(result.timedOut, false);
  assert.equal(result.errorCategory, null);
});

test('Execution Contract: Categorizes compilation errors correctly', async () => {
  const fetchMock = async (url, options) => {
    if (options.method === 'POST') return Response.json({ token: 'tok-compile-err' });
    return Response.json({
      status: { id: 6, description: 'Compilation Error' },
      stdout: null,
      stderr: null,
      compile_output: 'main.cpp:3:1: error: expected declaration\n',
      exit_code: 1,
      time: null,
      memory: null
    });
  };

  const result = await executeWithJudge0({
    source: 'int main() { bad syntax }',
    language: 'cpp',
    env: { JUDGE0_URL: 'https://judge.example' },
    fetchImpl: fetchMock
  });

  assert.equal(result.status, 'Compilation Error');
  assert.equal(result.statusId, 6);
  assert.equal(result.compileOutput.includes('error: expected declaration'), true);
  assert.equal(result.errorCategory, 'compilation_error');
  assert.equal(result.exitCode, 1);
});

test('Execution Contract: Categorizes runtime exceptions (status 7-12) correctly', async () => {
  const fetchMock = async (url, options) => {
    if (options.method === 'POST') return Response.json({ token: 'tok-runtime-err' });
    return Response.json({
      status: { id: 11, description: 'Runtime Error (NZEC)' },
      stdout: '',
      stderr: 'ZeroDivisionError: division by zero\n',
      compile_output: null,
      exit_code: 1,
      time: '0.02',
      memory: 1500
    });
  };

  const result = await executeWithJudge0({
    source: 'print(1/0)',
    language: 'python',
    env: { JUDGE0_URL: 'https://judge.example' },
    fetchImpl: fetchMock
  });

  assert.equal(result.status, 'Runtime Error (NZEC)');
  assert.equal(result.statusId, 11);
  assert.equal(result.stderr.includes('ZeroDivisionError'), true);
  assert.equal(result.errorCategory, 'runtime_exception');
  assert.equal(result.exitCode, 1);
});

test('Execution Contract: Clean structured timeout on deadline expiration without throwing unhandled 504', async () => {
  const fetchMock = async (url, options) => {
    if (options.method === 'POST') return Response.json({ token: 'tok-slow' });
    // Still in queue or processing
    return Response.json({ status: { id: 1, description: 'In Queue' } });
  };

  const result = await executeWithJudge0({
    source: 'while True: pass',
    language: 'python',
    timeoutMs: 15,
    pollIntervalMs: 5,
    env: { JUDGE0_URL: 'https://judge.example' },
    fetchImpl: fetchMock
  });

  assert.equal(result.status, 'timeout');
  assert.equal(result.statusId, 5);
  assert.equal(result.timedOut, true);
  assert.equal(result.errorCategory, 'timeout');
  assert.equal(result.exitCode, null);
});

test('Python Preparation: Supports from codelens import CodeLensQueue with indentation', () => {
  const code = `
    from codelens import CodeLensQueue
    q = CodeLensQueue("q")
    q.push(10)
  `;
  const prepared = prepareSourceForExecution(code, 'python');
  assert.equal(prepared.includes('class CodeLensQueue'), true);
  assert.equal(prepared.includes("sys.modules['codelens']"), true);
});

test('Java Preparation: Injects helper classes below Main class and keeps import at line 1', () => {
  const code = `public class Main {
    public static void main(String[] args) {
        CodeLensQueue<Integer> q = new CodeLensQueue<>("q");
    }
}`;
  const prepared = prepareSourceForExecution(code, 'java');
  assert.equal(prepared.startsWith('import java.util.*;\npublic class Main'), true);
  assert.equal(prepared.includes('class CodeLensQueue<T>'), true);
});

test('C++ Preparation: Prepends codelens.hpp and preserves line 1 directive', () => {
  const code = `#include <iostream>
#include "codelens.hpp"
int main() {
    codelens::queue<int> q("q");
    return 0;
}`;
  const prepared = prepareSourceForExecution(code, 'cpp');
  assert.equal(prepared.includes('namespace codelens'), true);
  assert.equal(prepared.includes('#line 1 "main.cpp"'), true);
});

test('Uninstrumented Programs: Source code is preserved completely unchanged for standard execution', () => {
  const pyCode = 'import sys\nprint("Pure Python")';
  assert.equal(prepareSourceForExecution(pyCode, 'python'), pyCode);

  const javaCode = 'public class Main {\n    public static void main(String[] args) { System.out.println("Pure Java"); }\n}';
  assert.equal(prepareSourceForExecution(javaCode, 'java'), javaCode);

  const cppCode = '#include <iostream>\nint main() { std::cout << "Pure C++\\n"; return 0; }';
  assert.equal(prepareSourceForExecution(cppCode, 'cpp'), cppCode);
});
