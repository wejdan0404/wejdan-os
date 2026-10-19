import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn as nodeSpawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';

const temp = await mkdtemp(join(tmpdir(), 'wejdan-codex-hardening-'));
const cli = join(temp, 'fake-codex.mjs');
const { __testOnly, validateChatGptOnlyEnvironment } = await import(pathToFileURL(join(process.cwd(), 'ops/local-live/runtime/codex-subscription-adapter.mjs')));
let mode = 'ok';
await writeFile(cli, `import {writeFileSync} from 'node:fs';
const args=process.argv.slice(2); const out=args[args.indexOf('--output-last-message')+1];
if(args[0]==='login'){console.log(args.includes('--test-wrong-auth')?'Logged in using API key':'Logged in using ChatGPT');process.exit(0)}
if(process.env.OPENAI_API_KEY||process.env.CODEX_API_KEY) process.exit(91);
if(args.includes('--test-hang')) await new Promise(()=>setInterval(()=>{},1000));
if(args.includes('--test-delay')) await new Promise(r=>setTimeout(r,350));
if(args.includes('--test-fail')) process.exit(7);
if(args.includes('--test-bad-json')) { console.log('{bad'); process.exit(0); }
if(args.includes('--test-no-complete')) { console.log(JSON.stringify({type:'thread.started',thread_id:'thread-x'})); process.exit(0); }
if(args.includes('--test-tool')) { console.log(JSON.stringify({type:'item.started',item:{type:'command_execution'}})); process.exit(0); }
if(args.includes('--test-overflow')) { console.log('x'.repeat(2100000)); process.exit(0); }
if(args.includes('--test-stderr')) { process.stderr.write('x'.repeat(300000)); process.exit(0); }
if(args.includes('--test-quota')) { console.log(JSON.stringify({type:'error',error:{message:'quota rate limit'}})); process.exit(0); }
writeFileSync(out,'Synthetic adapter response');
console.log(JSON.stringify({type:'thread.started',thread_id:'thread-x'}));
console.log(JSON.stringify({type:'turn.started',model:'test-model'}));
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}));
`);
const env = { APPDATA: temp, SYSTEMROOT: 'C:\\Windows', TEMP: temp, PATH: 'MUST_NOT_BE_INHERITED' };
const make = () => __testOnly.makeAdapter({ liveEnabled: true, entrypoint: cli, nodePath: process.execPath, env, verifyAuth: async ({env: childEnv}) => {
  assert.equal(childEnv.PATH, undefined);
  assert.equal(childEnv.APPDATA, temp);
}, spawn: (cmd, args, opts) => nodeSpawn(cmd, args, opts) });
const success = make();
  await assert.rejects((await import('./codex-subscription-adapter.mjs')).runCodexSubscription({ prompt: 'synthetic' }), { code: 'CODEX_APP_LIVE_APPROVAL_REQUIRED' });
