# CodeLens — Editor Toolbar, Trace Controls, and Status Badges UI Specification

## 1. Design Overview
This specification details the frontend UI refinements to the CodeLens Studio IDE workspace. The objective is to provide a clean, developer-focused aesthetic aligned with modern IDEs (VS Code, JetBrains Fleet, Linear) across both Dark and Light themes without visual clutter, heavy glows, oversized buttons, or horizontal page overflow.

## 2. Editor Toolbar (`.studio-window-bar`)

### 2.1 Component Structure
- **Window Controls (`.studio-window-dots`):** 3 compact window dots (red `#ef4444`, yellow `#f59e0b`, green `#10b981`), hidden on mobile viewports (<768px).
- **Filename Display (`.studio-file-info`):**
  - Displays the active file (`main.js`, `main.py`, `Main.java`, `main.cpp`).
  - `.studio-dirty-dot`: Emerald indicator dot appears whenever uncommitted keystrokes exist.
- **Segmented Language Selector (`.studio-lang-segmented`):**
  - Segmented control supporting JavaScript (`JS`), Python 3 (`PY`), Java (`JAVA`), and C++17 (`C++`).
  - Active tab is highlighted with subtle gradient and accessible ARIA attributes (`role="radiogroup"`, `role="radio"`, `aria-checked`).
- **Breakpoint Pill (`.bp-filename-pill-group`):**
  - Shows count of active breakpoints with a clear button (`✕`) to clear all breakpoints at once.

### 2.2 Action Button Group (`.studio-toolbar-actions`)
- **Reset Button (`.ide-reset-btn`):**
  - Secondary action button with subtle outline border and muted icon.
  - Prompts confirmation if unsaved edits are present to prevent accidental code loss.
  - Triggers coordinated reset across editor, trace timeline, visualizers, complexity analysis, and Algorithm panel.
- **Save Button (`.ide-save-btn`):**
  - Dedicated IDE save action saving source code to the active project session.
  - Displays dynamic states: `Save` (default), `Saving...` (spinner), `Saved` (green checkmark).
- **Primary Run Button (`.ide-run-btn`):**
  - Primary call-to-action button with high visual prominence (`#10b981` emerald gradient).
  - Clear loading indicator (`Running...` with animated spinner) during remote compiler executions.
  - Automatically activates the **Output** tab upon completion to show execution results.

### 2.3 Removed Redundant Controls
- **Removed "Run & Trace" Button:** Eliminated to avoid user confusion; **Run** executes and captures trace events automatically.
- **Removed "Analyze" Button:** Static and runtime analysis execute seamlessly upon Run and debounced code edits.
- **Removed "Save to Templates & Snippets" Button:** Previously located in the Output header, causing redundant save actions. The toolbar's dedicated **Save** button is the single canonical save mechanism.

## 3. Trace Playback Stepper Controls (`.studio-stepper-bar`)

- **Stepper Status Badges (`.stepper-status-badge`):**
  - `.step-count-pill`: Displays `Step X / Total` or `Step — / —` when idle.
  - `.step-line-indicator`: Highlights current source line (e.g. `Line 5 • ASSIGN`).
  - `.trace-status-pill`: Indicates tracing mode (`AST Stepping (JS)`, `Instrumented Containers (Python)`, etc.).
- **VCR Playback Buttons (`.stepper-controls`):**
  - Skip to Start (`<SkipBack />`), Previous Step (`<ChevronLeft />`), Play/Pause (`<Play />` / `<Pause />`), Next Step (`<ChevronRight />`), Skip to End (`<SkipForward />`), Loop/Restart (`<RotateCcw />`).
  - `.bp-continue-btn`: Fast-forward to the next breakpoint when breakpoints are set.
- **Playback Speed Selector (`.stepper-speed-control`):**
  - Segmented pill buttons for `0.5x` (slow), `1x` (normal), `1.5x` (fast), and `2x` (turbo).
- **Progress Scrubber (`.studio-scrubber-slider`):**
  - Compact gradient slider scrubber allowing rapid timeline seeking.

## 4. Status Badges & Contrast Styling
- **Success Badge (`.success-badge`):** High contrast emerald styling (`#10b981`), clearly displaying language and execution status.
- **Compilation & Runtime Error Badges:** Unmistakable crimson styling (`#ef4444`) with descriptive error diagnostics and exit codes.
- **Theme Support:** Complete dark (`data-theme='dark'`) and light (`data-theme='light'`) styling for all buttons, gutter indicators, overlay rows, badges, and tabs.
- **Accessibility:**
  - Full keyboard accessibility (`Tab`, `Space`, `Enter`, `Ctrl+Enter`, `Ctrl+S`, `F9`, `F5`).
  - Reduced motion query (`@media (prefers-reduced-motion: reduce)`) to disable transitions and pulse animations for users with motion sensitivity.
