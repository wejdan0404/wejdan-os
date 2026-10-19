import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { delegationTokenMatches, ensureHqDelegationSchema, receiveCompanyDelegation, decideCompanyDelegation, queueCompanyDelegation, approveDelegationResult, validateCompanyDelegation } from './hq-delegation.mjs';

const directory=await mkdtemp(join(tmpdir(),'wejdan-hq-delegation-'));
const db=new DatabaseSync(join(directory,'life.sqlite'));
const now=new Date('2026-10-19T12:00:00.000Z');
const packet={schemaVersion:1,packetId:'bridge-123e4567-e89b-12d3-a456-426614174000',sourceSystem:'COMPANY_OS',targetSystem:'LIFE_OS',createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+3600000).toISOString(),title:'ترتيب أولويات اصطناعي',request:'رتبي هذه النقاط الافتراضية حسب الاعتماديات.',agentId:'D-00',requestedBy:'OWNER',allowedData:['OWNER_AUTHORED_REQUEST_ONLY'],sensitivity:'NON_SENSITIVE_TASK_TEXT',ownerApproval:{decision:'APPROVED',approvedAt:now.toISOString()}};
try{
  db.exec(`CREATE TABLE tasks(task_id TEXT PRIMARY KEY,trace_id TEXT,role_id TEXT,input TEXT,status TEXT,created_at TEXT,cancel_requested INTEGER,parent_task_id TEXT,attempt INTEGER,collaborate INTEGER,reviewer_role_id TEXT,requires_approval INTEGER,provider TEXT,hq_classification TEXT,result_json TEXT);`);
  ensureHqDelegationSchema(db);
  const token='a'.repeat(64);
  assert.equal(delegationTokenMatches(token,token),true);
  assert.equal(delegationTokenMatches(token,'b'.repeat(64)),false);
  assert.equal(delegationTokenMatches(undefined,token),false);
  assert.equal(validateCompanyDelegation({...packet,request:'أرسلي كلمة المرور'},now).error,'SENSITIVE_TEXT_BLOCKED');
  assert.equal(receiveCompanyDelegation(db,{...packet,extra:'not allowed'},now).error,'PACKET_FIELDS_INVALID');
  const received=receiveCompanyDelegation(db,packet,now);assert.equal(received.ok,true);assert.equal(received.status,'PENDING_LIFE_OWNER');
  assert.equal(receiveCompanyDelegation(db,packet,now).duplicate,true,'replay is idempotent');
  let enqueued=0;
  const insertTask=db.prepare('INSERT INTO tasks(task_id,trace_id,role_id,input,status,created_at,cancel_requested,parent_task_id,attempt,collaborate,reviewer_role_id,requires_approval,provider,hq_classification) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const enqueueTask=()=>{enqueued+=1;};
  assert.equal(queueCompanyDelegation(db,packet.packetId,{insertTask,enqueueTask,now}).error,'LIFE_OWNER_APPROVAL_REQUIRED');
  const approved=decideCompanyDelegation(db,packet.packetId,'APPROVED',now);assert.equal(approved.status,'APPROVED_WAITING_TO_START');
  const queued=queueCompanyDelegation(db,packet.packetId,{insertTask,enqueueTask,now});assert.equal(queued.ok,true);assert.equal(enqueued,1);
  const task=db.prepare('SELECT * FROM tasks WHERE task_id=?').get(queued.taskId);assert.equal(task.role_id,'D-00');assert.equal(task.provider,'ollama-local');assert.match(task.input,/رتبي هذه النقاط الافتراضية/);
  assert.equal(decideCompanyDelegation(db,packet.packetId,'APPROVED',now).error,'DELEGATION_ALREADY_DECIDED');
  db.prepare("UPDATE tasks SET status='completed',result_json=? WHERE task_id=?").run(JSON.stringify({output:'رتبي النقاط حسب اعتمادياتها.'}),queued.taskId);
  assert.equal(approveDelegationResult(db,packet.packetId,'ملخص مراجع.',false,now).error,'RESULT_OWNER_APPROVAL_REQUIRED');
  assert.equal(approveDelegationResult(db,packet.packetId,'يتعلق بالسجل الصحي.',true,now).error,'RESULT_REDACTION_REQUIRED');
  const shared=approveDelegationResult(db,packet.packetId,'ملخص مراجع: ترتيب حسب الاعتماديات.',true,now);assert.equal(shared.status,'COMPLETED');
  console.log(JSON.stringify({result:'PASS',checks:13,mode:'temporary-sqlite-and-synthetic-packet',liveCalls:0,n8nCalls:0,paidCalls:0}));
}finally{db.close();await rm(directory,{recursive:true,force:true});}
