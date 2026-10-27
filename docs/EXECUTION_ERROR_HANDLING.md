# CodeLens — Execution Error Handling & Pipeline Integrity

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Reported Defect
When user code contained an error on a later line (such as a syntax error on line 15 of a 20-line program), CodeLens appeared to execute up to an earlier line and display partial output or a fake successful execution rather than halting and reporting the actual diagnostic at line 15.

### 1.2 Root Cause Analysis
A deep audit across `src/tracer.js`, `server/execution.js`, and `src/pages/StudioWorkspace.jsx` revealed four compounding causes:

1. **Heuristic Template Interception Before AST Syntax Validation (`src/tracer.js`):**
   `traceJavaScriptCode()` evaluated heuristic regular expressions and substrings (`arr[j] && arr[j+1]`, `minIdx`, `queue`, `factorial`, `arr[i + 1]`, etc.) *before* compiling or checking the AST. If any pattern matched, it returned a pre-baked educational trace representing a successful sorting algorithm (e.g., 84 steps), entirely ignoring syntax errors on later lines.

2. **Error Swallowing in JavaScript Runtime Runner (`src/tracer.js`):**
   When code did not match a template, `new Function('console', code)` caught runtime errors (`catch (e) { logs.push('Error: ' + e.message) }`), but still returned `success: true` and `exitCode: 0`. The UI subsequently rendered this as an `Accepted` execution.

3. **Line Offset Drift in Instrumented Runtimes (`server/execution.js`):**
   For Python tracing, a 143-line helper header (`codelens.py`) was prepended directly before user source code. When Python's parser or runtime raised a SyntaxError or exception on line 15, the traceback reported line 158 (143 + 15). The diagnostic extractor did not subtract the header offset, leading to erroneous line reporting or failed line mapping.

4. **Premature Success Feedback in Remote Tracing (`StudioWorkspace.jsx`):**
   In `handleRun()`, if `res.trace?.steps?.length > 0`, the client notified `"Program executed successfully"` unconditionally, even when `exec.exitCode !== 0` or compilation diagnostics were present.

---

## 2. Pipeline Fixes & Architecture

### 2.1 Strict Pre-Execution AST Parsing & Error Trapping
In `src/tracer.js`, `traceJavaScriptCode()` now enforces a strict, multi-stage pipeline:
1. **Full-Source AST Parse First:** Submits the entire source to Acorn with `{ locations: true, ecmaVersion: 'latest' }` in both module and script modes. Any syntax error immediately aborts execution, generates a structured diagnostic with line number, column, and excerpt, sets `exitCode: 1`, `success: false`, and marks the trace step as `type: 'error'`.
2. **Pre-Execution Runtime Boundary:** Runs code inside an isolated function scope with captured `console.log` buffers. If an exception occurs:
   - Genuine stdout produced *before* the exception is preserved.
   - The execution is marked `success: false`, `exitCode: 1`, `errorCategory: 'runtime_exception'`.
   - The failing line is extracted from the error stack.
3. **Template Tracing Only on Zero-Error Executions:** Template or educational traces are only returned if the program is 100% syntactically valid and executed with zero errors.

### 2.2 Source-Mapped Diagnostic Extractor (`server/execution.js`)
`parseExecutionDiagnostic(language, compileOutput, stderr, statusId, source, lineOffset)` normalizes compiler and runtime diagnostics:
- **Python:** Regex `File "(?:<string>|main\.py)", line (\d+)` extracts the reported line and applies `reportedLine - lineOffset` to map directly back to the user's source code.
- **Java:** Parses standard `javac` diagnostics (`/workspace/Main.java:(\d+):(?:\d+:)? error: (.*)`), maps the line back, and captures the code excerpt.
- **C++:** Parses GCC/Clang diagnostics (`(?:main\.cpp|<stdin>):(\d+):(\d+): (?:fatal )?error: (.*)`), captures exact line, column, and excerpt. Line 1 directive `#line 1 "main.cpp"` guarantees compiler lines align 1:1 with user source.

### 2.3 Strict Exit Code & Status Governance
CodeLens strictly adheres to the rule:
> **CodeLens must never report a program as successfully executed if the selected language's actual execution failed.**

- If `exitCode !== 0` or `compileOutput` is present, the status badge reflects `SYNTAX ERROR`, `COMPILATION ERROR`, `TIMEOUT`, or `RUNTIME ERROR`.
- A nonzero exit code is never converted into success.
- Partial output generated before a runtime failure is displayed in STDOUT, but explicitly annotated with `// [Execution halted with exit code 1 (Failed) on Line X]`.

---

## 3. UI Error Surfacing & Editor Highlights

### 3.1 Editor Visual Line Highlights
When an execution fails:
- **`studio-line-num.error-line`:** The failing line number turns vivid crimson (`#ef4444`) with an illuminated red diagnostic indicator dot.
- **`studio-code-row.error-row`:** The entire line in the editor receives a 3px red left-border and a subtle red highlight background (`rgba(239, 68, 68, 0.16)` in dark mode, `rgba(239, 68, 68, 0.12)` in light mode).
- **Auto-Scroll to Error:** The editor automatically scrolls the failing line into view.
- **Auto-Invalidation on Edit:** When the user types or modifies code in the editor, stale error decorations are cleared immediately.

### 3.2 Structured Error Diagnostics Card (Output Tab)
When an error occurs, the Output tab renders a dedicated card containing:
1. **Error Category Banner:** `SYNTAX ERROR`, `COMPILATION ERROR`, or `RUNTIME ERROR` with exact Line and Column.
2. **Filename Tag:** Displays `main.js`, `main.py`, `Main.java`, or `main.cpp`.
3. **Clean Message:** Exact diagnostic from the parser or compiler.
4. **Source Code Excerpt:** Displays the offending line of code with caret.
5. **Contextual Explanation:** Explains the underlying cause without replacing the actual compiler diagnostic.

---

## 4. Verification Evidence

| Scenario | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- |
| **20-line JS with syntax error on line 15** | Rejects, reports line 15, column, exit code 1, highlights line 15 | Acorn reports line 15 col 18, `.error-row` at line 15, exit code 1 | **VERIFIED** |
| **20-line Python with syntax error on line 15** | Maps reported line 158 back to user source line 15, exit code 1 | Diagnostic mapped to line 15, category `syntax` | **VERIFIED** |
| **Java compilation error (missing semicolon)** | Reports compilation error on line 3, exit code 1 | Javac line 3 mapped, exit code 1 | **VERIFIED** |
| **C++ compilation error (undeclared type)** | Reports compilation error on line 4, col 5, exit code 1 | GCC line 4 col 5 mapped, exit code 1 | **VERIFIED** |
| **Runtime failure after stdout** | Preserves pre-failure stdout, marks failed, reports runtime exception | Pre-failure stdout displayed, halted annotation added, exit code 1 | **VERIFIED** |
| **Execution Timeout** | Returns timeout status, null exit code, no fabricated output | Timed out badge, timeout diagnostic card, empty stdout | **VERIFIED** |
