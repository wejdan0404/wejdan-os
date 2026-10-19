import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { unlink, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dbPath = resolve(root, 'ops/local-live/data/collaboration-test.sqlite');
const apiPort = 8767;
const stubPort = 8768;
const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, result: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${name}: ${detail}`);
};
for (const suffix of ['', '-wal', '-shm']) await unlink(dbPath + suffix).catch(() => {});

let stubCall = 0;
const stub = createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw || '{}');
  stubCall += 1;
  if(body.input.includes('CASE_DELAY'))await new Promise(resolve=>setTimeout(resolve,3000));
  const mismatch = body.input.includes('CASE_MISMATCH') ||
    (body.role_id === 'QA-01' && body.input.includes('CASE_REVIEW_FAIL'));
  const empty = body.input.includes('CASE_EMPTY');
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    task_id: body.task_id,
    trace_id: mismatch ? 'trace_wrong' : body.trace_id,
    role_id: body.role_id,
    status: 'completed',
    output: empty ? '' : `${body.role_id} local test output`,
    execution_id: `stub-${stubCall}`,
  }));
});
await new Promise((resolve, reject) => stub.listen(stubPort, '127.0.0.1', resolve).once('error', reject));

let api = spawn(process.execPath, [resolve(root, 'ops/local-live/runtime/server.mjs')], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, WEJDAN_API_PORT: String(apiPort), WEJDAN_N8N_WEBHOOK: `http://127.0.0.1:${stubPort}`, WEJDAN_DB_PATH: dbPath },
});
let childOutput = '';
api.stdout.on('data', chunk => childOutput += chunk);
api.stderr.on('data', chunk => childOutput += chunk);
const base = `http://127.0.0.1:${apiPort}`;
const waitReady = async () => {
  for (let i = 0; i < 50; i++) {
    if (api.exitCode !== null) throw new Error(`test API exited early: ${childOutput}`);
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`test API did not start: ${childOutput}`);
};
const postTask = async (body) => fetch(`${base}/api/tasks`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const waitForTask = async (taskId, terminal = ['completed','approved','rejected','failed','cancelled','blocked','waiting_approval']) => {
  for(let i=0;i<100;i++){const response=await fetch(`${base}/api/tasks/${taskId}`);if(response.ok){const task=await response.json();if(terminal.includes(task.status))return task;}await new Promise(resolve=>setTimeout(resolve,30));}
  throw new Error(`task ${taskId} did not reach a terminal state`);
};
const waitForStubCalls = async (minimum, timeoutMs=3000) => {
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){if(stubCall>=minimum)return;await new Promise(resolve=>setTimeout(resolve,10));}
  throw new Error(`stub did not receive expected active request: ${stubCall} < ${minimum}`);
};

