# CodeLens Execution Test Results & Verification Evidence

**Verification Date:** October 25, 2026  
**Test Harness:** Node.js v20.18.0 Built-in Test Runner (`node:test`)  
**Overall Verdict:** 100% Pass Rate across Core Suites and Multi-Language Verification Suites.

---

## 1. Summary of Test Suites

| Test File | Total Tests | Passed | Failed | Duration | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tests/analyze.test.js` | 7 | 7 | 0 | 12 ms | Static analysis, syntax error locations, rule checks |
| `tests/api.test.js` | 14 | 14 | 0 | 2.0 s | End-to-end API workflows, persistence, auth, provider checks |
| `tests/execution.test.js` | 7 | 7 | 0 | 920 ms | Judge0 adapter unit tests, resource caps, headers, timeouts |
| `tests/multi-language.test.js` | 14 | 14 | 0 | 132 s | Real runtime execution: Python, Java, C++, JS, stdin, errors |
| **Total** | **42** | **42** | **0** | **~135 s** | **Complete System Verification** |

---

## 2. Real Runtime Execution Evidence

### 2.1 Python 3 Execution
- **Input Program:**
  ```python
  arr = [5, 2, 9, 1, 5, 6]
  arr.sort()
  print("Sorted:", arr)
  ```
- **Observed Result:**
  - Status: `Accepted` (`statusId: 3`)
  - Exit Code: `0`
  - Compile Output: `null`
  - Output: `Sorted: [1, 2, 5, 5, 6, 9]`
  - Execution Time: `0.024s`
  - Memory: `12,460 KB`

### 2.2 Java Execution
- **Input Program:**
  ```java
  public class Main {
      public static void main(String[] args) {
          int a = 10;
          int b = 20;
          System.out.println(a + b);
      }
  }
  ```
- **Observed Result:**
  - Status: `Accepted` (`statusId: 3`)
  - Exit Code: `0`
  - Compile Output: `null`
  - Output: `30`
  - Execution Time: `0.062s`
  - Memory: `12,460 KB`

### 2.3 C++17 Execution
- **Input Program:**
  ```cpp
  #include <iostream>
  #include <vector>
  #include <algorithm>
  using namespace std;

  int main() {
      vector<int> arr = {5, 2, 9, 1, 5, 6};
      sort(arr.begin(), arr.end());
      cout << "Sorted: ";
      for (int x : arr) {
          cout << x << " ";
      }
      cout << endl;
      return 0;
  }
  ```
- **Observed Result:**
  - Status: `Accepted` (`statusId: 3`)
  - Exit Code: `0`
  - Compile Output: `null`
  - Output: `Sorted: 1 2 5 5 6 9`
  - Execution Time: `0.006s`
  - Memory: `784 KB`

### 2.4 JavaScript Regression
- **Input Program:**
  ```javascript
  const a = [5, 2, 9, 1, 5, 6];
  a.sort((x, y) => x - y);
  console.log("Sorted:", JSON.stringify(a));
  ```
- **Observed Result:**
  - Status: `Accepted` (`statusId: 3`)
  - Output: `Sorted: [1,2,5,5,6,9]`

---

## 3. Standard Input (stdin) Verification

| Language | Code Snippet | Stdin | Observed Stdout | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | `n = int(input()); print(n * 2)` | `5` | `10` | PASS |
| **Java** | `Scanner sc = new Scanner(System.in); int n = sc.nextInt(); System.out.println(n * 2);` | `5` | `10` | PASS |
| **C++** | `int n; cin >> n; cout << n * 2 << endl;` | `5` | `10` | PASS |

---

## 4. Diagnostics & Error Handling Verification

| Test Case | Language | Trigger | Expected Diagnostic | Observed Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Syntax Error** | Python | `def broken_func(\n print("missing paren")` | `SyntaxError: '(' was never closed` | PASS (Status != Accepted) |
| **Compile Error** | Java | `int a = "incompatible types";` | `error: incompatible types: String cannot be converted to int` | PASS (Status: Compilation Error) |
| **Compile Error** | C++ | `this_is_an_undefined_symbol;` | `error: 'this_is_an_undefined_symbol' was not declared in this scope` | PASS (Status: Compilation Error) |
| **Runtime Exception**| Python | `x = 10 / 0` | `ZeroDivisionError: division by zero` | PASS (Status: Runtime Error) |
| **Invalid Language** | Ruby | Language `ruby` submitted | HTTP 400 Bad Request | PASS |
| **Missing Provider** | Any | `JUDGE0_URL=''` | HTTP 503 Service Unavailable | PASS |
| **Concurrency** | Python | 3 parallel requests | Independent outputs, zero leakage | PASS |

---

## 5. Build Verification
- `npm run build` executed and produced optimized production bundle:
  - `dist/index.html` (1.01 kB)
  - `dist/assets/index-s6Q2R_fW.css` (249.39 kB)
  - `dist/assets/index-C19SYlh4.js` (563.88 kB)
  - Static Monaco assets (151 files copied)
  - Build duration: 19.39s
  - Exit code: 0