try {
  const x = await success({ prompt: 'synthetic only' });
  assert.equal(x.output, 'Synthetic adapter response');
  assert.equal(x.provider, 'codex-subscription');
  assert.equal(x.provider_execution_id, 'thread-x');
  assert.equal(x.adapter_run_id.startsWith('adapter_'), true);
  assert.equal(x.model, 'test-model');
  assert.equal(x.usage.output_tokens, 1);
  assert.equal(x.real_cost_usd, null);
  assert.equal(x.tool_execution_status, 'unverified-no-tool-event-observed');
  await assert.rejects(success({ prompt: ' ' }), { code: 'INVALID_CODEX_TASK_INPUT' });
  assert.throws(() => validateChatGptOnlyEnvironment({ OPENAI_API_KEY: 'synthetic-secret' }), /CODEX_UNSAFE_PROVIDER_ENV/);
  assert.throws(() => validateChatGptOnlyEnvironment({ ANTHROPIC_API_KEY: 'synthetic-secret' }), /CODEX_UNSAFE_PROVIDER_ENV/);
  assert.throws(() => validateChatGptOnlyEnvironment({ CODEX_AUTH_METHOD: 'api-key' }), /CODEX_AUTH_MODE_NOT_CHATGPT/);
  await __testOnly.verifyChatGptLogin({ spawn: nodeSpawn, nodePath: process.execPath, entrypoint: cli, env: __testOnly.minimalEnvironment(env), cwd: temp });
  await assert.rejects(__testOnly.verifyChatGptLogin({ spawn: (cmd, args, opts) => nodeSpawn(cmd, [...args, '--test-wrong-auth'], opts), nodePath: process.execPath, entrypoint: cli, env: __testOnly.minimalEnvironment(env), cwd: temp }), { code: 'CODEX_AUTH_MODE_NOT_CHATGPT' });
  let spawnedAfterAuthFailure = false;
  const wrongAuth = __testOnly.makeAdapter({ liveEnabled: true, entrypoint: cli, nodePath: process.execPath, env, verifyAuth: async () => { throw Object.assign(new Error('wrong auth'), { code: 'CODEX_AUTH_MODE_NOT_CHATGPT' }); }, spawn: () => { spawnedAfterAuthFailure = true; throw Error('must not spawn'); } });
  await assert.rejects(wrongAuth({ prompt: 'synthetic' }), { code: 'CODEX_AUTH_MODE_NOT_CHATGPT' });
  assert.equal(spawnedAfterAuthFailure, false);
  await assert.rejects(__testOnly.makeAdapter({ liveEnabled: true, env: {}, nodePath: process.execPath, verifyAuth: async () => {}, spawn: nodeSpawn })({ prompt: 'synthetic' }), { code: 'CODEX_CLI_NOT_FOUND' });
  const runWith = suffix => __testOnly.makeAdapter({ liveEnabled: true, entrypoint: cli, nodePath: process.execPath, env, verifyAuth: async () => {}, spawn: (cmd, args, opts) => nodeSpawn(cmd, cmd === process.execPath ? [...args, suffix] : args, opts) });
  await assert.rejects(runWith('--test-fail')({ prompt: 'synthetic' }), { code: 'CODEX_NONZERO_EXIT' });
  await assert.rejects(runWith('--test-bad-json')({ prompt: 'synthetic' }), { code: 'CODEX_INVALID_JSONL' });
  await assert.rejects(runWith('--test-no-complete')({ prompt: 'synthetic' }), { code: 'CODEX_TERMINAL_COMPLETION_MISSING_OR_DUPLICATE' });
  await assert.rejects(runWith('--test-tool')({ prompt: 'synthetic' }), { code: 'CODEX_TOOL_ACTIVITY_DETECTED' });
  await assert.rejects(runWith('--test-overflow')({ prompt: 'synthetic' }), { code: 'CODEX_STDOUT_LIMIT' });
  await assert.rejects(runWith('--test-stderr')({ prompt: 'synthetic' }), { code: 'CODEX_STDERR_LIMIT' });
  await assert.rejects(runWith('--test-quota')({ prompt: 'synthetic' }), { code: 'CODEX_QUOTA_OR_RATE_LIMIT' });
  let fallbackKilled = false;
  const failedTaskkill = () => { const child = new EventEmitter(); queueMicrotask(() => child.emit('error', new Error('taskkill unavailable'))); return child; };
  const fallback = await __testOnly.killTree({ pid: 123, exitCode: null, signalCode: null, kill: () => { fallbackKilled = true; return true; } }, 123, 'win32', failedTaskkill);
  assert.equal(fallback.method, 'child-kill-fallback');
  assert.equal(fallbackKilled, true);
  const stuck = new EventEmitter();
  stuck.pid = 789; stuck.exitCode = null; stuck.signalCode = null;
  stuck.stdout = new PassThrough(); stuck.stderr = new PassThrough();
  stuck.stdin = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  stuck.kill = () => false;
  const noKill = __testOnly.makeAdapter({ liveEnabled: true, entrypoint: cli, nodePath: process.execPath, env, platform: 'win32', verifyAuth: async () => {}, spawn: command => command === 'taskkill.exe' ? failedTaskkill() : stuck });
  const killFailure = noKill({ prompt: 'synthetic', timeoutMs: 20 });
  await assert.rejects(killFailure, { code: 'CODEX_CHILD_TERMINATION_FAILED' });
  setTimeout(() => { stuck.signalCode = 'SIGKILL'; stuck.emit('close', null, 'SIGKILL'); }, 60);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal((await success({ prompt: 'after cleanup' })).output, 'Synthetic adapter response');
  const timeoutRun = runWith('--test-hang');
  await assert.rejects(timeoutRun({ prompt: 'synthetic', timeoutMs: 50 }), { code: 'CODEX_TIMEOUT' });
  const controller = new AbortController();
  const cancelled = runWith('--test-hang')({ prompt: 'synthetic', signal: controller.signal });
  setTimeout(() => controller.abort(), 50);
  await assert.rejects(cancelled, { code: 'CODEX_CANCELLED' });
  const delayed = runWith('--test-delay');
  const first = delayed({ prompt: 'synthetic' });
  await assert.rejects(delayed({ prompt: 'synthetic' }), { code: 'CODEX_CONCURRENCY_LIMIT' });
  await first;
  console.log(JSON.stringify({ result: 'PASS', mode: 'stub-only', checks: ['production adapter hard-denied without fresh approval', 'minimal child env excludes PATH and unrelated variables', 'API-key and alternate-provider environment fails closed', 'ChatGPT login status required before dispatch', 'valid output, known usage and unknown cost parsed separately', 'nonzero exit, malformed JSONL, missing terminal and nested tool event rejected', 'stdout and stderr byte caps', 'quota classification', 'timeout and abort cancellation', 'Windows taskkill failure falls back to child termination', 'concurrency cap 1', 'missing CLI fails closed', 'temporary sandbox cleanup'], live_codex_calls: 0, paid_calls: 0, n8n_runs: 0 }));
} finally { await rm(temp, { recursive: true, force: true }); }
