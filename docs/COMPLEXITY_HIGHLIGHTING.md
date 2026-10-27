# CodeLens — Inline Time-Complexity Highlighting

## 1. Overview
CodeLens Program Intelligence Platform features a learning-focused, static complexity analysis engine and synchronized editor annotation system. It provides immediate, non-intrusive asymptotic time and auxiliary space bounds ($O(1)$, $O(\log n)$, $O(n)$, $O(n \log n)$, $O(n^2)$, $O(2^n)$) without modifying user source code, shifting line numbers, or degrading typing responsiveness.

## 2. Multi-Language Static Analysis Engine (`src/complexityAnalyzer.js`)

The static analyzer implements dedicated language-aware strategies:

### 2.1 JavaScript (ECMAScript 2024 via Acorn AST)
- Parses code into a full Abstract Syntax Tree with `allowReturnOutsideFunction: true` and `allowAwaitOutsideFunction: true`.
- **Single Traversal ($O(n)$):** Detects `ForStatement`, `ForOfStatement`, `ForInStatement`, `WhileStatement`, and `DoWhileStatement` with standard bounds.
- **Nested Loops ($O(n^2)$, $O(n^3)$):** Evaluates parent loop stacks. When loops are nested within another loop body, it classifies them as quadratic ($O(n^2)$) or cubic ($O(n^3)$) with documented input-size assumptions.
- **Sequential Loops ($O(n) + O(n) = O(n)$):** Loops residing at the same lexical block depth are evaluated additively rather than multiplied.
- **Logarithmic Reduction ($O(\log n)$):** Identifies boundary pointer patterns (`while (low <= high)`), binary mid-point calculations (`Math.floor((low + high) / 2)`), and division steps (`/= 2`, `>>= 1`).
- **Exponential Recursion ($O(2^n)$):** Traverses `FunctionDeclaration` bodies to detect multiple recursive calls per frame or Fibonacci-like recurrence relations.
- **Sorting Routines ($O(n \log n)$):** Identifies standard library `Array.prototype.sort()` invocations, mapping them to V8 Timsort / MergeSort asymptotic bounds.

### 2.2 Python 3 (Indentation-Aware Lexical Analysis)
- Analyzes indentation levels and scope blocks.
- Distinguishes sequential `for` / `while` statements at identical indentation from nested loops at increasing indentation depths.
- Detects logarithmic pointer divisions (`// 2`, `>> 1`) and standard collection iterations.

### 2.3 Java & C++17 (Brace Depth & Keyword Analysis)
- Tracks brace nesting levels (`{`, `}`) and detects nested vs sequential loops.
- Detects standard library sorting routines (`std::sort()`, `Collections.sort()`, `Arrays.sort()`).
- Detects binary search bounds and recursive procedures.

## 3. Non-Intrusive Editor Annotations
- **No Source Code Mutation:** The underlying code textarea remains untouched. Annotations are rendered as interactive overlay badges (`.inline-complexity-badge`) and region spans (`.complexity-region-highlight`) in `.studio-code-overlay`.
- **Zero Line Shifting:** Badges are positioned on the right edge of the corresponding line row (`flex: 1` text span with `margin-left: 16px` badge), ensuring line numbers and cursor coordinates remain exact.
- **Subtle, Color-Coded Badges:**
  - `O(1)`: Mint / Lime (`.badge-lime`)
  - `O(log n)`: Cyan (`.badge-cyan`)
  - `O(n)`: Sky Blue (`.badge-blue`)
  - `O(n log n)`: Amber (`.badge-amber`)
  - `O(n²)`: Rose / Orange (`.badge-orange`)
  - `O(n³)` / `O(2ⁿ)`: Crimson / Red (`.badge-red`)
- **Interactive Inspection:** Clicking any inline badge opens the **Complexity** tab, scrolls the editor to the start line, and selects the finding card.

## 4. Complexity Tab Synchronization
The Complexity tab displays:
1. **Asymptotic Summary Grid:**
   - **Time Complexity:** Dominant asymptotic bound.
   - **Space Complexity:** Auxiliary memory bound.
   - **Analyzed Regions:** Count of detected iterative and recursive structures.
   - **Trace Operations:** Total recorded runtime execution steps.
2. **Static Findings Cards (`.complexity-finding-card`):**
   - Asymptotic Pill (e.g., `O(n²)`)
   - Source Line Range (e.g., `Lines 4–10`)
   - Classification & Confidence Tag (`High confidence` | `Estimated` | `Unable to determine reliably`)
   - Detailed Reasoning & Explanation
   - Explicit Assumptions (e.g., *Loop bounds scale with input size n*)
   - Known Limitations (e.g., *Early return or break statements may reduce average-case iterations*)
3. **Editor Region Highlighting:**
   - Selecting a finding card applies `.complexity-region-highlight` to the corresponding source lines in the editor overlay.

## 5. Lifecycle and Invalidation
- **Debounced Analysis:** Code edits trigger debounced analysis (400ms) to ensure smooth typing performance.
- **Run Synchronization:** Clicking **Run** immediately analyzes the active source code.
- **Coordinated Reset:** Clicking **Reset** completely clears all inline badges, region highlights, and complexity findings, restoring the neutral empty state.
