import express, { Router } from 'express';
import {
  getSession,
  updateProfile,
  createCheckin,
  recordFocus,
  createTopic,
  completeLesson,
  uploadAvatar,
  removeAvatar,
  serveAvatar
} from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const rawImageParser = express.raw({ type: ['image/*', 'application/octet-stream'], limit: '6mb' });
const jsonImageParser = express.json({ limit: '10mb' });

export const createWorkspaceRouter = ({ stripe = null, demoBilling = true }) => {
  const router = Router();

  router.get('/session', (req, res) => getSession(req, res, stripe, demoBilling));
  router.patch('/profile', requireAuth, (req, res) => updateProfile(req, res, stripe, demoBilling));

  // Profile Avatar Upload & Management
  router.post(
    '/profile/avatar',
    requireAuth,
    (req, res, next) => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.startsWith('image/') || contentType === 'application/octet-stream') {
        return rawImageParser(req, res, next);
      }
      return jsonImageParser(req, res, next);
    },
    (req, res) => uploadAvatar(req, res, stripe, demoBilling)
  );
  router.delete('/profile/avatar', requireAuth, (req, res) => removeAvatar(req, res, stripe, demoBilling));
  router.get('/uploads/avatars/:filename', serveAvatar);

  router.post('/checkins', requireAuth, (req, res) => createCheckin(req, res, stripe, demoBilling));
  router.post('/focus', requireAuth, (req, res) => recordFocus(req, res, stripe, demoBilling));
  router.post('/topics', requireAuth, (req, res) => createTopic(req, res, stripe, demoBilling));
  router.post('/topics/:id/lessons/:index', requireAuth, (req, res) => completeLesson(req, res, stripe, demoBilling));

  return router;
};

export default createWorkspaceRouter;
