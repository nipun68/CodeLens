import { randomUUID } from 'node:crypto';
import { mutateAccount } from '../models/index.js';
import { analyzeCode } from '../services/analyzeService.js';
import { fail, text, publicAccount } from '../middleware/authMiddleware.js';

export const analyzeSnippet = async (req, res, stripe = null, demoBilling = true) => {
  const code = text(req.body.code, 'Code', 30000);
  const language = req.body.language;
  if (!['javascript', 'html', 'css'].includes(language)) {
    fail('Choose JavaScript, HTML, or CSS.');
  }

  const { account, result } = await mutateAccount(req.accountId, a => {
    const date = new Date().toISOString().slice(0, 10);
    if (a.state.usage.date !== date) a.state.usage = { date, analyses: 0 };
    const limit = a.state.subscription.plan === 'pro' ? 100 : 10;
    if (a.state.usage.analyses >= limit) {
      fail(`You have used your ${limit} daily reviews. ${limit === 10 ? 'Upgrade to Pro for 100 per day.' : 'Come back tomorrow.'}`, 429);
    }
    const result = analyzeCode(code, language);
    a.state.usage.analyses++;
    a.state.sessions.unshift({
      id: randomUUID(),
      language,
      score: result.score,
      findings: result.findings.length,
      createdAt: new Date().toISOString()
    });
    a.state.sessions = a.state.sessions.slice(0, 100);
    return result;
  });

  res.json({ analysis: result, account: publicAccount(account, stripe, demoBilling) });
};
