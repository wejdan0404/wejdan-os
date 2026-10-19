import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), 'wejdan-codex-status-api-'));
const port = 8767;
const db = join(temp, 'tasks.sqlite');
const testEnv = {};
for (const name of ['SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA']) if (process.env[name]) testEnv[name] = process.env[name];
testEnv.WEJDAN_DB_PATH = db;
testEnv.WEJDAN_API_PORT = String(port);
const child = spawn(process.execPath, [resolve(root, 'ops/local-live/runtime/server.mjs')], { cwd: root, env: testEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i = 0; i < 70; i++) {
    try { if ((await fetch(base + '/api/roles')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, `API did not start: ${logs}`);
  const response = await fetch(base + '/api/provider-status');
  assert.equal(response.status, 200);
  const body = await response.json();
  const states = Object.fromEntries(body.states.map(item => [item.state_key, item]));
  assert.equal(states.CLI_AUTH_VERIFIED.status, 'VERIFIED_HISTORICAL');
  assert.equal(states.CLI_DIRECT_LIVE_VERIFIED.status, 'VERIFIED_HISTORICAL');
  assert.equal(states.APP_MOCK_INTEGRATION_VERIFIED.status, 'VERIFIED_HISTORICAL');
  assert.equal(states.APP_CODEX_E2E_LIVE_VERIFIED.status, 'NOT_VERIFIED');
  assert.equal(states.EFFECTIVE_PROVIDER.status, 'OLLAMA_LOCAL_DEFAULT');
  assert.equal(states.USAGE_KNOWN.details.app_usage, 'unknown');
  assert.equal(body.live_codex_calls_during_ll09, 0);
  assert.equal(body.paid_api_calls_during_ll09, 0);
  assert.equal(body.n8n_runs_during_ll09, 0);
  assert.equal(body.dispatch_enabled, false);
  const before = await fetch(base + '/api/tasks').then(result => result.json());
  const denied = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: 'synthetic denied test', role_id: 'D-00', provider: 'codex-subscription', asynchronous: true }) });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, 'CODEX_APP_LIVE_APPROVAL_REQUIRED');
  const after = await fetch(base + '/api/tasks').then(result => result.json());
  assert.equal(after.tasks.length, before.tasks.length);
  const envSafe = await fetch(base + '/api/health').then(result => result.json());
  assert.equal(envSafe.bind, '127.0.0.1');
  console.log(JSON.stringify({ result: 'PASS', mode: 'mock-status-only', checks: ['SQLite provider state persisted', 'historical CLI pilot separated from mock app integration', 'application live E2E explicitly not verified', 'Codex API dispatch hard-denied pending approval without task creation', 'Ollama remains effective default', 'app usage remains unknown', 'loopback API only'], live_codex_calls: 0, paid_calls: 0, n8n_runs: 0 }));
} finally {
  child.kill();
  await new Promise(resolve => child.once('close', resolve));
  await rm(temp, { recursive: true, force: true });
}
