import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWithJudge0 } from '../server/execution.js';

// Use configured Judge0 URL from environment, or public Judge0 CE
const JUDGE0_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com/';

test('Python 3 execution: sorts array correctly', async () => {
  const code = `arr = [5, 2, 9, 1, 5, 6]
arr.sort()
print("Sorted:", arr)`;

  const result = await executeWithJudge0({
    source: code,
    language: 'python',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `Python execution failed: ${result.stderr || result.compileOutput}`);
  assert.equal(result.stdout.trim(), 'Sorted: [1, 2, 5, 5, 6, 9]');
  assert.equal(result.compileOutput, null);
});

test('Java execution: compiles Main class and evaluates expression', async () => {
  const code = `public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        System.out.println(a + b);
    }
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'java',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `Java execution failed: ${result.stderr || result.compileOutput}`);
  assert.equal(result.stdout.trim(), '30');
  assert.equal(result.compileOutput, null);
});

test('C++17 execution: compiles STL vector and algorithm sort', async () => {
  const code = `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> arr = {5, 2, 9, 1, 5, 6};
    sort(arr.begin(), arr.end());
    cout << "Sorted: ";
    for (int x : arr) {
        cout << x << " ";
    }
    cout << endl;
    return 0;
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'cpp',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `C++ execution failed: ${result.stderr || result.compileOutput}`);
  assert.equal(result.stdout.trim(), 'Sorted: 1 2 5 5 6 9');
  assert.equal(result.compileOutput, null);
});

test('JavaScript provider regression: executes on Node runtime', async () => {
  const code = `const a = [5, 2, 9, 1, 5, 6];
a.sort((x, y) => x - y);
console.log("Sorted:", JSON.stringify(a));`;

  const result = await executeWithJudge0({
    source: code,
    language: 'javascript',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `JavaScript execution failed: ${result.stderr}`);
  assert.equal(result.stdout.trim(), 'Sorted: [1,2,5,5,6,9]');
});

test('Standard input (stdin): Python receives 5 and outputs 10', async () => {
  const code = `n = int(input())
print(n * 2)`;

  const result = await executeWithJudge0({
    source: code,
    language: 'python',
    stdin: '5',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `Python stdin test failed: ${result.stderr}`);
  assert.equal(result.stdout.trim(), '10');
});

test('Standard input (stdin): Java receives 5 and outputs 10', async () => {
  const code = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n * 2);
    }
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'java',
    stdin: '5',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `Java stdin test failed: ${result.stderr || result.compileOutput}`);
  assert.equal(result.stdout.trim(), '10');
});

test('Standard input (stdin): C++ receives 5 and outputs 10', async () => {
  const code = `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    cout << n * 2 << endl;
    return 0;
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'cpp',
    stdin: '5',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Accepted', `C++ stdin test failed: ${result.stderr || result.compileOutput}`);
  assert.equal(result.stdout.trim(), '10');
});

test('Error handling: Python syntax error reports diagnostic with line number', async () => {
  const code = `def broken_func(
    print("missing paren")`;

  const result = await executeWithJudge0({
    source: code,
    language: 'python',
    env: { JUDGE0_URL },
  });

  assert.notEqual(result.status, 'Accepted');
  assert.match(result.stderr || result.compileOutput, /SyntaxError/i);
});

test('Error handling: Java compilation error reports compiler diagnostics', async () => {
  const code = `public class Main {
    public static void main(String[] args) {
        int a = "incompatible types";
    }
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'java',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Compilation Error');
  assert.ok(result.compileOutput && result.compileOutput.includes('incompatible types'), 'Compile output must contain diagnostic');
});

test('Error handling: C++ compilation error reports compiler diagnostics', async () => {
  const code = `#include <iostream>
int main() {
    this_is_an_undefined_symbol_error;
    return 0;
}`;

  const result = await executeWithJudge0({
    source: code,
    language: 'cpp',
    env: { JUDGE0_URL },
  });

  assert.equal(result.status, 'Compilation Error');
  assert.ok(result.compileOutput && result.compileOutput.includes('this_is_an_undefined_symbol_error'), 'Compile output must contain undefined symbol');
});

test('Error handling: Python runtime exception (ZeroDivisionError)', async () => {
  const code = `x = 10 / 0`;

  const result = await executeWithJudge0({
    source: code,
    language: 'python',
    env: { JUDGE0_URL },
  });

  assert.notEqual(result.status, 'Accepted');
  assert.match(result.stderr, /ZeroDivisionError/);
});

test('Error handling: Invalid language selection rejected with 400', async () => {
  await assert.rejects(
    executeWithJudge0({ source: 'puts "hello"', language: 'ruby', env: { JUDGE0_URL } }),
    { status: 400 }
  );
});

test('Error handling: Missing execution provider rejected with 503', async () => {
  await assert.rejects(
    executeWithJudge0({ source: 'print(1)', language: 'python', env: { JUDGE0_URL: '' } }),
    { status: 503 }
  );
});

test('Concurrency: Parallel executions do not collide or leak outputs', async () => {
  const [res1, res2, res3] = await Promise.all([
    executeWithJudge0({ source: 'print("EXECUTION_ALPHA")', language: 'python', env: { JUDGE0_URL } }),
    executeWithJudge0({ source: 'print("EXECUTION_BETA")', language: 'python', env: { JUDGE0_URL } }),
    executeWithJudge0({ source: 'print("EXECUTION_GAMMA")', language: 'python', env: { JUDGE0_URL } }),
  ]);

  assert.equal(res1.stdout.trim(), 'EXECUTION_ALPHA');
  assert.equal(res2.stdout.trim(), 'EXECUTION_BETA');
  assert.equal(res3.stdout.trim(), 'EXECUTION_GAMMA');
});
