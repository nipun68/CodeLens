# CodeLens — Program Intelligence & Algorithmic Execution Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://nipun68.github.io/CodeLens/)
[![Architecture](https://img.shields.io/badge/Architecture-AST%20Virtual%20Machine-blueviolet?style=for-the-badge)](https://github.com/nipun68/CodeLens)
[![Language](https://img.shields.io/badge/Core-Vanilla%20JS%20(ES2020)-yellow?style=for-the-badge&logo=javascript)](https://github.com/nipun68/CodeLens)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **An interactive, zero-dependency client-side JavaScript execution engine, AST virtual machine, and algorithmic telemetry platform engineered from the ground up in pure Vanilla ECMAScript 2020.**

---

## 🌐 Live Production Deployment

* 🚀 **Production Application:** **[https://nipun68.github.io/CodeLens/](https://nipun68.github.io/CodeLens/)**
* 📁 **Official Repository:** **[https://github.com/nipun68/CodeLens](https://github.com/nipun68/CodeLens)**

---

## 🏛️ Lead Architect & System Ownership

| Role | Engineer | Core Responsibilities & Architectural Ownership |
| :--- | :--- | :--- |
| 👑 **Lead Architect & System Designer** | **Nipun Kalra** ([@nipun68](https://github.com/nipun68)) | **End-to-End System Architecture**, AST Virtual Machine Execution Engine, Static Complexity & Big-O Analyzer (`js/analyzer.js`), Reactive State & Memory Visualizer (`js/visualizer.js`), REST API Integration (`js/api.js`), and Pedagogical Alignment. |
| 💻 **Core Subsystems Engineer** | **Nikhil** ([@nikhill91](https://github.com/nikhill91)) | AST Interpreter Runtime (`js/interpreter.js`), Editor Hotkeys Subsystem (`js/editor.js`), Storage Manager (`js/storage.js`), UI Layout & Theme Engine (`index.html`, `script.js`, `style.css`). |
| 📊 **Algorithms & Telemetry Engineer** | **Sameer Verma** ([@Sameerverma2303](https://github.com/Sameerverma2303)) | Algorithm Step Generators (`js/algorithms.js`), Data Structure Sandboxes, Learning Telemetry & Mastery Engine (`js/learning.js`). |

---

## 💡 Engineering Motivation & High-Level Design

Standard web execution environments treat code as a black box: source code goes in, stdout comes out. **CodeLens** was designed to solve the cognitive disconnect in program understanding by transforming raw JavaScript into a deterministic, **statement-by-statement observable virtual runtime**.

### Key Technical Achievements
1. **Zero `eval()` / Zero `Function()` Execution**: Implemented a custom Abstract Syntax Tree (AST) tree-walking interpreter using Acorn parsing, eliminating arbitrary execution vulnerabilities.
2. **Pre-Execution Static Heatmap ($O(1)$ to $O(2^n)$)**: Developed a two-pass AST visitor that pre-computes asymptotic time/space bounds before running a single statement.
3. **Enterprise Code Quality Engine**: Built real-time static code analysis calculating McCabe Cyclomatic Complexity ($M = \text{Decisions} + 1$), SEI Maintainability Index, and SonarQube-style cognitive load.
4. **Reactive Memory Snapshots**: Continuous capture of variable scopes, activation records (call stack), and array heap mutations without UI frame drops.

---

## 🏗️ System Architecture & Dataflow Pipeline

```
                     ┌───────────────────────────────┐
                     │   Raw JavaScript Source Code  │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   Acorn Lexer & AST Parser    │ (ECMAScript 2020)
                     └───────┬───────────────┬───────┘
                             │               │
            ┌────────────────┘               └────────────────┐
            ▼                                                 ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│   Static Analysis Pipeline   │              │   Virtual Execution Engine   │
├──────────────────────────────┤              ├──────────────────────────────┤
│ • 6-Tier Asymptotic Heatmap  │              │ • Statement Evaluator Loop   │
│ • Cyclomatic Complexity (M)  │              │ • Scope Tree & Frame Manager │
│ • Cognitive Load Penalty     │              │ • Breakpoint Interceptor (F9)│
│ • SEI Maintainability (0-100)│              │ • Step Snapshot Generator    │
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      │
                                      ▼
                      ┌──────────────────────────────┐
                      │    Reactive UI Controller    │
                      ├──────────────────────────────┤
                      │ • Step-by-step Trace Slider  │
                      │ • Dynamic Scope Grid         │
                      │ • Call Stack Frame Visualizer│
                      │ • Real-time Output Streaming │
                      └──────────────────────────────┘
```

---

## 🎨 6-Tier Static Asymptotic Heatmap

Before execution begins, the static analyzer performs recursive AST pattern matching to classify each line's computational complexity:

| Tier | Complexity | Color Indicator | AST Node Trigger / Heuristic |
| :---: | :---: | :---: | :--- |
| **1** | **$O(1)$** | 🟩 Emerald | Deterministic statement sequence, branch conditions (`IfStatement`) |
| **2** | **$O(\log n)$** | 🟦 Sky Blue | Divide-and-conquer index halving (`mid = (low + high) / 2`) |
| **3** | **$O(n)$** | 🟨 Amber | Single linear loop construct (`ForStatement`, `WhileStatement`) |
| **4** | **$O(n \log n)$** | 🟪 Violet | Built-in `.sort()` invocations (Dual-Pivot Quicksort / Timsort) |
| **5** | **$O(n^2)+$** | 🟥 Crimson | Nested loop iterations ($depth \ge 2$) |
| **6** | **$O(2^n)$** | 🟪 Fuchsia | Branching self-recursive function calls (`fn(n-1) + fn(n-2)`) |

---

## 🛡️ Enterprise Code Quality & Architectural Health Matrix

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ ENTERPRISE STATIC ANALYSIS REPORT                       │
├──────────────────────────────┬──────────────────────────────┤
│ Maintainability Index: 88/100│ Architectural Grade: A+      │
├──────────────────────────────┼──────────────────────────────┤
│ Cyclomatic Complexity: M = 4 │ Cognitive Load: 5 pts        │
│ Risk Level: Low (Testable)   │ Max Nesting Depth: 1         │
└──────────────────────────────┴──────────────────────────────┘
```

- **Cyclomatic Complexity ($M = E - N + 2P$)**: Quantifies the number of linearly independent paths through the program.
- **SEI Maintainability Index**: Normalized polynomial metric factoring in Cyclomatic Complexity, Halstead volume, and source lines of code (LOC).
- **Clean Code & Smell Detection**: Proactively flags single-letter non-idiomatic variables, missing exception boundaries (`try/catch`), and duplicate patterns for strict **DRY compliance**.

---

## 🎓 30-Lecture Curriculum & Pedagogical Alignment

CodeLens is engineered strictly with **100% Vanilla JavaScript**, demonstrating direct real-world mastery over fundamental and advanced ECMAScript concepts:

| Lecture Phase | Syllabus Topics | CodeLens Architectural Implementation |
| :--- | :--- | :--- |
| **Lectures 1–6** | Variables, Scoping, Operators, Conditionals & Loops | AST variable resolution, branch condition evaluations, sorting loop generators. |
| **Lectures 7–12** | Functions, Scope Chains, Arrays & High-Order Methods | Activation record tracking, call stack frame resolution, `.map()/.filter()/.reduce()` history telemetry. |
| **Lectures 13–16** | Objects, Destructuring, JSON & Deep State Clones | Immutable execution state snapshots, report exports, nested object dereferencing. |
| **Lectures 17–22** | DOM Selection, Traversal, Mutations & Event Loop | Reactive UI updates, custom line-gutter rendering, keyboard shortcut listeners ($F5$, $F9$, $F10$, $Ctrl+Enter$). |
| **Lectures 23–24** | `localStorage`, `sessionStorage` & Modern ES6+ Features | Execution history persistence, theme preference memory, ES6 `Set` for $O(1)$ breakpoint lookups. |
| **Lectures 25–30** | Async JavaScript, Promises, REST APIs & Mini-Project Integration | External code execution fallback API, loading states, full end-to-end integration. |

---

## ⌨️ IDE Keyboard Shortcuts Reference

| Key Combination | Action | Subsystem |
| :--- | :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run & Trace Code | Editor |
| `F9` / `Ctrl + B` | Toggle Breakpoint on Current Line | Editor Gutter |
| `F5` | Play / Pause Continuous Execution Trace | Trace Controls |
| `F10` / `→` / `Space` | Step Next Statement | Trace Controls |
| `F11` / `←` | Step Previous Statement | Trace Controls |
| `Home` / `End` | Jump to First / Last Execution Step | Trace Controls |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo Source Code Edit | Editor |
| `Ctrl + S` | Persist Current Snippet to Local History | Storage Engine |
| `Shift + F5` | Full Workspace & Trace Reset | Workspace |

---

## 🚀 Quickstart & Local Installation

CodeLens has **zero build steps** and requires no compilation or package installation:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nipun68/CodeLens.git
   cd CodeLens
   ```
2. **Launch directly in your browser:**
   ```bash
   # Option 1: Open directly
   start index.html

   # Option 2: Run with any local server
   npx serve .
   ```

---

## 📄 License

Distributed under the **MIT License**. Free for academic, educational, and commercial use.
