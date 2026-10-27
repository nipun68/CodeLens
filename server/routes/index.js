import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import { createAuthRouter } from '../auth.js';
import { createWorkspaceRouter } from './workspaceRoutes.js';
import { createSnippetRouter } from './snippetRoutes.js';
import executionRoutes from './executionRoutes.js';
import { createAnalyzeRouter } from './analyzeRoutes.js';
import { createBillingRouter } from './billingRoutes.js';
import { getSentEmailLog } from '../email.js';
import {
  secret,
  production,
  fail,
  text,
  token,
  publicAccount
} from '../middleware/authMiddleware.js';

export const createApiRouter = ({
  stripe = null,
  demoBilling = true,
  appUrl = 'http://localhost:5173'
} = {}) => {
  const router = Router();

  // Health endpoint
  router.use(healthRoutes);

  // Authentication router
  const authRouter = createAuthRouter({
    secret,
    production,
    appUrl,
    publicAccount: (a) => publicAccount(a, stripe, demoBilling),
    token,
    fail,
    text
  });
  router.use('/auth', authRouter);

  // Workspace & Learning routes
  router.use(createWorkspaceRouter({ stripe, demoBilling }));

  // Snippets routes
  router.use(createSnippetRouter({ stripe, demoBilling }));

  // Execution & AST-free container tracing routes
  router.use(executionRoutes);

  // Code analysis routes
  router.use(createAnalyzeRouter({ stripe, demoBilling }));

  // Billing & Stripe subscription routes
  router.use(createBillingRouter({ stripe, demoBilling, appUrl }));

  // Test helpers (only mounted in test environment)
  if (process.env.NODE_ENV === 'test') {
    router.get('/test/emails', (req, res) => res.json(getSentEmailLog()));
    router.post('/test/reset-cooldown', async (req, res) => {
      const { updateOtpChallenge, getOtpChallenge } = await import('../models/index.js');
      const challenge = await getOtpChallenge(req.body.email);
      if (challenge) {
        await updateOtpChallenge(challenge._id, { resendCooldownUntil: new Date(Date.now() - 70000) });
      }
      res.json({ ok: true });
    });
  }

  return router;
};

export default createApiRouter;
