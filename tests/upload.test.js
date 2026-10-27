import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('Direct Profile Photo Upload, Security Validation & Robust Password Policy', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'codelens-upload-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));

  let server;
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: '',
    JWT_SECRET: 'test-secret-for-upload-and-password-policy-32-chars-long',
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
    return {
      getCookie: () => cookie,
      setCookie: (c) => { cookie = c; },
      request: async (url, method = 'GET', body, extra = {}) => {
        const isBuffer = Buffer.isBuffer(body);
        const headers = { ...extra };
        if (cookie) headers.Cookie = cookie;
        if (!isBuffer && body !== undefined && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`http://127.0.0.1:${port}/api${url}`, {
          method,
          headers,
          body: isBuffer ? body : (body === undefined ? undefined : JSON.stringify(body))
        });

        if (response.headers.get('set-cookie')) {
          cookie = response.headers.get('set-cookie').split(';')[0];
        }

        let data;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try { data = await response.json(); } catch { data = null; }
        } else {
          data = await response.text();
        }

        return { status: response.status, data, headers: response.headers };
      }
    };
  }

  const client = createClient();
  let uploadedAvatarPath = '';

  // Minimal valid 1x1 image buffers
  const validPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89
  ]);

  const validJpg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
  ]);

  const validWebp = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]), // size
    Buffer.from('WEBPVP8 ', 'ascii'),
    Buffer.from([0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00])
  ]);

  // =========================================================================
  // 1. Password Policy Tests
  // =========================================================================

  await t.test('1. Registration rejects password shorter than 12 characters', async () => {
    const res = await client.request('/auth/register', 'POST', {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      password: 'short-pwd-1', // 11 characters
      confirmPassword: 'short-pwd-1'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /at least 12 characters/i);
  });

  await t.test('2. Registration rejects common or easily guessed password', async () => {
    const res = await client.request('/auth/register', 'POST', {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      password: 'password1234',
      confirmPassword: 'password1234'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /too common/i);
  });

  await t.test('3. Registration rejects confirmPassword mismatch', async () => {
    const res = await client.request('/auth/register', 'POST', {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      password: 'correct-horse-battery-staple-123',
      confirmPassword: 'different-password-456'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /passwords do not match/i);
  });

  await t.test('4. Registration succeeds with compliant password and matching confirmation', async () => {
    const res = await client.request('/auth/register', 'POST', {
      name: 'Elena Rostova',
      email: 'elena@example.com',
      password: 'correct-horse-battery-staple-123',
      confirmPassword: 'correct-horse-battery-staple-123'
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.email, 'elena@example.com');
  });

  // =========================================================================
  // 2. Profile Photo Upload Security & Serving Tests
  // =========================================================================

  await t.test('5. Rejects unauthenticated avatar upload attempt', async () => {
    const unauthClient = createClient();
    const res = await unauthClient.request('/profile/avatar', 'POST', validPng, {
      'Content-Type': 'image/png'
    });
    assert.equal(res.status, 401);
  });

  await t.test('6. Rejects corrupt or spoofed non-image payload (magic byte check)', async () => {
    const fakeImage = Buffer.from('<html><script>alert("xss")</script></html>');
    const res = await client.request('/profile/avatar', 'POST', fakeImage, {
      'Content-Type': 'image/png'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /supported|Invalid image format/i);
  });

  await t.test('7. Rejects oversized image file (>5MB)', async () => {
    const bigFile = Buffer.alloc(5.2 * 1024 * 1024);
    // Write valid PNG header so it only fails on size
    validPng.copy(bigFile, 0);
    const res = await client.request('/profile/avatar', 'POST', bigFile, {
      'Content-Type': 'image/png'
    });
    assert.ok(res.status === 413 || res.status === 400, `Expected 413/400 but got ${res.status}`);
  });

  await t.test('8. Successfully uploads valid PNG photo directly from buffer', async () => {
    const res = await client.request('/profile/avatar', 'POST', validPng, {
      'Content-Type': 'image/png'
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.success);
    assert.match(res.data.avatar, /^\/api\/uploads\/avatars\/[a-z0-9-]+\.png$/);
    uploadedAvatarPath = res.data.avatar;
  });

  await t.test('9. Serves uploaded photo with secure headers and correct MIME type', async () => {
    assert.ok(uploadedAvatarPath, 'Avatar path must be set');
    const filename = uploadedAvatarPath.split('/').pop();
    const res = await client.request(`/uploads/avatars/${filename}`, 'GET');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('cache-control'));
  });

  await t.test('10. Path traversal in avatar serving is blocked', async () => {
    const res = await client.request('/uploads/avatars/../../server/index.js', 'GET');
    assert.ok(res.status === 400 || res.status === 404, `Expected 400/404 but got ${res.status}`);
  });

  await t.test('11. Successfully replaces photo with valid WebP image', async () => {
    const res = await client.request('/profile/avatar', 'POST', validWebp, {
      'Content-Type': 'image/webp'
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.success);
    assert.match(res.data.avatar, /\.webp$/);
  });

  await t.test('12. Successfully removes photo and restores default avatar', async () => {
    const res = await client.request('/profile/avatar', 'DELETE');
    assert.equal(res.status, 200);
    assert.ok(res.data.success);
    assert.equal(res.data.avatar, '');

    // Verify session profile now has empty avatar
    const session = await client.request('/session', 'GET');
    assert.equal(session.data.profile.avatar, '');
  });
});
