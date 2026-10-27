import { Router } from 'express';
import { analyzeSnippet } from '../controllers/analyzeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const createAnalyzeRouter = ({ stripe = null, demoBilling = true }) => {
  const router = Router();

  router.post('/analyze', requireAuth, (req, res) => analyzeSnippet(req, res, stripe, demoBilling));

  return router;
};

export default createAnalyzeRouter;
