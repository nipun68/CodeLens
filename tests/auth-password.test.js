import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('Password Recovery (Tokens & Codes), Account Enumeration Defense & Change Password', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'codelens-pwd-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));

  let server;
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: '',
    JWT_SECRET: 'test-secret-for-password-recovery-tests-32-chars-long',
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

  const dave = createClient();
  const attacker = createClient();
  let firstResetToken = null;
  let secondResetCode = null;

  await t.test('1. Setup Dave user account', async () => {
    const reg = await dave('/auth/register', 'POST', {
      name: 'Dave Bowman',
      email: 'dave@example.com',
      password: 'initial-password-123'
    });
    assert.equal(reg.status, 200);
    assert.equal(reg.data.email, 'dave@example.com');
  });

  await t.test('2. Forgot Password returns generic response to prevent account enumeration', async () => {
    const nonExistent = await attacker('/auth/forgot-password', 'POST', {
      email: 'nonexistent-account-9999@example.com'
    });
    assert.equal(nonExistent.status, 200);
    assert.ok(nonExistent.data.success);
    assert.match(nonExistent.data.message, /if an account matches/i);

    const realUser = await attacker('/auth/forgot-password', 'POST', {
      email: 'dave@example.com'
    });
    assert.equal(realUser.status, 200);
    assert.ok(realUser.data.success);
    assert.equal(realUser.data.message, nonExistent.data.message, 'Responses must be identical');

    // Inspect email queue for recovery email
    const emailsRes = await dave('/test/emails');
    const resetEmail = emailsRes.data[0];
    assert.equal(resetEmail.to, 'dave@example.com');
    assert.match(resetEmail.subject, /Password Recovery/i);

    // Extract resetToken from reset URL in text
    const urlMatch = resetEmail.text.match(/resetToken=([a-f0-9]+)/);
    assert.ok(urlMatch, 'Reset token must be present in email link');
    firstResetToken = urlMatch[1];
  });

  await t.test('3. Reset password using token succeeds and hashes new password', async () => {
    // Attempt reset with short password (rejected)
    const tooShort = await attacker('/auth/reset-password', 'POST', {
      token: firstResetToken,
      newPassword: 'short'
    });
    assert.equal(tooShort.status, 400);

    // Attempt reset with valid new password
    const success = await attacker('/auth/reset-password', 'POST', {
      token: firstResetToken,
      newPassword: 'new-secure-password-456'
    });
    assert.equal(success.status, 200);
    assert.ok(success.data.success);

    // Verify rawToken cannot be reused (single-use)
    const reused = await attacker('/auth/reset-password', 'POST', {
      token: firstResetToken,
      newPassword: 'another-attempt-password-789'
    });
    assert.equal(reused.status, 400);

    // Verify Dave can login with new password
    const loginNew = await dave('/auth/login', 'POST', {
      email: 'dave@example.com',
      password: 'new-secure-password-456'
    });
    assert.equal(loginNew.status, 200);

    // Old password fails
    const loginOld = await attacker('/auth/login', 'POST', {
      email: 'dave@example.com',
      password: 'initial-password-123'
    });
    assert.equal(loginOld.status, 401);
  });

  await t.test('4. Reset password using 6-digit recovery code succeeds', async () => {
    // Request another recovery email
    await attacker('/auth/forgot-password', 'POST', { email: 'dave@example.com' });

    const emailsRes = await dave('/test/emails');
    const resetEmail = emailsRes.data[0];
    const codeMatch = resetEmail.text.match(/Recovery Code:\s*(\d{6})/);
    assert.ok(codeMatch, '6-digit recovery code must be present in recovery email');
    secondResetCode = codeMatch[1];

    const resetByCode = await attacker('/auth/reset-password', 'POST', {
      email: 'dave@example.com',
      code: secondResetCode,
      newPassword: 'code-reset-password-999'
    });
    assert.equal(resetByCode.status, 200);

    // Reused code fails
    const reusedCode = await attacker('/auth/reset-password', 'POST', {
      email: 'dave@example.com',
      code: secondResetCode,
      newPassword: 'code-reset-password-999'
    });
    assert.equal(reusedCode.status, 400);

    // Verify login with new password
    const loginNew = await dave('/auth/login', 'POST', {
      email: 'dave@example.com',
      password: 'code-reset-password-999'
    });
    assert.equal(loginNew.status, 200);
  });

  await t.test('5. Change Password from authenticated session validates current password and sets new password', async () => {
    // Dave is currently signed in. Try wrong current password:
    const wrongCurrent = await dave('/auth/change-password', 'POST', {
      currentPassword: 'incorrect-current-pass',
      newPassword: 'fresh-password-111222'
    });
    assert.equal(wrongCurrent.status, 401);

    // Dave provides correct current password:
    const correctChange = await dave('/auth/change-password', 'POST', {
      currentPassword: 'code-reset-password-999',
      newPassword: 'fresh-password-111222'
    });
    assert.equal(correctChange.status, 200);
    assert.ok(correctChange.data.success);

    // Can sign in with fresh password
    const loginFresh = await dave('/auth/login', 'POST', {
      email: 'dave@example.com',
      password: 'fresh-password-111222'
    });
    assert.equal(loginFresh.status, 200);

    // Check confirmation email
    const emailsRes = await dave('/test/emails');
    const changedEmail = emailsRes.data.find(e => e.to === 'dave@example.com' && /password.*changed/i.test(e.subject));
    assert.ok(changedEmail, 'Password changed security notification email must be dispatched');
  });
});
