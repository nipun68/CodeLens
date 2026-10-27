# CodeLens Shared Trace-Event Schema

**Specification Version:** 1.0.0  
**Scope:** JavaScript, Python 3, Java (OpenJDK), C++17 (GCC)

---

## 1. Overview

The CodeLens Shared Trace-Event Schema defines the universal serialization contract for runtime execution events and data structure operations across all supported languages. 

To prevent fabricated events and ensure absolute visualization fidelity:
- Every event corresponds directly to an executed source statement or an observed container mutation.
- The schema explicitly separates **real debugger events**, **instrumented data structure operations**, **captured runtime snapshots**, and **derived visual states**.
- Output streams (`stdout` / `stderr`) are cleanly decoupled from structured trace telemetry.

---

## 2. Event Structure

Each step in a trace is a JSON object adhering to the following interface:

```typescript
interface CodeLensTraceEvent {
  /** Unique identifier for the execution run (UUID v4) */
  executionId: string;

  /** Programming language of the executing artifact */
  language: 'javascript' | 'python' | 'java' | 'cpp';

  /** 1-based sequential step index */
  step: number;

  /** Classification of the execution event */
  eventType: 
    | 'init'        // Initialization of variable or data structure
    | 'operation'   // Explicit mutation (push, pop, enqueue, dequeue, insert, etc.)
    | 'compare'     // Comparison between elements or boundary condition check
    | 'assign'      // Memory assignment or variable mutation
    | 'loop'        // Loop boundary evaluation
    | 'call'        // Function / method invocation
    | 'return'      // Return from function
    | 'log'         // Standard stream output emission
    | 'error'       // Runtime exception or error
    | 'end';        // Normal termination of execution

  /** 1-based line number in user's original source code */
  sourceLine: number;

  /** 1-based column number in source code (optional) */
  sourceColumn?: number;

  /** Source statement text associated with this event */
  statement: string;

  /** Current executing function context (e.g. 'main()', 'quicksort()') */
  functionName: string;

  /** Active call stack frames from outermost to innermost */
  callStack: string[];

  /** Identifier of the data structure being inspected or modified (e.g. 'q', 'stack', 'nums') */
  dataStructureId?: string;

  /** Category of the data structure for visualizer binding */
  dataStructureType?: 
    | 'queue'       // FIFO queue or deque
    | 'stack'       // LIFO stack
    | 'vector'      // Contiguous dynamic array (vector / list / ArrayList)
    | 'map'         // Key-value associative container (map / dict / HashMap)
    | 'set'         // Unique key set
    | 'heap'        // Priority queue / heap
    | 'primitive'   // Scalar values (int, float, string, boolean)
    | 'custom';     // Custom object or graph

  /** Concrete mutating or query operation observed */
  operation?: 
    | 'push' 
    | 'pop' 
    | 'enqueue' 
    | 'dequeue' 
    | 'front' 
    | 'top' 
    | 'set' 
    | 'get' 
    | 'insert' 
    | 'erase' 
    | 'compare' 
    | 'swap' 
    | 'clear';

  /** Operand or item value involved in the operation */
  value?: any;

  /** Complete verified snapshot of the data structure immediately after this event */
  stateSnapshot?: any;

  /** Delta describing the change from the prior step (optional) */
  stateDelta?: {
    added?: any[];
    removed?: any[];
    modified?: Record<string, any>;
  };

  /** Complete dictionary of active scalar variables in current scope */
  variables: Record<string, any>;

  /** Human-readable explanation of the state change for educational display */
  description: string;

  /** Cumulative execution time in milliseconds at this step */
  elapsedMs?: number;

  /** Health and safety status of this event */
  status: 'ok' | 'error' | 'terminated';
}
```

---

## 3. Delimited Wire Protocol for Remote Runtimes

When programs execute inside isolated sandboxes (such as Judge0 Docker containers for Python, Java, and C++), structured trace events are streamed to standard output surrounded by deterministic guard delimiters:

```text
__CODELENS_TRACE_START__
{"step":1,"line":4,"type":"init","dsId":"q","dsType":"queue","op":"init","snapshot":[],"desc":"Queue initialized: []"}
{"step":2,"line":5,"type":"operation","dsId":"q","dsType":"queue","op":"push","val":10,"snapshot":[10],"desc":"q.push(10) -> [10]"}
{"step":3,"line":6,"type":"operation","dsId":"q","dsType":"queue","op":"push","val":20,"snapshot":[10,20],"desc":"q.push(20) -> [10, 20]"}
{"step":4,"line":7,"type":"operation","dsId":"q","dsType":"queue","op":"pop","val":10,"snapshot":[20],"desc":"q.pop() -> removed 10, remaining [20]"}
__CODELENS_TRACE_END__
```

### Protocol Guarantees:
1. **Clean Stdout Separation**: The backend trace extractor extracts all content between `__CODELENS_TRACE_START__` and `__CODELENS_TRACE_END__`, parses the JSON lines, and strips the block entirely from the user's visible `stdout`.
2. **Payload Validation**: Any malformed JSON lines are logged as warnings and skipped without crashing execution.
3. **Safety Caps**: Traces exceeding 1,000 steps or 2 MB in total JSON size are cleanly capped with a termination notice to protect client memory.
