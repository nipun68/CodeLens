import { Router } from 'express';
import { createSnippet, deleteSnippet } from '../controllers/snippetController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const createSnippetRouter = ({ stripe = null, demoBilling = true }) => {
  const router = Router();

  router.post('/snippets', requireAuth, (req, res) => createSnippet(req, res, stripe, demoBilling));
  router.delete('/snippets/:id', requireAuth, (req, res) => deleteSnippet(req, res, stripe, demoBilling));

  return router;
};

export default createSnippetRouter;
