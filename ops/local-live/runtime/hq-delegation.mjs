import { randomUUID, timingSafeEqual } from 'node:crypto';

const KEYS=['schemaVersion','packetId','sourceSystem','targetSystem','createdAt','expiresAt','title','request','agentId','requestedBy','allowedData','sensitivity','ownerApproval'];
const sensitive=/(health|medical|medicine|diagnos|pcos|bank|password|passphrase|api[ _-]?key|secret|token|صحة|صحي|دواء|علاج|تشخيص|تكيس|حساب بنكي|كلمة\s*المرور|مفتاح سري|معلوماتي الشخصية)/i;
export function ensureHqDelegationSchema(db){db.exec(`CREATE TABLE IF NOT EXISTS hq_delegation_requests(
  packet_id TEXT PRIMARY KEY, title TEXT NOT NULL, request_text TEXT NOT NULL, status TEXT NOT NULL,
  task_id TEXT, owner_decision_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  shared_summary TEXT, shared_at TEXT
);`)}
export function delegationTokenMatches(expected,supplied){if(typeof expected!=='string'||expected.length<43||typeof supplied!=='string')return false;const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b)}
export function validateCompanyDelegation(packet,now=new Date()){
  if(!packet||typeof packet!=='object'||Array.isArray(packet)||Object.keys(packet).length!==KEYS.length||Object.keys(packet).some(key=>!KEYS.includes(key)))return {ok:false,error:'PACKET_FIELDS_INVALID'};
  if(packet.schemaVersion!==1||packet.sourceSystem!=='COMPANY_OS'||packet.targetSystem!=='LIFE_OS')return {ok:false,error:'PACKET_DIRECTION_INVALID'};
  if(typeof packet.packetId!=='string'||!/^bridge-[a-f0-9-]{36}$/.test(packet.packetId))return {ok:false,error:'PACKET_ID_INVALID'};
  if(packet.agentId!=='D-00'||packet.requestedBy!=='OWNER')return {ok:false,error:'DELEGATE_NOT_ALLOWED'};
  if(typeof packet.title!=='string'||!packet.title.trim()||packet.title.trim().length>160||typeof packet.request!=='string'||!packet.request.trim()||packet.request.trim().length>2000)return {ok:false,error:'TEXT_INVALID'};
  if(JSON.stringify(packet.allowedData)!==JSON.stringify(['OWNER_AUTHORED_REQUEST_ONLY'])||packet.sensitivity!=='NON_SENSITIVE_TASK_TEXT')return {ok:false,error:'DATA_NOT_ALLOWED'};
  if(!packet.ownerApproval||Object.keys(packet.ownerApproval).sort().join(',')!=='approvedAt,decision'||packet.ownerApproval.decision!=='APPROVED')return {ok:false,error:'COMPANY_OWNER_APPROVAL_REQUIRED'};
  if(sensitive.test(`${packet.title}\n${packet.request}`))return {ok:false,error:'SENSITIVE_TEXT_BLOCKED'};
  const created=Date.parse(packet.createdAt),expires=Date.parse(packet.expiresAt),approved=Date.parse(packet.ownerApproval.approvedAt),current=now.getTime();
  if(![created,expires,approved].every(Number.isFinite)||created>current+300000||approved<created||approved>current+300000||expires<current||expires>created+3600000)return {ok:false,error:'PACKET_EXPIRED_OR_TIME_INVALID'};
  return {ok:true,packet:{...packet,title:packet.title.trim(),request:packet.request.trim()}};
}
export function receiveCompanyDelegation(db,packet,now=new Date()){
  const checked=validateCompanyDelegation(packet,now);if(!checked.ok)return checked;
  const existing=db.prepare('SELECT packet_id,status FROM hq_delegation_requests WHERE packet_id=?').get(packet.packetId);
  if(existing)return {ok:true,duplicate:true,requestId:existing.packet_id,status:existing.status};
  const timestamp=now.toISOString();
  db.prepare(`INSERT INTO hq_delegation_requests(packet_id,title,request_text,status,created_at,updated_at) VALUES(?,?,?,'PENDING_LIFE_OWNER',?,?)`)
    .run(packet.packetId,checked.packet.title,checked.packet.request,timestamp,timestamp);
  return {ok:true,duplicate:false,requestId:packet.packetId,status:'PENDING_LIFE_OWNER'};
}
export function decideCompanyDelegation(db,packetId,decision,now=new Date()){
  if(!['APPROVED','REJECTED'].includes(decision))return {ok:false,error:'DECISION_INVALID'};
  const row=db.prepare('SELECT * FROM hq_delegation_requests WHERE packet_id=?').get(packetId);
  if(!row)return {ok:false,error:'DELEGATION_NOT_FOUND'};
  if(row.status!=='PENDING_LIFE_OWNER')return {ok:false,error:'DELEGATION_ALREADY_DECIDED'};
  const status=decision==='APPROVED'?'APPROVED_WAITING_TO_START':'REJECTED',timestamp=now.toISOString();
  db.prepare('UPDATE hq_delegation_requests SET status=?,owner_decision_at=?,updated_at=? WHERE packet_id=? AND status=\'PENDING_LIFE_OWNER\'').run(status,timestamp,timestamp,packetId);
  return {ok:true,status,ownerDecisionAt:timestamp};
}
export function queueCompanyDelegation(db,packetId,{insertTask,enqueueTask,now=new Date(),queueFull=false}={}){
  const row=db.prepare('SELECT * FROM hq_delegation_requests WHERE packet_id=?').get(packetId);
  if(!row)return {ok:false,error:'DELEGATION_NOT_FOUND'};
  if(row.status!=='APPROVED_WAITING_TO_START')return {ok:false,error:'LIFE_OWNER_APPROVAL_REQUIRED'};
  if(queueFull)return {ok:false,error:'LOCAL_QUEUE_FULL'};
  const taskId=`task_${randomUUID()}`,traceId=`trace_${randomUUID()}`,timestamp=now.toISOString();
  insertTask.run(taskId,traceId,'D-00',`Company OS handoff: ${row.title}\n\n${row.request_text}`,'queued',timestamp,0,null,1,0,null,0,'ollama-local','OPERATIONAL');
  db.prepare('UPDATE hq_delegation_requests SET status=\'RUNNING\',task_id=?,updated_at=? WHERE packet_id=?').run(taskId,timestamp,packetId);
  enqueueTask(taskId);
  return {ok:true,taskId,status:'RUNNING'};
}
export function approveDelegationResult(db,packetId,summary,ownerConfirmed,now=new Date()){
  if(ownerConfirmed!==true)return {ok:false,error:'RESULT_OWNER_APPROVAL_REQUIRED'};
  if(typeof summary!=='string'||!summary.trim()||summary.trim().length>1000||sensitive.test(summary))return {ok:false,error:'RESULT_REDACTION_REQUIRED'};
  const row=db.prepare('SELECT * FROM hq_delegation_requests WHERE packet_id=?').get(packetId);
  if(!row||row.status!=='RUNNING'||!row.task_id)return {ok:false,error:'TASK_NOT_RUNNING_OR_FOUND'};
  const task=db.prepare('SELECT status,result_json FROM tasks WHERE task_id=?').get(row.task_id);
  if(task?.status!=='completed')return {ok:false,error:'TASK_NOT_COMPLETED'};
  const timestamp=now.toISOString();db.prepare(`UPDATE hq_delegation_requests SET status='COMPLETED',shared_summary=?,shared_at=?,updated_at=? WHERE packet_id=?`).run(summary.trim(),timestamp,timestamp,packetId);
  return {ok:true,status:'COMPLETED',sharedAt:timestamp};
}
