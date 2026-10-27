# CodeLens incremental design and feature checklist

## Baseline

This repository is a working React/Vite + Express/Mongoose application with a JSON development store, cookie-based guest/account sessions, snippets, learning paths, static analysis, billing, and passing Node integration tests. Preserve those workflows. Existing README and UI explicitly describe it as DevPulse and disclose that static analysis is not execution or AI.

## Design direction

- **Palette:** retain the established mineral light/dark palette; use restrained terminal green and slate only for execution states so the new workspace reads as an extension, not a replacement.
- **Type:** retain the current product typography and monospace only for editor/output.
- **Layout:** keep the established app shell and make the editor/inspection panes responsive; collapse the inspection pane below the editor on narrow screens.
- **Principles:** distinguish static analysis, real provider execution, and unavailable integrations in both copy and status. No fabricated debug data or AI responses.

## Security checkpoint

- Execute only through a separately hosted Judge0-compatible provider; never run submissions on the Express process.
- Require the existing authenticated session; validate language, source, stdin, and byte limits on the server.
- Provider endpoint and API key are server-side environment configuration. Never expose key or raw provider failure bodies.
- Apply rate limits and bounded provider request/poll durations. Return normalized status/stdout/stderr/compiler output/exit code/time/memory where available.
- Treat missing configuration as HTTP 503 with actionable but non-secret guidance.

## Feature checklist

- [x] Inspect existing files, dependencies, config, tests, skills, and run baseline checks.
- [ ] Establish versioned authenticated execution endpoint with actual provider submissions for Python, Java, JavaScript, and C++.
- [ ] Add workspace language choices, editor support, stdin, run/stop, and genuine output/status handling.
- [ ] Keep code review separate from execution; explicitly state debugger trace/variables/call stack are not provided by Judge0.
- [ ] Add provider adapter tests and API tests for validation, unavailable provider, and normalized successful result.
- [ ] Document setup and exact verified limits.
- [ ] Future phases: genuine debugger backend, provider-backed AI with diff approval, persistent projects/notes/quizzes, OAuth/reset email, richer lessons, Playwright workflows.

## Current delivery boundary

This first implementation phase is real multi-language ordinary execution through configured Judge0, not a claim that every item in the broad product brief is delivered. Monaco, full OAuth/password-reset, AI, and debugger state must not be represented as working unless independently implemented and verified.
