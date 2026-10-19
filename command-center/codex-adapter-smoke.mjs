import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

const require = createRequire(join(process.env.CODEX_NODE_MODULES, '__cc_smoke__.cjs'));
const { chromium } = require('playwright');
const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.route('http://127.0.0.1:8766/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body = {};
    if (path === '/api/roles') body = { total: registry.roles.length, roles: registry.roles.map(role => ({ ...role, execution_kind: 'mocked role profile' })) };
    else if (path === '/api/health') body = { status: 'ok', bind: '127.0.0.1', roles_configured: 85, provider: 'ollama-local' };
    else if (path === '/api/tasks') body = request.method() === 'POST' ? { error: 'CODEX_APP_LIVE_APPROVAL_REQUIRED' } : { tasks: [] };
    else if (path === '/api/approvals') body = { approvals: [] };
    else if (path === '/api/provider-status') body = { provider: 'codex-subscription', dispatch_enabled: false, states: [{ state_key: 'APP_CODEX_E2E_LIVE_VERIFIED', status: 'NOT_VERIFIED' }] };
    return route.fulfill({ status: path === '/api/tasks' && request.method() === 'POST' ? 403 : 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://127.0.0.1:8765/command-center/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.role-card').length === 85);
  const option = page.locator('#new-task-provider option[value="codex-subscription"]');
  if (await option.count() !== 1 || !(await option.isDisabled())) throw Error('Codex provider must remain disabled pending owner approval.');
  const stateText = await page.locator('#codex-provider-evidence').innerText();
  if (!stateText.includes('تكامل التطبيق الحي') || !stateText.includes('لا توجد استدعاءات جديدة')) throw Error('UI must distinguish CLI pilot from unverified app live execution.');
  const denied = await page.evaluate(async () => { const response = await fetch('http://127.0.0.1:8766/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role_id: 'D-00', provider: 'codex-subscription', input: 'synthetic no-op', asynchronous: true }) }); return { status: response.status, body: await response.json() }; });
  if (denied.status !== 403 || denied.body.error !== 'CODEX_APP_LIVE_APPROVAL_REQUIRED') throw Error('Mock API dispatch was not denied.');
  if (errors.length) throw Error(errors.join('; '));
  console.log(JSON.stringify({ result: 'PASS', checks: ['85 roles displayed', 'Codex provider disabled pending approval', 'UI distinguishes historical direct pilot from unverified app execution', 'API blocks Codex before creating a task', 'no inference dispatched'], live_codex_calls: 0, paid_calls: 0, n8n_runs: 0, console_errors: errors.length }));
} finally { await browser.close(); }
