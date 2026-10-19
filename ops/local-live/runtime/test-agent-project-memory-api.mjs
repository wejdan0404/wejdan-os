import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dbPath = resolve(root, 'ops/local-live/data/agent-project-memory-api-test.sqlite');
const apiPort = Number(process.env.WEJDAN_MEMORY_TEST_API_PORT || 8777);
const stubPort = Number(process.env.WEJDAN_MEMORY_TEST_STUB_PORT || 8778);
const controlToken = 'a'.repeat(64);
const healthStub=createServer((req,res)=>{res.writeHead(200);res.end('ok');});
const healthPort=Number(process.env.WEJDAN_MEMORY_TEST_HEALTH_PORT||8779);
await new Promise((resolve,reject)=>healthStub.listen(healthPort,'127.0.0.1',resolve).once('error',reject));
const base = `http://127.0.0.1:${apiPort}`;
const ownerHeaders = {'content-type':'application/json','x-wejdan-local-control':controlToken};
for(const suffix of ['', '-wal', '-shm']) await unlink(dbPath+suffix).catch(()=>{});

let captured=[];
let stubCall=0;
const stub=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const packet=JSON.parse(raw||'{}');captured.push(packet);stubCall+=1;
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({task_id:packet.task_id,trace_id:packet.trace_id,role_id:packet.role_id,status:'completed',output:`Synthetic response ${stubCall}`,execution_id:`memory-api-${stubCall}`}));
});
await new Promise((resolve,reject)=>stub.listen(stubPort,'127.0.0.1',resolve).once('error',reject));
const api=spawn(process.execPath,[resolve(root,'ops/local-live/runtime/server.mjs')],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,WEJDAN_API_PORT:String(apiPort),WEJDAN_N8N_WEBHOOK:`http://127.0.0.1:${stubPort}`,WEJDAN_MEMORY_TEST_STUB_PORT:String(stubPort),WEJDAN_N8N_HEALTH_URL:`http://127.0.0.1:${healthPort}/healthz/readiness`,WEJDAN_OLLAMA_HEALTH_URL:`http://127.0.0.1:${healthPort}/api/version`,WEJDAN_DB_PATH:dbPath,WEJDAN_API_CONTROL_TOKEN:controlToken}});
let logs='';api.stdout.on('data',chunk=>logs+=chunk);api.stderr.on('data',chunk=>logs+=chunk);
const waitReady=async()=>{for(let i=0;i<80;i++){if(api.exitCode!==null)throw new Error(`API exited early: ${logs}`);try{if((await fetch(`${base}/api/health`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error(`API failed to start: ${logs}`);};
const task=async(roleId,input)=>{const response=await fetch(`${base}/api/tasks`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role_id:roleId,input,synthetic:true})});return {response,body:await response.json()};};
const owner=async(path,method='GET',bodyValue)=>fetch(`${base}${path}`,{method,headers:ownerHeaders,...(bodyValue===undefined?{}:{body:JSON.stringify(bodyValue)})});

try{
  await waitReady();
  const unauthorized=await fetch(`${base}/api/memory?scope_kind=agent&role_id=AI-09`);
  assert.equal(unauthorized.status,403,'memory API requires local owner token');

  const first=await task('AI-09','synthetic task creates a completed evidence source');
  if(first.response.status!==201)throw new Error(`Synthetic task failed: ${JSON.stringify(first.body)}; logs=${logs}`);
  assert.equal(first.response.status,201);
  assert.ok(captured[0].system_prompt.length<=8000,'inference context respects the local workflow prompt cap');
  assert.match(captured[0].system_prompt,/AI-09/);
  assert.match(captured[0].system_prompt,/agent-memory/,'role assigned memory skill is assembled into inference context');
  const firstTaskDetail=await (await fetch(`${base}/api/tasks/${first.body.task_id}`)).json();
  assert.equal(firstTaskDetail.context_manifests.length,1,'actual context assembly is recorded per task step');
  assert.ok(firstTaskDetail.context_manifests[0].manifest.sources.some(source=>source.id==='agents/skills/agent-memory/SKILL.md'&&source.status==='included'));
  assert.ok(firstTaskDetail.context_manifests[0].manifest.sources.every(source=>source.sha256&&source.scope&&source.reason),'context manifest records source hashes, scopes, and selection reasons');

  const packet={task_id:first.body.task_id,trace_id:first.body.trace_id,source_role_id:'AI-09',scope_kind:'agent',role_id:'AI-09',project_id:'wejdan-life-os',key:'workflow.output',content:'Return the declared artifact and leave unavailable evidence explicitly unknown.',evidence_refs:[`task:${first.body.task_id}/trace:${first.body.trace_id}`],confidence:0.95,sensitivity:'non_personal'};
  const proposed=await owner('/api/memory/proposals','POST',packet);if(proposed.status!==201)throw new Error(`Proposal failed: ${await proposed.text()}`);const proposalBody=await proposed.json();assert.equal(proposalBody.record.status,'PROPOSED');
  const beforeApproval=await (await owner('/api/memory?scope_kind=agent&role_id=AI-09&status=APPROVED')).json();assert.equal(beforeApproval.records.length,0);
  const approve=await owner(`/api/memory/${proposalBody.record.record_id}/review`,'POST',{decision:'approved',note:'Synthetic reviewer verified evidence pointer.'});assert.equal(approve.status,200,await approve.text());
  const approvedCheck=await owner(`/api/memory?scope_kind=agent&role_id=AI-09&status=APPROVED`);const approvedCheckBody=await approvedCheck.json();assert.equal(approvedCheckBody.records.length,1,JSON.stringify(approvedCheckBody));

  const second=await task('AI-09','synthetic follow-up checks private role memory injection');assert.equal(second.response.status,201);
  assert.match(captured[1].system_prompt,/workflow\.output[\s\S]*Return the declared artifact and leave unavailable evidence explicitly unknown/);
  const other=await task('AI-12','synthetic other role must not read AI-09 private memory');assert.equal(other.response.status,201);
  assert.doesNotMatch(captured[2].system_prompt,/workflow\.output[\s\S]*Return the declared artifact and leave unavailable evidence explicitly unknown/);

  const projectPacket={task_id:other.body.task_id,trace_id:other.body.trace_id,source_role_id:'AI-12',scope_kind:'project',project_id:'wejdan-life-os',key:'governance.owner',content:'Only the local project owner can approve durable agent or project memory.',evidence_refs:['agents/README.md#memory-boundaries'],confidence:0.9,sensitivity:'non_personal'};
  const projectProposed=await owner('/api/memory/proposals','POST',projectPacket);assert.equal(projectProposed.status,201);const projectRecord=(await projectProposed.json()).record;
  await owner(`/api/memory/${projectRecord.record_id}/review`,'POST',{decision:'approved'});
  const fourth=await task('AI-12','synthetic shared approved project memory is retrievable');assert.equal(fourth.response.status,201);
  assert.match(captured[3].system_prompt,/Only the local project owner can approve durable agent or project memory/);

  const sensitive=await owner('/api/memory/proposals','POST',{...packet,content:'private user medical detail',sensitivity:'sensitive'});assert.equal(sensitive.status,400);
  const crossRole=await owner('/api/memory/proposals','POST',{...packet,role_id:'AI-12'});assert.equal(crossRole.status,400);
  const audit=await owner(`/api/memory/${proposalBody.record.record_id}/audit`);assert.equal(audit.status,200);assert.ok((await audit.json()).events.some(event=>event.action==='approved'));
  const deleteNeedsConfirm=await owner(`/api/memory/${proposalBody.record.record_id}`,'DELETE',{});assert.equal(deleteNeedsConfirm.status,400);
  const deletedTask=await fetch(`${base}/api/tasks/${first.body.task_id}`,{method:'DELETE'});assert.equal(deletedTask.status,200);
  const afterSourceDelete=await owner('/api/memory?scope_kind=agent&role_id=AI-09&status=APPROVED');assert.equal((await afterSourceDelete.json()).records.length,0,'deleting source task also erases durable records derived from it');
  console.log(JSON.stringify({result:'PASS',suite:'local-agent-project-memory-api-synthetic',checks:['loopback control-token authorization','role and skill context loaded under 8k chars','owner-proposed memory not used before approval','per-role memory injected only for matching role','approved project memory injected for roles in same project','sensitive/cross-role writes rejected','audit trail','explicit delete confirmation','source-task deletion removes derived persistent memory'],stub_model_calls:stubCall,paid_calls:0,external_actions:0}));
}finally{
  api.kill('SIGTERM');stub.close();healthStub.close();
  await new Promise(resolve=>api.once('exit',resolve));
  for(const suffix of ['', '-wal', '-shm'])await unlink(dbPath+suffix).catch(()=>{});
}
