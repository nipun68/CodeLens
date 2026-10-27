import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';
import { executeWithJudge0, prepareSourceForExecution, instrumentJavaSource } from '../server/execution.js';
import { reconstructStateAtStep } from '../client/src/reconstruction.js';

test('Java Tracing: Source Preparation preserves exact line numbers and adds instrumentation', () => {
  const code = `public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        int sum = a + b;
        System.out.println(sum);
    }
}`;

  const prepared = prepareSourceForExecution(code, 'java', 'trace');
  assert.equal(prepared.includes('CodeLensTraceEmitter.traceVar(3, "a", a);'), true);
  assert.equal(prepared.includes('CodeLensTraceEmitter.traceVar(4, "b", b);'), true);
  assert.equal(prepared.includes('CodeLensTraceEmitter.traceVar(5, "sum", sum);'), true);
  assert.equal(prepared.includes('class CodeLensTraceEmitter'), true);
});

test('Java Tracing: Uninstrumented Run mode preserves original source untouched', () => {
  const code = `public class Main {
    public static void main(String[] args) {
        System.out.println("No trace");
    }
}`;
  const prepared = prepareSourceForExecution(code, 'java', 'run');
  assert.equal(prepared, code);
});

test('Test A: Arithmetic & Local-Variable Inspection in real OpenJDK 21 sandbox', async () => {
  const code = `public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        int sum = a + b;
        System.out.println(sum);
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3, `Expected Accepted, got ${res.status}`);
  assert.equal(res.stdout.trim(), '30');
  assert.equal(res.hasTrace, true);
  assert.ok(res.trace.steps.length >= 3);

  const lastStep = res.trace.steps[res.trace.steps.length - 1];
  assert.equal(lastStep.variables.a, 10);
  assert.equal(lastStep.variables.b, 20);
  assert.equal(lastStep.variables.sum, 30);
  assert.equal(res.trace.steps[0].sourceLine, 3);
  assert.equal(lastStep.sourceLine, 5);
});

test('Test B: Array Mutation & Sorting with Live Array Visualization', async () => {
  const code = `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] arr = {5, 2, 9};
        arr[0] = 1;
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr));
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3);
  assert.equal(res.stdout.trim(), '[1, 2, 9]');
  assert.equal(res.hasTrace, true);
  assert.ok(res.trace.steps.length >= 3);

  // Step 1: initialization
  assert.deepEqual(res.trace.steps[0].stateSnapshot, [5, 2, 9]);
  assert.equal(res.trace.steps[0].sourceLine, 5);

  // Step 2: assignment arr[0] = 1
  assert.deepEqual(res.trace.steps[1].stateSnapshot, [1, 2, 9]);
  assert.equal(res.trace.steps[1].sourceLine, 6);

  // Step 3: Arrays.sort(arr)
  assert.deepEqual(res.trace.steps[2].stateSnapshot, [1, 2, 9]);
  assert.equal(res.trace.steps[2].sourceLine, 7);
});

test('Test C: ArrayList Operations (add, remove) with Sequence Snapshots', async () => {
  const code = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> values = new ArrayList<>();
        values.add(10);
        values.add(20);
        values.add(30);
        values.remove(1);
        System.out.println(values);
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3);
  assert.equal(res.stdout.trim(), '[10, 30]');
  assert.equal(res.hasTrace, true);

  // Verify list operation progression
  const snaps = res.trace.steps.map(s => s.stateSnapshot).filter(Array.isArray);
  assert.ok(snaps.length >= 4);
  assert.deepEqual(snaps[0], []);
  assert.deepEqual(snaps[1], [10]);
  assert.deepEqual(snaps[2], [10, 20]);
  assert.deepEqual(snaps[3], [10, 20, 30]);
  assert.deepEqual(snaps[snaps.length - 1], [10, 30]);
});

