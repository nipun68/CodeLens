import mongoose from 'mongoose';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { initialState } from './seed.js';
import { randomUUID } from 'node:crypto';

const accountSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, index: { unique: true, sparse: true } },
  password: String,
  state: mongoose.Schema.Types.Mixed,
  stripeCustomerId: String,
  emailVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  welcomeSent: { type: Boolean, default: false },
  welcomeSentAt: Date,
  tokenVersion: { type: Number, default: 0 },
  oauth: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const otpSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, index: true },
  hashedOtp: String,
  purpose: { type: String, default: 'registration' },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } },
  resendCooldownUntil: Date,
  verified: { type: Boolean, default: false }
}, { timestamps: true });

const passwordResetSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, index: true },
  hashedToken: { type: String, index: true },
  hashedCode: String,
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, index: { expires: 0 } },
  used: { type: Boolean, default: false }
}, { timestamps: true });

export const Account = mongoose.model('Account', accountSchema);
export const OtpChallenge = mongoose.model('OtpChallenge', otpSchema);
export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

let local = {
  accounts: {},
  otps: {},
  passwordResets: {}
};
let file;
let queue = Promise.resolve();
let mongo = false;

export function isMongoConnected() {
  return mongo && mongoose.connection.readyState === 1;
}

export async function connectStore() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      mongo = true;
      return 'MongoDB (Connected)';
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to connect to MongoDB in production: ${err.message}. Local JSON fallback is disabled in production.`);
      }
      console.warn(`[Database Warning] Could not connect to configured MONGODB_URI: ${err.message}. Falling back to local JSON store.`);
    }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production. Local JSON storage fallback is disabled in production environments.');
  }
  file = path.resolve(process.env.DATA_FILE || 'data/devpulse.json');
  await mkdir(path.dirname(file), { recursive: true });
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'));
    local.accounts = raw.accounts || {};
    local.otps = raw.otps || {};
    local.passwordResets = raw.passwordResets || {};
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return 'Local JSON (development mode)';
}

async function persist() {
  if (!file) return;
  const snapshot = JSON.stringify(local, null, 2);
  const task = queue.catch(() => {}).then(async () => {
    await writeFile(file + '.tmp', snapshot, { mode: 0o600 });
    await rename(file + '.tmp', file);
  });
  queue = task;
  return task;
}

export async function getAccount(id) {
  return mongo ? Account.findById(id).lean() : structuredClone(local.accounts[id] || null);
}

export async function findAccount(field, value) {
  if (mongo) {
    return Account.findOne({ [field]: value }).lean();
  }
  return structuredClone(Object.values(local.accounts).find(a => a[field] === value) || null);
}

export async function findAccountByOAuth(provider, providerId) {
  if (mongo) {
    return Account.findOne({ [`oauth.${provider}.id`]: providerId }).lean();
  }
  return structuredClone(Object.values(local.accounts).find(a => a.oauth && a.oauth[provider]?.id === providerId) || null);
}

export async function saveAccount(account) {
  if (mongo) {
    await Account.updateOne(
      { _id: account._id },
      {
        $set: {
          state: account.state,
          email: account.email,
          password: account.password,
          stripeCustomerId: account.stripeCustomerId,
          emailVerified: account.emailVerified ?? false,
          verifiedAt: account.verifiedAt ?? null,
          welcomeSent: account.welcomeSent ?? false,
          welcomeSentAt: account.welcomeSentAt ?? null,
          tokenVersion: account.tokenVersion ?? 0,
          oauth: account.oauth || {}
        }
      },
      { upsert: true }
    );
  } else {
    local.accounts[account._id] = structuredClone(account);
    await persist();
  }
  return account;
}

export async function createAccount(initialData = {}) {
  const id = initialData._id || randomUUID();
  const seed = initialState();
  const state = initialData.state ? {
    ...seed,
    ...initialData.state,
    profile: { ...seed.profile, ...(initialData.state.profile || {}) }
  } : seed;
  const account = {
    _id: id,
    state,
    email: initialData.email || null,
    password: initialData.password || null,
    emailVerified: initialData.emailVerified ?? false,
    verifiedAt: initialData.verifiedAt ?? null,
    welcomeSent: initialData.welcomeSent ?? false,
    welcomeSentAt: initialData.welcomeSentAt ?? null,
    tokenVersion: initialData.tokenVersion ?? 0,
    oauth: initialData.oauth || {},
    stripeCustomerId: initialData.stripeCustomerId || null
  };
  return saveAccount(account);
}

// Serialize per-account mutations
const locks = new Map();
export async function mutateAccount(id, fn) {
  const previous = locks.get(id) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const account = await getAccount(id);
    if (!account) throw Object.assign(new Error('Please sign in again.'), { status: 401 });
    const result = await fn(account);
    await saveAccount(account);
    return { account, result };
  });
  locks.set(id, task);
  try { return await task; }
  finally { if (locks.get(id) === task) locks.delete(id); }
}

// ============================================================================
// OTP CHALLENGE STORAGE (Email OTP Verification for Registration & Recovery)
// ============================================================================

export async function saveOtpChallenge(challenge) {
  const record = {
    _id: challenge._id || randomUUID(),
    email: challenge.email.toLowerCase(),
    hashedOtp: challenge.hashedOtp,
    purpose: challenge.purpose || 'registration',
    attempts: challenge.attempts || 0,
    expiresAt: challenge.expiresAt instanceof Date ? challenge.expiresAt : new Date(challenge.expiresAt),
    resendCooldownUntil: challenge.resendCooldownUntil instanceof Date ? challenge.resendCooldownUntil : new Date(challenge.resendCooldownUntil),
    verified: challenge.verified || false
  };

  if (mongo) {
    await OtpChallenge.deleteMany({ email: record.email, purpose: record.purpose });
    await OtpChallenge.create(record);
  } else {
    // Delete any previous challenge for this email and purpose
    for (const [id, c] of Object.entries(local.otps)) {
      if (c.email === record.email && c.purpose === record.purpose) {
        delete local.otps[id];
      }
    }
    local.otps[record._id] = structuredClone(record);
    await persist();
  }
  return record;
}

export async function getOtpChallenge(email, purpose = 'registration') {
  const normalizedEmail = email.toLowerCase();
  if (mongo) {
    return OtpChallenge.findOne({ email: normalizedEmail, purpose, verified: false }).lean();
  }
  return structuredClone(
    Object.values(local.otps).find(c => c.email === normalizedEmail && c.purpose === purpose && !c.verified) || null
  );
}

export async function updateOtpChallenge(id, updates) {
  if (mongo) {
    await OtpChallenge.updateOne({ _id: id }, { $set: updates });
    return OtpChallenge.findById(id).lean();
  }
  if (local.otps[id]) {
    Object.assign(local.otps[id], updates);
    await persist();
    return structuredClone(local.otps[id]);
  }
  return null;
}

export async function deleteOtpChallenge(email, purpose = 'registration') {
  const normalizedEmail = email.toLowerCase();
  if (mongo) {
    await OtpChallenge.deleteMany({ email: normalizedEmail, purpose });
  } else {
    for (const [id, c] of Object.entries(local.otps)) {
      if (c.email === normalizedEmail && c.purpose === purpose) {
        delete local.otps[id];
      }
    }
    await persist();
  }
}

// ============================================================================
// PASSWORD RESET STORAGE
// ============================================================================

export async function savePasswordReset(reset) {
  const record = {
    _id: reset._id || randomUUID(),
    email: reset.email.toLowerCase(),
    hashedToken: reset.hashedToken || null,
    hashedCode: reset.hashedCode || null,
    attempts: reset.attempts || 0,
    expiresAt: reset.expiresAt instanceof Date ? reset.expiresAt : new Date(reset.expiresAt),
    used: false
  };

  if (mongo) {
    await PasswordReset.deleteMany({ email: record.email });
    await PasswordReset.create(record);
  } else {
    for (const [id, r] of Object.entries(local.passwordResets)) {
      if (r.email === record.email) {
        delete local.passwordResets[id];
      }
    }
    local.passwordResets[record._id] = structuredClone(record);
    await persist();
  }
  return record;
}

export async function getPasswordResetByToken(hashedToken) {
  if (!hashedToken) return null;
  if (mongo) {
    return PasswordReset.findOne({ hashedToken, used: false }).lean();
  }
  return structuredClone(
    Object.values(local.passwordResets).find(r => r.hashedToken === hashedToken && !r.used) || null
  );
}

export async function getPasswordResetByCode(email, hashedCode) {
  const normalizedEmail = email.toLowerCase();
  if (mongo) {
    return PasswordReset.findOne({ email: normalizedEmail, hashedCode, used: false }).lean();
  }
  return structuredClone(
    Object.values(local.passwordResets).find(r => r.email === normalizedEmail && r.hashedCode === hashedCode && !r.used) || null
  );
}

export async function updatePasswordReset(id, updates) {
  if (mongo) {
    await PasswordReset.updateOne({ _id: id }, { $set: updates });
  } else if (local.passwordResets[id]) {
    Object.assign(local.passwordResets[id], updates);
    await persist();
  }
}

export async function invalidatePasswordReset(id) {
  if (mongo) {
    await PasswordReset.updateOne({ _id: id }, { $set: { used: true } });
  } else if (local.passwordResets[id]) {
    local.passwordResets[id].used = true;
    await persist();
  }
}
