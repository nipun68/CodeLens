# CodeLens

A full-stack developer learning workspace built with **MongoDB, Express, React, and Node.js**. The browser workspace uses Monaco; user code runs only through a separately configured Judge0-compatible provider, never in the application server.

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:3001**.

A local `.env` is already configured for the MongoDB instance on your machine (`mongodb://127.0.0.1:27017/devpulse`). MongoDB must be running. If setting up on another machine, copy `.env.example` to `.env` and set a strong, stable `JWT_SECRET`.

For development without MongoDB, remove/comment `MONGODB_URI`. Data then persists to `data/devpulse.json`, clearly labeled as local development storage in the UI. If a configured MongoDB connection fails, the server fails rather than silently switching databases. Production requires MongoDB.

## What works

- Editable, syntax-colored JavaScript/HTML/CSS workspace and backend static code reviews.
- Monaco editor with Python, Java, JavaScript, and C++ source modes, stdin, provider-backed execution results, compiler/runtime output, and explicit provider-not-configured errors.
- Analysis, suggested fixes, rule-based guide, and language-specific optimization tips.
- Focus timer with pause/resume and server-saved cumulative time. **Save before leaving the workspace.**
- Snippet creation, search/filter, preview, copy, export, and confirmed deletion.
- One daily reflection per UTC day, mood selection, +10 XP, and actual streak calculations.
- Learning paths, linked official resources, self-tracked lesson completion, +25 XP, and custom Pro topics.
- Persistent profile editing, progress, levels, check-in heatmap, and recent reviews.
- Guest workspaces, registration that retains guest data, login/logout, password hashing, and HTTP-only session cookies.
- **Email OTP Verification:** 6-digit verification codes for newly registered users with accessible auto-advance inputs, countdown timer, resend cooldown, 10-minute expiry, and brute-force protection.
- **Transactional Welcome Email:** Sent after successful verification from `codelens044@gmail.com` detailing actual features and platform capabilities.
- **Password Recovery & Security:** Forgot Password with enumeration protection, 15-minute single-use reset links & 6-digit recovery codes, session invalidation via `tokenVersion`, and authenticated password change in Settings.
- **OAuth 2.0 / OIDC Integration:** Direct login and registration with Google, GitHub, and LinkedIn with CSRF state protection and graceful missing-credential handling.
- **Custom 404 Routing:** CodeLens-themed responsive 404 Not Found page for invalid frontend routes, and standardized JSON `{ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } }` for unknown API routes.
- Free/Pro subscriptions with server-enforced limits, monthly/yearly pricing, explicit demo mode, Stripe Checkout and billing portal integration.
- Responsive navigation, search palette (⌘/Ctrl+K), light/dark mineral palettes, accessible dialogs, focus states, reduced-motion support, and animations.

For comprehensive setup details on SMTP, OAuth providers, and MongoDB Atlas, see [Authentication and Security Documentation](docs/AUTHENTICATION_AND_SECURITY.md).

Progress starts at **zero** rather than using the screenshot’s fictional stats. The provided profile and sample snippet are starter content; edit them to make them yours.

### Important: static review, execution, and AI are separate

CodeLens uses **Acorn syntax parsing and a small set of deterministic checks** for JavaScript/HTML/CSS; it does not provide full language linting. The Guide tab is rule-based, not a live LLM. Run code is sent to the configured Judge0-compatible provider with bounded CPU, wall-time, memory, stack, and file-size limits. Configure `JUDGE0_URL` (and optional `JUDGE0_API_KEY`) in `.env`; no provider credentials or results are simulated. Judge0 does not provide source-level debugger state, so breakpoints, variable snapshots, call stacks, and step controls are not available. CodeLens does not currently have an AI integration. Review history saves metadata, not pasted source unless you explicitly save a snippet. Draft code stays in browser session storage.

### Security and External Providers

Authentication, Email OTP verification, Password Recovery, and OAuth flows are fully implemented. To enable live external email delivery and OAuth provider logins in production, register your OAuth applications with Google, GitHub, and LinkedIn, and provide your SMTP credentials in `.env` as documented in [docs/AUTHENTICATION_AND_SECURITY.md](docs/AUTHENTICATION_AND_SECURITY.md). In local development and automated testing, mock delivery queues handle tests safely without outbound email spam.

### Configure real execution

Set `JUDGE0_URL` to a trusted Judge0-compatible API base URL. Set `JUDGE0_API_KEY` if required by that provider. For RapidAPI, also set `JUDGE0_AUTH_HEADER=X-RapidAPI-Key` and `JUDGE0_API_HOST` (otherwise the auth header defaults to `X-Auth-Token`). Restart the API. Requests are authenticated, rate limited, limited to 30 KB source and 10 KB stdin, have bounded provider-request timeouts, and the server polls asynchronous submissions for at most 18 seconds. The execution API is `POST /api/v1/execution` with `{ "source": "...", "language": "python|java|javascript|cpp", "stdin": "" }`. Provider limitations, unsupported tracing, and unconfigured state are reported explicitly. Use a managed, isolated Judge0 deployment with its own network and resource policies; do not point to an untrusted endpoint. The application does not default to a public execution service: configure one you trust before sending code to it.

