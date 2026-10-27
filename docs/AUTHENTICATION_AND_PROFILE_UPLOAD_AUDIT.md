# CodeLens — Authentication, OTP Deliverability, UI, and Profile Photo Upload Audit & Verification Report

**Date:** October 26, 2026  
**Auditor / Engineer:** Senior Full-Stack MERN, Authentication & Email Deliverability Specialist  
**Repository:** [CodeLens (GitHub)](https://github.com/nipun68/CodeLens)  
**Execution Runtime:** Node.js v20.18.0 / Express 5.1 / React 19 / Vite 7.3.7 / MongoDB Atlas  

---

## 1. Executive Summary & Verification Scorecard

All reported defects regarding OTP email delivery, password strength validation, confirm-password enforcement, show/hide password controls, modal UI layout regressions, and direct profile photo upload have been comprehensively diagnosed, repaired, and verified with automated test suites and real live server executions.

| Feature / Subsystem | Status | Verification Summary & Evidence |
| :--- | :---: | :--- |
| **1. OTP Email Deliverability & SMTP Transport** | **PASS — tested and verified** | Diagnosed 3 root causes. Fixed Gmail SMTP configuration, whitespace stripping for app passwords, RFC 5322 From header parsing, and connection verification. Real email sent with Gmail messageId `<1960c230-bf67-adea-7048-b7c4960c502a@gmail.com>`. All 7 OTP tests in `tests/auth-otp.test.js` pass. |
| **2. Robust Registration Password Policy** | **PASS — tested and verified** | Strict 12–128 character policy enforced symmetrically on backend (`server/auth.js`) and frontend. Blocks common passwords (`password1234`, `123456789012`). Real-time advisory password strength meter (`Weak`, `Fair`, `Strong`, `Very strong`) with live dynamic requirement checklist. |
| **3. Confirm-Password Field & Validation** | **PASS — tested and verified** | Confirm-password field added to Registration modal, Password Reset modal, and Settings change-password tab (and explicitly omitted from Sign-in). Live inline mismatch warning, instant matching feedback, submit button locking, and backend verification. |
| **4. Accessible Show/Hide Password Controls** | **PASS — tested and verified** | Reusable `PasswordInput` component using accessible `<button type="button">`, dynamic `aria-label`, Lucide `Eye`/`EyeOff` icons, preserving cursor position and value across toggles. Verified on desktop and mobile. |
| **5. Authentication UI & Modal Redesign** | **PASS — tested and verified** | Fixed double-scrollbar regression. Replaced tall 3-row vertical OAuth buttons stack with sleek responsive 3-column `.social-buttons-grid` (Google, GitHub, LinkedIn). Tested on Desktop (1440x1000) and Mobile (390x844). Verified via 6 automated Playwright tests. |
| **6. Direct Profile Photo Upload & Storage** | **PASS — tested and verified** | Replaced URL-only input with direct file upload workflow (native picker, PNG/JPEG/WebP support, 5 MB client/server limit, magic byte validation, collision-proof UUID disk storage, secure static delivery with `nosniff`, remove action, fallback avatar). Tested in `tests/upload.test.js` and browser specs. |
| **7. Regression & Full Test Suite Integrity** | **PASS — tested and verified** | 78/78 project unit & integration tests pass (`npm test`). 14/14 Postman API collection requests pass (`npm run test:api`). 6/6 browser Playwright specs pass (`npx playwright test`). Production bundle builds in 30.86s without errors (`npm run build`). |

---

## 2. Root Cause Analysis: OTP Email Deliverability

### Identified Defects
1. **Misplaced Environment Configuration:**
   - The user had pasted their Google App Password into `.env.example` rather than the active `.env` file read by `dotenv/config`. In production/local execution, the running Node.js backend never received the credentials, defaulting to mock simulated mode or failing on undefined transporter.
2. **Invalid RFC 5322 "From" Header Syntax:**
   - The environment variable was configured as `EMAIL_FROM= CodeLens<codelens044@gmail.com>`.
   - When formatted using naive template interpolation (`"CodeLens Platform" <${EMAIL_FROM}>`), the resulting outgoing header became `"CodeLens Platform" < CodeLens<codelens044@gmail.com>>`.
   - RFC 5322 prohibits nested brackets `< <...>>`. Google SMTP servers strictly parse headers and reject such messages with `555 5.5.2 Syntax error`.
3. **App Password Formatting (Whitespace Tokens):**
   - Google App Passwords generated in Google Accounts are formatted in 4-character space-separated groups (`rltr csbg vtqi asdn`).
   - If passed with raw spaces to `nodemailer`, standard SMTP plain-auth handshakes fail authentication (`535-5.7.8 Username and Password not accepted`).
4. **Missing Exported Constant:**
   - The default fallback sender constant `DEFAULT_SENDER` was missing an explicit export in `server/email.js`, causing a `ReferenceError` inside template footers during registration email generation.

### Implemented Fixes
- Added `parseSenderAddress(fromHeader)` and `getFormattedFromHeader(fromHeader)` in `server/email.js`:
  - Strips leading/trailing whitespaces, extracts pure email address, and formats clean RFC 5322 compliant `"CodeLens Platform" <codelens044@gmail.com>`.
- App password sanitization: `pass = rawPass.replace(/\s+/g, '')`.
- Added `verifySmtpConnection()` utility to `server/email.js` and exported it via `server/services/emailService.js` to allow diagnostic connection checks without sending emails.
- Exported `DEFAULT_SENDER` at module level.
- Safe structured diagnostic logging: masked recipient (`co***@gmail.com`), logs provider error codes (`ESOCKET`, `EAUTH`), but never logs credentials, full OTP codes, or secrets.
- Transferred live credentials into git-ignored `.env` and sanitized `.env.example` back to clean, secure template placeholders.

### Verification Evidence
```bash
$ node -r dotenv/config -e "import('./server/email.js').then(async ({ verifySmtpConnection, sendOtpEmail }) => { ... })"

SMTP Verify Result: {
  verified: true,
  host: 'smtp.gmail.com',
  port: 587,
  user: 'codelens044@gmail.com'
}
[Email Delivered]: Subject="782914 is your CodeLens verification code" to=co***@gmail.com messageId=<1960c230-bf67-adea-7048-b7c4960c502a@gmail.com>
Live Send Result: {
  success: true,
  messageId: '<1960c230-bf67-adea-7048-b7c4960c502a@gmail.com>',
  mode: 'smtp'
}
```

---

## 3. Password Validation & Strength System

### Password Policy
- **Minimum Length:** 12 characters (authoritative on backend and client).
- **Maximum Length:** 128 characters.
- **Common Password Rejection:** Blocklist checked on backend and client (`password1234`, `123456789012`, `qwertyuiop12`, `admin1234567`, `welcome12345`, `codelens1234`, `iloveyou1234`, etc.).
- **Passphrase & Manager Compatibility:** No arbitrary rules requiring punctuation or preventing spaces; supports modern high-entropy passphrases.

### UI & Strength Meter
- File created: `src/utils/passwordStrength.js`.
- File created: `src/components/PasswordStrengthMeter.jsx`.
- Calculates real dynamic entropy points based on length (12+, 16+, 20+), character diversity (lowercase, uppercase, digits, symbols/spaces), and dictionary check.
- Rating levels:
  - **Weak** (red `#ef4444`, <40 points or common password)
  - **Fair** (amber `#f59e0b`, 40–69 points)
  - **Strong** (emerald `#34d399`, 70–89 points)
  - **Very strong** (mint `#10b981`, 90+ points)
- Interactive live checklist showing which conditions are met as the user types. Screen reader accessible via `role="status"` and `aria-live="polite"`.

---

## 4. Confirm-Password Enforcement & Show/Hide Controls

### Confirm-Password Implementation
- Added to:
  1. **Registration Form** in `AuthModal` (`src/App.jsx`).
  2. **Password Reset Form** in `ResetPasswordModal` (`src/components/ResetPasswordModal.jsx`).
  3. **Change Password Tab** in `SettingsModal` (`src/App.jsx`).
  - *Explicitly omitted from Sign-in form.*
- Features:
  - Real-time mismatch detection with inline red warning: `"Passwords do not match. Please verify both fields."`
  - Inline green confirmation: `"Passwords match"`
  - Submit button is disabled while fields do not match or password is < 12 characters.
  - Symmetrically verified on the backend: `validatePasswordPolicy(password, confirmPassword)` throws HTTP 400 if mismatch occurs.

### Show/Hide Password Toggle
- File created: `src/components/PasswordInput.jsx`.
- Uses accessible `<button type="button">` with `aria-label="Show password"` / `aria-label="Hide password"`.
- Uses Lucide `Eye` and `EyeOff` icons.
- Preserves focus and selection range (`selectionStart`, `selectionEnd`) during toggling via `requestAnimationFrame`.
- Tested across desktop and mobile browsers.

---

## 5. Authentication UI Redesign & Modal Polish

### UI Regressions Diagnosed
1. **Conflicting Double Scrollbars:** Both `.modal-backdrop` and `.modal` were styled with `overflow-y: auto`, causing dual scrollbars and scroll hijacking.
2. **Excessive Vertical Height:** 3 large social OAuth buttons (`Continue with Google`, `Continue with GitHub`, `Continue with LinkedIn`) were vertically stacked in full-width rows, occupying ~150px and pushing modal actions below the viewport fold.

### Fixes Implemented
- **Modal Container:** Fixed backdrop to `overflow-y: auto; overscroll-behavior: contain; display: flex; align-items: center; justify-content: center;`.
- **Modal Body:** Constrained height to `max-height: min(92dvh, 660px); overflow-y: auto;` with slim, elegant webkit scrollbars.
- **Social OAuth Layout:** Replaced `.social-buttons-stack` with responsive 3-column `.social-buttons-grid`:
  - `display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;`
  - Compact branded buttons with icons and clean titles ("Google", "GitHub", "LinkedIn").
  - On mobile screens (<480px), cleanly stacks into full-width tap targets.
- **Consistent Visual Hierarchy:** Aligned font weights, radius (`11px`), borders, dark/light theme tokens, and error alerts.

---

## 6. Profile Photo Direct File Upload & Storage Architecture

### Storage Architecture
- Service created: `server/services/uploadService.js`.
- Storage directory: `data/uploads/avatars/`.
- File naming: Collision-proof cryptographic UUIDs (`avatar-<uuid>-<timestamp>-<hash>.<ext>`), preventing path traversal and name collisions.
- Supported MIME types & Magic Bytes:
  - **PNG:** `89 50 4E 47 0D 0A 1A 0A` (`image/png`)
  - **JPEG:** `FF D8 FF` (`image/jpeg`)
  - **WebP:** `RIFF....WEBP` (`image/webp`)
- Server Size Limit: 5 MB (`5 * 1024 * 1024` bytes) enforced via Express raw body parser limit and size check in service.
- Secure Static Serving:
  - Endpoint: `GET /api/uploads/avatars/:filename`
  - Strict basename resolution preventing directory traversal (`path.basename()`).
  - Security headers: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- Profile deletion & replacement: Old avatar files on disk are automatically deleted when a user replaces or removes their photo, preventing orphan storage bloat.

### Frontend Profile Modal
- Hidden native file input `<input type="file" accept="image/png,image/jpeg,image/webp" />`.
- "Upload photo" / "Change photo" action triggers device file picker.
- Client-side size and format validation with immediate warning.
- Instant preview via `URL.createObjectURL(file)`.
- "Remove photo" action restores default initials avatar and clears photo from backend.
- Saves binary directly to `POST /api/profile/avatar`.

---

## 7. Verification Evidence & Automated Test Results

### 1. New Upload & Password Security Integration Test (`tests/upload.test.js`)
```
TAP version 13
# Subtest: Direct Profile Photo Upload, Security Validation & Robust Password Policy
    ok 1 - 1. Registration rejects password shorter than 12 characters (83ms)
    ok 2 - 2. Registration rejects common or easily guessed password (13ms)
    ok 3 - 3. Registration rejects confirmPassword mismatch (11ms)
    ok 4 - 4. Registration succeeds with compliant password and matching confirmation (512ms)
    ok 5 - 5. Rejects unauthenticated avatar upload attempt (24ms)
    ok 6 - 6. Rejects corrupt or spoofed non-image payload (magic byte check) (21ms)
    ok 7 - 7. Rejects oversized image file (>5MB) (21ms)
    ok 8 - 8. Successfully uploads valid PNG photo directly from buffer (21ms)
    ok 9 - 9. Serves uploaded photo with secure headers and correct MIME type (10ms)
    ok 10 - 10. Path traversal in avatar serving is blocked (5ms)
    ok 11 - 11. Successfully replaces photo with valid WebP image (9ms)
    ok 12 - 12. Successfully removes photo and restores default avatar (25ms)
ok 1 - Direct Profile Photo Upload, Security Validation & Robust Password Policy (1886ms)
1..1
# tests 13, pass 13, fail 0
```

### 2. Playwright End-to-End Browser UI Tests (`tests/browser/auth-ui.spec.js`)
```
Running 6 tests using 1 worker

  ok 1 [desktop] › tests\browser\auth-ui.spec.js:13:3 › Sign-in Modal: Show/hide toggle, compact social grid & responsive fit (4.8s)
  ok 2 [desktop] › tests\browser\auth-ui.spec.js:52:3 › Registration Modal: Password strength meter, confirm password & live validation (5.5s)
  ok 3 [desktop] › tests\browser\auth-ui.spec.js:99:3 › Profile Modal: Direct photo file upload, native picker & remove action (3.1s)
  ok 4 [mobile]  › tests\browser\auth-ui.spec.js:13:3 › Sign-in Modal: Show/hide toggle, compact social grid & responsive fit (5.8s)
  ok 5 [mobile]  › tests\browser\auth-ui.spec.js:52:3 › Registration Modal: Password strength meter, confirm password & live validation (4.4s)
  ok 6 [mobile]  › tests\browser\auth-ui.spec.js:99:3 › Profile Modal: Direct photo file upload, native picker & remove action (3.5s)

  6 passed (40.0s)
```

Generated Verification Screenshots:
- `docs/screenshots/signin_modal_desktop.png`
- `docs/screenshots/signin_modal_mobile.png`
- `docs/screenshots/registration_strength_meter_desktop.png`
- `docs/screenshots/registration_strength_meter_mobile.png`
- `docs/screenshots/profile_photo_upload_desktop.png`
- `docs/screenshots/profile_photo_upload_mobile.png`

### 3. Core Test Suite (`npm test`)
```
# tests 78
# suites 0
# pass 78
# fail 0
# cancelled 0
# duration_ms 138005.2633
```

### 4. Postman 14-Request API Collection (`npm run test:api`)
```
======================================================
Postman Evaluation Run Summary:
Total Requests: 14
Passed: 14
Failed: 0
======================================================
```

### 5. Production Bundle Build (`npm run build`)
```
vite v7.3.7 building client environment for production...
✓ 1614 modules transformed.
dist/index.html                   1.01 kB │ gzip:   0.53 kB
dist/assets/index-BCSikqo4.css  271.24 kB │ gzip:  46.75 kB
dist/assets/index-COLWUVcX.js   672.06 kB │ gzip: 192.13 kB
✓ built in 30.86s
```

---

## 8. Files Changed & Added

| File Path | Description of Changes |
| :--- | :--- |
| `server/email.js` | Added RFC 5322 header parsing, whitespace stripping for app passwords, `verifySmtpConnection()`, safe masked logging, exported `DEFAULT_SENDER`. |
| `server/services/emailService.js` | Exported `verifySmtpConnection`, `getTransporter`, `resetTransporter`. |
| `server/services/uploadService.js` | *(New)* Binary magic number image detection (PNG/JPEG/WebP), 5MB size limit validation, UUID disk storage, safe path resolution, file deletion. |
| `server/controllers/workspaceController.js` | Added `uploadAvatar`, `removeAvatar`, `serveAvatar`, and updated `updateProfile` to authorize local avatar paths. |
| `server/routes/workspaceRoutes.js` | Added endpoints `POST /profile/avatar`, `DELETE /profile/avatar`, `GET /uploads/avatars/:filename`. |
| `server/auth.js` | Added authoritative 12-char password policy, common password dictionary check, confirm password validation, and safe OTP rollback on SMTP failure. |
| `src/utils/passwordStrength.js` | *(New)* Advisory password strength score calculation, checklist requirement evaluation. |
| `src/components/PasswordInput.jsx` | *(New)* Reusable accessible password input with eye/eye-off toggle, maintaining value and cursor position. |
| `src/components/PasswordStrengthMeter.jsx` | *(New)* Visual color-coded strength bar and live requirements checklist. |
| `src/components/ResetPasswordModal.jsx` | Updated with `PasswordInput`, `PasswordStrengthMeter`, confirm-password match indicator, and 12-char validation. |
| `src/components.jsx` | Made `Avatar` component safe against undefined profiles or names, with clean image background and initials fallback. |
| `src/App.jsx` | Enhanced `AuthModal` with confirm-password, strength meter, show/hide toggle, and compact 3-column social OAuth grid; enhanced `ProfileModal` with native file upload, preview, and delete; enhanced `SettingsModal` password change. |
| `src/styles.css` | Fixed modal double-scrollbars, added password toggle button styles, strength meter styling, compact social grid, and avatar upload card layout. |
| `package.json` | Added `tests/upload.test.js` to `npm test` script. |
| `tests/upload.test.js` | *(New)* 12 integration test subtests covering password policy, buffer uploads, magic byte checks, size limits, and photo deletion. |
| `tests/browser/auth-ui.spec.js` | *(New)* 6 Playwright browser specs for desktop and mobile authentication and profile photo flows. |
| `docs/AUTHENTICATION_AND_PROFILE_UPLOAD_AUDIT.md` | *(New)* This canonical audit report. |

---

## 9. Manual Steps & Provider Access Guide

### SMTP Configuration (Gmail)
To send emails through Gmail in production or staging:
1. Ensure your Google Account has **2-Step Verification** enabled.
2. Visit **Google Account > Security > App passwords**.
3. Generate an App Password for **Mail** on **CodeLens Backend**.
4. In your environment (e.g. Render, Railway, Heroku, or VPS), set:
   ```env
   EMAIL_FROM=CodeLens <your-email@gmail.com>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```
   *(Note: CodeLens automatically removes any accidental spaces from `SMTP_PASS`).*

### Object Storage Adaptation for Ephemeral Clouds (AWS S3 / Cloudinary)
Currently, avatars are stored persistently in `data/uploads/avatars/`. If you deploy the backend to an ephemeral container platform (such as Render or Heroku free tier where the local disk resets on redeployment):
1. In `server/services/uploadService.js`, the `saveAvatar` function can be switched to upload the buffer directly to an S3 bucket or Cloudinary using the AWS SDK or Cloudinary SDK.
2. In MongoDB, the `state.profile.avatar` field already stores the absolute URL (`https://...`), so no frontend or database schema changes are required.

---

## 10. Conclusion & Final Verdict

The CodeLens platform authentication subsystem, email delivery pipeline, password policy, UI modal layouts, and profile photo upload workflows have been fully resolved, hardened against edge cases, and validated with concrete live evidence. All test suites pass 100%.
