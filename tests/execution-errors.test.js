import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { traceJavaScriptCode, runJavaScriptCode, validateJavaScriptSyntax } from '../client/src/tracer.js';
import { executeWithJudge0, parseExecutionDiagnostic } from '../server/execution.js';
import { analyzeComplexity } from '../client/src/complexityAnalyzer.js';

// ============================================================================
// TEST A: Java Syntax / Compilation Error on Line 15 (20-line source)
// ============================================================================
test('Test A: Java 20-line program with compilation error on line 15', async () => {
  const java20Lines = [
    'public class Main {',
    '    public static void main(String[] args) {',
    '        int total = 0;',
    '        for (int i = 0; i < 5; i++) {',
    '            total += i;',
    '        }',
    '        System.out.println("Total: " + total);',
    '        String[] names = new String[]{"Alice", "Bob"};',
    '        for (String name : names) {',
    '            System.out.println("Hello " + name);',
    '        }',
    '        int a = 100;',
    '        int b = 200;',
    '        int c = a + b;',
    '        int invalid_var = ; // Line 15 syntax error',
    '        System.out.println("c = " + c);',
    '        int d = c * 2;',
    '        System.out.println("d = " + d);',
    '        System.out.println("Done line 19");',
    '    }',
    '}'
  ].join('\n');

  // Verify line 15 has the error
  const lines = java20Lines.split('\n');
  assert.equal(lines[14], '        int invalid_var = ; // Line 15 syntax error');

  // Mock standard compiler output from javac for line 15 syntax error
  // (In Java, prepending "import java.util.*;\n" shifts reported line from 15 to 16)
  const rawCompilerOutput = `/workspace/Main.java:16: error: illegal start of expression\n        int invalid_var = ; // Line 15 syntax error\n                          ^\n1 error\n`;

  // 1. Diagnostic parser accuracy with 1-line header offset
  const diag = parseExecutionDiagnostic('java', rawCompilerOutput, '', 6, java20Lines, 1);
  assert.ok(diag, 'Must produce structured diagnostic');
  assert.equal(diag.category, 'compilation', 'Category must be compilation');
  assert.equal(diag.line, 15, 'Diagnostic line must map back to user source line 15');
  assert.equal(diag.filename, 'Main.java');
  assert.ok(diag.message.includes('illegal start of expression') || diag.message.includes('error'));
  assert.ok(diag.excerpt.includes('int invalid_var = ;'));

  // 2. Strict execution engine lifecycle
  const result = await executeWithJudge0({
    source: java20Lines,
    language: 'java',
    mode: 'trace',
    env: { JUDGE0_URL: 'https://judge.example/' },
    fetchImpl: async (_url, options) => {
      if (options.method === 'POST') return Response.json({ token: 'job-java-err' });
      return Response.json({
        status: { id: 6, description: 'Compilation Error' },
        compile_output: rawCompilerOutput,
        stdout: null,
        stderr: null,
        exit_code: 1
      });
    }
  });

  // Verify:
  // - Complete file was compiled
  // - Real compiler rejected it
  // - Diagnostic points to actual error location (line 15)
  // - Execution did NOT start (executionStarted === false)
  // - No successful runtime trace is produced (trace === null, traceStatus === 'not_started')
  // - No partial output is presented as successful execution (stdout === '')
  // - Execution stage is compile_failed
  assert.equal(result.compilationStatus, 'failed', 'compilationStatus must be failed');
  assert.equal(result.executionStarted, false, 'executionStarted must be false');
  assert.equal(result.traceStatus, 'not_started', 'traceStatus must be not_started');
  assert.equal(result.executionStage, 'compile_failed', 'executionStage must be compile_failed');
  assert.equal(result.hasTrace, false, 'hasTrace must be false');
  assert.equal(result.trace, null, 'trace must be null');
  assert.equal(result.stdout, '', 'Must never return partial stdout for uncompiled programs');
  assert.equal(result.diagnostic.line, 15, 'Diagnostic must point to line 15');
});

