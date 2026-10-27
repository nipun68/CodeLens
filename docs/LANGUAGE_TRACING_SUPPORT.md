# Language Tracing Support Matrix

**CodeLens — Program Intelligence Platform**

---

## 1. Canonical Capability & Verification Matrix

| Language | Normal execution | Standard input/output | Error reporting | Detailed tracing | Actual integration test result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Java (OpenJDK 21)** | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified (10/10 tests passed: Tests A–G, array mutation, ArrayList, Queue, Stack, recursion, error limits, reversible scrubbing) |
| **Python 3 (3.12)** | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified (7/7 tests passed: output, math, sorting, stdin, syntax err, exception, queue) |
| **C++17 (GCC 14)** | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified (7/7 tests passed: output, math, vector sort, std::queue, syntax err, segfault, stdin) |
| **JavaScript (Node.js 20 / In-Browser)** | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified (AST stepping, queue demo, stack demo, reverse scrubbing, breakpoints) |

---

## 2. Capabilities Breakdown

| Capability | Java (OpenJDK 21) | Python 3 | C++17 (GCC 14) | JavaScript |
| :--- | :---: | :---: | :---: | :---: |
| **Execution Sandbox** | Judge0 Sandbox (OpenJDK 21) | Judge0 Sandbox (Python 3.12) | Judge0 Sandbox (GCC 14) | Node.js / Browser |
| **Source-Level Breakpoints** | Full (F9 / UI toggle & pause) | Supported | Supported | Full (F9 / UI toggle) |
| **Execution Step Events** | Full (line-by-line event log) | Full | Full | Full |
| **Current Source Line & Method** | Exact (JVM stack reflection) | AST-based | Source mapped | AST-based |
| **Local-Variable Inspection** | Full (`variables` map) | Full | Vector/Map | Full |
| **Call-Stack Inspection** | Full (Dynamic call stack frames) | Single frame | Single frame | Stack frames |
| **Method Entry & Exit Events** | Full (`methodEnter`, `methodExit`) | Function scope | Block scope | Function scope |
| **FIFO Queue Tracing** | Full (`Queue`, `ArrayDeque`, `LinkedList`) | Full (`CodeLensQueue`) | Full (`codelens::queue`) | Full (`traceQueueDemo`) |
| **LIFO Stack Tracing** | Full (`ArrayDeque`, `Stack`) | Full (`CodeLensStack`) | Full (`codelens::stack`) | Full (`traceStackDemo`) |
| **Dynamic Array / List Tracing** | Full (`int[]`, `ArrayList`, `Arrays.sort`) | Full (`CodeLensList`) | Full (`codelens::vector`) | Full (`arr` mutations) |
| **Map & Set Tracing** | Full (`HashMap`, `HashSet`) | Full (`CodeLensMap`) | Full (`codelens::map`) | Full (Objects) |
| **Standard Output Decoupling** | Clean stdout (`extractTraceFromOutput`) | Clean stdout | Clean stdout | Clean stdout |
| **Reversible State Playback** | Deterministic forward/backward scrubbing | Forward / Backward | Forward / Backward | Forward / Backward |

---

## 3. Java-Specific Tracing Architecture

### 3.1 Execution Invariants & JDI Considerations
In the stateless Judge0 container architecture, direct TCP socket connections for the Java Debug Interface (JDI) are prohibited by container security isolation. To achieve authentic, deterministic JVM execution tracing without emulated or mocked events, CodeLens employs **bytecode-level and source-level instrumentation paired with JVM stack reflection**:

1. **Source Preservation**: Normal `Run` mode passes user source code completely unmodified to `javac Main.java` and `java Main`.
2. **Trace Mode Instrumentation**: When `Run & Trace` (`mode: 'trace'`) is invoked, `prepareSourceForExecution` detects collections, arrays, scalar assignments, and recursive methods. It transparently wraps collections with subclassed implementations (`CodeLensArrayList`, `CodeLensArrayDeque`, `CodeLensHashMap`) and injects the companion runtime classes (`CodeLensTraceEmitter`, `CodeLensArray`) at the bottom of the compilation unit.
3. **Zero Line Displacement**: All instrumentation statements are appended on the exact same line as the original statement (e.g. `int a = 10; CodeLensTraceEmitter.traceVar(3, "a", a);`). User line numbers in `Main.java` remain 100% identical to the editor lines.
4. **JVM Call-Stack Reflection**: When methods or collection operations are executed, `Thread.currentThread().getStackTrace()` is dynamically inspected by the JVM runtime to discover caller classes, method names, line numbers, and stack frame depths.
5. **Clean Telemetry Separation**: Wire events prefixed by `__CODELENS_EVENT__` are separated from standard output by `extractTraceFromOutput`, ensuring `System.out.println` produces pristine terminal output.

---

## 4. Supported Subset & Current Limitations

### 4.1 Genuinely Supported
- Primitive numeric and string local variables (`int`, `double`, `long`, `boolean`, `String`).
- Primitive arrays (`int[]`, `double[]`, `Object[]`), indexed element assignment (`arr[i] = val`), and sorting (`Arrays.sort(arr)`).
- Standard Collections:
  - `java.util.ArrayList` (add, remove, set, clear).
  - `java.util.ArrayDeque` as FIFO Queue (add, remove, peek, poll) and LIFO Stack (push, pop, peek).
  - `java.util.LinkedList` (queue and deque operations).
  - `java.util.HashMap` (put, remove, clear).
  - `java.util.HashSet` (add, remove, clear).
  - Backward-compatible `CodeLensQueue<T>` and `CodeLensStack<T>`.
- Recursive and static method calls: method entry, call stack depth expansion, return value emission, and stack unwinding.
- Errors: compilation errors, runtime exceptions (e.g. `ArithmeticException`, `ArrayIndexOutOfBoundsException`), and wall-clock execution timeouts.

### 4.2 Limitations & Unsupported Subset
- **Multi-threaded Java programs**: Tracing is bounded to the main execution thread; child threads spawned via `Thread` or `ExecutorService` are not synchronized to the single-timeline tracer.
- **Custom ClassLoaders**: Classes loaded through dynamic reflection or custom URL classloaders do not have companion instrumentation classes injected.
- **Native JNI Methods**: Execution inside compiled C/C++ native libraries is opaque to the JVM stack tracker.