try {
  await waitReady();
  const invalidBefore = (await (await fetch(`${base}/api/tasks`)).json()).tasks.length;
  const invalid = await postTask({ role_id: 'D-00', input: 'synthetic', collaborate: true, reviewer_role_id: 'NO-SUCH-ROLE' });
  const invalidAfter = (await (await fetch(`${base}/api/tasks`)).json()).tasks.length;
  check('unknown reviewer rejected before task/inference', invalid.status === 400 && invalidBefore === invalidAfter, `HTTP ${invalid.status}; tasks ${invalidBefore}→${invalidAfter}`);

  const normal = await postTask({ role_id: 'QA-01', input: 'synthetic successful producer step' });
  const normalBody = await normal.json();
  const normalDetail = await (await fetch(`${base}/api/tasks/${normalBody.task_id}`)).json();
  check('single-stage local dispatch and memory persistence', normal.status === 201 && normalDetail.steps.length === 1 && normalDetail.memory.length === 2 && normalDetail.steps[0].n8n_execution_id === 'stub-1', JSON.stringify({ status: normalBody.status, steps: normalDetail.steps.length, memory: normalDetail.memory.length }));
  const exported=await (await fetch(`${base}/api/tasks/${normalBody.task_id}/export`)).json();
  const deleted=await fetch(`${base}/api/tasks/${normalBody.task_id}`,{method:'DELETE'});
  const afterDelete=await fetch(`${base}/api/tasks/${normalBody.task_id}`);
  check('task export includes scoped memory and confirmed delete removes it',exported.memory.length===2&&deleted.status===200&&afterDelete.status===404,JSON.stringify({export_memory:exported.memory.length,delete_http:deleted.status,after_delete:afterDelete.status}));

  const mismatch = await postTask({ role_id: 'QA-01', input: 'CASE_MISMATCH synthetic correlation rejection' });
  const mismatchBody = await mismatch.json();
  const mismatchDetail = await (await fetch(`${base}/api/tasks/${mismatchBody.task_id}`)).json();
  check('mismatched task/trace/role correlation fails closed and persists', mismatch.status === 502 && mismatchDetail.status === 'failed' && mismatchDetail.steps[0].status === 'failed' && mismatchDetail.steps[0].error.includes('LOCAL_CORRELATION_MISMATCH'), JSON.stringify({ http: mismatch.status, task_status: mismatchDetail.status, step_status: mismatchDetail.steps[0]?.status }));

  const empty = await postTask({ role_id: 'QA-01', input: 'CASE_EMPTY synthetic malformed output' });
  const emptyBody = await empty.json();
  const emptyDetail = await (await fetch(`${base}/api/tasks/${emptyBody.task_id}`)).json();
  check('empty model output fails closed and persists', empty.status === 502 && emptyDetail.status === 'failed' && emptyDetail.steps[0].error.includes('LOCAL_EMPTY_OUTPUT'), JSON.stringify({ http: empty.status, error: emptyDetail.steps[0]?.error }));

  const reviewFailure = await postTask({ role_id: 'D-00', input: 'CASE_REVIEW_FAIL synthetic reviewer correlation rejection', collaborate: true, reviewer_role_id: 'QA-01' });
  const reviewBody = await reviewFailure.json();
  const reviewDetail = await (await fetch(`${base}/api/tasks/${reviewBody.task_id}`)).json();
  check('reviewer correlation failure preserves producer and fails overall task', reviewFailure.status === 502 && reviewDetail.status === 'failed' && reviewDetail.steps.length === 2 && reviewDetail.steps[0].status === 'completed' && reviewDetail.steps[1].status === 'failed' && reviewDetail.steps.every(s => s.trace_id === reviewDetail.trace_id), JSON.stringify({ http: reviewFailure.status, task_status: reviewDetail.status, step_statuses: reviewDetail.steps.map(s => s.status) }));

  const activeQueued=await postTask({role_id:'QA-01',input:'CASE_DELAY first task holds local test queue',asynchronous:true});
  const activeBody=await activeQueued.json();
  const activeRunning=await waitForTask(activeBody.task_id,['running']);
  await waitForStubCalls(stubCall+1);
  const waitingResponse=await postTask({role_id:'QA-01',input:'CASE_NEVER_RUN queued task cancellation',asynchronous:true});
  const waitingBody=await waitingResponse.json();
  const beforeCancelCalls=stubCall;
  const cancelWaiting=await fetch(`${base}/api/tasks/${waitingBody.task_id}/cancel`,{method:'POST'});
  const cancelledQueued=await (await fetch(`${base}/api/tasks/${waitingBody.task_id}`)).json();
  await waitForTask(activeBody.task_id);
  check('queued cancellation prevents any model/n8n dispatch',waitingResponse.status===202&&cancelWaiting.status===200&&cancelledQueued.status==='cancelled'&&stubCall===beforeCancelCalls,JSON.stringify({status:cancelledQueued.status,stub_calls:stubCall,before_cancel:beforeCancelCalls,active_status:activeRunning.status}));

  const activeCancelResponse=await postTask({role_id:'QA-01',input:'CASE_DELAY active inference then checkpoint cancellation',asynchronous:true});
  const activeCancelTask=await activeCancelResponse.json();
  await waitForTask(activeCancelTask.task_id,['running']);
  const activeCancel=await fetch(`${base}/api/tasks/${activeCancelTask.task_id}/cancel`,{method:'POST'});
  const activeCancelled=await waitForTask(activeCancelTask.task_id);
  check('running cancellation is honest and applied at a safe checkpoint',activeCancel.status===202&&activeCancelled.status==='cancelled'&&activeCancelled.steps[0].status==='completed'&&activeCancelled.error?.includes('already-running local'),JSON.stringify({cancel_http:activeCancel.status,status:activeCancelled.status,step_status:activeCancelled.steps[0]?.status,note:activeCancelled.error}));

  const retrySource=await postTask({role_id:'QA-01',input:'CASE_MISMATCH synthetic first attempt for retry'});
  const retrySourceBody=await retrySource.json();
  const retryCreated=await fetch(`${base}/api/tasks/${retrySourceBody.task_id}/retry`,{method:'POST'});
  const retryBody=await retryCreated.json();
  const retryFinished=await waitForTask(retryBody.task_id);
  check('retry creates linked attempt with fresh task and trace IDs',retrySource.status===502&&retryCreated.status===202&&retryFinished.parent_task_id===retrySourceBody.task_id&&retryFinished.attempt===2&&retryFinished.trace_id!==retrySourceBody.trace_id&&retryFinished.status==='failed',JSON.stringify({attempt:retryFinished.attempt,parent_task_id:retryFinished.parent_task_id,status:retryFinished.status}));

  const interruptedResponse=await postTask({role_id:'QA-01',input:'CASE_DELAY recovery test interrupted during local stub request',asynchronous:true});
  const interrupted=await interruptedResponse.json();
  await waitForTask(interrupted.task_id,['running']);
  await waitForStubCalls(stubCall+1);
  const apiExited=new Promise(resolve=>api.once('exit',resolve));api.kill('SIGTERM');await apiExited;
  api = spawn(process.execPath, [resolve(root, 'ops/local-live/runtime/server.mjs')], {
    cwd: root, stdio: ['ignore','pipe','pipe'],
    env: { ...process.env, WEJDAN_API_PORT: String(apiPort), WEJDAN_N8N_WEBHOOK: `http://127.0.0.1:${stubPort}`, WEJDAN_DB_PATH: dbPath },
  });
  childOutput='';api.stdout.on('data',chunk=>childOutput+=chunk);api.stderr.on('data',chunk=>childOutput+=chunk);
  await waitReady();
  const recovered=await (await fetch(`${base}/api/tasks/${interrupted.task_id}`)).json();
  check('restart recovery marks interrupted task/step failed without replay',recovered.status==='failed'&&recovered.error==='PROCESS_RESTARTED_DURING_RUN'&&recovered.steps[0].status==='failed'&&stubCall===beforeCancelCalls+4,JSON.stringify({task_status:recovered.status,step_status:recovered.steps[0]?.status,stub_calls:stubCall}));

  const report = { schema_version: 'local-lifecycle-test.v1', tested_at: new Date().toISOString(), result: 'PASS', checks, mock_only: true, external_calls: 0, paid_provider_calls: 0, bindings: ['127.0.0.1'], stub_endpoint: `http://127.0.0.1:${stubPort}`, api_port: apiPort, note: 'Stub outputs validate API lifecycle, correlation, cancellation/retry, and memory handling only; real producer-reviewer inference is evidenced separately by local n8n executions. Running n8n/Ollama inference cannot be interrupted and is cancelled at a task checkpoint.' };
  await writeFile(resolve(root, 'ops/evidence/local-lifecycle-negative-tests.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  api.kill('SIGTERM');
  await new Promise(resolve => api.once('exit', resolve));
  await new Promise(resolve => stub.close(resolve));
  for (const suffix of ['', '-wal', '-shm']) await unlink(dbPath + suffix).catch(() => {});
}
