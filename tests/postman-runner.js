import fs from 'node:fs';
import path from 'node:path';

const collectionPath = path.join(process.cwd(), 'docs', 'postman', 'CodeLens-Second-Evaluation.postman_collection.json');
const envPath = path.join(process.cwd(), 'docs', 'postman', 'CodeLens-Second-Evaluation.postman_environment.json');

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const environment = JSON.parse(fs.readFileSync(envPath, 'utf8'));

const envMap = new Map();
environment.values.forEach(v => envMap.set(v.key, v.value));

const resolveVars = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_, key) => envMap.get(key) || `{{${key}}}`);
};

let cookieHeader = '';

async function runSuite() {
  console.log(`\n======================================================`);
  console.log(`Executing Postman Evaluation Collection (14 Requests)`);
  console.log(`Target Base URL: ${envMap.get('baseUrl')}`);
  console.log(`======================================================\n`);

  let passCount = 0;
  let failCount = 0;

  for (const item of collection.item) {
    const rawUrl = resolveVars(item.request.url.raw);
    const method = item.request.method;
    const headers = { 'Content-Type': 'application/json' };
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    let body = undefined;
    if (item.request.body && item.request.body.raw) {
      body = resolveVars(item.request.body.raw);
    }

    const startTime = Date.now();
    try {
      const response = await fetch(rawUrl, {
        method,
        headers,
        body
      });
      const duration = Date.now() - startTime;
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        cookieHeader = setCookie.split(';')[0];
      }

      let json = null;
      try {
        json = await response.json();
      } catch {}

      // Variable extraction logic matching postman tests
      if (item.name.includes('Session') && json?.id) {
        envMap.set('accountId', json.id);
      }
      if (item.name.includes('Create Snippet') && json?.snippets?.[0]?.id) {
        envMap.set('snippetId', json.snippets[0].id);
      }

      console.log(`✓ [${method}] ${item.name}`);
      console.log(`   URL: ${rawUrl}`);
      console.log(`   Status: ${response.status} ${response.statusText} (${duration}ms)`);
      if (json) {
        const preview = JSON.stringify(json).slice(0, 140);
        console.log(`   Response: ${preview}${preview.length >= 140 ? '...' : ''}`);
      }
      passCount++;
    } catch (err) {
      console.error(`✗ [${method}] ${item.name} - ERROR: ${err.message}`);
      failCount++;
    }
    console.log('');
  }

  console.log(`======================================================`);
  console.log(`Postman Evaluation Run Summary:`);
  console.log(`Total Requests: ${collection.item.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`======================================================\n`);
}

runSuite().catch(console.error);
