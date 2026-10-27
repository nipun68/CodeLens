import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('API 404 JSON Handler, Error Standardization & Route Integrity', async t => {
  const directory = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'codelens-404-test-'));
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));

  let server;
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: '',
    JWT_SECRET: 'test-secret-for-404-tests-32-chars-long-secure',
    NODE_ENV: 'test',
    DATA_FILE: path.join(directory, 'state.json'),
    DEMO_BILLING: 'true',
    APP_URL: `http://localhost:${port}`
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

  await t.test('1. Unknown API route returns consistent JSON 404 error structure', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent-endpoint-xyz`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type')?.includes('application/json'), true);

    const data = await res.json();
    assert.deepEqual(data, {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'API endpoint not found'
      }
    });
  });

  await t.test('2. Deeply nested unknown API route also returns structured JSON 404', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/auth/unknown/subpath/action`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'NOT_FOUND');
  });

  await t.test('3. Valid API endpoints remain functional', async () => {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 200);
    const healthData = await health.json();
    assert.equal(healthData.ok, true);

    const session = await fetch(`http://127.0.0.1:${port}/api/session`);
    assert.equal(session.status, 200);
    const sessionData = await session.json();
    assert.equal(sessionData.isGuest, true);
  });
});
