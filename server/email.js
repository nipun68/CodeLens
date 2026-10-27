import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Extracts pure email address from an RFC 5322 formatted string or raw email
 */
export function parseSenderAddress(fromHeader) {
  if (!fromHeader) return 'codelens044@gmail.com';
  const trimmed = fromHeader.trim();
  const match = trimmed.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return trimmed.replace(/^[^<]+<|>/g, '').trim();
}

export const DEFAULT_SENDER = parseSenderAddress(process.env.EMAIL_FROM || 'codelens044@gmail.com');

/**
 * Creates a compliant RFC 5322 From header without nested or broken brackets
 */
export function getFormattedFromHeader(fromHeader) {
  const address = parseSenderAddress(fromHeader);
  const raw = (fromHeader || '').trim();
  const nameMatch = raw.match(/^"?([^"<]+)"?\s*</);
  const displayName = (nameMatch && nameMatch[1].trim()) || 'CodeLens Platform';
  return `"${displayName}" <${address}>`;
}

// In-memory record for testing and development auditing
const sentEmailLog = [];

let cachedTransporter = null;

/**
 * Returns configured nodemailer transport or null if running in test/mock mode
 */
export function createTransporter() {
  const host = process.env.SMTP_HOST || (process.env.GMAIL_APP_PASSWORD ? 'smtp.gmail.com' : null);
  const user = process.env.SMTP_USER || (process.env.GMAIL_APP_PASSWORD ? parseSenderAddress(process.env.EMAIL_FROM) : null);
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  }

  return null;
}

export function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();
  }
  return cachedTransporter;
}

export function resetTransporter() {
  cachedTransporter = null;
}

/**
 * Verifies live SMTP credentials and server connectivity
 */
export async function verifySmtpConnection() {
  const t = getTransporter();
  if (!t) {
    return { verified: false, reason: 'SMTP credentials not configured in environment.' };
  }
  try {
    await t.verify();
    return {
      verified: true,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      user: parseSenderAddress(process.env.SMTP_USER || process.env.EMAIL_FROM)
    };
  } catch (err) {
    console.error('[SMTP Verification Error]:', err.code, err.message);
    return { verified: false, error: err.message, code: err.code };
  }
}

/**
 * Send a generic transactional email
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = getFormattedFromHeader(process.env.EMAIL_FROM);
  const emailPayload = {
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  };

  // Safe recipient mask for logging
  const maskedTo = to ? to.replace(/^([^@]{1,2})[^@]*(@.*)$/, '$1***$2') : 'unknown';

  // Always log to internal audit queue (max 50 items)
  sentEmailLog.unshift({
    timestamp: new Date().toISOString(),
    to,
    subject,
    text: emailPayload.text,
    delivered: false
  });
  if (sentEmailLog.length > 50) sentEmailLog.pop();

  const transporter = getTransporter();

  if (transporter && process.env.NODE_ENV !== 'test') {
    try {
      const info = await transporter.sendMail(emailPayload);
      sentEmailLog[0].delivered = true;
      sentEmailLog[0].messageId = info.messageId;
      console.log(`[Email Delivered]: Subject="${subject}" to=${maskedTo} messageId=${info.messageId}`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (err) {
      console.error(`[Email Delivery Failure]: Subject="${subject}" to=${maskedTo} error="${err.message}" code=${err.code}`);
      return { success: false, error: err.message, code: err.code, mode: 'smtp' };
    }
  }

  // Fallback for development / automated testing without live credentials
  sentEmailLog[0].delivered = true;
  sentEmailLog[0].mode = 'dev-simulated';
  return { success: true, mode: 'dev-simulated' };
}


/**
 * Retrieve recent email logs (useful for unit & integration testing)
 */
export function getSentEmailLog() {
  return [...sentEmailLog];
}

export function clearSentEmailLog() {
  sentEmailLog.length = 0;
}

/**
 * Email OTP for Registration
 */
