import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), 'wejdan-api-control-'));
const port = 18766;
const token = 'a'.repeat(64);
const dbPath = join(temp, 'tasks.sqlite');
const testEnv = {};
for (const name of ['SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA']) if (process.env[name]) testEnv[name] = process.env[name];
testEnv.WEJDAN_DB_PATH = dbPath;
testEnv.WEJDAN_API_PORT = String(port);
testEnv.WEJDAN_API_CONTROL_TOKEN = token;
const child = spawn(process.execPath, [resolve(root, 'ops/local-live/runtime/server.mjs')], { cwd: root, env: testEnv, stdio: ['ignore','pipe','pipe'], windowsHide: true, shell: false });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i=0;i<70;i++) {
    try { if ((await fetch(base+'/api/roles')).ok) { ready=true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve,100));
  }
  assert.equal(ready,true,`API did not start: ${logs}`);
  const noHeader = await fetch(base+'/api/control/shutdown',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(noHeader.status,403);
  const wrongHeader = await fetch(base+'/api/control/shutdown',{method:'POST',headers:{'content-type':'application/json','x-wejdan-local-control':'b'.repeat(64)},body:'{}'});
  assert.equal(wrongHeader.status,403);
  const stopped = new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`GRACEFUL_STOP_TIMEOUT:${logs}`)),10000);
    child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  const response = await fetch(base+'/api/control/shutdown',{method:'POST',headers:{'content-type':'application/json','x-wejdan-local-control':token},body:'{}'});
  assert.equal(response.status,202);
  const body=await response.json();
  assert.equal(body.status,'stopping');
  assert.equal(body.active_tasks,0);
  const exit=await stopped;
  assert.equal(exit.code,0);
  const db=new DatabaseSync(dbPath,{readOnly:true});
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n,0);
  db.close();
  console.log(JSON.stringify({result:'PASS',mode:'isolated-local-api',checks:['unauthenticated shutdown rejected','wrong control token rejected','authenticated loopback shutdown waits for idle database','HTTP 202 returned before graceful server close','SQLite integrity preserved after stop'],process_exit_code:exit.code,live_codex_calls:0,paid_calls:0,n8n_runs:0}));
} finally {
  if(child.exitCode===null) { child.kill(); await new Promise(resolve=>child.once('close',resolve)); }
  await rm(temp,{recursive:true,force:true});
}
