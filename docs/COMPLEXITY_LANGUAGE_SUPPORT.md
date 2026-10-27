# CodeLens — Multi-Language Complexity Analysis Support Matrix

## 1. Overview & Analysis Philosophy
CodeLens provides theoretical asymptotic time and auxiliary space complexity analysis coupled with inline editor annotations. Rather than using generic heuristics or applying a single language parser universally, CodeLens utilizes dedicated, language-appropriate syntactic analysis adapters for each supported language.

### Core Principles
- **No Indiscriminate $O(n^2)$ Classification:** CodeLens evaluates loop nesting depth, literal constant bounds (e.g. `i < 10` evaluates to $O(1)$), sequential non-nested loops (which sum to $O(n)$ rather than multiply), logarithmic division/bisection patterns ($O(\log n)$), and recursive branching ($O(2^n)$).
- **Asymptotic Complexity vs. Wall-Clock Duration:** Complexity analysis estimates mathematical growth rates with respect to input size $n$, completely separate from physical execution duration in seconds or milliseconds.
- **Honest Confidence Scoring:** Each finding specifies confidence (`High confidence`, `Estimated`, or `Unknown`), assumptions, and limitations.

---

## 2. Language-by-Language Support Matrix

The table below provides an honest assessment of static complexity analysis support across all four supported languages:

| Language | Support State | Parser / AST Engine | Recognized Constructs | Loop / Recursion Estimation | Auxiliary Space Estimation | Source Line Mapping | Inline Editor Annotations | Synchronized Panel Navigation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **JavaScript** | **Verified** | Acorn Parser (`ecmaVersion: 'latest'`, locations: true) | `ForStatement`, `WhileStatement`, `DoWhileStatement`, `ForOfStatement`, `Array.prototype.sort()`, binary search, exponential recursion | Full loop nesting, constant literal bounds, binary search bisection, recursive branching | $O(1)$ in-place vs. $O(n)$ heap/call-stack allocation | Exact AST line and column | Yes (`.inline-complexity-badge`) | Yes (click scrolls to region and highlights rows) |
| **Python 3** | **Verified** | Indentation & Scope Tracking Lexer | `for ... in range(...)`, `while ...:`, nested indented blocks, constant bounds `range(10)`, recursive branching | Indentation-based nesting depth, constant ranges, sequential loops | $O(1)$ auxiliary memory vs. $O(n)$ recursive frame stack | 1:1 user source lines | Yes (`.inline-complexity-badge`) | Yes |
| **Java** | **Partially supported** | Brace-Scoped Lexical Block Analyzer | `for (...) {`, `while (...) {`, nested curly braces, literal bounds `i < 10`, method recursion | Brace-depth loop nesting, recursive method calls | $O(1)$ in-place vs. $O(n)$ call-stack space | Exact 1:1 user source lines | Yes (`.inline-complexity-badge`) | Yes |
| **C++17** | **Partially supported** | Brace-Scoped Lexical Block Analyzer | `for (...) {`, `while (...) {`, nested curly braces, literal bounds, function recursion | Brace-depth loop nesting, recursive function calls | $O(1)$ in-place vs. $O(n)$ recursion stack | Exact 1:1 user source lines | Yes (`.inline-complexity-badge`) | Yes |

### Support States Defined:
- **Verified (JavaScript, Python 3):** Real AST or indentation-aware lexer parses language structure reliably. Detects single loops, nested loops, constant bounds, sequential loops, sorting methods, and recursion.
- **Partially Supported (Java, C++17):** Accurate for standard procedural, loop-based, and recursive algorithms. However, template metaprogramming, complex macro expansions, lambda expressions, and third-party container iterators are evaluated with `Estimated` confidence rather than full compile-time semantic analysis (which would require Clang libtooling / Eclipse JDT).
- **Unsupported:** (None of the core 4 languages).
- **Blocked by dependency or runtime:** Full Clang AST and Java Bytecode CFG analysis require heavy native server-side daemons.

---

