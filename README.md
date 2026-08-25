# CodeLens — Program Intelligence & Algorithmic Execution Platform

<div align="center">
  
  [![Live Demo - Netlify](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://codelens-platform.netlify.app)
  [![Live Demo - Vercel](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://codelens-platform.vercel.app)
  [![Architecture](https://img.shields.io/badge/Architecture-AST%20Virtual%20Machine-blueviolet?style=for-the-badge)](https://github.com/nipun68/CodeLens)
  [![Language](https://img.shields.io/badge/Core-Vanilla%20JS%20(ES2020)-yellow?style=for-the-badge&logo=javascript)](https://github.com/nipun68/CodeLens)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

## 🌐 Production Deployment

The project is deployed and accessible online:
* 🚀 **Live Production (Netlify)**: 👉 **[https://codelens-platform.netlify.app](https://codelens-platform.netlify.app)**
* 🚀 **Live Production (Vercel)**: 👉 **[https://codelens-platform.vercel.app](https://codelens-platform.vercel.app)**
* 📁 **Official GitHub Repository**: 👉 **[https://github.com/nipun68/CodeLens](https://github.com/nipun68/CodeLens)**

---

## 🏛️ System Ownership & Architectural Leadership

| Role | Engineer | Core Responsibilities & Architectural Ownership |
| :--- | :--- | :--- |
| 👑 **Lead Architect & System Designer** | **Nipun Kalra** ([@nipun68](https://github.com/nipun68)) | End‑to‑End System Architecture, AST Virtual Machine Execution Engine, Static Complexity & Big‑O Analyzer (`js/analyzer.js`), Reactive State & Memory Visualizer (`js/visualizer.js`), REST API Integration (`js/api.js`), Telemetry Architecture |
| 💻 **Core Subsystems Engineer** | **Nikhil** ([@nikhill91](https://github.com/nikhill91)) | AST Interpreter Runtime (`js/interpreter.js`), Editor Hotkeys Subsystem (`js/editor.js`), Storage Manager (`js/storage.js`), UI Layout & Theme Engine (`index.html`, `script.js`, `style.css`) |
| 📊 **Algorithms & Data Structures Engineer** | **Sameer Verma** ([@Sameerverma2303](https://github.com/Sameerverma2303)) | Algorithm Step Generators (`js/algorithms.js`), Data Structure Sandboxes, Learning Telemetry & Mastery Engine (`js/learning.js`) |

---

## 🌟 Executive Summary

Traditional code sandboxes treat execution as a black box: source code → stdout. **CodeLens** bridges the cognitive gap in algorithmic comprehension by converting arbitrary JavaScript into an **observable, statement‑by‑statement virtual runtime**. It parses code into an **AST** (via Acorn), tracks control‑flow, visualizes variable mutation timelines, and pre‑computes asymptotic bounds before execution.

---

## 🏗️ System Architecture & Dataflow Pipeline

```text
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
 │ • 6‑Tier Asymptotic Heatmap  │                          │ • Statement Evaluator Loop   │
 │ • Cyclomatic Complexity (M)  │                          │ • Lexical Scope Chain Tree   │
 │ • Cognitive Load Penalty     │                          │ • Breakpoint Interceptor(F9) │
 │ • SEI Maintainability Index │                          │ • Step Snapshot Generator    │
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
                           │ • Multi‑Stream Stdout/Stderr │
                           └──────────────────────────────┘
```

---

## ⚡ Core Engineering Subsystems

### 1. 🔬 AST Virtual Machine & Execution Sandbox
* **Zero `eval()` / Zero `Function()`** – Secure tree‑walking VM.
* **Non‑Blocking Step Engine** – Snapshots at each statement without locking the event loop.
* **Deterministic Call Stack** – Real‑time activation records & return values.
* **Infinite Loop & Recursion Protection** – Automatic bounds guard.

### 2. 🎨 6‑Tier Static Asymptotic Heatmap
Before execution, the AST is classified into complexity tiers ($O(1)$ … $O(2^n)$) and colour‑coded for instant visual insight.

### 3. 🛡️ Enterprise Code Quality & Architectural Health
* **McCabe Cyclomatic Complexity** – Path count for testability risk.
* **SEI Maintainability Index (0‑100)** – Composite quality metric.
* **Cognitive Load Analysis** – Penalties for deep nesting.
* **Clean‑Code & Smell Detector** – Flags non‑idiomatic identifiers, missing error handling, DRY violations.

### 4. 📦 Data Structures & Algorithm Visualizer
* Classic algorithms (Binary Search, Bubble Sort, etc.) with step‑by‑step animation.
* Interactive memory sandboxes for arrays, stacks, queues, linked lists.

### 5. 🏆 Algorithmic Mastery & Telemetry Dashboard
* Execution analytics: runs, steps, error rates, competency scores.
* Adaptive practice vectors – personalised drill recommendations.
* Client‑side persistence via `localStorage`.

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

CodeLens is **100 % zero‑dependency** – no build tools required.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nipun68/CodeLens.git
   cd CodeLens
   ```
2. **Launch in a browser:**
   ```bash
   # Windows shortcut
   start index.html
   # Or via a simple static server
   npx serve .
   ```

---

## 🤝 Contributing

We welcome contributions! To add a feature or fix a bug:
1. Fork the repo.
2. Create a branch prefixed with `feature/` or `bugfix/`.
3. Ensure commit messages follow the **Conventional Commits** format.
4. Open a Pull Request describing the change and its impact.

---

## 📈 Future Scope

* **Collaborative Live Coding** – Multi‑user session sharing with synchronized state.
* **AI‑Assisted Hint Engine** – Real‑time suggestions powered by LLMs for algorithm optimisation.
* **Extended Language Support** – Add TypeScript and Python parsers with unified visualisation.
* **Plugin Marketplace** – Community‑driven visualisations for custom data structures.

---

## 📄 License

Distributed under the **MIT License**. Free for educational, academic, and commercial use.
