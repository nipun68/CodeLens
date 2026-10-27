# CodeLens Multi-Language Execution Audit

**Date:** October 25, 2026  
**Auditor:** CodeLens System & Execution Architecture  
**Scope:** Frontend editor, language selector, execution engine, backend API, process isolation, and test infrastructure.

---

## 1. Executive Summary

CodeLens was originally built around JavaScript in-browser AST tracing with Acorn, alongside a backend Express server with Judge0 provider integration (`server/execution.js`) that was only partially integrated into the frontend. 

Prior to this audit:
- The backend had a `/api/v1/execution` endpoint with Judge0 support for Python, Java, JavaScript, and C++.
- The frontend `StudioWorkspace.jsx` had **no language selector**, no connection to `/api/v1/execution`, and only executed JavaScript code through the client-side `traceJavaScriptCode` AST interpreter in `src/tracer.js`.
- Clicking **Run & Trace** on the frontend only ran JavaScript in-browser; choosing Python, Java, or C++ was impossible in the main studio editor.
- The standard input (`stdin`) mechanism was absent from the frontend editor.
- Windows test runner (`npm test`) failed due to unexpanded shell globs (`tests/*.test.js`).

---

## 2. Component-by-Component Review

### 2.1 Frontend Framework & Editor Implementation
- **Framework:** React 19 + Vite 7 with Tailwind CSS v4.
- **Editor:** Custom `<textarea>` with synchronized overlay highlighting (`studio-code-overlay`), line numbering, breakpoint gutters, and complexity tooltips.
- **State Management:** Local React state in `StudioWorkspace.jsx` (`code`, `trace`, `currentStepIndex`, `breakpoints`, `activeTab`).
- **Defects identified:**
  1. No language state or selector in `StudioWorkspace.jsx`.
  2. Language mode was hardcoded to `main.js` and JavaScript syntax rendering.
  3. No stdin input field for programs requiring interactive input.

### 2.2 Programming Language Selector
- **Current State:**
  - `Landing.jsx` possessed a cosmetic preview pill for `['javascript', 'python', 'java', 'cpp']` displaying static code snippets.
  - `Snippets.jsx` had badge filtering for languages.
  - `StudioWorkspace.jsx` lacked a language selector entirely.
- **Defects identified:**
  - User could not select or switch languages inside the editor workspace.

### 2.3 Run & Run & Trace Button Handlers
- **Current State:**
  - `handleRunAndTrace` in `StudioWorkspace.jsx` directly called `traceJavaScriptCode(code)`.
  - There was no separate "Run" button (only "Run & Trace").
  - The AST interpreter (`src/tracer.js`) uses Acorn, which throws a syntax error on any non-JavaScript code (Python, Java, C++).
- **Defects identified:**
  - Any Python, Java, or C++ code pasted into the editor produced an Acorn syntax error rather than executing.

### 2.4 Execution Engine & Backend Routes
- **Backend Route:** `/api/v1/execution` and `/api/execution` in `server/index.js`.
- **Backend Service:** `server/execution.js` implements `executeWithJudge0`.
- **Supported Provider Languages:**
  - Python: Language ID 109 (Python 3.11.2 on Judge0 CE)
  - Java: Language ID 91 (OpenJDK 17.0.6 on Judge0 CE)
  - JavaScript: Language ID 102 (Node.js 20.18.0)
  - C++: Language ID 105 (GCC 14.1.0 on Judge0 CE)
- **Defects identified:**
  - Frontend never dispatched requests to `/api/v1/execution`.
  - Stdin was never gathered or sent from the client UI.
  - Tracing capabilities were conflated with standard code execution.

### 2.5 Security & Isolation Review
- **Architecture:** Isolated execution delegation to Judge0 provider. Untrusted user code is **never** executed inside the main Express Node.js process.
- **Resource Limits in Place:**
  - `cpu_time_limit`: 5 seconds
  - `wall_time_limit`: 8 seconds
  - `memory_limit`: 128 MB (128,000 KB)
  - `stack_limit`: 64 MB (64,000 KB)
  - `max_file_size`: 1024 KB
  - `source`: max 30,000 characters / 30 KB
  - `stdin`: max 10,000 characters / 10 KB
  - `stdout`: capped at 60,000 characters to prevent memory exhaustion
  - Rate limiting: 160 requests per minute on `/api` via `express-rate-limit`
  - Client abort handling: `AbortController` hooked to `res.on('close')`.

### 2.6 Local Host Runtime Detection (Host System)
- **Python 3:** Detected `Python 3.12.10` in host system PATH.
- **Java:** `java version "1.8.0_481"` in PATH, `JAVA_HOME` set to `D:\jdk21.0.9_10` (unmounted).
- **C++:** `g++.exe 6.3.0` in host system PATH (`E:\bin\g++.exe`).
- **Remote Provider (Judge0 CE):** Successfully reached `https://ce.judge0.com/`. Verified real remote execution for Python 3, Java, and C++17.

---

## 3. Root Cause Analysis

1. **Disconnected Execution Loop:** The frontend was conceived as an AST visualizer for JavaScript, while the backend was written to support multi-language execution via Judge0. The two layers were never wired together.
2. **Missing UI Controls:** No UI controls existed for language selection, stdin provisioning, or pure execution mode (Run vs Run & Trace).
3. **Trace vs Execute Disconnect:** Tracing requires an AST or debugger stepping engine (currently only implemented for JS), whereas execution requires a runtime compiler/interpreter. These two concepts must be clearly decoupled in both UI and backend contracts.

---

## 4. Remediation Plan

1. **Add Language Selector in `StudioWorkspace.jsx`:** Support `javascript`, `python`, `java`, and `cpp` with starter code templates and syntax mode switching.
2. **Decouple Run and Run & Trace:**
   - **Run:** Submits code + stdin to `/api/v1/execution` for any of the 4 languages. Displays real stdout, stderr, compile errors, exit code, time, and memory in the Output tab.
   - **Run & Trace:** Retains line-by-line stepping for JavaScript, and transparently executes via backend with an explanatory notice for other languages.
3. **Implement Stdin Input Panel:** Provide a clean collapsible standard input console so users can provide stdin (e.g. for input programs).
4. **Fix Test Runner & Expand Test Suite:** Fix Windows glob in `package.json`, fix provider unconfigured test in `tests/api.test.js`, and add comprehensive multi-language verification suite in `tests/multi-language.test.js`.
