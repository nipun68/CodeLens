# Tracing Security & Resource Boundaries

**CodeLens — Program Intelligence Platform**

---

## 1. Security Architecture

All code execution and trace collection in CodeLens occurs within isolated sandbox boundaries. CodeLens enforces strict defense-in-depth measures to prevent untrusted user code from harming the host server, leaking environment secrets, or consuming unbounded client resources:

### 1.1 Remote Sandbox Execution (Judge0)
1. **Container Isolation**: User code runs inside ephemeral Docker containers without root privileges.
2. **CPU & Execution Limits**:
   - Max CPU Time: 5.0 seconds
   - CPU Extra Time: 1.0 second
   - Max Wall Time: 8.0 seconds
3. **Memory Limits**:
   - Max RAM: 128 MB (128,000 KB)
   - Max Stack: 64 MB (64,000 KB)
4. **Process & File Limits**:
   - Max File Size: 1,024 KB
   - Network Access: Denied by default in execution sandbox.

### 1.2 In-Flight Telemetry Bounding
1. **Output Truncation**: Standard output and error streams are capped at 60,000 characters to prevent DOM denial-of-service.
2. **Trace Step Caps**: Traces are capped at 1,000 events. If an infinite loop or excessive mutation occurs, execution is terminated with status `terminated` rather than exhausting browser memory.
3. **Payload Sanitization**: Line-prefixed `__CODELENS_EVENT__` lines are parsed strictly via `JSON.parse`. Any unparseable line is discarded safely without crashing the client replayer.

### 1.3 Host API Rate Limiting & Origin Protection
1. **Rate Limiting**: `executionLimiter` enforces a strict 8 executions/minute ceiling per IP to prevent denial of service.
2. **CORS & CSRF Guards**: Cross-origin POST/PATCH requests are rejected with 403 Forbidden.
3. **No Dynamic `eval` on Backend**: The Node.js Express server never executes arbitrary user strings in the main process.
