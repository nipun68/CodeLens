# CodeLens — Program Intelligence & Algorithmic Execution Platform

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Application-brightgreen?style=for-the-badge&logo=vercel)](https://nipun68.github.io/CodeLens/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-CodeLens-blue?style=for-the-badge&logo=github)](https://github.com/nipun68/CodeLens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **An interactive, client-side JavaScript execution engine, AST visualizer, and algorithmic telemetry platform built with pure Vanilla ECMAScript 2020.**

---

## 🌐 Live Deployment

The project is fully deployed and accessible in real-time:
* **Primary Deployment (GitHub Pages):** 👉 **[https://nipun68.github.io/CodeLens/](https://nipun68.github.io/CodeLens/)**
* **Repository:** 👉 **[https://github.com/nipun68/CodeLens](https://github.com/nipun68/CodeLens)**

---

## 👥 Team Contributions & Branch Architecture

To demonstrate clear modularity and collaborative version control, the project utilizes individual dedicated feature branches:

| Team Member | GitHub Handle | Assigned Role & Module | Dedicated Branch |
| :--- | :--- | :--- | :--- |
| **Nipun Kalra** *(Lead)* | [@nipun68](https://github.com/nipun68) | Core AST Virtual Interpreter Sandbox & Reactive Execution Engine | [`feature/ast-engine-core`](https://github.com/nipun68/CodeLens/tree/feature/ast-engine-core) |
| **Nikhil** | [@nikhill91](https://github.com/nikhill91) | 6-Tier Static Heatmap, Asymptotic Big-O Engine & Enterprise Quality Audit | [`feature/static-analyzer-heuristics`](https://github.com/nipun68/CodeLens/tree/feature/static-analyzer-heuristics) |
| **Sameer Verma** | [@Sameerverma2303](https://github.com/Sameerverma2303) | Algorithm Step Visualizer, Data Structures Sandbox & Telemetry Dashboard | [`feature/algo-visualizer-dom`](https://github.com/nipun68/CodeLens/tree/feature/algo-visualizer-dom) |

---

## 🌟 Overview

**CodeLens** allows engineers, students, and technical interviewers to observe not just what code *outputs*, but what it *does* internally at every single instruction.

By parsing source code into an **Abstract Syntax Tree (AST)** via Acorn, CodeLens steps statement-by-statement, captures variable scopes, snapshots the call stack, pre-computes asymptotic time/space complexities, and renders visual memory structures in real time.

---

## ✨ Core Features

- **⚡ Line-by-Line AST Execution Engine**: Custom sandbox interpreter that evaluates JavaScript statement-by-statement with zero `eval()` security risks.
- **🎯 Reactive State & Memory Visualization**: Visual memory blocks for arrays, dynamic variables inspection, and timeline history.
- **🎨 6-Tier Static Heatmap & Complexity Heuristics**:
  - 🟩 **$O(1)$ Emerald**: Branch conditions (`if / else`)
  - 🟦 **$O(\log n)$ Sky Blue**: Divide-and-conquer / index halving (`mid = (low + high) / 2`)
  - 🟨 **$O(n)$ Amber**: Linear loops (`for`, `while`, `for..of`)
  - 🟪 **$O(n \log n)$ Violet**: Sorting passes (`.sort()`)
  - 🟥 **$O(n^2)+$ Crimson**: Nested loops ($depth \ge 2$)
  - 🟪 **$O(2^n)$ Fuchsia**: Recursive branching calls
- **🛡️ Enterprise-Grade Code Quality Audit**:
  - Cyclomatic Complexity ($M = \text{Decisions} + 1$) testability rating
  - Software Engineering Institute (SEI) Maintainability Index (0–100)
  - Cognitive load evaluation & nesting penalty
  - Clean code heuristics & SonarQube-style code smell detection
- **🔍 Algorithm & Data Structure Visualizer**:
  - Interactive step generators for Binary Search, Linear Search, Bubble Sort, Selection Sort, and Insertion Sort.
  - Interactive Data Structures: Arrays, Stacks (LIFO), Queues (FIFO), and Singly Linked Lists.
- **🏆 Algorithmic Mastery & Telemetry Dashboard**:
  - KPI performance cards, competency matrices, adaptive practice vectors, and milestone achievements persisted in `localStorage`.
- **⌨️ IDE Keyboard Shortcuts**: Breakpoints ($F9$), Step Next ($F10$), Step Back ($F11$), Run ($F5$ / $Ctrl+Enter$), and History Navigation.

---

## 🏗️ System Architecture

```
[ Source Code Input ]
        │
        ▼
[ Acorn Lexer & AST Parser ] (ECMAScript 2020)
        │
        ├──► [ Static Heatmap & Complexity Heuristics ] ──► (O(1) → O(2ⁿ))
        ├──► [ Static Code Quality & Cyclomatic Engine ] ──► (Maintainability & M)
        │
        ▼
[ Statement Evaluator & Scope Tree ]
        │
        ├──► [ Memory State Snapshots ] (Variables & Heap Arrays)
        ├──► [ Call Stack Frame Tracker ] (Activation Records & Returns)
        └──► [ Console Output Stream ] (Deterministic Stdout)
        │
        ▼
[ Reactive Visualizer DOM Renderer ] (High-Performance CSS / DOM Updates)
```

---

## ⌨️ IDE Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Run & Trace Code | Editor |
| `Ctrl + Z` / `Cmd + Z` | Undo Code Change | Editor |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo Code Change | Editor |
| `Ctrl + S` / `Cmd + S` | Save Code to History | Editor |
| `Ctrl + /` | Toggle Line Comment | Editor |
| `Tab` / `Shift + Tab` | Indent / Outdent Selection | Editor |
| `Alt + ↑` / `Alt + ↓` | Move Line Up / Down | Editor |
| `F9` / `Ctrl + B` | Toggle Breakpoint on Line | Editor |
| `F5` | Play / Pause Trace | Workspace |
| `F10` / `→` / `Space` | Step Next Statement | Trace Controls |
| `F11` / `←` | Step Previous Statement | Trace Controls |
| `Home` / `End` | Jump to First / Last Step | Trace Controls |
| `Shift + F5` | Full Workspace Reset | Workspace |

---

## 🚀 Local Development Setup

CodeLens is **zero-dependency** and runs directly in any modern browser:

1. Clone the repository:
   ```bash
   git clone https://github.com/nipun68/CodeLens.git
   cd CodeLens
   ```
2. Open `index.html` in your favorite web browser (or serve with any local HTTP server like Live Server or `npx serve`).

---

## 📄 License

MIT License — free for educational and commercial use.
