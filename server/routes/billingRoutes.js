import { Router } from 'express';
import express from 'express';
import {
  handleWebhook,
  createCheckoutSession,
  createPortalSession,
  cancelDemoSubscription
} from '../controllers/billingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const createBillingRouter = ({ stripe = null, demoBilling = true, appUrl = 'http://localhost:5173' }) => {
  const router = Router();

  // Webhook endpoint requires raw body parsing for Stripe cryptographic signature verification
  router.post('/billing/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    return handleWebhook(req, res, next, stripe);
  });

  router.post('/billing/checkout', requireAuth, (req, res) => {
    return createCheckoutSession(req, res, stripe, demoBilling, appUrl);
  });

  router.post('/billing/portal', requireAuth, (req, res) => {
    return createPortalSession(req, res, stripe, appUrl);
  });

  router.post('/billing/cancel-demo', requireAuth, (req, res) => {
    return cancelDemoSubscription(req, res, stripe, demoBilling);
  });

  return router;
};

export default createBillingRouter;
