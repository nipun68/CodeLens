# CodeLens — Authentication, Email OTP, Password Recovery, Welcome Email & OAuth Architecture

This guide provides end-to-end configuration, security principles, and deployment instructions for the **CodeLens Program Intelligence Platform** authentication system.

---

## 1. System Overview

CodeLens implements an enterprise-grade, defensive MERN authentication architecture:
- **Email OTP Verification:** 6-digit cryptographically unpredictable codes for registration, single-use, 10-minute expiration, 5-attempt rate limit, 60-second resend cooldown.
- **Transactional Welcome Email:** Branded responsive HTML & plain-text welcome email dispatched from `codelens044@gmail.com` upon successful verification with direct workspace CTA, security links, and genuine feature catalog.
- **Account Enumeration Defense:** Generic responses for forgot password requests to prevent username harvesting.
- **Two-Way Password Recovery:** One-click single-use reset links (15-minute TTL) and 6-digit recovery codes entered manually.
- **Session Revocation:** Incrementing `tokenVersion` to invalidate active session tokens across all other devices upon password reset or password change.
- **Direct OAuth 2.0 / OIDC Integration:** Dedicated entry points for Google, GitHub, and LinkedIn with CSRF state protection, scope minimization, and automatic email matching.
- **MongoDB Atlas Persistence:** Multi-tenant account models with unique sparse indexes, TTL indexes, and atomic updates.
- **Custom 404 Routing:** Professional CodeLens-branded catch-all 404 page for unknown frontend paths and structured JSON `{ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } }` for API routes.

---

## 2. Environment Variables Reference

Create a `.env` file in the project root based on `.env.example`:

| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend server port | Optional (Default: 3001) | `3001` |
| `APP_URL` | Frontend URL for redirects and email CTAs | **Required** | `http://localhost:5173` (dev) / `https://codelens.dev` (prod) |
| `API_BASE_URL` | Backend API URL | Optional | `http://localhost:3001` |
| `MONGODB_URI` | MongoDB Atlas connection string | **Production Required** | `mongodb+srv://<user>:<pwd>@cluster0.mongodb.net/codelens` |
| `JWT_SECRET` | 32+ character cryptographically random key | **Required** | `d3f829a1b4c7...` |
| `EMAIL_FROM` | Configured sender address | **Required** | `codelens044@gmail.com` |
| `GMAIL_APP_PASSWORD` | 16-character Google App Password (if using Gmail SMTP) | Optional | `abcd efgh ijkl mnop` |
| `SMTP_HOST` | Custom SMTP host (SendGrid, Postmark, SES, Resend) | Optional | `smtp.gmail.com` |
| `SMTP_PORT` | Custom SMTP port | Optional | `587` |
| `SMTP_USER` | SMTP username | Optional | `codelens044@gmail.com` |
| `SMTP_PASS` | SMTP password / API token | Optional | `your-smtp-token` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Client ID | Optional (for Google Auth) | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 2.0 Client Secret | Optional (for Google Auth) | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | Custom Google Callback URL | Optional | `http://localhost:3001/api/auth/google/callback` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Optional (for GitHub Auth) | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Optional (for GitHub Auth) | `7a9b...` |
| `GITHUB_CALLBACK_URL` | Custom GitHub Callback URL | Optional | `http://localhost:3001/api/auth/github/callback` |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer App Client ID | Optional (for LinkedIn Auth) | `77...` |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer App Client Secret | Optional (for LinkedIn Auth) | `Wk...` |
| `LINKEDIN_CALLBACK_URL` | Custom LinkedIn Callback URL | Optional | `http://localhost:3001/api/auth/linkedin/callback` |

---

## 3. Email Infrastructure Setup

### Default Sender Address
All transactional communications are sent from:
```
codelens044@gmail.com
```

### Option A: Gmail SMTP with App Password (Recommended for Staging / Small Teams)
1. Sign in to the Google account: `codelens044@gmail.com`.
2. Navigate to **Google Account Settings** → **Security**.
3. Under **How you sign in to Google**, ensure **2-Step Verification** is enabled.
4. Search for or click **App Passwords** (`https://myaccount.google.com/apppasswords`).
5. Enter app name: `CodeLens Platform` and click **Create**.
6. Copy the 16-character generated password (e.g., `abcd efgh ijkl mnop`).
7. In your `.env`:
   ```bash
   EMAIL_FROM=codelens044@gmail.com
   GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=codelens044@gmail.com
   ```

### Option B: Production SMTP Provider (Resend, SendGrid, Amazon SES, Postmark)
For high deliverability and domain reputation:
1. Register with your preferred transactional provider.
2. Verify domain ownership via SPF, DKIM, and DMARC DNS TXT records.
3. Configure environment variables in `.env`:
   ```bash
   EMAIL_FROM=codelens044@gmail.com
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.your-sendgrid-api-key
   ```
*Note: In automated testing (`NODE_ENV=test`), CodeLens operates an in-memory transactional queue (`getSentEmailLog()`), allowing tests to verify deliveries without sending live outbound network traffic.*

---

## 4. OAuth Provider Configuration