## Subscription setup

### Local demo (already enabled)

With no Stripe key and `DEMO_BILLING=true`, Plans & billing offers **Explore Pro · demo**. A confirmation explains that **no card is collected and no payment is processed**. Demo Pro unlocks server-side limits and can be cancelled immediately. Demo billing is disabled in production.

### Stripe test or live subscriptions

1. In Stripe, create a Pro product with recurring USD prices:
   - **$12/month**.
   - **$96/year** (displayed as $8/month billed annually).
2. Configure `.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
DEMO_BILLING=false
```

3. Forward local webhook events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Copy the printed signing secret to `STRIPE_WEBHOOK_SECRET`, then restart the backend.

4. Enable the Stripe customer billing portal in your Stripe Dashboard (include subscription cancellation).
5. Create a CodeLens account, choose Pro, and use Stripe test card `4242 4242 4242 4242` with a future expiry and any valid CVC.

**Access is granted only after a signed Stripe subscription webhook**, never from a checkout success URL. The server retrieves current Stripe subscription state and verifies the configured price ID. Listen for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Failed/unpaid/cancelled subscriptions return to Free; cancellation at period end preserves access while Stripe reports the subscription active. Existing data remains after downgrade.

Use live keys and live price IDs only when you intend to collect real payments. The displayed pricing must match your configured Stripe prices. Taxes and legal/customer-support policies must be configured for your business before accepting live payments.

### Plan limits

| Feature | Free | Pro |
| --- | --- | --- |
| Static reviews / UTC day | 10 | 100 |
| Saved snippets | 5 | 500 |
| Built-in paths | 4 | 4 |
| Custom topics | — | Up to 30 total paths |
| Check-ins, profiles, exports | Included | Included |

## Build & test

```bash
npm test          # Run complete backend, compiler, and integration test suite
npm run test:api  # Run automated 14-endpoint Postman evaluation test runner
npm run build     # Compile and optimize production frontend bundle
npm start         # Launch production server on configured PORT
```

Tests run against an **isolated temporary database**, not your actual MongoDB data. They cover static analysis, account isolation, authentication, validation, duplicate XP protection, CRUD, server-side plan limits, demo subscriptions, cancellation, and persistence across restarts.

For desktop/mobile browser tests (also using isolated test data):

```bash
npx playwright install chromium
npm run test:browser
```

These tests start their own API and frontend on ports 3101/5174, check the core UI workflows, horizontal overflow, dialogs, theme switching, and reload persistence. Screenshots and traces go in `test-results/`.

After a build, Express serves both the API and frontend. For a production deployment, set:

```dotenv
NODE_ENV=production
APP_URL=https://your-domain.example
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-own-long-random-secret-at-least-32-characters
```

Use HTTPS (production cookies are secure), install production Stripe configuration if accepting payments, restrict MongoDB access, and persist/backup your database.

## Architecture (MVC) & Project Structure

CodeLens adheres to a clear **Model-View-Controller (MVC)** design pattern:

```text
client/ (Frontend Client Application)
  ├── package.json        Client-specific scripts and dependencies
  ├── vite.config.js      Vite bundler configuration
  ├── index.html          Single-page application entry point
  ├── public/             Static assets and icons
  └── src/ (View Layer)
      ├── App.jsx         Application shell, state management, search palette
      ├── pages/          Interactive views (Landing, Studio, Workspace, Roadmap, etc.)
      ├── components.jsx  Shared UI, modal dialogs, and visualizers
      ├── styles.css      Comprehensive responsive styling system
      └── api.js          Centralized API client supporting VITE_API_URL and cookies

server/ (Model, Controller, Route, Service, Middleware Layers)
  ├── index.js            Express entry point, security headers, graceful shutdown
  ├── models/             [M] MongoDB / Mongoose data models (Account, OtpChallenge, PasswordReset)
  ├── controllers/        [C] HTTP request handlers & validation logic
  │   ├── healthController.js       System health and DB connectivity
  │   ├── workspaceController.js    Session, profile, check-ins, focus, learning paths
  │   ├── snippetController.js      Snippet creation & deletion
  │   ├── executionController.js    Judge0 execution & container tracing
  │   ├── analyzeController.js      AST static analysis & quota enforcement
  │   └── billingController.js      Stripe checkout, portal, and webhooks
  ├── routes/             [R] URL-to-Controller route mappings
  │   ├── healthRoutes.js, workspaceRoutes.js, snippetRoutes.js,
  │   ├── executionRoutes.js, analyzeRoutes.js, billingRoutes.js, index.js
  ├── services/           [S] Business logic & external service integrations
  │   ├── emailService.js, executionService.js, analyzeService.js
  ├── middleware/         [Middleware] Security, authentication, and error handling
  │   ├── authMiddleware.js         JWT session extraction & auth gates
  │   ├── securityMiddleware.js     CORS, Helmet headers & rate limiters
  │   └── errorMiddleware.js        API 404 handler & centralized error handler
  └── store.js            Mongoose connection manager with strict production fail-fast

tests/                    Complete test suites (Unit, Integration, Auth, Postman)
docs/                     Presentation guides, evaluation documentation & Postman collections
```

Your original uploaded screenshots are preserved in the project folder.
