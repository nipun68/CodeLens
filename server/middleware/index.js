import {
  secret,
  production,
  fail,
  text,
  token,
  publicAccount,
  extractSession,
  requireAuth
} from './authMiddleware.js';

import {
  helmetMiddleware,
  corsSecurityMiddleware,
  apiLimiter,
  executionLimiter
} from './securityMiddleware.js';

import {
  apiNotFoundHandler,
  centralizedErrorHandler
} from './errorMiddleware.js';

export {
  secret,
  production,
  fail,
  text,
  token,
  publicAccount,
  extractSession,
  requireAuth,
  helmetMiddleware,
  corsSecurityMiddleware,
  apiLimiter,
  executionLimiter,
  apiNotFoundHandler,
  centralizedErrorHandler
};

export default {
  secret,
  production,
  fail,
  text,
  token,
  publicAccount,
  extractSession,
  requireAuth,
  helmetMiddleware,
  corsSecurityMiddleware,
  apiLimiter,
  executionLimiter,
  apiNotFoundHandler,
  centralizedErrorHandler
};
