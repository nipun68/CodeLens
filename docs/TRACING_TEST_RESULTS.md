# Tracing Test Results & Output Equivalence

**CodeLens — Program Intelligence Platform**  
**Test Suites:** `tests/java-tracing.test.js`, `tests/multilanguage-execution.test.js`, `tests/execution.test.js`  
**Execution Environment:** OpenJDK 21 (Judge0 Sandbox)  
**Execution Date:** October 2026

---

## 1. Test Summary Matrix

| Test Case | Description | Expected Output | Actual Output | Line Mapping | Variables / Snapshots Captured | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **Test A** | Arithmetic & Primitive Locals | `30` | `30` | Lines 3, 4, 5 | `{ a: 10, b: 20, sum: 30 }` | **PASS** |
| **Test B** | Array Mutation & Sort | `[1, 2, 9]` | `[1, 2, 9]` | Lines 5, 6, 7 | `[5, 2, 9]` → `[1, 2, 9]` → `[1, 2, 9]` | **PASS** |
| **Test C** | `ArrayList` Add & Remove | `[10, 30]` | `[10, 30]` | Lines 5, 6, 7, 8, 9 | `[]` → `[10]` → `[10, 20]` → `[10, 20, 30]` → `[10, 30]` | **PASS** |
| **Test D** | `Queue` FIFO (`ArrayDeque`) | `10`<br>`[20, 30]` | `10`<br>`[20, 30]` | Lines 6, 7, 8, 9, 11, 12 | FIFO progression; peek=10; final=`[20, 30]` | **PASS** |
| **Test E** | `Stack` LIFO (`ArrayDeque`) | `30`<br>`[20, 10]` | `30`<br>`[20, 10]` | Lines 5, 6, 7, 8, 10, 11 | LIFO progression; peek=30; final=`[20, 10]` | **PASS** |
| **Test F** | Factorial Recursion | `24` | `24` | Lines 2, 3, 4, 7 | Depth 4 call stack; unwind on returns | **PASS** |
| **Test G1** | Syntax Error | Compile Diagnostic | `Compilation Error` | Accurate | Compiler diagnostics captured | **PASS** |
| **Test G2** | Runtime Exception (10/0) | ArithmeticException | `Runtime Error (NZEC)` | Accurate | `java.lang.ArithmeticException: / by zero` | **PASS** |
| **Test G3** | Execution Timeout | Timeout status | `timeout` | N/A | Process terminated by sandbox deadline | **PASS** |
| **Scrubbing**| Reversible Navigation | State at step N | Deterministic | Exact | Step 1, 2, 3 forward & backward match | **PASS** |

---

## 2. Output Equivalence Evidence

### Test A — Arithmetic Local Variables
```java
public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        int sum = a + b;
        System.out.println(sum);
    }
}
```
- **Standard Execution Output**: `30`
- **Traced Execution Output**: `30`
- **Verified Variables Snapshot**: `{ a: 10, b: 20, sum: 30 }`
- **UI Behavior**: Primitive variables strip displays `a = 10`, `b = 20`, `sum = 30` without any phantom array card.

### Test B — Array Mutation & Arrays.sort
```java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] arr = {5, 2, 9};
        arr[0] = 1;
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr));
    }
}
```
- **Standard Execution Output**: `[1, 2, 9]`
- **Traced Execution Output**: `[1, 2, 9]`
- **Snapshots Observed**:
  1. `Initialized array arr = [5, 2, 9]` at line 5
  2. `arr[0] = 1` yielding snapshot `[1, 2, 9]` at line 6
  3. `Arrays.sort(arr)` yielding snapshot `[1, 2, 9]` at line 7

### Test C — ArrayList Operations
```java
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> values = new ArrayList<>();
        values.add(10);
        values.add(20);
        values.add(30);
        values.remove(1);
        System.out.println(values);
    }
}
```
- **Standard Execution Output**: `[10, 30]`
- **Traced Execution Output**: `[10, 30]`
- **Snapshots Observed**:
  - `add(10)`: `[10]`
  - `add(20)`: `[10, 20]`
  - `add(30)`: `[10, 20, 30]`
  - `remove(1)`: `[10, 30]`

### Test D — Queue FIFO
```java
import java.util.ArrayDeque;
import java.util.Queue;

public class Main {
    public static void main(String[] args) {
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(10);
        queue.add(20);
        queue.add(30);

        System.out.println(queue.peek());
        queue.remove();
        System.out.println(queue);
    }
}
```
- **Standard Execution Output**: `10\n[20, 30]`
- **Traced Execution Output**: `10\n[20, 30]`
- **Snapshots Observed**: `[10]` → `[10, 20]` → `[10, 20, 30]` → peek: 10 → `remove()` front: `[20, 30]`

### Test E — Stack LIFO
```java
import java.util.ArrayDeque;

public class Main {
    public static void main(String[] args) {
        ArrayDeque<Integer> stack = new ArrayDeque<>();
        stack.push(10);
        stack.push(20);
        stack.push(30);

        System.out.println(stack.peek());
        stack.pop();
        System.out.println(stack);
    }
}
```
- **Standard Execution Output**: `30\n[20, 10]`
- **Traced Execution Output**: `30\n[20, 10]`
- **Snapshots Observed**: `[10]` → `[20, 10]` → `[30, 20, 10]` → peek: 30 → `pop()` top: `[20, 10]`

### Test F — Recursive Factorial & Call Stack
```java
public class Main {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    public static void main(String[] args) {
        int result = factorial(4);
        System.out.println(result);
    }
}
```
- **Standard Execution Output**: `24`
- **Traced Execution Output**: `24`
- **Max Stack Frames Captured**:
  1. `factorial(n=1)` [ACTIVE]
  2. `factorial(n=2)`
  3. `factorial(n=3)`
  4. `factorial(n=4)`
  5. `main()`
- **Return Unwinding**: Returns 1 → 2 → 6 → 24.
