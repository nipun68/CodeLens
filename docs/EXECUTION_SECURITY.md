# CodeLens Code Execution Security Architecture

## 1. Threat Model & Principles

CodeLens accepts arbitrary, untrusted user-submitted source code in Python, Java, C++, and JavaScript.

**Primary Principle:**
*Untrusted user code is NEVER executed inside the main Express Node.js application process or host operating system directly.*

Executing arbitrary source code on the web-server process introduces critical vulnerabilities:
- Remote code execution (RCE)
- Denial of Service via unbounded memory or CPU consumption
- File system access and credential theft (`.env`, secrets, session tokens)
- Network scanning and SSRF (Server-Side Request Forgery)
- Host process termination and socket hijack

---

## 2. Isolation Architecture

Execution requests are delegated to a sandboxed execution runtime (Judge0 CE / isolated worker containers) that enforces strict container and kernel-level cgroups boundaries.

```
[ User Browser ]
       │  (HTTPS POST /api/v1/execution)
       ▼
[ CodeLens Express Server ]
   ├── Input Validation (char & byte caps, rate limits, session auth)
   ├── AbortController (closes execution on client disconnect)
   │
   └── Isolated Provider Call (HTTPS to Judge0 Provider)
            │
            ▼
     [ Judge0 Container Sandbox ]
        ├── cgroups v2 resource limits
        ├── Linux namespaces (PID, IPC, UTS, Mount, Net)
        ├── Isolated ephemeral mount (read-only rootfs)
        ├── Network disabled
        └── Seccomp syscall filtering
```

---

## 3. Enforced Resource Limits & Constraints

| Parameter | Limit | Enforcement Point | Purpose |
| :--- | :--- | :--- | :--- |
| **Source Code Size** | 30,000 characters / 30 KB | Express API Validator | Prevents buffer exhaustion & compiler denial of service |
| **Standard Input Size** | 10,000 characters / 10 KB | Express API Validator | Bounds input payload size |
| **CPU Time Limit** | 5 seconds | Judge0 Sandbox cgroups | Prevents infinite loops (`while True: pass`) |
| **Wall Clock Timeout** | 8 seconds | Judge0 Sandbox / Backend deadline | Bounds total elapsed execution duration |
| **Memory Limit** | 128 MB (128,000 KB) | Judge0 Sandbox cgroups | Prevents memory allocation attacks |
| **Stack Limit** | 64 MB (64,000 KB) | Judge0 Sandbox | Prevents stack exhaustion via deep recursion |
| **Maximum File Size** | 1,024 KB | Judge0 Sandbox | Limits compiler artifact and output write size |
| **Output Truncation** | 60,000 characters | `server/execution.js` | Prevents browser DOM freezing & memory leaks |
| **Rate Limiting** | 160 requests / minute | `express-rate-limit` | Mitigates API flooding and automated abuse |
| **Network Access** | Blocked | Container isolation | Prevents outbound connections, port scanning, data exfiltration |

---

## 4. Credentials & Secret Hygiene

- **Backend-Only Secrets:** Environment variables (`JUDGE0_API_KEY`, `STRIPE_SECRET_KEY`, `JWT_SECRET`) reside exclusively on the server and are never exposed to the client bundle or output payload.
- **Provider Error Sanitization:** If the execution provider returns an internal HTTP 500 error or stack trace, the backend returns a sanitized error message (`Could not connect to the configured execution provider` / `The execution provider returned an invalid response`), concealing provider internal URLs, headers, or tokens.
- **Cancellation & Cleanup:** If the client disconnects or closes the browser tab before execution finishes, `res.on('close')` aborts the upstream request via `AbortController`, freeing provider resources immediately.
- **Workspace Isolation:** Submissions use unique UUID tokens. No execution workspace or temporary compilation artifact is shared between concurrent users.
