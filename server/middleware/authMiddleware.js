import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { streak } from '../seed.js';
import { getAccount, createAccount } from '../models/index.js';

export const secret = process.env.JWT_SECRET || randomBytes(48).toString('hex');
export const production = process.env.NODE_ENV === 'production';

export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

export const text = (value, label, max = 200, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    fail(`${label} must be ${required ? '1' : '0'}–${max} characters.`);
  }
  return value.trim();
};

export const token = (res, id) => {
  return res.cookie(
    'devpulse_session',
    jwt.sign({ sub: id }, secret, { expiresIn: '30d' }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      maxAge: 30 * 86400000,
      path: '/'
    }
  );
};

export const publicAccount = (a, stripeInstance = null, demoBilling = true) => ({
  ...a.state,
  id: a._id,
  email: a.email || null,
  isGuest: !a.email,
  emailVerified: a.emailVerified ?? false,
  verifiedAt: a.verifiedAt || null,
  oauthProviders: Object.keys(a.oauth || {}),
  streak: streak(a.state.checkins),
  billingMode: stripeInstance ? 'stripe' : demoBilling ? 'demo' : 'unavailable'
});

/**
 * Extracts session accountId from devpulse_session cookie or Authorization Bearer header
 */
export const extractSession = (req, res, next) => {
  let sessionToken = req.cookies?.devpulse_session;
  if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
    sessionToken = req.headers.authorization.slice(7).trim();
  }

  if (sessionToken) {
    try {
      const decoded = jwt.verify(sessionToken, secret);
      req.accountId = decoded.sub;
    } catch {
      // Cookie or bearer token invalid or expired
    }
  }
  next();
};

/**
 * Enforces an active session identity on protected routes
 */
export const requireAuth = (req, res, next) => {
  if (!req.accountId) {
    return res.status(401).json({ error: 'Your session expired. Please refresh or sign in again.' });
  }
  next();
};
