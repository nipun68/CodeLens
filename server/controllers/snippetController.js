import { randomUUID } from 'node:crypto';
import { mutateAccount } from '../models/index.js';
import { fail, text, publicAccount } from '../middleware/authMiddleware.js';

export const createSnippet = async (req, res, stripe = null, demoBilling = true) => {
  const title = text(req.body.title, 'Title', 100);
  const code = text(req.body.code, 'Code', 30000);
  const language = req.body.language;
  if (!['javascript', 'html', 'css', 'python', 'java', 'cpp'].includes(language)) fail('Unsupported language.');
  const tags = Array.isArray(req.body.tags) ? req.body.tags.slice(0, 5).map(t => text(t, 'Tag', 25)) : [];

  const { account } = await mutateAccount(req.accountId, a => {
    if (a.state.subscription.plan !== 'pro' && a.state.snippets.length >= 5) fail('Your free library holds 5 snippets. Upgrade to Pro for more.', 403);
    if (a.state.snippets.length >= 500) fail('Your library has reached its 500-snippet safety limit.', 403);
    a.state.snippets.unshift({ id: randomUUID(), title, code, language, tags, createdAt: new Date().toISOString() });
  });

  res.status(201).json(publicAccount(account, stripe, demoBilling));
};

export const deleteSnippet = async (req, res, stripe = null, demoBilling = true) => {
  const { account } = await mutateAccount(req.accountId, a => {
    if (!a.state.snippets.some(s => s.id === req.params.id)) fail('Snippet not found.', 404);
    a.state.snippets = a.state.snippets.filter(s => s.id !== req.params.id);
  });

  res.json(publicAccount(account, stripe, demoBilling));
};