// ============================================================================
// TEST B: C++17 Syntax / Compilation Error on Line 15 (20-line source)
// ============================================================================
test('Test B: C++17 20-line program with compilation error on line 15', async () => {
  const cpp20Lines = [
    '#include <iostream>',
    '#include <vector>',
    '#include <string>',
    'using namespace std;',
    'int main() {',
    '    int total = 0;',
    '    for (int i = 0; i < 5; i++) {',
    '        total += i;',
    '    }',
    '    cout << "Total: " << total << endl;',
    '    vector<string> names = {"Alice", "Bob"};',
    '    for (const auto& name : names) {',
    '        cout << "Hello " << name << endl;',
    '    }',
    '    undeclared_function_call_on_line_15(); // Line 15 error',
    '    int a = 10;',
    '    int b = 20;',
    '    cout << "Sum: " << (a + b) << endl;',
    '    return 0;',
    '}'
  ].join('\n');

  const lines = cpp20Lines.split('\n');
  assert.equal(lines[14], '    undeclared_function_call_on_line_15(); // Line 15 error');

  // Verify with local real g++ compiler if available on host
  let localGppOutput = null;
  try {
    const tmpFile = path.join(os.tmpdir(), `test_b_${Date.now()}.cpp`);
    fs.writeFileSync(tmpFile, cpp20Lines, 'utf8');
    try {
      execSync(`g++ -std=c++17 -fsyntax-only "${tmpFile}"`, { stdio: 'pipe' });
    } catch (gppErr) {
      localGppOutput = (gppErr.stderr || gppErr.stdout || '').toString();
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  } catch (sysErr) {
    // If g++ execution fails for filesystem reasons, fallback to standard GCC diagnostic
  }

  const rawGccOutput = localGppOutput || `main.cpp:15:5: error: 'undeclared_function_call_on_line_15' was not declared in this scope\n   15 |     undeclared_function_call_on_line_15(); // Line 15 error\n      |     ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;

  // 1. Diagnostic parser accuracy
  const diag = parseExecutionDiagnostic('cpp', rawGccOutput, '', 6, cpp20Lines, 0);
  assert.ok(diag, 'Must produce structured diagnostic');
  assert.equal(diag.category, 'compilation');
  assert.equal(diag.line, 15, 'C++ compiler error must point to line 15');
  assert.ok(diag.message.includes('undeclared_function_call_on_line_15'));
  assert.ok(diag.excerpt.includes('undeclared_function_call_on_line_15'));

  // 2. Execution engine lifecycle
  const result = await executeWithJudge0({
    source: cpp20Lines,
    language: 'cpp',
    mode: 'trace',
    env: { JUDGE0_URL: 'https://judge.example/' },
    fetchImpl: async (_url, options) => {
      if (options.method === 'POST') return Response.json({ token: 'job-cpp-err' });
      return Response.json({
        status: { id: 6, description: 'Compilation Error' },
        compile_output: rawGccOutput,
        stdout: null,
        stderr: null,
        exit_code: 1
      });
    }
  });

  assert.equal(result.compilationStatus, 'failed');
  assert.equal(result.executionStarted, false);
  assert.equal(result.traceStatus, 'not_started');
  assert.equal(result.executionStage, 'compile_failed');
  assert.equal(result.hasTrace, false);
  assert.equal(result.trace, null);
  assert.equal(result.stdout, '');
  assert.equal(result.diagnostic.line, 15);
});

// ============================================================================
// TEST C: Python Syntax Error on Line 15 (20-line source)
// ============================================================================
test('Test C: Python 20-line program with syntax error on line 15', async () => {
  const py20Lines = [
    '# Line 1: setup',
    'total = 0',
    'for i in range(5):',
    '    total += i',
    'print("Total:", total)',
    'names = ["Alice", "Bob"]',
    'for name in names:',
    '    print("Hello", name)',
    'a = 10',
    'b = 20',
    'c = a + b',
    'print("c =", c)',
    'd = c * 2',
    'print("d =", d)',
    'invalid_syntax_on_line_15 = = = // invalid',
    'e = 100',
    'print("e =", e)',
    'f = 200',
    'print("f =", f)',
    'print("Done line 20")'
  ].join('\n');

  const lines = py20Lines.split('\n');
  assert.equal(lines[14], 'invalid_syntax_on_line_15 = = = // invalid', 'Line 15 must contain syntax error');

  // Verify with local real Python 3 interpreter
  let pyStdout = '';
  let pyStderr = '';
  let pyExitCode = 0;
  const tmpPy = path.join(os.tmpdir(), `test_c_${Date.now()}.py`);
  fs.writeFileSync(tmpPy, py20Lines, 'utf8');
  try {
    pyStdout = execSync(`python "${tmpPy}"`, { stdio: 'pipe' }).toString();
  } catch (pyErr) {
    pyExitCode = pyErr.status || 1;
    pyStdout = (pyErr.stdout || '').toString();
    pyStderr = (pyErr.stderr || '').toString();
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }

  // Real Python MUST reject the complete program before starting execution
  assert.equal(pyExitCode, 1, 'Python must exit with non-zero status on syntax error');
  assert.equal(pyStdout, '', 'CRITICAL: Python must NEVER execute lines 1-14 when line 15 has syntax error');
  assert.ok(pyStderr.includes('SyntaxError'), 'Stderr must contain SyntaxError');
  assert.ok(pyStderr.includes('line 15'), 'Stderr must identify line 15');

  // 1. Diagnostic parser accuracy with caret column detection
  const diag = parseExecutionDiagnostic('python', null, pyStderr, 11, py20Lines, 0);
  assert.ok(diag, 'Must produce structured diagnostic');
  assert.equal(diag.category, 'syntax', 'Category must be syntax');
  assert.equal(diag.line, 15, 'Diagnostic line must be exactly 15');
  assert.ok(diag.message.includes('SyntaxError'));
  assert.ok(diag.excerpt.includes('invalid_syntax_on_line_15'));

  // 2. Execution engine lifecycle
  const result = await executeWithJudge0({
    source: py20Lines,
    language: 'python',
    mode: 'trace',
    env: { JUDGE0_URL: 'https://judge.example/' },
    fetchImpl: async (_url, options) => {
      if (options.method === 'POST') return Response.json({ token: 'job-py-err' });
      return Response.json({
        status: { id: 11, description: 'Runtime Error (NZEC)' },
        compile_output: null,
        stdout: null,
        stderr: pyStderr,
        exit_code: 1
      });
    }
  });

  // Verify:
  // - Complete source parsed before execution
  // - No first-14-lines execution falsely reported
  // - No successful runtime trace created
  assert.equal(result.isPythonSyntax, true, 'isPythonSyntax must be detected');
  assert.equal(result.compilationStatus, 'failed', 'compilationStatus must be failed');
  assert.equal(result.executionStarted, false, 'executionStarted must be false');
  assert.equal(result.traceStatus, 'not_started', 'traceStatus must be not_started');
  assert.equal(result.executionStage, 'compile_failed', 'executionStage must be compile_failed');
  assert.equal(result.stdout, '', 'stdout must be empty');
  assert.equal(result.trace, null, 'trace must be null');
  assert.equal(result.diagnostic.line, 15, 'diagnostic line must be 15');
});

// ============================================================================
// TEST C2: JavaScript Syntax Error on Line 15 (20-line source)
// ============================================================================
test('Test C2: JavaScript 20-line program with syntax error on line 15', () => {
  const js20Lines = [
    '// Line 1',
    'let count = 0;',
    'for (let i = 0; i < 5; i++) {',
    '  count += i;',
    '}',
    'console.log("Count:", count);',
    'let arr = [10, 20, 30];',
    'let sum = 0;',
    'for (let j = 0; j < arr.length; j++) {',
    '  sum += arr[j];',
    '}',
    'console.log("Sum:", sum);',
    'let x = 100;',
    'let y = 200;',
    'let invalidSyntax = ; // Line 15 syntax error',
    'console.log("This should not execute");',
    'let z = x + y;',
    'console.log("z =", z);',
    '// Line 19',
    'console.log("Line 20");'
  ].join('\n');

  // Test full-source syntax validation before execution
  const val = validateJavaScriptSyntax(js20Lines);
  assert.equal(val.valid, false, 'Must identify syntax error');
  assert.equal(val.line, 15, 'Must point to line 15');
  assert.ok(val.column > 0, 'Must identify column');

  // Test standard run mode (runJavaScriptCode)
  const runRes = runJavaScriptCode(js20Lines);
  assert.equal(runRes.success, false, 'Run mode must fail on syntax error');
  assert.equal(runRes.executionStage, 'compile_failed');
  assert.equal(runRes.compilationStatus, 'failed');
  assert.equal(runRes.executionStarted, false);
  assert.equal(runRes.traceStatus, 'not_started');
  assert.equal(runRes.stdout, '', 'Must not execute lines 1-14');
  assert.equal(runRes.diagnostic.line, 15);

  // Test trace mode (traceJavaScriptCode)
  const traceRes = traceJavaScriptCode(js20Lines);
  assert.equal(traceRes.success, false, 'Trace mode must fail on syntax error');
  assert.equal(traceRes.executionStage, 'compile_failed');
  assert.equal(traceRes.compilationStatus, 'failed');
  assert.equal(traceRes.executionStarted, false);
  assert.equal(traceRes.traceStatus, 'not_started');
  assert.equal(traceRes.steps.length, 0, 'Trace steps must be empty (NO fake simulation)');
  assert.equal(traceRes.stdout, '', 'Trace stdout must be empty');
  assert.equal(traceRes.diagnostic.line, 15);
});

// ============================================================================
// TEST D: Valid Programs Containing Statements After Line 14
// ============================================================================
test('Test D: Valid programs execute statements after line 14', () => {
  // 1. JavaScript valid 20-line program
  const validJs = [
    'let total = 0;',
    'for (let i = 0; i < 5; i++) { total += i; }',
    'console.log("Total:", total);',
    '// Line 4',
    '// Line 5',
    '// Line 6',
    '// Line 7',
    '// Line 8',
    '// Line 9',
    '// Line 10',
    '// Line 11',
    '// Line 12',
    '// Line 13',
    '// Line 14',
    'let after14 = "Executed Line 15";',
    'console.log(after14);',
    'let finalVal = 999;',
    'console.log("FinalVal:", finalVal);',
    '// Line 19',
    'console.log("Program Completed Line 20");'
  ].join('\n');

  const jsRes = runJavaScriptCode(validJs);
  assert.equal(jsRes.success, true);
  assert.equal(jsRes.exitCode, 0);
  assert.equal(jsRes.executionStage, 'completed');
  assert.equal(jsRes.executionStarted, true);
  assert.ok(jsRes.stdout.includes('Executed Line 15'), 'Must execute statement on line 15');
  assert.ok(jsRes.stdout.includes('Program Completed Line 20'), 'Must execute statement on line 20');

  // 2. Python valid 20-line program executed with local real python
  const validPy = [
    'total = 0',
    'for i in range(5):',
    '    total += i',
    'print("Total:", total)',
    '# Line 5',
    '# Line 6',
    '# Line 7',
    '# Line 8',
    '# Line 9',
    '# Line 10',
    '# Line 11',
    '# Line 12',
    '# Line 13',
    '# Line 14',
    'after14 = "Executed Line 15"',
    'print(after14)',
    'final_val = 999',
    'print("FinalVal:", final_val)',
    '# Line 19',
    'print("Program Completed Line 20")'
  ].join('\n');

  const tmpPy = path.join(os.tmpdir(), `test_d_${Date.now()}.py`);
  fs.writeFileSync(tmpPy, validPy, 'utf8');
  try {
    const pyOut = execSync(`python "${tmpPy}"`, { stdio: 'pipe' }).toString();
    assert.ok(pyOut.includes('Executed Line 15'), 'Python must execute line 15');
    assert.ok(pyOut.includes('Program Completed Line 20'), 'Python must execute line 20');
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
});

// ============================================================================
// TEST E: Runtime Exception (Valid program fails midway)
// ============================================================================
test('Test E: Runtime exception preserves genuine prior stdout and marks failure', () => {
  const codeWithRuntimeError = [
    'console.log("Initialization complete");',
    'console.log("Processing records batch 1");',
    'let count = 42;',
    'console.log("Batch 1 count:", count);',
    'const obj = null;',
    'obj.undefinedMethodCall(); // Throws TypeError on line 6',
    'console.log("This line should never execute");'
  ].join('\n');

  const res = runJavaScriptCode(codeWithRuntimeError);

  // Verify:
  // - Execution DID start (executionStarted === true)
  // - Prior stdout is preserved
  // - Execution stage is runtime_failed
  // - Diagnostic points to line 6
  assert.equal(res.success, false, 'Execution must fail');
  assert.equal(res.executionStarted, true, 'Execution must have started');
  assert.equal(res.executionStage, 'runtime_failed', 'Stage must be runtime_failed');
  assert.ok(res.stdout.includes('Initialization complete'), 'Must preserve prior stdout 1');
  assert.ok(res.stdout.includes('Processing records batch 1'), 'Must preserve prior stdout 2');
  assert.ok(res.stdout.includes('Batch 1 count: 42'), 'Must preserve prior stdout 3');
  assert.ok(!res.stdout.includes('This line should never execute'), 'Must not execute statements after exception');
  assert.equal(res.diagnostic.line, 6, 'Diagnostic must point to line 6');
  assert.equal(res.diagnostic.category, 'runtime');
});

// ============================================================================
// TEST F: Stale State Prevention
// ============================================================================
test('Test F: Stale state prevention across runs and invalidation', () => {
  // Run 1: Successful execution
  const validCode = 'console.log("Run 1 Output");';
  const run1 = runJavaScriptCode(validCode);
  assert.equal(run1.success, true);
  assert.equal(run1.stdout, 'Run 1 Output');

  // Run 2: User enters invalid code
  const invalidCode = 'let x = ; // syntax error';
  const run2 = runJavaScriptCode(invalidCode);

  // Verify:
  // Previous successful output is NOT retained in Run 2 result
  assert.equal(run2.success, false);
  assert.equal(run2.stdout, '', 'Run 2 stdout must NOT retain Run 1 output');
  assert.equal(run2.executionStarted, false);
  assert.equal(run2.executionStage, 'compile_failed');
});

// ============================================================================
// TEST G: Separate Trace Mode vs Run Mode
// ============================================================================
test('Test G: Run mode vs Trace mode distinction and error handling', () => {
  const code = 'let x = 10; let y = 20; console.log("Sum:", x + y);';

  // 1. Run mode: lightweight execution, stdout captured, no trace steps overhead
  const runRes = runJavaScriptCode(code);
  assert.equal(runRes.success, true);
  assert.equal(runRes.executionStage, 'completed');
  assert.equal(runRes.traceStatus, 'unavailable', 'Run mode does not record trace');
  assert.equal(runRes.trace, null);
  assert.ok(runRes.stdout.includes('Sum: 30'));

  // 2. Trace mode: full instrumentation with step-by-step timeline
  const traceRes = traceJavaScriptCode(code);
  assert.equal(traceRes.success, true);
  assert.equal(traceRes.executionStage, 'completed');
  assert.equal(traceRes.traceStatus, 'complete', 'Trace mode records complete trace');
  assert.ok(traceRes.steps.length > 0, 'Trace mode must provide recorded steps');
  assert.ok(traceRes.stdout.includes('Sum: 30'));

  // 3. Trace mode with syntax error: MUST refuse to start runtime tracing
  const invalidCode = 'let invalid = ;';
  const traceErr = traceJavaScriptCode(invalidCode);
  assert.equal(traceErr.success, false);
  assert.equal(traceErr.traceStatus, 'not_started', 'Trace mode refuses to start on syntax error');
  assert.equal(traceErr.steps.length, 0, 'No trace steps recorded');
  assert.equal(traceErr.executionStarted, false);
});

// ============================================================================
// Multi-language Complexity Analysis Verification
// ============================================================================
test('Complexity Analyzer: Multi-language coverage verification', () => {
  // 1. JavaScript nested loops -> O(n²)
  const jsNested = 'for (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) {\n    sum++;\n  }\n}';
  const jsRes = analyzeComplexity(jsNested, 'javascript');
  assert.equal(jsRes.timeComplexity, 'O(n²)');
  assert.equal(jsRes.supported, true);

  // 2. Python nested loops (indentation-based) -> O(n²)
  const pyNested = 'for i in range(n):\n    for j in range(n):\n        total += 1';
  const pyRes = analyzeComplexity(pyNested, 'python');
  assert.equal(pyRes.timeComplexity, 'O(n²)');
  assert.equal(pyRes.supported, true);

  // 3. Java nested loops (brace-scoped) -> O(n²)
  const javaNested = 'for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        count++;\n    }\n}';
  const javaRes = analyzeComplexity(javaNested, 'java');
  assert.equal(javaRes.timeComplexity, 'O(n²)');
  assert.equal(javaRes.supported, true);

  // 4. C++ nested loops -> O(n²)
  const cppNested = 'for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        ans++;\n    }\n}';
  const cppRes = analyzeComplexity(cppNested, 'cpp');
  assert.equal(cppRes.timeComplexity, 'O(n²)');
  assert.equal(cppRes.supported, true);

  // 5. Constant bounds loop -> O(1)
  const constLoop = 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}';
  const constRes = analyzeComplexity(constLoop, 'javascript');
  assert.equal(constRes.timeComplexity, 'O(1)', 'Constant bound loop must evaluate to O(1), not O(n)');

  // 6. Sequential loops -> O(n), NOT multiplied
  const seqLoops = 'for (let i = 0; i < n; i++) { sum++; }\nfor (let j = 0; j < n; j++) { count++; }';
  const seqRes = analyzeComplexity(seqLoops, 'javascript');
  assert.equal(seqRes.timeComplexity, 'O(n)', 'Sequential loops must be O(n), not O(n²)');

  // 7. Binary search -> O(log n)
  const binSearch = 'while (low <= high) {\n  let mid = Math.floor((low + high) / 2);\n  if (arr[mid] === target) return mid;\n}';
  const binRes = analyzeComplexity(binSearch, 'javascript');
  assert.equal(binRes.timeComplexity, 'O(log n)');
});
