import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const production = process.env.NODE_ENV === 'production';
const appUrl = process.env.APP_URL || 'http://localhost:5173';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

export const corsSecurityMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigin = process.env.ALLOWED_ORIGIN || appUrl;

  if (origin) {
    let isAllowed = false;
    try {
      const parsedOrigin = new URL(origin).origin;
      const parsedConfigured = new URL(configuredOrigin).origin;

      if (parsedOrigin === parsedConfigured) {
        isAllowed = true;
      } else if (!production) {
        const reqUrl = new URL(origin);
        isAllowed = reqUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(reqUrl.hostname);
      }
    } catch {
      isAllowed = false;
    }

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    let allowedOrigin = !origin;
    if (origin) {
      try {
        const parsedOrigin = new URL(origin).origin;
        const parsedConfigured = new URL(configuredOrigin).origin;
        if (parsedOrigin === parsedConfigured) {
          allowedOrigin = true;
        } else if (!production) {
          const reqUrl = new URL(origin);
          allowedOrigin = reqUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(reqUrl.hostname);
        }
      } catch {
        allowedOrigin = false;
      }
    }

    if (!allowedOrigin) {
      return res.status(403).json({ error: 'This request origin is not allowed.' });
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      return res.status(403).json({ error: 'Cross-site request blocked.' });
    }
  }

  next();
};

export const apiLimiter = rateLimit({
  windowMs: 60000,
  limit: 160,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute.' }
});

export const executionLimiter = rateLimit({
  windowMs: 60000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Execution limit reached. Please wait a minute.' }
});
