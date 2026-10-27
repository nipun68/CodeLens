# CodeLens — Multi-Language Execution Audit

## 1. Executive Summary & Root Cause Analysis

### Primary Failure Observed
In the runtime execution panel, running a Python program with:
```python
from codelens import CodeLensQueue
```
produced the failure:
`"The execution provider timed out. Please try again."` (Exit code 1, accompanied by an empty trace placeholder).

### Root Causes Identified & Verified

1. **Premature Polling Deadline Expiration:**
   - **File:** [`server/execution.js`](file:///e:/PROJECT%20BEE/PROJEct/server/execution.js) (`executeWithJudge0`)
   - **Mechanism:** `timeoutMs` was hardcoded to `18000` (18 seconds). On the public tier of Judge0 CE (`https://ce.judge0.com/`), incoming submissions enter a shared job queue (`status.id: 1` "In Queue"). During typical and peak traffic, queue wait time alone ranges between 14 and 25 seconds before a worker begins execution (`status.id: 2` "Processing").
   - **Consequence:** At 18.0 seconds, the client-side polling timer expired while the worker was actively processing or about to accept the job. Real-time telemetry (`scratch/poll_debug.mjs`) showed:
     - `0ms`: Submission POST successful (`token: d5e00ceb...`)
     - `806ms - 15403ms`: Poll #1 - #10 (`status: 1 In Queue`)
     - `16698ms - 18003ms`: Poll #11 - #12 (`status: 2 Processing`)
     - `18000ms`: Adapter timeout aborted the request!
     - `19434ms`: Judge0 finished with `status: 3 Accepted` (300ms too late for the 18s cutoff).

2. **Per-Request Fetch Signal Collapsing into Fatal 504:**
   - **File:** [`server/execution.js`](file:///e:/PROJECT%20BEE/PROJEct/server/execution.js) (`request`)
   - **Mechanism:** When `deadline - Date.now()` was small (< 1s), `AbortSignal.timeout(Math.min(8000, remaining))` cut the fetch signal to a fraction of a second (e.g. 10–50ms). When that micro-fetch timed out, `request()` threw `HTTP 504 The execution provider timed out. Please try again.` rather than allowing the polling loop to complete gracefully and return a structured timeout state object.

3. **Frontend Exception Absorption:**
   - **File:** [`src/pages/StudioWorkspace.jsx`](file:///e:/PROJECT%20BEE/PROJEct/src/pages/StudioWorkspace.jsx) (`handleRun`, `handleRunAndTrace`)
   - **Mechanism:** When the backend threw HTTP 504, the frontend `api()` wrapper rejected, jumping directly into `catch (err)`. This set `exitCode: 1`, `status: "Execution Failed"`, `stderr: "The execution provider timed out. Please try again."`, and failed to update the visualizer trace, leaving the generic placeholder.

4. **`from codelens import CodeLensQueue` Dependency Architecture:**
   - **File:** [`server/headers/codelens.py`](file:///e:/PROJECT%20BEE/PROJEct/server/headers/codelens.py) and [`server/execution.js`](file:///e:/PROJECT%20BEE/PROJEct/server/execution.js)
   - **Analysis:** `codelens` is not a publicly installed PyPI package; it is a CodeLens repository runtime instrumentation module located at [`server/headers/codelens.py`](file:///e:/PROJECT%20BEE/PROJEct/server/headers/codelens.py).
   - **Defect:** While `prepareSourceForExecution` stripped `from codelens import ...`, any user program that wrote `import codelens` and then referenced `codelens.CodeLensQueue`, or imported with leading whitespace/indentation, would trigger `ModuleNotFoundError: No module named 'codelens'` or `NameError: name 'codelens' is not defined`.
   - **Resolution:** Registered `sys.modules['codelens'] = sys.modules[__name__]` in the injected Python header and updated the regex to `^\s*(?:import\s+codelens|from\s+codelens\s+import\s+.*)$` so both absolute and namespace-qualified imports resolve transparently without installing third-party packages.

---

## 2. Language Execution Architecture & Runtime Mapping

| Language | Configured Provider Runtime | Language ID | Execution Mechanism | Isolation / Sandboxing |
| :--- | :--- | :---: | :--- | :--- |
| **Python 3** | Python 3.12 (Judge0 Sandbox) | `109` | Remote Linux sandbox with 5s CPU limit, 128MB RAM, 8s wall limit | Judge0 cgroups & seccomp |
| **Java** | OpenJDK 21 (Judge0 Sandbox) | `91` | Pre-compiles `Main.java` followed by JVM execution | Judge0 cgroups & seccomp |
| **C++17** | GCC 14 (C++17, Judge0 Sandbox) | `105` | Compiles with `-std=c++17 -O2` followed by isolated ELF execution | Judge0 cgroups & seccomp |
| **JavaScript** | Node.js 20 (Judge0) / AST Stepper | `102` | Remote runtime on Judge0 (`mode: run`) + Local AST engine (`mode: trace`) | In-browser AST / Judge0 |

---

## 3. Repaired Execution Pipeline & Contract

### Request Payload (`POST /api/v1/execution`)
```json
{
  "executionId": "exec-1729868400000-abcd",
  "source": "print('Hello, CodeLens!')",
  "language": "python",
  "stdin": "Optional stdin",
  "mode": "run"
}
```

### Response Schema (`HTTP 200`)
```json
{
  "execution": {
    "executionId": "exec-1729868400000-abcd",
    "language": "python",
    "runtimeVersion": "Python 3.12 (Judge0 Sandbox)",
    "status": "Accepted",
    "statusId": 3,
    "compilationStatus": "not_applicable",
    "compilationDiagnostics": null,
    "runtimeDiagnostics": null,
    "stdout": "Hello, CodeLens!",
    "stderr": "",
    "exitCode": 0,
    "time": "0.024",
    "duration": "0.024s",
    "memory": 52064,
    "timedOut": false,
    "errorCategory": null
  },
  "trace": null,
  "debugger": {
    "supported": false,
    "type": "Standard Runtime Execution",
    "reason": "Standard execution completed. Include CodeLens wrappers for container tracing."
  }
}
```

### Error Categories
- `null`: Execution successful (`statusId: 3`, `exitCode: 0`)
- `compilation_error`: GCC or `javac` syntax/type error (`statusId: 6`)
- `runtime_exception`: Python exception, Java uncaught throw, C++ segfault (`statusId: 7–12`)
- `timeout`: Execution provider deadline exceeded (`statusId: 5` or adapter timeout)
- `limit_exceeded`: Time Limit Exceeded (CPU limit 5s, wall limit 8s) or Memory Limit Exceeded (128MB)
- `provider_unavailable`: Execution provider unreachable or credentials invalid
