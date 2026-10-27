# Hybrid Tracing & Data Structure Visualization Audit

**CodeLens — Program Intelligence Platform**  
**Audit Date:** October 2026  
**Auditor:** Principal Compiler & Debugger Engineer, Systems Tooling Specialist

---

## 1. Executive Summary

An audit of CodeLens was conducted to evaluate execution tracing and data structure visualization fidelity across all four supported languages: **JavaScript**, **Python 3**, **Java (OpenJDK)**, and **C++17 (GCC 14)**.

### Key Findings
1. **Stale Trace Pollution**: When switching languages or executing non-JavaScript code, `StudioWorkspace.jsx` retained the initial JavaScript bubble-sort trace (`trace.steps`). The live visualization banner and variables tab continued displaying phantom array cells (`arr = [5, 2, 9, 1, 5, 6]`) even during C++ or Python execution.
2. **Missing Runtime Container Visibility**: Standard debugging tools and isolated execution containers (Judge0) return process streams (`stdout`, `stderr`, `compile_output`) and resource metrics (`time`, `memory`, `exit_code`), but do not expose discrete mutation operations (such as `push()`, `pop()`, `insert()`, `enqueue()`, `dequeue()`) inside language standard library containers (`std::queue`, `std::stack`, `std::vector`, `std::map`, `java.util.ArrayDeque`, `collections.deque`).
3. **Hardcoded Algorithm Simulators**: `src/tracer.js` relied primarily on hardcoded step generators for a handful of algorithm patterns (Bubble Sort, Binary Search, Linear Search, Selection Sort, Insertion Sort). Custom scripts received only a shallow AST line walker without container state tracking.
4. **Disconnected Execution vs. Tracing**: The "Run" button executed code via Judge0, whereas "Run & Trace" branched on `language === 'javascript'`. For Python, Java, and C++, "Run & Trace" simply fell back to "Run", leaving the trace timeline empty or stale.

---

## 2. Component-by-Component Assessment

| Component | Current Implementation | Capabilities | Gaps & Deficiencies |
| :--- | :--- | :--- | :--- |
| **Language Selector** | `StudioWorkspace.jsx` | Tabs for JS, PY, JAVA, C++; caches code per language | Switching language does not invalidate stale trace state; trace remains set to initial JS algorithm |
| **JavaScript Tracer** | `src/tracer.js` (Acorn AST + hardcoded algorithms) | Generates exact step sequences for predefined algorithms; line-by-line fallback for custom JS | Cannot trace complex mutations across data structures; custom scripts lack variable snapshotting |
| **Python Execution** | `server/execution.js` (Judge0 lang ID 109) | Full Python 3 runtime execution; standard input; syntax diagnostics | No trace events emitted; mutations inside lists, deques, and dicts are opaque |
| **Java Execution** | `server/execution.js` (Judge0 lang ID 91) | OpenJDK compilation & execution; error diagnostics; stdin | No JVM debugging hooks; `ArrayList`, `Stack`, `Queue` internal operations unobserved |
| **C++17 Execution** | `server/execution.js` (Judge0 lang ID 105) | GCC 14 compilation & execution; compiler diagnostics; stdin | Standard library containers (`std::queue`, `std::stack`, `std::vector`, `std::map`) have no reflection; operations unobserved |
| **State Synchronization** | React local state in `StudioWorkspace` | Forward/backward scrubbing on existing step array | No execution identity tracking; stale traces from previous executions survive; no state delta reconstruction |
| **Visualization Components** | Array track (`vis-array-track`) | Visualizes flat numerical arrays with compare/swap states | Only visualizes 1D arrays named `arr`; completely lacks visualizers for Stacks, Queues, Maps, Trees, or Primitives |

---

## 3. Root Cause Analysis

### 3.1 The Stale Trace Bug
In `src/pages/StudioWorkspace.jsx`:
```javascript
const [trace, setTrace] = useState(() => traceBubbleSort());
...
const handleSelectLanguage = (newLang) => {
  ...
  setExecutionResult(null);
  if (newLang === 'javascript') {
    const res = traceJavaScriptCode(nextCode);
    setTrace(res);
    setCurrentStepIndex(0);
  }
  // BUG: If newLang !== 'javascript', setTrace is NOT called!
  // trace remains set to the old traceBubbleSort() steps!
};
```
Furthermore, `handleRun()` sets `executionResult` but never clears or updates `trace`, so the visualization timeline displays JavaScript bubble sort while the Output tab displays C++ compiler output.

### 3.2 The Invisible Container Limitation
Standard-library containers in compiled languages (C++ `std::queue`, `std::stack`, Java `java.util.ArrayDeque`) encapsulate their internal buffers (`std::deque` or object arrays). In remote sandbox execution:
- Pretty-printers only format state when paused at an active breakpoint inside an interactive GDB session; they cannot capture an event stream of every mutation.
- Regex source rewriting is unsafe and brittle for C++ templates, type aliases, and nested containers.
- **Solution Required**: An explicit, zero-dependency, header-only tracing wrapper library (`codelens/trace.hpp` for C++, Python tracer helper, Java trace wrapper) that wraps the real underlying containers, executes authentic operations, and serializes normalized trace events to a delimited stream without fabricating events or altering semantics.

### 3.3 The Phantom Array Visualizer
In `StudioWorkspace.jsx`:
```jsx
{currentStep?.variables?.arr && (
  <div className="vis-array-track">...</div>
)}
```
If code does not define an array named `arr` (e.g. arithmetic, queues, trees, or stacks), either the visualizer goes completely blank or—if a stale trace is present—renders the leftover `arr` from Bubble Sort.
**Solution Required**: Dynamic data-structure-aware visualizers:
- **Stack Visualizer**: Vertical container with `TOP` indicator, push/pop animations.
- **Queue Visualizer**: Horizontal conveyor with `FRONT` and `BACK` indicators.
- **Vector / Array Visualizer**: Indexed linear cells with compare/swap/highlight states.
- **Map / Dictionary Visualizer**: Key-value table cards with lookup and insertion states.
- **Primitive Inspector**: Scalar variable cards when no collections are active.

---

## 4. Architecture Requirements for Hybrid Tracing Engine

1. **Shared Trace-Event Schema**: Canonical JSON structure with `executionId`, `language`, `step`, `sourceLine`, `statement`, `dataStructureId`, `dataStructureType`, `operation`, `value`, `stateSnapshot`, `variables`, `description`, `callStack`.
2. **Deterministic State Reconstruction Engine**: Ordered state deltas and snapshot checkpoints supporting reversible stepping (forward, backward, jump-to-step) without fabricating unobserved intermediate states.
3. **Language Tracing Adapters**:
   - **C++17**: `#include "codelens.hpp"` providing `codelens::queue<T>`, `codelens::stack<T>`, `codelens::vector<T>`, `codelens::map<K, V>`.
   - **Python 3**: `CodeLensQueue`, `CodeLensStack`, `CodeLensList`, `CodeLensMap` runtime instrumentation.
   - **Java**: `CodeLensQueue<T>`, `CodeLensStack<T>`, `CodeLensList<T>`, `CodeLensMap<K, V>` wrapper classes.
   - **JavaScript**: Real in-browser tracer supporting arrays, stacks, queues, and custom statements.
4. **Execution Identity & Stale State Annihilation**: Every run generates a unique `executionId`; old traces are cleared immediately on language switch or code change.
5. **Transparent UI Status**: Clear labeling of trace fidelity (e.g. "Instrumented Container Tracing (C++17)", "AST Stepping (JavaScript)", or "Standard Runtime (Uninstrumented)").
