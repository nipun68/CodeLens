import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeComplexity } from '../client/src/complexityAnalyzer.js';

test('Complexity Analyzer: JavaScript nested loops produce justified O(n²) finding', () => {
  const code = `let arr = [5, 2, 9, 1];
const n = arr.length;
for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      let temp = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = temp;
    }
  }
}`;

  const result = analyzeComplexity(code, 'javascript');
  assert.equal(result.overallTime, 'O(n²)');
  assert.equal(result.overallSpace, 'O(1)');
  assert.equal(result.confidence, 'High confidence');

  const nestedFinding = result.findings.find(f => f.complexity === 'O(n²)');
  assert.ok(nestedFinding);
  assert.equal(nestedFinding.type, 'Quadratic Nested Loop');
  assert.ok(nestedFinding.line >= 3);
});

test('Complexity Analyzer: Sequential loops are NOT multiplied and yield O(n)', () => {
  const code = `const n = 100;
for (let i = 0; i < n; i++) {
  console.log(i);
}
for (let j = 0; j < n; j++) {
  console.log(j);
}`;

  const result = analyzeComplexity(code, 'javascript');
  assert.equal(result.overallTime, 'O(n)');
  assert.equal(result.findings.every(f => f.complexity !== 'O(n²)'), true);
  assert.equal(result.findings.filter(f => f.complexity === 'O(n)').length, 2);
});

test('Complexity Analyzer: Binary search pattern produces O(log n)', () => {
  const code = `let low = 0;
let high = arr.length - 1;
while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) low = mid + 1;
  else high = mid - 1;
}`;

  const result = analyzeComplexity(code, 'javascript');
  assert.equal(result.overallTime, 'O(log n)');
  assert.equal(result.findings[0].complexity, 'O(log n)');
});

test('Complexity Analyzer: Recursive branching generates exponential O(2ⁿ)', () => {
  const code = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

  const result = analyzeComplexity(code, 'javascript');
  assert.equal(result.overallTime, 'O(2ⁿ)');
  assert.equal(result.overallSpace, 'O(n)');
  assert.equal(result.findings[0].type, 'Exponential Branching Recursion');
});

test('Complexity Analyzer: Python indentation-based nested loops', () => {
  const pyCode = `for i in range(n):
    for j in range(n):
        print(i, j)`;

  const result = analyzeComplexity(pyCode, 'python');
  assert.equal(result.overallTime, 'O(n²)');
  assert.equal(result.findings.length, 2);
  assert.equal(result.findings[0].complexity, 'O(n²)');
});

test('Complexity Analyzer: C++ and Java brace-scoped loops', () => {
  const cppCode = `for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        swap(a[i], a[j]);
    }
}`;

  const resultCpp = analyzeComplexity(cppCode, 'cpp');
  assert.equal(resultCpp.overallTime, 'O(n²)');

  const javaCode = `for (int i = 0; i < n; i++) {
    System.out.println(i);
}`;

  const resultJava = analyzeComplexity(javaCode, 'java');
  assert.equal(resultJava.overallTime, 'O(n)');
});

test('Complexity Analyzer: Constant O(1) for empty or loopless operations', () => {
  const result = analyzeComplexity('let x = 10;\nlet y = 20;\nreturn x + y;', 'javascript');
  assert.equal(result.overallTime, 'O(1)');
  assert.equal(result.overallSpace, 'O(1)');
  assert.equal(result.findings.length, 0);
});
