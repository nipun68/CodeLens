import { findAccount, mutateAccount, getAccount } from '../models/index.js';
import { fail, publicAccount } from '../middleware/authMiddleware.js';

export const handleWebhook = async (req, res, next, stripe) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  try {
    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      const payload = event.data.object;
      const customerId = typeof payload.customer === 'string' ? payload.customer : payload.customer.id;
      const account = await findAccount('stripeCustomerId', customerId);
      if (account) {
        const sub = await stripe.subscriptions.retrieve(payload.id);
        const price = sub.items.data[0]?.price;
        const validPrice = [process.env.STRIPE_PRO_MONTHLY_PRICE_ID, process.env.STRIPE_PRO_YEARLY_PRICE_ID].filter(Boolean).includes(price?.id);
        await mutateAccount(account._id, a => {
          a.state.subscription = {
            plan: validPrice && ['active', 'trialing'].includes(sub.status) ? 'pro' : 'free',
            status: sub.status,
            interval: price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
            demo: false,
            id: sub.id,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: sub.items.data[0]?.current_period_end || null
          };
        });
      }
    }
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const createCheckoutSession = async (req, res, stripe, demoBilling, appUrl) => {
  const interval = req.body.interval;
  if (!['monthly', 'yearly'].includes(interval)) {
    fail('Choose monthly or yearly billing.');
  }

  if (demoBilling) {
    if (req.body.confirmDemo !== true) {
      fail('Confirm that this is a demo subscription. No payment is collected.');
    }
    const { account } = await mutateAccount(req.accountId, a => {
      a.state.subscription = { plan: 'pro', status: 'active', interval, demo: true };
    });
    return res.json({ account: publicAccount(account, stripe, demoBilling), demo: true });
  }

  if (!stripe) {
    fail('Payments are not configured. Add your Stripe keys to enable subscriptions.', 503);
  }

  const price = interval === 'monthly' ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID : process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  if (!price || !process.env.STRIPE_WEBHOOK_SECRET) {
    fail('Stripe prices and webhook secret must be configured.', 503);
  }

  const { account, result: url } = await mutateAccount(req.accountId, async a => {
    if (!a.email) fail('Create an account before subscribing.', 403);
    if (a.state.subscription.plan === 'pro') fail('You already have Pro. Use Manage billing instead.', 409);
    if (!a.stripeCustomerId) {
      a.stripeCustomerId = (await stripe.customers.create(
        { email: a.email, metadata: { accountId: a._id } },
        { idempotencyKey: `customer-${a._id}` }
      )).id;
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: a.stripeCustomerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: a._id,
      success_url: `${appUrl}/?billing=success#subscription`,
      cancel_url: `${appUrl}/?billing=cancelled#subscription`,
      subscription_data: { metadata: { accountId: a._id } }
    });
    return session.url;
  });

  res.json({ url });
};

export const createPortalSession = async (req, res, stripe, appUrl) => {
  const account = await getAccount(req.accountId);
  if (!account) fail('Account not found.', 401);
  if (!stripe || !account.stripeCustomerId) fail('No Stripe billing account found.', 400);
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appUrl}/#subscription`
  });
  res.json({ url: session.url });
};

export const cancelDemoSubscription = async (req, res, stripe, demoBilling) => {
  const { account } = await mutateAccount(req.accountId, a => {
    if (!a.state.subscription.demo) fail('Use the billing portal to manage a paid subscription.');
    a.state.subscription = { plan: 'free', status: 'inactive', interval: 'monthly', demo: false };
  });
  res.json(publicAccount(account, stripe, demoBilling));
};
