import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, randomInt, createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {
  findAccount,
  findAccountByOAuth,
  getAccount,
  createAccount,
  saveAccount,
  mutateAccount,
  saveOtpChallenge,
  getOtpChallenge,
  updateOtpChallenge,
  deleteOtpChallenge,
  savePasswordReset,
  getPasswordResetByToken,
  getPasswordResetByCode,
  invalidatePasswordReset
} from './store.js';
import {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from './email.js';

export function createAuthRouter({ secret, production, appUrl, publicAccount, token, fail, text }) {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' }
  });

  const otpLimiter = rateLimit({
    windowMs: 10 * 60000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many verification attempts. Please wait a few minutes.' }
  });

  const hashSecret = (val) => createHash('sha256').update(val + secret).digest('hex');

  const COMMON_PASSWORDS = new Set([
    'password1234',
    '123456789012',
    'qwertyuiop12',
    'admin1234567',
    'welcome12345',
    'codelens1234',
    'iloveyou1234',
    'monkey123456',
    'letmein12345',
    'password123456'
  ]);

  function validatePasswordPolicy(password, confirmPassword = undefined) {
    if (typeof password !== 'string') {
      fail('Password must be a valid string.', 400);
    }
    if (password.length < 12) {
      fail('Password must contain at least 12 characters.', 400);
    }
    if (password.length > 128) {
      fail('Password cannot exceed 128 characters.', 400);
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
      fail('This password is too common or easily guessed. Please choose a stronger password.', 400);
    }
    if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) {
      fail('Passwords do not match. Please verify both fields.', 400);
    }
  }

  function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user[user.length - 1]}@${domain}`;
  }

  // ==========================================================================
  // 1. REGISTRATION & EMAIL OTP DISPATCH
  // ==========================================================================

  router.post('/register', authLimiter, async (req, res, next) => {
    try {
      const email = text(req.body.email, 'Email', 254).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
      const password = text(req.body.password, 'Password', 128);
      validatePasswordPolicy(password, req.body.confirmPassword);
      const name = text(req.body.name, 'Name', 60).trim();

      const existing = await findAccount('email', email);
      if (existing && existing.emailVerified) {
        fail('An account with this email already exists.', 409);
      }

      const hash = await bcrypt.hash(password, 12);

      let targetAccountId = req.accountId;
      let account;

      if (targetAccountId) {
        // Upgrade current guest workspace
        const current = await getAccount(targetAccountId);
        if (current && current.email && current.email !== email && current.emailVerified) {
          fail('This workspace is already linked to an existing verified account.', 409);
        }
        const mutated = await mutateAccount(targetAccountId, a => {
          a.email = email;
          a.password = hash;
          a.emailVerified = false;
          if (!a.state.profile) a.state.profile = {};
          a.state.profile.name = name;
        });
        account = mutated.account;
      } else {
        // Create new account
        account = await createAccount({
          email,
          password: hash,
          emailVerified: false,
          state: {
            profile: { name, handle: '@' + name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user' }
          }
        });
      }

      // Generate cryptographically secure 6-digit OTP
      const otp = randomInt(100000, 1000000).toString();
      const hashedOtp = hashSecret(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const resendCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds

      await saveOtpChallenge({
        email,
        hashedOtp,
        purpose: 'registration',
        attempts: 0,
        expiresAt,
        resendCooldownUntil
      });

      // Send verification email
      const emailResult = await sendOtpEmail({ to: email, name, otp });
      if (!emailResult.success && emailResult.mode === 'smtp') {
        console.error('[Registration Email Failed]: Could not deliver OTP to', maskEmail(email), emailResult.error);
        await deleteOtpChallenge(email, 'registration');
        fail('Could not deliver verification email to this address. Please verify your email or SMTP configuration.', 502);
      }

      // Establish session cookie so subsequent actions know the account context
      token(res, account._id);

      res.status(200).json({
        ...publicAccount(account),
        pendingVerification: true,
        emailVerified: false,
        email,
        maskedEmail: maskEmail(email),
        resendCooldown: 60,
        message: 'Registration initiated. A 6-digit verification code has been sent to your email.'
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 2. VERIFY EMAIL OTP
  // ==========================================================================

  router.post('/verify-otp', otpLimiter, async (req, res, next) => {
    try {
      const email = text(req.body.email, 'Email', 254).toLowerCase().trim();
      const otp = text(req.body.otp, 'Verification code', 10).trim();

      const challenge = await getOtpChallenge(email, 'registration');
      if (!challenge) {
        fail('No active verification code found for this email. Please request a new code.', 400);
      }

      // Expiration check
      if (new Date() > new Date(challenge.expiresAt)) {
        await deleteOtpChallenge(email, 'registration');
        fail('Verification code has expired. Please request a new code.', 400);
      }

      // Max attempts check (max 5)
      if (challenge.attempts >= 5) {
        await deleteOtpChallenge(email, 'registration');
        fail('Too many failed verification attempts. This code has been invalidated. Please request a new code.', 429);
      }

      // Compare cryptographic hash
      const hashedInput = hashSecret(otp);
      if (hashedInput !== challenge.hashedOtp) {
        const nextAttempts = challenge.attempts + 1;
        await updateOtpChallenge(challenge._id, { attempts: nextAttempts });
        const remaining = 5 - nextAttempts;
        if (remaining <= 0) {
          await deleteOtpChallenge(email, 'registration');
          fail('Too many failed attempts. This code has been invalidated. Please request a new code.', 429);
        }
        fail(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 400);
      }

      // Mark challenge invalidated immediately to prevent replay attacks
      await deleteOtpChallenge(email, 'registration');

      // Update account to verified
      const account = await findAccount('email', email);
      if (!account) fail('Account not found.', 404);

      let sendWelcome = false;
      const { account: updatedAccount } = await mutateAccount(account._id, a => {
        a.emailVerified = true;
        a.verifiedAt = new Date();
        if (!a.welcomeSent) {
          sendWelcome = true;
          a.welcomeSent = true;
          a.welcomeSentAt = new Date();
        }
      });

      // Send CodeLens Welcome Email (idempotent, only once per user upon registration)
      if (sendWelcome) {
        sendWelcomeEmail({
          to: email,
          name: updatedAccount.state?.profile?.name || 'Learner',
          appUrl,
          force: true
        }).catch(err => console.error('[Welcome Email Background Error]:', err.message));
      }

      // Confirm authenticated session
      token(res, updatedAccount._id);

      res.json({
        success: true,
        verified: true,
        emailVerified: true,
        account: publicAccount(updatedAccount),
        message: 'Email successfully verified. Welcome to CodeLens!'
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 3. RESEND EMAIL OTP
  // ==========================================================================

  router.post('/resend-otp', otpLimiter, async (req, res, next) => {
    try {
      const email = text(req.body.email, 'Email', 254).toLowerCase().trim();
      const account = await findAccount('email', email);
      if (!account) {
        // Return generic success to avoid enumeration
        return res.json({ success: true, message: 'If this email is pending verification, a new code was sent.', resendCooldown: 60 });
      }

      if (account.emailVerified) {
        fail('This email address is already verified. Please sign in.', 400);
      }

      const existingChallenge = await getOtpChallenge(email, 'registration');
      if (existingChallenge && new Date() < new Date(existingChallenge.resendCooldownUntil)) {
        const remainingSec = Math.ceil((new Date(existingChallenge.resendCooldownUntil).getTime() - Date.now()) / 1000);
        fail(`Please wait ${remainingSec} second${remainingSec === 1 ? '' : 's'} before requesting another code.`, 429);
      }

      // Generate new OTP & invalidate previous
      const otp = randomInt(100000, 1000000).toString();
      const hashedOtp = hashSecret(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const resendCooldownUntil = new Date(Date.now() + 60 * 1000);

      await saveOtpChallenge({
        email,
        hashedOtp,
        purpose: 'registration',
        attempts: 0,
        expiresAt,
        resendCooldownUntil
      });

      const sendResult = await sendOtpEmail({
        to: email,
        name: account.state?.profile?.name || 'Learner',
        otp
      });

      if (!sendResult.success && sendResult.mode === 'smtp') {
        console.error('[Resend OTP Email Failed]: Could not deliver OTP to', maskEmail(email), sendResult.error);
        fail('Failed to deliver verification email. Please check your SMTP settings or try again.', 502);
      }

      res.json({
        success: true,
        message: 'A new 6-digit verification code has been sent to your email.',
        resendCooldown: 60
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 4. SIGN IN
  // ==========================================================================

  router.post('/login', authLimiter, async (req, res, next) => {
    try {
      const email = text(req.body.email, 'Email', 254).toLowerCase().trim();
      const password = text(req.body.password, 'Password', 128);
      const account = await findAccount('email', email);
      if (!account?.password || !(await bcrypt.compare(password, account.password))) {
        fail('Email or password is incorrect.', 401);
      }

      // Check if user has not yet verified email
      if (account.emailVerified === false) {
        token(res, account._id);
        return res.json({
          ...publicAccount(account),
          pendingVerification: true,
          emailVerified: false,
          maskedEmail: maskEmail(email),
          message: 'Please complete email verification to unlock all platform features.'
        });
      }

      token(res, account._id);
      res.json(publicAccount(account));
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 5. SIGN OUT
  // ==========================================================================

  router.post('/logout', (req, res) => {
    res.clearCookie('devpulse_session', { path: '/' });
    res.clearCookie('codelens_oauth_state', { path: '/' });
    res.json({ ok: true, success: true });
  });

  // ==========================================================================
  // 6. FORGOT PASSWORD (REQUEST RESET CODE OR LINK)
  // ==========================================================================

  router.post('/forgot-password', authLimiter, async (req, res, next) => {
    try {
      const email = text(req.body.email || req.body.target || '', 'Email address', 254).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail('Enter a valid email address.');
      }

      const genericResponse = {
        success: true,
        message: 'If an account matches that email address, password reset instructions have been sent.'
      };

      const account = await findAccount('email', email);
      if (!account) {
        return res.json(genericResponse);
      }

      // Generate single-use reset token and 6-digit recovery code
      const resetToken = randomBytes(32).toString('hex');
      const resetCode = randomInt(100000, 1000000).toString();
      const hashedToken = hashSecret(resetToken);
      const hashedCode = hashSecret(resetCode);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await savePasswordReset({
        email,
        hashedToken,
        hashedCode,
        expiresAt
      });

      const cleanAppUrl = appUrl.replace(/\/+$/, '');
      const resetUrl = `${cleanAppUrl}/?resetToken=${resetToken}#reset-password`;

      await sendPasswordResetEmail({
        to: email,
        name: account.state?.profile?.name || 'Learner',
        resetUrl,
        code: resetCode
      });

      res.json(genericResponse);
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 7. RESET PASSWORD (SUBMIT TOKEN OR CODE WITH NEW PASSWORD)
  // ==========================================================================

  router.post('/reset-password', authLimiter, async (req, res, next) => {
    try {
      const tokenInput = req.body.token ? String(req.body.token).trim() : null;
      const emailInput = req.body.email ? String(req.body.email).toLowerCase().trim() : null;
      const codeInput = req.body.code ? String(req.body.code).trim() : null;
      const newPassword = text(req.body.newPassword || req.body.password, 'New password', 128);
      validatePasswordPolicy(newPassword, req.body.confirmPassword);

      let resetRecord = null;

      if (tokenInput) {
        const hashedToken = hashSecret(tokenInput);
        resetRecord = await getPasswordResetByToken(hashedToken);
      } else if (emailInput && codeInput) {
        const hashedCode = hashSecret(codeInput);
        resetRecord = await getPasswordResetByCode(emailInput, hashedCode);
      } else {
        fail('Password reset token or recovery code is required.', 400);
      }

      if (!resetRecord) {
        fail('Password reset link or code is invalid or has already been used.', 400);
      }

      if (new Date() > new Date(resetRecord.expiresAt)) {
        await invalidatePasswordReset(resetRecord._id);
        fail('Password reset link or code has expired. Please request a new one.', 400);
      }

      const account = await findAccount('email', resetRecord.email);
      if (!account) {
        fail('Account not found.', 404);
      }

      // Hash new password securely
      const hash = await bcrypt.hash(newPassword, 12);

      // Invalidate existing sessions by incrementing tokenVersion
      await mutateAccount(account._id, a => {
        a.password = hash;
        a.tokenVersion = (a.tokenVersion || 0) + 1;
        a.emailVerified = true; // Recovering via verified email proves ownership
      });

      // Invalidate reset credential immediately
      await invalidatePasswordReset(resetRecord._id);

      // Send password changed security notification
      sendPasswordChangedEmail({
        to: account.email,
        name: account.state?.profile?.name || 'Learner'
      }).catch(err => console.error('[Password Changed Email Error]:', err.message));

      res.json({
        success: true,
        message: 'Your password has been successfully reset. You can now sign in with your new password.'
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 8. CHANGE PASSWORD (AUTHENTICATED FROM PROFILE / SETTINGS)
  // ==========================================================================

  router.post('/change-password', async (req, res, next) => {
    try {
      if (!req.accountId) fail('Please sign in to change your password.', 401);
      const account = await getAccount(req.accountId);
      if (!account) fail('Account not found.', 404);

      const currentPassword = text(req.body.currentPassword, 'Current password', 128);
      const newPassword = text(req.body.newPassword, 'New password', 128);
      validatePasswordPolicy(newPassword, req.body.confirmPassword);

      if (account.password && !(await bcrypt.compare(currentPassword, account.password))) {
        fail('Current password is incorrect.', 401);
      }

      const hash = await bcrypt.hash(newPassword, 12);

      await mutateAccount(account._id, a => {
        a.password = hash;
        a.tokenVersion = (a.tokenVersion || 0) + 1;
      });

      // Send confirmation notification
      if (account.email) {
        sendPasswordChangedEmail({
          to: account.email,
          name: account.state?.profile?.name || 'Learner'
        }).catch(err => console.error('[Password Changed Email Error]:', err.message));
      }

      res.json({
        success: true,
        message: 'Password successfully updated. All other active sessions have been invalidated.'
      });
    } catch (err) {
      next(err);
    }
  });

  // ==========================================================================
  // 9. GOOGLE OAUTH
  // ==========================================================================

  router.get('/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      if (req.accepts('html')) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent('Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.')}`);
      }
      return res.status(503).json({
        error: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.'
      });
    }

    const state = randomBytes(24).toString('hex');
    res.cookie('codelens_oauth_state', state, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });

    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account'
    }).toString();

    res.redirect(authUrl);
  });

  router.get('/google/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(String(error))}`);
      }

      const savedState = req.cookies.codelens_oauth_state;
      res.clearCookie('codelens_oauth_state');
      if (!state || state !== savedState) {
        return res.redirect(`${appUrl}/#landing?oauthError=Invalid%20OAuth%20state%20verification`);
      }

      const redirectUri = `${appUrl}/api/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return res.redirect(`${appUrl}/#landing?oauthError=Google%20token%20exchange%20failed`);
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const googleUser = await userRes.json();

      if (!googleUser.email || !googleUser.email_verified) {
        return res.redirect(`${appUrl}/#landing?oauthError=Google%20email%20not%20verified`);
      }

      const email = googleUser.email.toLowerCase().trim();
      const googleId = googleUser.sub;
      const name = googleUser.name || 'Google Learner';
      const picture = googleUser.picture || '';

      let account = await findAccountByOAuth('google', googleId);
      let isNew = false;

      if (!account) {
        // Check if existing verified account matches this email
        account = await findAccount('email', email);
        if (account) {
          // Link Google identity to existing verified account
          await mutateAccount(account._id, a => {
            if (!a.oauth) a.oauth = {};
            a.oauth.google = { id: googleId, email, linkedAt: new Date() };
            a.emailVerified = true;
          });
        } else {
          // Create new account
          isNew = true;
          account = await createAccount({
            email,
            emailVerified: true,
            verifiedAt: new Date(),
            welcomeSent: true,
            welcomeSentAt: new Date(),
            oauth: { google: { id: googleId, email, linkedAt: new Date() } },
            state: {
              profile: {
                name,
                avatar: picture,
                handle: '@' + name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'google_user'
              }
            }
          });
        }
      }

      if (isNew) {
        sendWelcomeEmail({ to: email, name, appUrl, force: true }).catch(() => {});
      }

      token(res, account._id);
      res.redirect(`${appUrl}/#workspace`);
    } catch (err) {
      console.error('[Google OAuth Callback Error]:', err);
      res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(err.message)}`);
    }
  });

  // ==========================================================================
  // 10. GITHUB OAUTH
  // ==========================================================================

  router.get('/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
      if (req.accepts('html')) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent('GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to environment variables.')}`);
      }
      return res.status(503).json({
        error: 'GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to environment variables.'
      });
    }

    const state = randomBytes(24).toString('hex');
    res.cookie('codelens_oauth_state', state, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });

    const redirectUri = `${appUrl}/api/auth/github/callback`;
    const authUrl = `https://github.com/login/oauth/authorize?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state
    }).toString();

    res.redirect(authUrl);
  });

  router.get('/github/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(String(error))}`);
      }

      const savedState = req.cookies.codelens_oauth_state;
      res.clearCookie('codelens_oauth_state');
      if (!state || state !== savedState) {
        return res.redirect(`${appUrl}/#landing?oauthError=Invalid%20OAuth%20state%20verification`);
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: String(code)
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect(`${appUrl}/#landing?oauthError=GitHub%20token%20exchange%20failed`);
      }

      const headers = {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'CodeLens-App'
      };

      const userRes = await fetch('https://api.github.com/user', { headers });
      const ghUser = await userRes.json();
      const githubId = String(ghUser.id);

      // Fetch verified email through GitHub emails API to properly handle private emails
      let email = ghUser.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          const primaryVerified = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified);
          if (primaryVerified) email = primaryVerified.email;
        }
      }

      if (!email) {
        return res.redirect(`${appUrl}/#landing?oauthError=GitHub%20verified%20email%20not%20available`);
      }

      email = email.toLowerCase().trim();
      const name = ghUser.name || ghUser.login || 'GitHub Coder';
      const avatar = ghUser.avatar_url || '';

      let account = await findAccountByOAuth('github', githubId);
      let isNew = false;

      if (!account) {
        account = await findAccount('email', email);
        if (account) {
          await mutateAccount(account._id, a => {
            if (!a.oauth) a.oauth = {};
            a.oauth.github = { id: githubId, username: ghUser.login, email, linkedAt: new Date() };
            a.emailVerified = true;
          });
        } else {
          isNew = true;
          account = await createAccount({
            email,
            emailVerified: true,
            verifiedAt: new Date(),
            welcomeSent: true,
            welcomeSentAt: new Date(),
            oauth: { github: { id: githubId, username: ghUser.login, email, linkedAt: new Date() } },
            state: {
              profile: {
                name,
                avatar,
                handle: '@' + (ghUser.login || 'coder').toLowerCase().slice(0, 20)
              }
            }
          });
        }
      }

      if (isNew) {
        sendWelcomeEmail({ to: email, name, appUrl, force: true }).catch(() => {});
      }

      token(res, account._id);
      res.redirect(`${appUrl}/#workspace`);
    } catch (err) {
      console.error('[GitHub OAuth Callback Error]:', err);
      res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(err.message)}`);
    }
  });

  // ==========================================================================
  // 11. LINKEDIN OAUTH (OPENID CONNECT)
  // ==========================================================================

  router.get('/linkedin', (req, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId || !process.env.LINKEDIN_CLIENT_SECRET) {
      if (req.accepts('html')) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent('LinkedIn OAuth is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to environment variables.')}`);
      }
      return res.status(503).json({
        error: 'LinkedIn OAuth is not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to environment variables.'
      });
    }

    const state = randomBytes(24).toString('hex');
    res.cookie('codelens_oauth_state', state, {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });

    const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state
    }).toString();

    res.redirect(authUrl);
  });

  router.get('/linkedin/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) {
        return res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(String(error))}`);
      }

      const savedState = req.cookies.codelens_oauth_state;
      res.clearCookie('codelens_oauth_state');
      if (!state || state !== savedState) {
        return res.redirect(`${appUrl}/#landing?oauthError=Invalid%20OAuth%20state%20verification`);
      }

      const redirectUri = `${appUrl}/api/auth/linkedin/callback`;
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return res.redirect(`${appUrl}/#landing?oauthError=LinkedIn%20token%20exchange%20failed`);
      }

      // Fetch user profile via LinkedIn OpenID Connect UserInfo endpoint
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const lnUser = await userRes.json();

      if (!lnUser.email) {
        return res.redirect(`${appUrl}/#landing?oauthError=LinkedIn%20verified%20email%20not%20available`);
      }

      const email = lnUser.email.toLowerCase().trim();
      const linkedinId = lnUser.sub;
      const name = lnUser.name || `${lnUser.given_name || ''} ${lnUser.family_name || ''}`.trim() || 'LinkedIn Learner';
      const picture = lnUser.picture || '';

      let account = await findAccountByOAuth('linkedin', linkedinId);
      let isNew = false;

      if (!account) {
        account = await findAccount('email', email);
        if (account) {
          await mutateAccount(account._id, a => {
            if (!a.oauth) a.oauth = {};
            a.oauth.linkedin = { id: linkedinId, email, linkedAt: new Date() };
            a.emailVerified = true;
          });
        } else {
          isNew = true;
          account = await createAccount({
            email,
            emailVerified: true,
            verifiedAt: new Date(),
            welcomeSent: true,
            welcomeSentAt: new Date(),
            oauth: { linkedin: { id: linkedinId, email, linkedAt: new Date() } },
            state: {
              profile: {
                name,
                avatar: picture,
                handle: '@' + name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'linkedin_user'
              }
            }
          });
        }
      }

      if (isNew) {
        sendWelcomeEmail({ to: email, name, appUrl, force: true }).catch(() => {});
      }

      token(res, account._id);
      res.redirect(`${appUrl}/#workspace`);
    } catch (err) {
      console.error('[LinkedIn OAuth Callback Error]:', err);
      res.redirect(`${appUrl}/#landing?oauthError=${encodeURIComponent(err.message)}`);
    }
  });

  return router;
}
