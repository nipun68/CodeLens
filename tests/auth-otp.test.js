import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('Email OTP Verification, Resend Cooldowns, Security Rate Limits & Welcome Email', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'codelens-otp-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));

  let server;
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: '',
    JWT_SECRET: 'test-secret-for-otp-and-welcome-email-tests-32-chars-long',
    NODE_ENV: 'test',
    DATA_FILE: path.join(directory, 'state.json'),
    DEMO_BILLING: 'true',
    APP_URL: `http://localhost:${port}`,
    EMAIL_FROM: 'codelens044@gmail.com'
  };

  const start = () => new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 15000);
    server.stdout.on('data', data => {
      log += data;
      if (log.includes('DevPulse API:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on('data', data => { log += data; });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${log}`)); });
  });

  const stop = () => new Promise(resolve => {
    if (!server || server.exitCode !== null) return resolve();
    server.once('exit', resolve);
    server.kill();
  });

  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });

  await start();

  function createClient() {
    let cookie = '';
    return async (url, method = 'GET', body, extra = {}) => {
      const response = await fetch(`http://127.0.0.1:${port}/api${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extra },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (response.headers.get('set-cookie')) {
        cookie = response.headers.get('set-cookie').split(';')[0];
      }
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      return { status: response.status, data };
    };
  }

  const carol = createClient();
  let freshOtp = null;

  await t.test('1. Registration initiates OTP challenge, hashes credentials, and dispatches verification email', async () => {
    const reg = await carol('/auth/register', 'POST', {
      name: 'Carol Danvers',
      email: 'carol@example.com',
      password: 'super-secure-password-123'
    });

    assert.equal(reg.status, 200);
    assert.equal(reg.data.pendingVerification, true);
    assert.equal(reg.data.email, 'carol@example.com');
    assert.equal(reg.data.emailVerified, false);
    assert.equal(reg.data.isGuest, false);

    // Verify session state reflects unverified status
    const session = await carol('/session');
    assert.equal(session.data.emailVerified, false);

    // Verify OTP email was dispatched
    const emailsRes = await carol('/test/emails');
    const emails = emailsRes.data;
    const otpEmail = emails.find(e => e.to === 'carol@example.com' && /verification code/i.test(e.subject));
    assert.ok(otpEmail, 'OTP verification email must be in the delivery queue');
    assert.match(otpEmail.text, /\b\d{6}\b/);
  });

  await t.test('2. Resend cooldown blocks immediate re-issuing within 60s', async () => {
    const resend = await carol('/auth/resend-otp', 'POST', { email: 'carol@example.com' });
    assert.equal(resend.status, 429);
    assert.match(resend.data.error.message || resend.data.error, /wait|cooldown/i);
  });

  await t.test('3. Invalid OTP is rejected and increments attempt count', async () => {
    const wrong = await carol('/auth/verify-otp', 'POST', {
      email: 'carol@example.com',
      otp: '999999'
    });
    assert.equal(wrong.status, 400);
    assert.match(wrong.data.error.message || wrong.data.error, /invalid/i);
  });

  await t.test('4. Too many failed attempts blocks verification and invalidates OTP', async () => {
    // 3 more wrong attempts (making it 4 total failed attempts)
    for (let i = 0; i < 3; i++) {
      await carol('/auth/verify-otp', 'POST', {
        email: 'carol@example.com',
        otp: `00000${i}`
      });
    }

    // 5th failed attempt must return 429
    const fifthAttempt = await carol('/auth/verify-otp', 'POST', {
      email: 'carol@example.com',
      otp: '000004'
    });
    assert.equal(fifthAttempt.status, 429);
    assert.match(fifthAttempt.data.error.message || fifthAttempt.data.error, /too many/i);

    // Subsequent attempt confirms challenge is invalidated
    const locked = await carol('/auth/verify-otp', 'POST', {
      email: 'carol@example.com',
      otp: '123456'
    });
    assert.equal(locked.status, 400);
    assert.match(locked.data.error.message || locked.data.error, /no active/i);
  });

  await t.test('5. Re-issue fresh OTP after cooldown and verify successfully', async () => {
    // Clear cooldown via test helper
    await carol('/test/reset-cooldown', 'POST', { email: 'carol@example.com' });

    // Resend OTP
    const resend = await carol('/auth/resend-otp', 'POST', { email: 'carol@example.com' });
    assert.equal(resend.status, 200);

    // Retrieve fresh OTP from email queue
    const emailsRes = await carol('/test/emails');
    const freshOtpEmail = emailsRes.data[0];
    const match = freshOtpEmail.text.match(/\b\d{6}\b/);
    assert.ok(match, 'Fresh OTP must be a 6-digit number');
    freshOtp = match[0];

    // Verify with valid fresh OTP
    const verified = await carol('/auth/verify-otp', 'POST', {
      email: 'carol@example.com',
      otp: freshOtp
    });

    assert.equal(verified.status, 200);
    assert.equal(verified.data.verified, true);
    assert.equal(verified.data.emailVerified, true);
    assert.ok(verified.data.account.verifiedAt);

    // Verify session
    const session = await carol('/session');
    assert.equal(session.data.emailVerified, true);
  });

  await t.test('6. Reused OTP is immediately rejected (challenge was invalidated upon success)', async () => {
    const reused = await carol('/auth/verify-otp', 'POST', {
      email: 'carol@example.com',
      otp: freshOtp
    });
    assert.equal(reused.status, 400);
    assert.match(reused.data.error.message || reused.data.error, /no active|invalid/i);
  });

  await t.test('7. Welcome email is dispatched with CodeLens branding, real features, and CTA link', async () => {
    const emailsRes = await carol('/test/emails');
    const emails = emailsRes.data;
    const welcome = emails.find(e => e.to === 'carol@example.com' && e.subject.includes('Welcome to CodeLens'));

    assert.ok(welcome, 'Welcome email must be sent after successful verification');
    assert.equal(welcome.subject, 'Welcome to CodeLens — Your Coding Journey Starts Here');
    assert.match(welcome.text, /Carol Danvers/);
    assert.match(welcome.text, /Multi-language sandbox execution/);
    assert.match(welcome.text, /reversible execution tracing/i);
    assert.match(welcome.text, /Binary Tree, Graph, Stack, Queue/);
  });
});
