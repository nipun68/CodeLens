import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWithJudge0, prepareSourceForExecution } from '../server/execution.js';
import { extractTraceFromOutput, normalizeTraceEvents, reconstructStateAtStep, createEmptyTrace } from '../client/src/reconstruction.js';
import { traceQueueDemo, traceStackDemo, traceJavaScriptCode } from '../client/src/tracer.js';

test('Wire Protocol: extractTraceFromOutput cleanly separates trace JSON from stdout', () => {
  const sampleStdout = `Hello World
__CODELENS_TRACE_START__
{"step":1,"line":5,"type":"init","dsId":"q","dsType":"queue","op":"init","snapshot":[],"desc":"Init"}
{"step":2,"line":6,"type":"operation","dsId":"q","dsType":"queue","op":"push","val":10,"snapshot":[10],"desc":"Push"}
__CODELENS_TRACE_END__
Execution completed with code 0`;

  const { cleanStdout, traceEvents, hasTrace } = extractTraceFromOutput(sampleStdout);
  assert.equal(hasTrace, true);
  assert.equal(traceEvents.length, 2);
  assert.equal(cleanStdout.includes('__CODELENS_TRACE_START__'), false);
  assert.equal(cleanStdout.includes('__CODELENS_TRACE_END__'), false);
  assert.equal(cleanStdout.includes('Hello World'), true);
  assert.equal(cleanStdout.includes('Execution completed with code 0'), true);
});

test('State Reconstruction: Reversible navigation preserves exact snapshots at every step', () => {
  const rawEvents = [
    { step: 1, line: 4, type: 'init', dsId: 'q', dsType: 'queue', op: 'init', snapshot: [], desc: 'init' },
    { step: 2, line: 5, type: 'operation', dsId: 'q', dsType: 'queue', op: 'push', val: 10, snapshot: [10], desc: 'push 10' },
    { step: 3, line: 6, type: 'operation', dsId: 'q', dsType: 'queue', op: 'push', val: 20, snapshot: [10, 20], desc: 'push 20' },
    { step: 4, line: 7, type: 'operation', dsId: 'q', dsType: 'queue', op: 'push', val: 30, snapshot: [10, 20, 30], desc: 'push 30' },
    { step: 5, line: 8, type: 'operation', dsId: 'q', dsType: 'queue', op: 'pop', val: 10, snapshot: [20, 30], desc: 'pop' }
  ];

  const trace = normalizeTraceEvents(rawEvents, { executionId: 'test-exec-1', language: 'cpp', totalLines: 10 });
  assert.equal(trace.steps.length, 5);

  // Forward navigation
  const state0 = reconstructStateAtStep(trace, 0);
  assert.deepEqual(state0.dataStructures.q.snapshot, []);

  const state1 = reconstructStateAtStep(trace, 1);
  assert.deepEqual(state1.dataStructures.q.snapshot, [10]);

  const state2 = reconstructStateAtStep(trace, 2);
  assert.deepEqual(state2.dataStructures.q.snapshot, [10, 20]);

  const state3 = reconstructStateAtStep(trace, 3);
  assert.deepEqual(state3.dataStructures.q.snapshot, [10, 20, 30]);

  const state4 = reconstructStateAtStep(trace, 4);
  assert.deepEqual(state4.dataStructures.q.snapshot, [20, 30]);

  // Backward navigation to step 2 returns exact prior state
  const stateRewind2 = reconstructStateAtStep(trace, 2);
  assert.deepEqual(stateRewind2.dataStructures.q.snapshot, [10, 20]);

  // Backward navigation to step 1 returns exact prior state
  const stateRewind1 = reconstructStateAtStep(trace, 1);
  assert.deepEqual(stateRewind1.dataStructures.q.snapshot, [10]);
});

test('JavaScript Tracing: Stack and Queue demos generate valid structured trace steps', () => {
  const queueTrace = traceQueueDemo();
  assert.equal(queueTrace.success, true);
  assert.equal(queueTrace.algorithm, 'Queue (FIFO)');
  assert.equal(queueTrace.steps.length, 5);
  assert.equal(queueTrace.steps[1].op, 'push');
  assert.deepEqual(queueTrace.steps[1].snapshot, [10]);
  assert.deepEqual(queueTrace.steps[4].snapshot, [20, 30]);

  const stackTrace = traceStackDemo();
  assert.equal(stackTrace.success, true);
  assert.equal(stackTrace.algorithm, 'Stack (LIFO)');
  assert.equal(stackTrace.steps.length, 5);
  assert.equal(stackTrace.steps[1].op, 'push');
  assert.deepEqual(stackTrace.steps[1].snapshot, [10]);
  assert.deepEqual(stackTrace.steps[4].snapshot, [10, 20]);

  // Automatic pattern detection
  const jsAutoQueue = traceJavaScriptCode('let queue = []; queue.push(10); queue.shift();');
  assert.equal(jsAutoQueue.algorithm, 'Queue (FIFO)');

  const jsAutoStack = traceJavaScriptCode('let stack = []; stack.push(10); stack.pop();');
  assert.equal(jsAutoStack.algorithm, 'Stack (LIFO)');
});

