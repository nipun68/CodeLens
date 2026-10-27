import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// MVC Architectural Layers
import { connectStore, isMongoConnected } from './models/index.js';
import { setStorageMode } from './controllers/healthController.js';
import { handleWebhook } from './controllers/billingController.js';
import { createApiRouter } from './routes/index.js';
import {
  helmetMiddleware,
  corsSecurityMiddleware,
  apiLimiter,
  extractSession,
  apiNotFoundHandler,
  centralizedErrorHandler,
  production,
  secret
} from './middleware/index.js';

// Environment & Security Validation
if (production && (!process.env.JWT_SECRET || secret.length < 32 || secret.includes('replace-this'))) {
  throw new Error('Set a strong JWT_SECRET before deploying.');
}

const appUrl = process.env.APP_URL || 'http://localhost:5173';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const demoBilling = !stripe && !production && process.env.DEMO_BILLING !== 'false';

const app = express();
app.disable('x-powered-by');

// Security headers (Helmet)
app.use(helmetMiddleware);

// Stripe webhook requires raw body for signature verification before JSON parser
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  return handleWebhook(req, res, next, stripe);
});

// JSON body parsing and Cookie parsing
app.use(express.json({ limit: '150kb' }));
app.use(cookieParser());

// Rate limiting & CORS security for API endpoints
app.use('/api', apiLimiter);
app.use('/api', corsSecurityMiddleware);

// Extract user session identity from cookie or bearer token
app.use(extractSession);

// Mount Master API Router (Health, Auth, Workspace, Snippets, Execution, Analyze, Billing)
app.use('/api', createApiRouter({ stripe, demoBilling, appUrl }));

// Catch-all structured JSON 404 handler for unrecognized /api routes
app.use('/api', apiNotFoundHandler);

// Static frontend distribution
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDist = path.join(root, 'client', 'dist');
const distPath = fs.existsSync(clientDist) ? clientDist : path.join(root, 'dist');
app.use(express.static(distPath));
app.get('/{*path}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

// Centralized error handling middleware
app.use(centralizedErrorHandler);

// Database connection & Store initialization
const storageMode = await connectStore();
setStorageMode(storageMode);

// Server startup
const port = Number(process.env.PORT) || 3001;
const server = app.listen(port);

server.on('listening', () => {
  console.log(`DevPulse API: http://localhost:${server.address().port} | ${storageMode} | Billing: ${stripe ? 'Stripe' : demoBilling ? 'demo (no payments)' : 'unavailable'}`);
  if (!process.env.JWT_SECRET) {
    console.warn('Development session secret is temporary. Set JWT_SECRET in .env to keep sessions across server restarts.');
  }
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cannot start DevPulse API: port ${port} is already in use. Stop the other server or set PORT to a free port.`);
  } else {
    console.error('Cannot start DevPulse API:', error);
  }
  process.exitCode = 1;
});

// Graceful process termination (SIGTERM, SIGINT)
const gracefulShutdown = async (signal) => {
  console.log(`[Shutdown] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(async () => {
    console.log('[Shutdown] HTTP server closed.');
    if (isMongoConnected()) {
      try {
        const mongoose = (await import('mongoose')).default;
        await mongoose.disconnect();
        console.log('[Shutdown] MongoDB connection closed.');
      } catch (err) {
        console.error('[Shutdown Error] Error disconnecting MongoDB:', err.message);
      }
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