test('Test D: Queue Operations (add, peek, remove) with FIFO Ordering', async () => {
  const code = `import java.util.ArrayDeque;
import java.util.Queue;

public class Main {
    public static void main(String[] args) {
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(10);
        queue.add(20);
        queue.add(30);

        System.out.println(queue.peek());
        queue.remove();
        System.out.println(queue);
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3);
  assert.equal(res.stdout.includes('10'), true);
  assert.equal(res.stdout.includes('[20, 30]'), true);
  assert.equal(res.hasTrace, true);

  const finalStep = res.trace.steps[res.trace.steps.length - 1];
  assert.deepEqual(finalStep.stateSnapshot, [20, 30]);
});

test('Test E: Stack Operations (push, peek, pop) with LIFO Ordering', async () => {
  const code = `import java.util.ArrayDeque;

public class Main {
    public static void main(String[] args) {
        ArrayDeque<Integer> stack = new ArrayDeque<>();
        stack.push(10);
        stack.push(20);
        stack.push(30);

        System.out.println(stack.peek());
        stack.pop();
        System.out.println(stack);
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3);
  assert.equal(res.stdout.includes('30'), true);
  assert.equal(res.stdout.includes('[20, 10]'), true);
  assert.equal(res.hasTrace, true);

  const finalStep = res.trace.steps[res.trace.steps.length - 1];
  assert.deepEqual(finalStep.stateSnapshot, [20, 10]);
});

test('Test F: Recursive Factorial (Method calls, Call Stack progression, Returns)', async () => {
  const code = `public class Main {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    public static void main(String[] args) {
        int result = factorial(4);
        System.out.println(result);
    }
}`;

  const res = await executeWithJudge0({ source: code, language: 'java', mode: 'trace' });
  assert.equal(res.statusId, 3);
  assert.equal(res.stdout.trim(), '24');
  assert.equal(res.hasTrace, true);

  // Check call stack frames at deepest recursion
  const maxStackStep = res.trace.steps.reduce((max, s) => (s.callStack.length > max.callStack.length ? s : max), res.trace.steps[0]);
  assert.ok(maxStackStep.callStack.length >= 4);
  assert.equal(maxStackStep.callStack[0], 'main()');
  assert.equal(maxStackStep.callStack.some(f => f.includes('factorial(n=1)')), true);
});

test('Test G: Errors and Limits (Syntax error, Runtime exception, Timeout)', async () => {
  // G1: Syntax Error
  const syntaxRes = await executeWithJudge0({
    source: `public class Main { public static void main(String[] args) { int a = ; } }`,
    language: 'java',
    mode: 'trace'
  });
  assert.equal(syntaxRes.statusId, 6);
  assert.equal(syntaxRes.errorCategory, 'compilation_error');
  assert.ok(syntaxRes.compileOutput.includes('error:'));

  // G2: Runtime Exception (divide by zero)
  const runtimeRes = await executeWithJudge0({
    source: `public class Main { public static void main(String[] args) { int a = 10 / 0; } }`,
    language: 'java',
    mode: 'trace'
  });
  assert.equal(runtimeRes.errorCategory, 'runtime_exception');
  assert.ok(runtimeRes.stderr.includes('ArithmeticException'));

  // G3: Execution Timeout
  const timeoutRes = await executeWithJudge0({
    source: `public class Main { public static void main(String[] args) { while(true) {} } }`,
    language: 'java',
    timeoutMs: 2500,
    pollIntervalMs: 500,
    mode: 'trace'
  });
  assert.equal(timeoutRes.timedOut, true);
  assert.equal(timeoutRes.errorCategory, 'timeout');
});

test('Reversible State Reconstruction: Forward and backward scrubbing matches exact states', () => {
  const dummyTrace = {
    executionId: 'exec-test',
    language: 'java',
    steps: [
      { step: 1, sourceLine: 5, eventType: 'init', dataStructureId: 'q', dataStructureType: 'queue', stateSnapshot: [], variables: {} },
      { step: 2, sourceLine: 6, eventType: 'operation', dataStructureId: 'q', dataStructureType: 'queue', operation: 'add', value: 10, stateSnapshot: [10], variables: { a: 1 } },
      { step: 3, sourceLine: 7, eventType: 'operation', dataStructureId: 'q', dataStructureType: 'queue', operation: 'add', value: 20, stateSnapshot: [10, 20], variables: { b: 2 } },
      { step: 4, sourceLine: 8, eventType: 'operation', dataStructureId: 'q', dataStructureType: 'queue', operation: 'remove', value: 10, stateSnapshot: [20], variables: { c: 3 } }
    ]
  };

  // Step 2
  const stateAt2 = reconstructStateAtStep(dummyTrace, 2);
  assert.deepEqual(stateAt2.dataStructures.q.snapshot, [10, 20]);
  assert.equal(stateAt2.variables.a, 1);
  assert.equal(stateAt2.variables.b, 2);
  assert.equal(stateAt2.variables.c, undefined);

  // Scrub backward to Step 1
  const stateAt1 = reconstructStateAtStep(dummyTrace, 1);
  assert.deepEqual(stateAt1.dataStructures.q.snapshot, [10]);
  assert.equal(stateAt1.variables.a, 1);
  assert.equal(stateAt1.variables.b, undefined);

  // Scrub forward to Step 3
  const stateAt3 = reconstructStateAtStep(dummyTrace, 3);
  assert.deepEqual(stateAt3.dataStructures.q.snapshot, [20]);
  assert.equal(stateAt3.variables.c, 3);
});
