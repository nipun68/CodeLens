# CodeLens — Program Intelligence & Algorithmic Execution Platform

<div align="center">

[![Architecture](https://img.shields.io/badge/Architecture-AST%20Virtual%20Machine-blueviolet?style=for-the-badge)](https://github.com/nipun68/CodeLens)
[![Language](https://img.shields.io/badge/Core-Vanilla%20JS%20(ES2020)-yellow?style=for-the-badge&logo=javascript)](https://github.com/nipun68/CodeLens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**A high-performance, client-side JavaScript execution engine, AST virtual machine, and real-time algorithmic telemetry platform engineered in pure Vanilla ECMAScript 2020.**

[Repository Code](https://github.com/nipun68/CodeLens) • [Report Bug](https://github.com/nipun68/CodeLens/issues) • [Request Feature](https://github.com/nipun68/CodeLens/issues)

</div>

---

## 🏛️ System Ownership & Architectural Leadership

| Role | Engineer | Core Responsibilities & Architectural Ownership |
| :--- | :--- | :--- |
| 👑 **Lead Architect & System Designer** | **Nipun Kalra** ([@nipun68](https://github.com/nipun68)) | **End-to-End System Architecture**, AST Virtual Machine Execution Engine, Static Complexity & Big-O Analyzer (`js/analyzer.js`), Reactive State & Memory Visualizer (`js/visualizer.js`), REST API Integration (`js/api.js`), and Telemetry Architecture. |
| 💻 **Core Subsystems Engineer** | **Nikhil** ([@nikhill91](https://github.com/nikhill91)) | AST Interpreter Runtime (`js/interpreter.js`), Editor Hotkeys Subsystem (`js/editor.js`), Storage Manager (`js/storage.js`), UI Layout & Theme Engine (`index.html`, `script.js`, `style.css`). |
| 📊 **Algorithms & Data Structures Engineer** | **Sameer Verma** ([@Sameerverma2303](https://github.com/Sameerverma2303)) | Algorithm Step Generators (`js/algorithms.js`), Data Structure Sandboxes, Learning Telemetry & Mastery Engine (`js/learning.js`). |

---

## 🌟 Executive Summary

Traditional code sandboxes treat execution as a black box: source code goes in, stdout comes out. **CodeLens** bridges the cognitive gap in algorithmic comprehension by transforming arbitrary JavaScript code into an **observable, statement-by-statement virtual runtime**.

By converting code into an **Abstract Syntax Tree (AST)** via Acorn, CodeLens intercepts control flow, tracks variable mutation timelines, renders activation records on the call stack, and pre-computes asymptotic time/space bounds before running a single instruction.

---

## 🏗️ System Architecture & Dataflow Pipeline

```
                     ┌───────────────────────────────────┐
                     │    Raw JavaScript Source Code     │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │     Acorn Lexer & AST Parser      │ (ECMAScript 2020)
                     └─────────┬───────────────────┬─────┘
                               │                   │
            ┌──────────────────┘                   └──────────────────┐
            ▼                                                         ▼
┌──────────────────────────────┐                          ┌──────────────────────────────┐
│   Static Analysis Pipeline   │                          │   Virtual Execution Engine   │
├──────────────────────────────┤                          ├──────────────────────────────┤
│ • 6-Tier Asymptotic Heatmap  │                          │ • Statement Evaluator Loop   │
│ • Cyclomatic Complexity (M)  │                          │ • Lexical Scope Chain Tree   │
│ • Cognitive Load Penalty     │                          │ • Breakpoint Interceptor(F9) │
│ • SEI Maintainability (0-100)│                          │ • Step Snapshot Generator    │
│ • SonarQube Code Smell Audit │                          │ • Execution Timeout Guard    │
└──────────────┬───────────────┘                          └──────────────┬───────────────┘
               │                                                         │
               └──────────────────────────┬──────────────────────────────┘
                                          │
                                          ▼
                          ┌──────────────────────────────┐
                          │    Reactive UI Controller    │
                          ├──────────────────────────────┤
                          │ • Trace Timeline Scrubber    │
                          │ • Heap & Scope Variable Grid │
                          │ • Call Stack Frame Visualizer│
                          │ • Multi-Stream Stdout/Stderr │
                          └──────────────────────────────┘
```

---

## ⚡ Core Engineering Subsystems

### 1. 🔬 AST Virtual Machine & Execution Sandbox
* **Zero `eval()` / Zero `Function()`**: Complete execution security using an internal tree-walking virtual machine.
* **Non-Blocking Step Engine**: Captures deep-cloned state snapshots at each statement boundary without blocking the browser event loop.
* **Deterministic Call Stack**: Tracks recursive function frames, activation records, and return value resolution in real time.
* **Infinite Loop & Recursion Protection**: Automatic execution bounds guard against runaway loops.

### 2. 🎨 6-Tier Static Asymptotic Heatmap
Before execution, CodeLens parses the AST to classify control-flow structures by asymptotic time complexity:

| Tier | Asymptotic Bound | Color Accent | AST Classification Heuristic |
| :---: | :---: | :---: | :--- |
| **1** | **$O(1)$** | 🟩 Emerald | Deterministic statement sequence, branch condition (`IfStatement`) |
| **2** | **$O(\log n)$** | 🟦 Sky Blue | Divide-and-conquer binary search index halving (`mid = (low + high) / 2`) |
| **3** | **$O(n)$** | 🟨 Amber | Single linear loop construct (`ForStatement`, `WhileStatement`, `ForOfStatement`) |
| **4** | **$O(n \log n)$** | 🟪 Violet | Built-in `.sort()` invocations (Dual-Pivot Quicksort / Timsort) |
| **5** | **$O(n^2)+$** | 🟥 Crimson | Nested iteration loops with depth $\ge 2$ |
| **6** | **$O(2^n)$** | 🟪 Fuchsia | Branching self-recursive function invocations (`fib(n-1) + fib(n-2)`) |

### 3. 🛡️ Enterprise Code Quality & Architectural Health
* **McCabe Cyclomatic Complexity ($M = \text{Decisions} + 1$)**: Measures independent execution paths to evaluate unit-testability risk.
* **SEI Maintainability Index (0–100)**: Multi-variable software metric factoring Cyclomatic Complexity, Halstead volume, and lines of code (LOC).
* **Cognitive Load Analysis**: Penalizes deeply nested structures ($depth \ge 2$) that increase human comprehension difficulty.
* **Clean Code & Smell Detector**: Identifies non-idiomatic single-letter identifiers, missing `try/catch` exception boundaries, and DRY pattern violations.

### 4. 📦 Data Structures & Algorithm Visualizer
* **Classic Algorithms**: Step-by-step generator animations for Binary Search, Linear Search, Bubble Sort, Selection Sort, and Insertion Sort.
* **Interactive Memory Sandboxes**: Real-time visual manipulation of Arrays, Stacks (LIFO), Queues (FIFO), and Singly Linked Lists.

### 5. 🏆 Algorithmic Mastery & Telemetry Dashboard
* **Telemetry Analytics**: Tracks executed runs, total trace steps analyzed, error rates, and algorithmic competency scores.
* **Adaptive Practice Vectors**: Recommends algorithm drills based on user history and identified weakness areas.
* **Client-Side Persistence**: Stores execution history and user preferences via `localStorage`.

---

## ⌨️ IDE Keyboard Shortcuts Reference

| Shortcut | Function | Context |
| :--- | :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run & Trace Code | Editor |
| `F9` / `Ctrl + B` | Toggle Breakpoint on Line | Editor Gutter |
| `F5` | Play / Pause Trace | Workspace |
| `F10` / `→` / `Space` | Step Next Statement | Trace Controls |
| `F11` / `←` | Step Previous Statement | Trace Controls |
| `Home` / `End` | Jump to First / Last Step | Trace Controls |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo Source Code | Editor |
| `Ctrl + S` | Persist Current Snippet | Storage |
| `Shift + F5` | Full Workspace Reset | Workspace |
| `Escape` | Pause Trace / Close Modals | Global |

---

## 🚀 Local Development Setup

CodeLens is **100% zero-dependency** and requires no build tools or package installations:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nipun68/CodeLens.git
   cd CodeLens
   ```
2. **Launch directly in any modern browser:**
   ```bash
   # Direct launch (Windows)
   start index.html

   # Or run via any local server
   npx serve .
   ```

---

## 📄 License

Distributed under the **MIT License**. Free for educational, academic, and commercial use.
