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
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <title>${otp} is your CodeLens verification code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { color: #ffaa40; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#07090e" style="width: 100% !important; background-color: #07090e; min-height: 100vh; padding: 36px 16px; margin: 0;">
        <tr>
          <td align="center" valign="top">
            <!-- Main Card Container -->
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#10141f" style="max-width: 520px; width: 100%; background-color: #10141f; border: 1px solid #242b3a; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 149, 31, 0.1);">
              <!-- Top Orange Gradient Accent Bar -->
              <tr>
                <td height="4" bgcolor="#ff951f" style="background: linear-gradient(90deg, #ff951f 0%, #ffaa40 50%, #ea7200 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding: 36px 32px 32px;">
                  <!-- Brand Header -->
                  <div style="margin-bottom: 26px;">
                    <span style="font-size: 21px; font-weight: 800; color: #ff951f; letter-spacing: -0.3px;">✦ CodeLens</span>
                    <span style="font-size: 13px; font-weight: 600; color: #717d96; font-family: 'JetBrains Mono', Consolas, Courier, monospace; margin-left: 6px;">// Program Intelligence</span>
                  </div>

                  <!-- Greeting -->
                  <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 12px; letter-spacing: -0.3px;">
                    Hello ${escapeHtml(name)},
                  </div>

                  <!-- Instruction Text -->
                  <p style="font-size: 14.5px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px;">
                    Welcome to CodeLens. To complete your account registration and secure your workspace, enter the following 6-digit verification code:
                  </p>

                  <!-- OTP Code Display Box -->
                  <div style="background-color: #090c13; border: 2px dashed #ff951f; border-radius: 10px; padding: 22px 16px; text-align: center; margin: 26px 0; box-shadow: inset 0 0 20px rgba(255, 149, 31, 0.08);">
                    <div style="font-family: 'JetBrains Mono', 'SF Mono', Consolas, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 9px; color: #ffaa40; text-shadow: 0 0 16px rgba(255, 149, 31, 0.35); padding-left: 9px;">
                      ${otp}
                    </div>
                  </div>

                  <!-- Expiry Alert Callout -->
                  <div style="font-size: 13px; color: #ffbe6b; background-color: rgba(255, 149, 31, 0.1); border-left: 3px solid #ff951f; padding: 10px 14px; border-radius: 6px; margin: 22px 0; line-height: 1.5;">
                    ⏱ <strong>This code expires in 10 minutes.</strong> For your security, never share this code with anyone.
                  </div>

                  <!-- Notice -->
                  <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 20px 0 0;">
                    If you did not initiate this registration, you can safely disregard this email.
                  </p>

                  <!-- Footer -->
                  <div style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #1f2636; padding-top: 18px; text-align: center; line-height: 1.6;">
                    <strong style="color: #94a3b8;">CodeLens Platform</strong> • Intelligent Tracing & Program Architecture<br>
                    Sent from <code style="color: #ffaa40; background: rgba(255, 149, 31, 0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${DEFAULT_SENDER}</code>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <title>Welcome to CodeLens</title>
      <style>
        body { margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { color: #ffaa40; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#07090e" style="width: 100% !important; background-color: #07090e; min-height: 100vh; padding: 36px 16px; margin: 0;">
        <tr>
          <td align="center" valign="top">
            <!-- Main Card Container -->
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#10141f" style="max-width: 580px; width: 100%; background-color: #10141f; border: 1px solid #242b3a; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 149, 31, 0.1);">
              <!-- Top Orange Gradient Accent Bar -->
              <tr>
                <td height="4" bgcolor="#ff951f" style="background: linear-gradient(90deg, #ff951f 0%, #ffaa40 50%, #ea7200 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding: 38px 34px 34px;">
                  <!-- Brand Header -->
                  <div style="font-size: 21px; font-weight: 800; color: #ff951f; margin-bottom: 24px; letter-spacing: -0.3px;">
                    ✦ CodeLens
                  </div>

                  <!-- Hero Title -->
                  <div style="font-size: 23px; font-weight: 800; color: #ffffff; margin-bottom: 14px; letter-spacing: -0.4px;">
                    Welcome aboard, ${escapeHtml(name)}!
                  </div>

                  <!-- Intro Statement -->
                  <p style="font-size: 14.5px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px;">
                    Your email has been verified and your CodeLens account is now active. CodeLens brings genuine runtime intelligence, structured state reconstruction, and interactive visual modeling to your code exploration.
                  </p>

                  <!-- Feature Showcase Box -->
                  <div style="background-color: #090c13; border: 1px solid #1f2636; border-radius: 10px; padding: 22px; margin: 24px 0;">
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
                      <span style="font-size: 18px; line-height: 1;">⚡</span>
                      <div><strong style="color: #ffaa40;">Multi-Language Execution:</strong> Compile and execute Python 3, OpenJDK Java 21, GCC C++17, and Node.js JavaScript directly in secure sandbox runtimes.</div>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
                      <span style="font-size: 18px; line-height: 1;">🔍</span>
                      <div><strong style="color: #ffaa40;">Step-by-Step Execution Tracing:</strong> Inspect step-by-step state changes, memory mutations, local variables, and call stacks with reversible scrubber controls.</div>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
                      <span style="font-size: 18px; line-height: 1;">🌳</span>
                      <div><strong style="color: #ffaa40;">Real-Time Data Structure Visualizers:</strong> Observe live Binary Trees, Directed/Undirected Graphs, LIFO Stacks, FIFO Queues, Heaps, and Dynamic Arrays as your instructions execute.</div>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px; font-size: 13.5px; line-height: 1.5; color: #cbd5e1;">
                      <span style="font-size: 18px; line-height: 1;">📊</span>
                      <div><strong style="color: #ffaa40;">Complexity Analyzer:</strong> Perform static AST inspection with Big-O time and space classification across every statement and loop boundary.</div>
                    </div>
                  </div>

                  <!-- Primary CTA Button -->
                  <div style="text-align: center; margin: 30px 0 22px;">
                    <a href="${workspaceUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff951f 0%, #ea7200 100%); background-color: #ff951f; color: #07090e; text-decoration: none; font-weight: 800; font-size: 14.5px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 18px rgba(255, 149, 31, 0.45); letter-spacing: 0.2px;">
                      Open CodeLens Workspace →
                    </a>
                  </div>

                  <!-- Account Settings Link -->
                  <p style="font-size: 13px; color: #64748b; text-align: center; margin: 20px 0 0;">
                    You can manage your preferences anytime in <a href="${settingsUrl}" style="color: #ffaa40; text-decoration: underline;">Account Settings</a>.
                  </p>

                  <!-- Footer -->
                  <div style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #1f2636; padding-top: 18px; text-align: center; line-height: 1.6;">
                    Need assistance or have feedback? Contact us directly at <a href="mailto:${DEFAULT_SENDER}" style="color: #ffaa40; text-decoration: none;">${DEFAULT_SENDER}</a>.<br>
                    <strong style="color: #94a3b8;">CodeLens</strong> — Made for the process. Not just the progress.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <title>CodeLens Password Recovery</title>
      <style>
        body { margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { color: #ffaa40; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#07090e" style="width: 100% !important; background-color: #07090e; min-height: 100vh; padding: 36px 16px; margin: 0;">
        <tr>
          <td align="center" valign="top">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#10141f" style="max-width: 540px; width: 100%; background-color: #10141f; border: 1px solid #242b3a; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 149, 31, 0.1);">
              <!-- Top Orange Gradient Accent Bar -->
              <tr>
                <td height="4" bgcolor="#ff951f" style="background: linear-gradient(90deg, #ff951f 0%, #ffaa40 50%, #ea7200 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding: 36px 32px 32px;">
                  <div style="font-size: 21px; font-weight: 800; color: #ff951f; margin-bottom: 22px; letter-spacing: -0.3px;">
                    ✦ CodeLens Security
                  </div>
                  <div style="font-size: 19px; font-weight: 700; color: #ffffff; margin-bottom: 12px; letter-spacing: -0.2px;">
                    Hello ${escapeHtml(name)},
                  </div>
                  <p style="font-size: 14.5px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px;">
                    We received a request to reset the password for your CodeLens account. You can reset your password using the link or 6-digit recovery code below:
                  </p>
                  
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff951f 0%, #ea7200 100%); background-color: #ff951f; color: #07090e; text-decoration: none; font-weight: 800; font-size: 14px; padding: 13px 28px; border-radius: 8px; box-shadow: 0 4px 18px rgba(255, 149, 31, 0.4);">
                      Reset My Password →
                    </a>
                  </div>

                  <p style="text-align: center; font-size: 13px; color: #94a3b8; margin: 18px 0 8px;">Or enter this verification code directly:</p>
                  <div style="background-color: #090c13; border: 1px solid #1f2636; padding: 16px; border-radius: 8px; font-family: 'JetBrains Mono', Consolas, Courier, monospace; font-size: 26px; font-weight: 800; letter-spacing: 6px; text-align: center; color: #ffaa40; margin: 12px 0 20px;">
                    ${code}
                  </div>

                  <div style="font-size: 13px; color: #ffbe6b; background-color: rgba(255, 149, 31, 0.1); border-left: 3px solid #ff951f; padding: 10px 14px; border-radius: 6px; margin: 18px 0; line-height: 1.5;">
                    ⏱ <strong>This link and code will expire in 15 minutes.</strong> For your protection, each reset code is single-use and invalidates immediately after use.
                  </div>

                  <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 16px 0 0;">
                    If you did not request a password reset, please ignore this email. Your existing password remains unchanged.
                  </p>
                  <div style="font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1f2636; padding-top: 16px; text-align: center; line-height: 1.6;">
                    CodeLens Platform Security • Sent from <code style="color: #ffaa40; background: rgba(255, 149, 31, 0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${DEFAULT_SENDER}</code>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
      <title>Password Changed</title>
      <style>
        body { margin: 0; padding: 0; background-color: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { color: #ffaa40; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090e; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#07090e" style="width: 100% !important; background-color: #07090e; min-height: 100vh; padding: 36px 16px; margin: 0;">
        <tr>
          <td align="center" valign="top">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#10141f" style="max-width: 540px; width: 100%; background-color: #10141f; border: 1px solid #242b3a; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 149, 31, 0.1);">
              <!-- Top Orange Gradient Accent Bar -->
              <tr>
                <td height="4" bgcolor="#ff951f" style="background: linear-gradient(90deg, #ff951f 0%, #ffaa40 50%, #ea7200 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding: 36px 32px 32px;">
                  <div style="font-size: 21px; font-weight: 800; color: #ff951f; margin-bottom: 22px; letter-spacing: -0.3px;">
                    ✦ CodeLens Security
                  </div>
                  <div style="font-size: 19px; font-weight: 700; color: #ffffff; margin-bottom: 12px; letter-spacing: -0.2px;">
                    Hello ${escapeHtml(name)},
                  </div>
                  <div style="background-color: rgba(255, 149, 31, 0.1); border-left: 3px solid #ff951f; padding: 12px 14px; border-radius: 6px; font-size: 13.5px; color: #ffbe6b; margin: 18px 0; line-height: 1.5;">
                    ✓ Your account password was successfully updated on ${new Date().toUTCString()}.
                  </div>
                  <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px;">
                    All existing sessions on other browsers have been invalidated according to our account security policy. You can now sign in with your new password.
                  </p>
                  <p style="color: #f87171; font-size: 13px; line-height: 1.5; margin: 16px 0 0;">
                    ⚠️ If you did not make this change, please contact us immediately at <a href="mailto:${DEFAULT_SENDER}" style="color: #f87171; text-decoration: underline;">${DEFAULT_SENDER}</a> to secure your account.
                  </p>
                  <div style="font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1f2636; padding-top: 16px; text-align: center; line-height: 1.6;">
                    CodeLens Security Team • Sent from <code style="color: #ffaa40; background: rgba(255, 149, 31, 0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${DEFAULT_SENDER}</code>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