test('C++ Source Preparation: Expands codelens.hpp and preserves line mapping', () => {
  const userCpp = `#include <iostream>
#include "codelens.hpp"
using namespace std;

int main() {
    codelens::queue<int> q("q");
    q.push(10);
    return 0;
}`;

  const prepared = prepareSourceForExecution(userCpp, 'cpp');
  assert.equal(prepared.includes('namespace codelens'), true);
  assert.equal(prepared.includes('#line 1 "main.cpp"'), true);
  assert.equal(prepared.includes('codelens::queue<int> q("q");'), true);
});

test('Python Source Preparation: Prepares CodeLensQueue and CodeLensStack wrappers', () => {
  const userPy = `from codelens import CodeLensQueue
q = CodeLensQueue("q")
q.push(10)`;

  const prepared = prepareSourceForExecution(userPy, 'python');
  assert.equal(prepared.includes('class CodeLensQueue:'), true);
  assert.equal(prepared.includes('class CodeLensStack:'), true);
  assert.equal(prepared.includes('q = CodeLensQueue("q")'), true);
});

test('Java Source Preparation: Injects CodeLens helper classes into compilation unit', () => {
  const userJava = `public class Main {
    public static void main(String[] args) {
        CodeLensQueue<Integer> q = new CodeLensQueue<>("q");
        q.push(10);
    }
}`;

  const prepared = prepareSourceForExecution(userJava, 'java');
  assert.equal(prepared.includes('class CodeLensQueue<T>'), true);
  assert.equal(prepared.includes('class CodeLensStack<T>'), true);
});

test('C++ Queue Integration: Compiles real codelens::queue, pushes, pops, and verifies exact snapshots', async () => {
  const cppQueueCode = `#include <iostream>
#include "codelens.hpp"
using namespace std;

int main() {
    codelens::queue<int> q("q");
    q.push(10);
    q.push(20);
    q.push(30);
    q.pop();
    cout << "FINAL_FRONT:" << q.front() << endl;
    return 0;
}`;

  const result = await executeWithJudge0({
    source: cppQueueCode,
    language: 'cpp',
    timeoutMs: 35000
  });

  assert.equal(result.exitCode, 0, `C++ Queue failed to compile or run: ${result.compileOutput || result.stderr}`);
  assert.equal(result.stdout.includes('FINAL_FRONT:20'), true);
  assert.equal(result.hasTrace, true);
  assert.ok(result.trace);
  assert.ok(result.trace.steps.length >= 4);

  // Verify steps
  const steps = result.trace.steps;
  const initStep = steps.find(s => s.operation === 'init' && s.dataStructureId === 'q');
  assert.ok(initStep, 'Missing init step');
  assert.deepEqual(initStep.stateSnapshot, []);

  const push1 = steps.find(s => s.operation === 'push' && s.value === 10);
  assert.ok(push1, 'Missing push 10');
  assert.deepEqual(push1.stateSnapshot, [10]);

  const push2 = steps.find(s => s.operation === 'push' && s.value === 20);
  assert.ok(push2, 'Missing push 20');
  assert.deepEqual(push2.stateSnapshot, [10, 20]);

  const push3 = steps.find(s => s.operation === 'push' && s.value === 30);
  assert.ok(push3, 'Missing push 30');
  assert.deepEqual(push3.stateSnapshot, [10, 20, 30]);

  const popStep = steps.find(s => s.operation === 'pop');
  assert.ok(popStep, 'Missing pop step');
  assert.equal(popStep.value, 10);
  assert.deepEqual(popStep.stateSnapshot, [20, 30]);
});