export async function sendOtpEmail({ to, name = 'Learner', otp }) {
  const subject = `${otp} is your CodeLens verification code`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1715; color: #e6edf3; margin: 0; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background: #16221e; border: 1px solid #233830; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 20px; color: #10b981; margin-bottom: 24px; }
        .greeting { font-size: 16px; font-weight: 600; color: #f0fdf4; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 20px; }
        .otp-box { background: #0d1512; border: 2px dashed #10b981; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'JetBrains Mono', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399; }
        .warning { font-size: 12.5px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 4px; margin: 20px 0; }
        .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #233830; padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">✦ CodeLens // Program Intelligence</div>
        <div class="greeting">Hello ${escapeHtml(name)},</div>
        <p class="text">Welcome to CodeLens. To complete your account registration and secure your workspace, enter the following 6-digit verification code:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <div class="warning">
          ⏱ <strong>This code expires in 10 minutes.</strong> For your security, never share this code with anyone.
        </div>
        <p class="text">If you did not initiate this registration, you can safely disregard this email.</p>
        <div class="footer">
          CodeLens Platform • Intelligent Tracing & Program Architecture<br>
          Sent from <code>${DEFAULT_SENDER}</code>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nYour CodeLens verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.\n\nCodeLens Platform`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Welcome Email to Newly Registered Clients
 */
export async function sendWelcomeEmail({ to, name = 'Learner', appUrl = APP_URL }) {
  const subject = 'Welcome to CodeLens — Your Coding Journey Starts Here';
  const cleanAppUrl = appUrl.replace(/\/+$/, '');
  const workspaceUrl = `${cleanAppUrl}/#workspace`;
  const settingsUrl = `${cleanAppUrl}/#subscription`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1210; color: #e6edf3; margin: 0; padding: 24px; }
        .card { max-width: 580px; margin: 0 auto; background: #151e1a; border: 1px solid #22332c; border-radius: 14px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .brand { font-size: 22px; font-weight: 800; color: #10b981; margin-bottom: 24px; }
        .hero { font-size: 20px; font-weight: 750; color: #ffffff; margin-bottom: 14px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 18px; }
        .feature-box { background: #0c1411; border: 1px solid #1e2c26; border-radius: 8px; padding: 18px; margin: 20px 0; }
        .feature-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; font-size: 13.5px; color: #cbd5e1; }
        .feature-item strong { color: #34d399; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 18px 0; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); }
        .footer { font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #22332c; padding-top: 18px; line-height: 1.5; }
        .footer a { color: #10b981; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">✦ CodeLens</div>
        <div class="hero">Welcome aboard, ${escapeHtml(name)}!</div>
        <p class="text">
          Your email has been verified and your CodeLens account is now active. CodeLens brings genuine runtime intelligence, structured state reconstruction, and interactive visual modeling to your code exploration.
        </p>

        <div class="feature-box">
          <div class="feature-item">
            <span>⚡️</span>
            <div><strong>Multi-Language Execution:</strong> Compile and execute Python 3, OpenJDK Java 21, GCC C++17, and Node.js JavaScript directly in secure sandbox runtimes.</div>
          </div>
          <div class="feature-item">
            <span>🔍</span>
            <div><strong>Step-by-Step Execution Tracing:</strong> Inspect step-by-step state changes, memory mutations, local variables, and call stacks with reversible scrubber controls.</div>
          </div>
          <div class="feature-item">
            <span>🌳</span>
            <div><strong>Real-Time Data Structure Visualizers:</strong> Observe live Binary Trees, Directed/Undirected Graphs, LIFO Stacks, FIFO Queues, Heaps, and Dynamic Arrays as your instructions execute.</div>
          </div>
          <div class="feature-item">
            <span>📊</span>
            <div><strong>Complexity Analyzer:</strong> Perform static AST inspection with Big-O time and space classification across every statement and loop boundary.</div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${workspaceUrl}" class="cta-btn">Open CodeLens Workspace →</a>
        </div>

        <p class="text" style="font-size: 13px; margin-top: 20px;">
          You can update your security settings, manage your profile, and configure preferences anytime from your <a href="${settingsUrl}" style="color: #34d399;">Account Settings</a>.
        </p>

        <div class="footer">
          Need assistance or have feedback? Contact us directly at <a href="mailto:${DEFAULT_SENDER}">${DEFAULT_SENDER}</a>.<br>
          CodeLens — Made for the process. Not just the progress.<br>
          Sent from <code>${DEFAULT_SENDER}</code>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Welcome to CodeLens, ${name}!\n\nYour email has been successfully verified.\n\nCodeLens features ready for you:\n- Multi-language sandbox execution (Python, Java, C++, JS)\n- Step-by-step reversible execution tracing\n- Real-time Binary Tree, Graph, Stack, Queue, and Array visualizers\n- Static Big-O time & space complexity analysis\n\nOpen your workspace: ${workspaceUrl}\n\nSupport: ${DEFAULT_SENDER}\nCodeLens Platform`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Password Reset Recovery Email
 */
export async function sendPasswordResetEmail({ to, name = 'Learner', resetUrl, code }) {
  const subject = 'CodeLens — Password Recovery Instructions';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1210; color: #e6edf3; margin: 0; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background: #151e1a; border: 1px solid #22332c; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .brand { font-size: 20px; font-weight: 800; color: #10b981; margin-bottom: 20px; }
        .greeting { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 18px; }
        .cta-btn { display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 16px 0; }
        .code-box { background: #0c1411; border: 1px solid #22332c; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #34d399; margin: 16px 0; }
        .warning { font-size: 12px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 8px 12px; border-radius: 4px; margin: 16px 0; }
        .footer { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #22332c; padding-top: 14px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">✦ CodeLens Security</div>
        <div class="greeting">Hello ${escapeHtml(name)},</div>
        <p class="text">We received a request to reset the password for your CodeLens account. You can reset your password using the link or 6-digit recovery code below:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="cta-btn">Reset My Password →</a>
        </div>

        <p class="text" style="text-align: center; font-size: 13px;">Or enter this verification code directly:</p>
        <div class="code-box">${code}</div>

        <div class="warning">
          ⏱ <strong>This link and code will expire in 15 minutes.</strong> For your protection, each reset code is single-use and invalidates immediately after use.
        </div>
        <p class="text">If you did not request a password reset, please ignore this email. Your existing password remains unchanged.</p>
        <div class="footer">
          CodeLens Platform Security • Sent from <code>${DEFAULT_SENDER}</code>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nA password reset request was received for your CodeLens account.\n\nReset Link: ${resetUrl}\nRecovery Code: ${code}\n\nThis request expires in 15 minutes. If you did not request this, you can ignore this email.\n\nCodeLens Security`;
  return sendEmail({ to, subject, html, text });
}

/**
 * Password Changed Notification Email
 */
export async function sendPasswordChangedEmail({ to, name = 'Learner' }) {
  const subject = 'Your CodeLens password has been changed';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1210; color: #e6edf3; margin: 0; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background: #151e1a; border: 1px solid #22332c; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .brand { font-size: 20px; font-weight: 800; color: #10b981; margin-bottom: 20px; }
        .greeting { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 18px; }
        .alert-box { background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #34d399; margin: 18px 0; }
        .footer { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #22332c; padding-top: 14px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">✦ CodeLens Security</div>
        <div class="greeting">Hello ${escapeHtml(name)},</div>
        <div class="alert-box">
          ✓ Your account password was successfully updated on ${new Date().toUTCString()}.
        </div>
        <p class="text">
          All existing sessions on other browsers have been invalidated according to our account security policy. You can now sign in with your new password.
        </p>
        <p class="text" style="color: #f87171; font-size: 13px;">
          ⚠️ If you did not make this change, please contact us immediately at <a href="mailto:${DEFAULT_SENDER}" style="color: #f87171;">${DEFAULT_SENDER}</a> to secure your account.
        </p>
        <div class="footer">
          CodeLens Security Team • Sent from <code>${DEFAULT_SENDER}</code>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nYour CodeLens password was successfully updated on ${new Date().toUTCString()}.\n\nIf you did not make this change, contact us immediately at ${DEFAULT_SENDER}.\n\nCodeLens Security`;
  return sendEmail({ to, subject, html, text });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
