# Data Structure Instrumentation & Compatibility Wrappers

**CodeLens — Program Intelligence Platform**

---

## 1. Design Invariants

1. **Authentic Operations Only**: Tracing wrappers delegate storage and algorithms to actual underlying standard-library collections (`std::deque`, `std::vector`, `std::map` in C++; `collections.deque` and `list` in Python; `java.util.ArrayDeque`, `java.util.ArrayList`, and `java.util.HashMap` in Java).
2. **No Phantom State**: If an operation is not performed, no event is created. If a container is empty, the visualizer shows an empty container. For arithmetic-only programs, the UI renders the active execution state and variables rather than an unrelated array.
3. **Transparent Serialization**: Data structure states are serialized to JSON without side effects or mutating internal container pointers.

---

## 2. Java Standard Library & Collection Wrappers (`CodeLensTrace.java`)

Compilation unit: `server/headers/CodeLensTrace.java`  
Supported imports: `java.util.ArrayList`, `java.util.ArrayDeque`, `java.util.Queue`, `java.util.LinkedList`, `java.util.HashMap`, `java.util.HashSet`, `java.util.Arrays`

### 2.1 Primitive Array Instrumentation (`CodeLensArray`)
- **Tracked Operations**:
  - `CodeLensArray.track(line, id, arr, desc)`: Emits array initialization event and baseline snapshot `[val0, val1, ...]`.
  - `CodeLensArray.assign(line, id, arr, index, value)`: Emits element mutation event with updated snapshot.
  - `CodeLensArray.sort(line, id, arr)`: Emits sort event with reordered snapshot.
- **Visualizer Mapping**: Renders indexed array cells with highlight indicators for mutated indices.

### 2.2 `CodeLensArrayList<T>`
- **Inheritance**: Subclasses `java.util.ArrayList<T>`.
- **Observed Operations**:
  - `add(T item)` / `add(int index, T element)`: Appends or inserts element; captures list snapshot.
  - `remove(int index)` / `remove(Object o)`: Removes element; captures remaining elements.
  - `set(int index, T element)`: Replaces element at index.
  - `clear()`: Empties collection.
- **Output Compatibility**: Overrides standard methods cleanly; `System.out.println(values)` outputs identical standard string representation.

### 2.3 `CodeLensArrayDeque<T>` (Dual Queue / Stack Adapter)
- **Inheritance**: Subclasses `java.util.ArrayDeque<T>`; implements both `Queue<T>` and `Deque<T>`.
- **FIFO Queue Operations**:
  - `add(item)` / `offer(item)`: Enqueues item at rear.
  - `remove()` / `poll()`: Dequeues item from front.
  - `peek()` / `element()`: Inspects front item.
- **LIFO Stack Operations**:
  - `push(item)`: Pushes item onto stack top.
  - `pop()`: Pops item from stack top.
  - `peek()`: Inspects top item.
- **Visualizer Mapping**: Queue operations activate the FIFO conveyor visualizer; stack operations activate the LIFO vertical stack visualizer.

### 2.4 `CodeLensHashMap<K, V>`
- **Inheritance**: Subclasses `java.util.HashMap<K, V>`.
- **Observed Operations**:
  - `put(K key, V value)`: Inserts or replaces key-value pair.
  - `remove(Object key)`: Removes key entry.
  - `clear()`: Clears map.
- **Visualizer Mapping**: Activates the key-value card grid visualizer.

### 2.5 `CodeLensHashSet<T>`
- **Inheritance**: Subclasses `java.util.HashSet<T>`.
- **Observed Operations**:
  - `add(T item)`: Inserts set member.
  - `remove(Object o)`: Deletes set member.
- **Visualizer Mapping**: Renders unique element set chips.

### 2.6 Binary Trees (`CodeLensTreeNode<T>`)
- **Structure**: Explicit generic node with `val`, `left`, `right`.
- **Operations**: `insert(val)`, recursive tree construction.
- **Serialization**: Serializes hierarchical JSON `{ "val": ..., "left": ..., "right": ... }`.

### 2.7 Execution State & Method Calls (`CodeLensTraceEmitter`)
- **Call-Stack Management**: `pushFrame(frameName)`, `popFrame()`, `getCallStack()`.
- **Method Entry/Exit**: `methodEnter(method, line, frameName, paramName, val)`, `methodExit(method, line, returnVal)`.
- **Local Variables**: `traceVar(line, name, val)` for scalar primitive variables (`a = 10`, `b = 20`, `sum = 30`).

---

## 3. C++17 Standard Library Wrappers (`codelens.hpp`)

Header path: `server/headers/codelens.hpp`  
Usage in C++: `#include "codelens.hpp"`

- **`codelens::queue<T>`**: Wraps `std::deque<T>` (push, pop, front, back, size).
- **`codelens::stack<T>`**: Wraps `std::vector<T>` (push, pop, top, size).
- **`codelens::vector<T>`**: Wraps `std::vector<T>` (push_back, pop_back, operator[], iterators).
- **`codelens::map<K, V>`**: Wraps `std::map<K, V>` (insert_or_assign, operator[], erase).

---

## 4. Python 3 Wrappers (`codelens.py`)

Module path: `server/headers/codelens.py`  
Usage in Python: `from codelens import CodeLensQueue, CodeLensStack, CodeLensList, CodeLensMap`

- **`CodeLensQueue`**: Wraps `collections.deque`; supports `.push()`, `.append()`, `.pop()`, `.popleft()`, `.front()`.
- **`CodeLensStack`**: Wraps Python `list`; supports `.push()`, `.pop()`, `.top()`, `.peek()`.
- **`CodeLensList`**: Subclasses `list`; emits mutation events on `append`, `pop`, and item assignment.
- **`CodeLensMap`**: Subclasses `dict`; emits mutation events on item assignment and `pop`.