### 1. Google OAuth (OpenID Connect)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select `CodeLens Platform`.
3. Configure the **OAuth Consent Screen**:
   - User Type: **External**
   - App Name: `CodeLens — Program Intelligence Platform`
   - User Support Email: `codelens044@gmail.com`
   - Scopes: `openid`, `email`, `profile`
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application Type: **Web application**
   - Name: `CodeLens Web Client`
   - **Authorized JavaScript origins:**
     - Development: `http://localhost:5173`, `http://localhost:3001`
     - Production: `https://your-domain.com`
   - **Authorized redirect URIs:**
     - Development: `http://localhost:3001/api/auth/google/callback`
     - Production: `https://your-domain.com/api/auth/google/callback`
5. Copy `Client ID` and `Client Secret` into `.env`.

### 2. GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **New OAuth App**.
   - Application Name: `CodeLens — Program Intelligence Platform`
   - Homepage URL: `http://localhost:5173` (or production URL)
   - Authorization callback URL:
     - Development: `http://localhost:3001/api/auth/github/callback`
     - Production: `https://your-domain.com/api/auth/github/callback`
3. Click **Register Application**.
4. Generate a new Client Secret.
5. Copy `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` into `.env`.
*Note: CodeLens queries the GitHub `/user/emails` API to safely extract verified primary email addresses even when users mark their email as private on GitHub profile.*

### 3. LinkedIn OAuth (OpenID Connect)
1. Go to [LinkedIn Developers Portal](https://www.linkedin.com/developers/apps).
2. Click **Create App**:
   - App Name: `CodeLens Platform`
   - Associate with your LinkedIn Page or developer profile.
3. In the **Products** tab, request access to:
   - **Sign In with LinkedIn using OpenID Connect** (Approved instantly).
4. In the **Auth** tab, under **Authorized redirect URLs for your app**:
   - Development: `http://localhost:3001/api/auth/linkedin/callback`
   - Production: `https://your-domain.com/api/auth/linkedin/callback`
5. Copy `Client ID` and `Client Secret` into `.env` as `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.

---

## 5. MongoDB Atlas Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Security** → **Database Access**, create a database user:
   - Username: `codelens_admin`
   - Password: `<secure-password>`
   - Role: `readWriteAnyDatabase` or `Atlas Admin`
3. Under **Security** → **Network Access**:
   - Click **Add IP Address**.
   - Add your production server's static IP address (or `0.0.0.0/0` with secure credentials).
4. Click **Connect** → **Drivers** (Node.js 5.5 or later).
5. Copy connection URI into `.env`:
   ```bash
   MONGODB_URI=mongodb+srv://codelens_admin:<password>@cluster0.mongodb.net/codelens?retryWrites=true&w=majority
   ```
6. The application automatically configures:
   - Indexes on `email` (sparse & unique)
   - TTL indexes on `expiresAt` for automatic cleanup of expired OTPs and password reset challenges
   - Idempotency flags (`welcomeSent`, `tokenVersion`)

---

## 6. Authentication Security Controls

### Password Hashing
- Standardized with `bcrypt` with 12 computational rounds (or Argon2id where supported).
- Passwords are never logged, emailed, or returned in API responses.

### Email OTP Verification
- Codes are generated using `node:crypto.randomInt(100000, 1000000)`.
- OTP values are hashed using SHA-256 with the server secret before database storage.
- Rate limiting: max 5 failed attempts locks and deletes the challenge.
- Resend cooldown: 60-second cooldown enforced server-side.
- Expired after 10 minutes.
- Verified challenge is immediately deleted to prevent replay attacks.

### Welcome Email Delivery
- Triggered automatically and asynchronously upon successful verification.
- Protected by `welcomeSent: true` flag and timestamp to guarantee strictly once-only delivery even on network retries.
- Displays genuine implemented capabilities (Multi-language execution, step-by-step tracing, data-structure visualizers, Big-O complexity analyzer).

### Password Recovery Flow
- User submits email at `/api/auth/forgot-password`.
- Generic response returned unconditionally to prevent account existence enumeration.
- If the account exists, an email is dispatched containing both:
  1. A direct one-time token link (`/?resetToken=<token>#reset-password`).
  2. A 6-digit recovery code.
- Reset credentials expire after 15 minutes.
- Successful reset immediately updates the password hash, increments `tokenVersion` (revoking other active sessions), deletes the reset challenge, and sends a "Password Changed" security notification without revealing credentials.

### Custom 404 Routing
- Any unrecognized frontend route (e.g. `/#unknown-path`) renders `<NotFound />` with:
  - Branded Glowing `{ 404 }` badge
  - Responsive dark/light theme support
  - "Back to Workspace" button (for logged-in learners)
  - "Back to Home" button (for guests/logged-out visitors)
  - "Previous Page" browser navigation button
  - Recommended destination cards (Studio Visualizer, Algorithms Sandbox, Workspace)
- Any unknown backend route (e.g. `/api/nonexistent-route`) returns structured JSON:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "API endpoint not found"
    }
  }
  ```

---

## 7. Testing & Verification

Run the complete test suite:
```bash
npm test
```

Run specific test suites:
```bash
# Email OTP Verification & Welcome Email:
node --test tests/auth-otp.test.js

# Password Recovery & Change Password:
node --test tests/auth-password.test.js

# OAuth Redirects & CSRF Protection:
node --test tests/auth-oauth.test.js

# 404 Error Routing & Integrity:
node --test tests/api-not-found.test.js
```

Verify production bundling:
```bash
npm run build
```