test('C++ Stack Integration: Compiles real codelens::stack, pushes, pops, and verifies LIFO order', async () => {
  const cppStackCode = `#include <iostream>
#include "codelens.hpp"
using namespace std;

int main() {
    codelens::stack<int> s("s");
    s.push(5);
    s.push(15);
    s.push(25);
    s.pop();
    cout << "FINAL_TOP:" << s.top() << endl;
    return 0;
}`;

  const result = await executeWithJudge0({
    source: cppStackCode,
    language: 'cpp',
    timeoutMs: 35000
  });

  assert.equal(result.exitCode, 0, `C++ Stack failed: ${result.compileOutput || result.stderr}`);
  assert.equal(result.stdout.includes('FINAL_TOP:15'), true);
  assert.equal(result.hasTrace, true);

  const steps = result.trace.steps;
  const push25 = steps.find(s => s.operation === 'push' && s.value === 25);
  assert.ok(push25);
  assert.deepEqual(push25.stateSnapshot, [5, 15, 25]);

  const popStep = steps.find(s => s.operation === 'pop');
  assert.ok(popStep);
  assert.equal(popStep.value, 25);
  assert.deepEqual(popStep.stateSnapshot, [5, 15]);
});

test('Python Queue Integration: Executes CodeLensQueue, verifies FIFO snapshots and clean stdout', async () => {
  const pyCode = `from codelens import CodeLensQueue

q = CodeLensQueue("q")
q.push(100)
q.push(200)
q.pop()
print("PY_FRONT:", q.front())`;

  const result = await executeWithJudge0({
    source: pyCode,
    language: 'python',
    timeoutMs: 35000
  });

  assert.equal(result.exitCode, 0, `Python Queue failed: ${result.stderr}`);
  assert.equal(result.stdout.includes('PY_FRONT: 200'), true);
  assert.equal(result.hasTrace, true);

  const steps = result.trace.steps;
  const push1 = steps.find(s => s.operation === 'push' && s.value === 100);
  assert.ok(push1);
  assert.deepEqual(push1.stateSnapshot, [100]);

  const popStep = steps.find(s => s.operation === 'pop');
  assert.ok(popStep);
  assert.equal(popStep.value, 100);
  assert.deepEqual(popStep.stateSnapshot, [200]);
});

test('Java Queue Integration: Compiles and runs CodeLensQueue in OpenJDK', async () => {
  const javaCode = `public class Main {
    public static void main(String[] args) {
        CodeLensQueue<Integer> q = new CodeLensQueue<>("q");
        q.push(7);
        q.push(14);
        q.pop();
        System.out.println("JAVA_FRONT:" + q.front());
    }
}`;

  const result = await executeWithJudge0({
    source: javaCode,
    language: 'java',
    timeoutMs: 35000
  });

  assert.equal(result.exitCode, 0, `Java Queue failed: ${result.compileOutput || result.stderr}`);
  assert.equal(result.stdout.includes('JAVA_FRONT:14'), true);
  assert.equal(result.hasTrace, true);

  const steps = result.trace.steps;
  const pushStep = steps.find(s => s.operation === 'push' && s.value === 7);
  assert.ok(pushStep);
  assert.deepEqual(pushStep.stateSnapshot, [7]);

  const popStep = steps.find(s => s.operation === 'pop');
  assert.ok(popStep);
  assert.equal(popStep.value, 7);
  assert.deepEqual(popStep.stateSnapshot, [14]);
});

test('Output Equivalence: Program output with CodeLens wrappers matches expected calculation exactly', async () => {
  const code = `#include <iostream>
#include "codelens.hpp"
using namespace std;

int main() {
    codelens::vector<int> v("v");
    v.push_back(10);
    v.push_back(20);
    int sum = 0;
    for (int x : v) sum += x;
    cout << "SUM=" << sum << endl;
    return 0;
}`;

  const result = await executeWithJudge0({ source: code, language: 'cpp', timeoutMs: 35000 });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.trim(), 'SUM=30');
});

test('Empty Trace & Reset: createEmptyTrace returns unexecuted baseline with 0 steps', () => {
  const emptyTrace = createEmptyTrace('javascript', 'Ready for execution.');
  assert.equal(emptyTrace.hasExecuted, false);
  assert.equal(emptyTrace.isUnexecuted, true);
  assert.equal(emptyTrace.steps.length, 0);
  assert.equal(emptyTrace.totalSteps, 0);
  assert.equal(emptyTrace.output, '');

  const state = reconstructStateAtStep(emptyTrace, 0);
  assert.equal(state.activeLine, null);
  assert.deepEqual(state.callStack, []);
  assert.deepEqual(state.dataStructures, {});
  assert.deepEqual(state.variables, {});
  assert.equal(state.totalSteps, 0);
});

