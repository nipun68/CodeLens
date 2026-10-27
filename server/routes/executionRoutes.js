import { Router } from 'express';
import { executeCode } from '../controllers/executionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { executionLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

router.post('/execution', requireAuth, executionLimiter, executeCode);
router.post('/v1/execution', requireAuth, executionLimiter, executeCode);

export default router;
