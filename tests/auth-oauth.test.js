import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('OAuth Providers (Google, GitHub, LinkedIn), State Security & Missing Credentials Handling', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'codelens-oauth-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));

  let server;
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: '',
    JWT_SECRET: 'test-secret-for-oauth-tests-32-chars-long-random',
    NODE_ENV: 'test',
    DATA_FILE: path.join(directory, 'state.json'),
    DEMO_BILLING: 'true',
    APP_URL: `http://localhost:${port}`,
    EMAIL_FROM: 'codelens044@gmail.com',
    // Provide configured test credentials for Google & GitHub, but leave LinkedIn unset to test safe handling
    GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GITHUB_CLIENT_ID: 'test-github-client-id',
    GITHUB_CLIENT_SECRET: 'test-github-client-secret'
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

  await t.test('1. Google OAuth starts authorization redirect with state and PKCE/OIDC params', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/google`, {
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
    assert.match(location, /client_id=test-google-client-id/);
    assert.match(location, /response_type=code/);
    assert.match(location, /scope=openid\+email\+profile/);
    assert.match(location, /state=/);

    // Verify state cookie was set
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.match(setCookie, /codelens_oauth_state=/);
  });

  await t.test('2. GitHub OAuth starts authorization redirect with state and user:email scope', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/github`, {
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /^https:\/\/github\.com\/login\/oauth\/authorize/);
    assert.match(location, /client_id=test-github-client-id/);
    assert.match(location, /scope=read%3Auser\+user%3Aemail/);
    assert.match(location, /state=/);
  });

  await t.test('3. Unconfigured OAuth provider (LinkedIn) produces safe friendly redirect without crashing', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/linkedin`, {
      headers: { 'Accept': 'text/html' },
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /oauthError=/);
    assert.match(location, /LinkedIn.*not.*configured/i);

    // Also verify API request returns structured 503
    const apiRes = await fetch(`http://127.0.0.1:${port}/api/auth/linkedin`, {
      headers: { 'Accept': 'application/json' }
    });
    assert.equal(apiRes.status, 503);
    const apiData = await apiRes.json();
    assert.match(apiData.error, /LinkedIn OAuth is not configured/i);
  });

  await t.test('4. OAuth Callback rejects request when state cookie is missing or invalid (CSRF protection)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/google/callback?code=mock_code&state=fake_state`, {
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /oauthError=/);
    assert.match(location, /state.*verification/i);
  });

  await t.test('5. OAuth Callback handles provider denial / cancellation gracefully', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/github/callback?error=access_denied&error_description=User+denied+access`, {
      redirect: 'manual'
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location);
    assert.match(location, /oauthError=/);
  });
});
