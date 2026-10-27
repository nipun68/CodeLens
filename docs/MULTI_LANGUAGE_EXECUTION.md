# CodeLens Multi-Language Execution Architecture

## 1. Overview

CodeLens supports multi-language execution across four primary languages:
- **Python 3** (Language ID 109, Python 3.11.2+)
- **Java** (Language ID 91, OpenJDK 17.0.6+)
- **C++17** (Language ID 105, GCC 14.1.0+ with `-std=c++17`)
- **JavaScript** (Language ID 102, Node.js 20.18.0+)

The platform decouples **pure runtime execution** from **client-side AST tracing**:
- **Run (Execution):** Dispatches the source code, standard input (`stdin`), and selected language to the isolated backend execution endpoint (`/api/v1/execution`). Execution occurs within an isolated, resource-constrained sandbox. Results (standard output, standard error, compiler diagnostics, execution time, memory usage, exit code) are returned to the client and rendered in the Output panel.
- **Run & Trace:** For JavaScript, runs the in-browser AST interpreter (`src/tracer.js`), capturing step-by-step variable changes, call stacks, loop iterations, and array visualizer state. For Python, Java, and C++, informs the user that source-level AST stepping is currently active for JavaScript and executes the program via the isolated runtime provider.

---

## 2. Supported Languages & Toolchains

| Language | Language ID | Compiler / Runtime | Entry Point / Conventions |
| :--- | :--- | :--- | :--- |
| **JavaScript** | `102` | Node.js 20.18.0+ | Top-level code or functions; uses `console.log()` |
| **Python 3** | `109` | Python 3.11.2 / 3.12+ | Top-level script or `def main()`; uses `print()` and `input()` |
| **Java** | `91` | OpenJDK 17.0.6 / 21+ | `public class Main { public static void main(String[] args) { ... } }` |
| **C++17** | `105` | GCC 14.1.0+ (`-std=c++17`) | `int main() { ... }` with `#include <iostream>`, `<vector>`, etc. |

---

## 3. Execution API Specification

### Endpoint: `POST /api/v1/execution` (also aliased as `/api/execution`)
**Headers:**
- `Content-Type: application/json`
- `Cookie: devpulse_session=...` (or guest session cookie)

**Request Body:**
```json
{
  "source": "string (1-30,000 characters, max 30 KB)",
  "language": "python" | "java" | "javascript" | "cpp",
  "stdin": "string (optional, 0-10,000 characters, max 10 KB)"
}
```

**Response Body (HTTP 200 OK):**
```json
{
  "execution": {
    "language": "python",
    "status": "Accepted",
    "statusId": 3,
    "stdout": "Sorted: [1, 2, 5, 5, 6, 9]\n",
    "stderr": "",
    "compileOutput": null,
    "runtimeError": null,
    "exitCode": 0,
    "time": "0.024",
    "duration": "0.024s",
    "memory": 12460,
    "timedOut": false
  },
  "debugger": {
    "supported": false,
    "reason": "Judge0 execution does not expose source-level breakpoints, variable snapshots, or call stacks."
  }
}
```

### Response Status Definitions:
- `Accepted` (`statusId: 3`): Program executed and completed with exit code 0 or normal termination.
- `Compilation Error` (`statusId: 6`): Compiler diagnostics captured in `compileOutput`.
- `Time Limit Exceeded` (`statusId: 5`): Program exceeded CPU or wall-clock budget.
- `Runtime Error (SIGSEGV/NZEC/etc.)` (`statusId: 7..12`): Runtime exception or crash captured in `stderr`.

---

## 4. Frontend Integration in Studio Workspace

### 4.1 Language Selector
Located in the editor header bar (`studio-filename-area`), providing instant switching between:
- `JS` (`main.js`)
- `PY` (`main.py`)
- `JAVA` (`Main.java`)
- `C++` (`main.cpp`)

State is cached per language (`codeCache`), ensuring that switching between languages does not lose user edits.

### 4.2 Standard Input (stdin)
The Output panel contains an embedded, non-obtrusive `STANDARD INPUT (STDIN)` console. Users can provide input before clicking **Run**. Programs using `input()` in Python, `Scanner` in Java, or `cin` in C++ receive this input synchronously without hanging.

### 4.3 Output & Diagnostics Panel
- **Status Header:** Displays status pill (green `SUCCESS`, red `COMPILATION ERROR`, amber `RUNTIME ERROR`, orange `TIMEOUT`), execution duration, memory consumption in KB, and exit code.
- **Compiler Diagnostics:** Rendered in a dedicated error banner with compiler messages, line numbers, and error descriptions.
- **Runtime Error Display:** Segregated from standard program output.
- **Standard Output Terminal:** Renders the exact text produced by `print`, `System.out.println`, `cout`, or `console.log`.

---

## 5. Local Setup & Configuration

1. Set the execution provider URL in `.env`:
   ```env
   JUDGE0_URL=https://ce.judge0.com/
   ```
2. (Optional) If using RapidAPI or an authenticated private Judge0 instance:
   ```env
   JUDGE0_API_KEY=your_api_key_here
   JUDGE0_AUTH_HEADER=X-Auth-Token  # or X-RapidAPI-Key
   JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