## 3. Detailed Language Analysis Capabilities

### 3.1 JavaScript (Verified)
- **Engine:** Acorn AST parser (`src/complexityAnalyzer.js`).
- **Loop Depth & Hierarchy:** Tracks nested AST nodes (`ForStatement`, `WhileStatement`, `ForOfStatement`). Loops nested inside another loop produce $O(n^2)$, $O(n^3)$, etc.
- **Constant Bound Detection:** Analyzes loop test expressions (`BinaryExpression`). Loops with literal right-hand bounds (e.g. `i < 10` or `i < 100`) are evaluated as $O(1)$ constant time.
- **Sequential Loops:** Multiple loops at the same scope are evaluated as sequential operations ($O(n) + O(n) = O(n)$).
- **Binary Search:** Detects low/high bisection with `Math.floor((low + high) / 2)` and halving updates, classifying as $O(\log n)$.
- **Sorting Routines:** Recognizes `Array.prototype.sort()` and classifies as $O(n \log n)$ V8 Timsort.
- **Recursion:** Recursion tree analysis detects self-referential calls with multiple branches ($O(2^n)$).

### 3.2 Python 3 (Verified)
- **Engine:** Python indentation-aware lexical analyzer (`analyzePythonComplexity()`).
- **Indentation Scope Tracking:** Matches indentation levels (multiples of 4 or 2 spaces). Loops indented inside preceding loop blocks are classified as nested $O(n^2)$.
- **Constant Range Detection:** `for i in range(10):` recognizes integer literal arguments and assigns $O(1)$.
- **Sequential Loops:** Loops with identical indentation level are tracked sequentially ($O(n)$).
- **Recursion:** Detects function definitions `def name():` and subsequent internal recursive calls.

### 3.3 Java (Partially Supported)
- **Engine:** Brace-scoped lexical block analyzer (`analyzeBraceScopedComplexity()`).
- **Capabilities:**
  - Accurately tracks nested brace depth `{ ... }`.
  - Distinguishes nested loops ($O(n^2)$) from sequential loops ($O(n)$).
  - Recognizes constant upper bounds (e.g. `i < 10`).
  - Detects recursive method calls and flags exponential branching.
- **Known Limitations:**
  - Stream API pipelines (e.g., `.stream().filter().map()`) are not yet decomposed into individual operation costs.
  - Generics and inheritance hierarchies do not alter complexity findings.

### 3.4 C++17 (Partially Supported)
- **Engine:** Brace-scoped lexical block analyzer (`analyzeBraceScopedComplexity()`).
- **Capabilities:**
  - Accurately computes loop nesting across compound statements.
  - Recognizes constant numeric limits in `for (int i = 0; i < 50; i++)`.
  - Flags recursive function branches.
- **Known Limitations:**
  - C++ Template metaprogramming (compile-time recursion) is not executed.
  - STL algorithms (`std::sort`, `std::lower_bound`) inside `<algorithm>` require explicit lexical matching.

---

## 4. Editor Highlighting & Synchronization Contract

1. **Non-Intrusive Overlay:** Inline complexity badges are rendered in the `.studio-code-overlay` layer via absolute row positioning, without modifying code, altering line indices, or interfering with breakpoints.
2. **Badge Color Palette:**
   - $O(1)$: Emerald / Lime (`.badge-lime`)
   - $O(\log n)$: Cyan (`.badge-cyan`)
   - $O(n)$: Sky Blue (`.badge-blue`)
   - $O(n \log n)$: Amber (`.badge-amber`)
   - $O(n^2)$: Orange (`.badge-orange`)
   - $O(2^n)$: Rose / Red (`.badge-red`)
3. **Bi-Directional Synchronization:** Clicking an inline badge or a finding card in the Complexity panel highlights the entire region with `.complexity-region-highlight` and scrolls the editor smoothly to the target line.
4. **Lifecycle & Reset:**
   - Modifying code while executed triggers a debounced recalculation (400ms).
   - Clicking Reset completely removes all badges, highlights, and finding cards.
