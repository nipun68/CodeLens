import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { getAccount, createAccount, mutateAccount } from '../models/index.js';
import { secret, fail, text, token, publicAccount } from '../middleware/authMiddleware.js';
import { saveAvatar, getAvatarFilePath, deleteAvatarFile } from '../services/uploadService.js';

export const getSession = async (req, res, stripe = null, demoBilling = true) => {
  let account;
  if (req.cookies?.devpulse_session) {
    try {
      const decoded = jwt.verify(req.cookies.devpulse_session, secret);
      account = await getAccount(decoded.sub);
    } catch {
      // Missing or expired cookie
    }
  }

  if (!account && req.accountId) {
    try {
      account = await getAccount(req.accountId);
    } catch {
      // Ignored
    }
  }

  if (!account) {
    account = await createAccount();
    token(res, account._id);
  }

  res.set('Cache-Control', 'no-store').json(publicAccount(account, stripe, demoBilling));
};

export const updateProfile = async (req, res, stripe = null, demoBilling = true) => {
  const name = text(req.body.name, 'Name', 60);
  const handle = text(req.body.handle, 'Handle', 30);
  if (!/^@?[a-zA-Z0-9_]+$/.test(handle)) fail('Handles can contain letters, numbers, and underscores.');
  const bio = text(req.body.bio, 'Bio', 180, false);
  const avatar = text(req.body.avatar || '', 'Avatar URL', 1000, false);
  if (avatar && !/^https:\/\//i.test(avatar) && !/^\/api\/uploads\/avatars\//i.test(avatar) && !avatar.startsWith('data:image/')) {
    fail('Avatar images must use an HTTPS URL or CodeLens upload URL.');
  }
  if (!Array.isArray(req.body.goals) || req.body.goals.length > 2) fail('Add up to two goals.');
  const goals = req.body.goals.map(g => text(g, 'Goal', 120, false));

  const { account } = await mutateAccount(req.accountId, a => {
    a.state.profile = {
      name,
      handle: handle.startsWith('@') ? handle : '@' + handle,
      bio,
      avatar,
      goals
    };
  });

  res.json(publicAccount(account, stripe, demoBilling));
};

export const uploadAvatar = async (req, res, stripe = null, demoBilling = true) => {
  let buffer;
  if (Buffer.isBuffer(req.body)) {
    buffer = req.body;
  } else if (req.body?.image && typeof req.body.image === 'string') {
    const base64Data = req.body.image.replace(/^data:image\/[a-z]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else if (req.body?.dataUrl && typeof req.body.dataUrl === 'string') {
    const base64Data = req.body.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    fail('No image file payload provided.', 400);
  }

  const uploaded = saveAvatar({ accountId: req.accountId, buffer });

  const { account } = await mutateAccount(req.accountId, a => {
    if (a.state.profile?.avatar && a.state.profile.avatar.startsWith('/api/uploads/avatars/')) {
      deleteAvatarFile(a.state.profile.avatar);
    }
    if (!a.state.profile) a.state.profile = {};
    a.state.profile.avatar = uploaded.url;
  });

  res.status(200).json({
    ...publicAccount(account, stripe, demoBilling),
    success: true,
    avatar: uploaded.url,
    avatarUrl: uploaded.url,
    message: 'Profile photo uploaded successfully.'
  });
};

export const removeAvatar = async (req, res, stripe = null, demoBilling = true) => {
  const { account } = await mutateAccount(req.accountId, a => {
    if (a.state.profile?.avatar && a.state.profile.avatar.startsWith('/api/uploads/avatars/')) {
      deleteAvatarFile(a.state.profile.avatar);
    }
    if (a.state.profile) {
      a.state.profile.avatar = '';
    }
  });

  res.status(200).json({
    ...publicAccount(account, stripe, demoBilling),
    success: true,
    avatar: '',
    message: 'Profile photo removed.'
  });
};

export const serveAvatar = (req, res) => {
  const fileInfo = getAvatarFilePath(req.params.filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Avatar not found.' });
  }

  res.setHeader('Content-Type', fileInfo.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  fs.createReadStream(fileInfo.filePath).pipe(res);
};

export const createCheckin = async (req, res, stripe = null, demoBilling = true) => {
  const reflection = text(req.body.reflection, 'Reflection', 1500);
  const mood = text(req.body.mood || 'steady', 'Mood', 20);
  if (!['steady', 'inspired', 'challenged'].includes(mood)) fail('Choose a valid mood.');
  const date = new Date().toISOString().slice(0, 10);

  const { account } = await mutateAccount(req.accountId, a => {
    if (a.state.checkins.some(c => c.date === date)) fail('You already checked in today. Come back tomorrow!', 409);
    a.state.checkins.unshift({ id: randomUUID(), date, reflection, mood });
    a.state.xp += 10;
  });

  res.json(publicAccount(account, stripe, demoBilling));
};

export const recordFocus = async (req, res, stripe = null, demoBilling = true) => {
  const seconds = Number(req.body.seconds);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) fail('A focus session must be 1–3600 seconds.');
  const { account } = await mutateAccount(req.accountId, a => {
    a.state.focusSeconds += seconds;
  });
  res.json(publicAccount(account, stripe, demoBilling));
};

export const createTopic = async (req, res, stripe = null, demoBilling = true) => {
  const name = text(req.body.name, 'Topic name', 100);
  if (!Array.isArray(req.body.lessons) || !req.body.lessons.length || req.body.lessons.length > 12) fail('Add 1–12 lessons.');
  const lessons = req.body.lessons.map(l => text(l, 'Lesson', 100));

  const { account } = await mutateAccount(req.accountId, a => {
    if (a.state.subscription.plan !== 'pro') fail('Custom learning paths are part of Pro.', 403);
    if (a.state.topics.length >= 30) fail('You can have up to 30 learning paths.');
    a.state.topics.push({
      id: randomUUID(),
      name,
      lessons,
      progress: 0,
      color: ['mint', 'lilac', 'amber', 'rose'][a.state.topics.length % 4]
    });
  });

  res.status(201).json(publicAccount(account, stripe, demoBilling));
};

export const completeLesson = async (req, res, stripe = null, demoBilling = true) => {
  const { account } = await mutateAccount(req.accountId, a => {
    const topic = a.state.topics.find(t => t.id === req.params.id);
    const index = Number(req.params.index);
    if (!topic || !Number.isInteger(index) || index < 0 || index >= topic.lessons.length) fail('Lesson not found.', 404);
    const key = `${topic.id}:${index}`;
    if (!a.state.completedLessons.includes(key)) {
      a.state.completedLessons.push(key);
      a.state.xp += 25;
      a.state.solved++;
    }
    topic.progress = Math.round(
      topic.lessons.filter((_, i) => a.state.completedLessons.includes(`${topic.id}:${i}`)).length / topic.lessons.length * 100
    );
  });

  res.json(publicAccount(account, stripe, demoBilling));
};
