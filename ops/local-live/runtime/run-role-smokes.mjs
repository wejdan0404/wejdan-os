import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../../..');
const roles=JSON.parse(await readFile(resolve(root,'roles/role_registry.json'),'utf8')).roles;
const evidencePath=resolve(root,'ops/evidence/local-live-85-role-smoke.json');
const report={schema_version:'local-role-live-smoke.v1',auditor_version:'1.0.0',model:'qwen3:8b',provider:'ollama-local',started_at:new Date().toISOString(),expected_roles:roles.length,completed:0,passed:0,failed:0,entries:[],paid_provider_calls:0,notes:['Each role received a synthetic bounded text-only prompt through the persisted API → local n8n → Ollama chain. Pass validates task/trace/role correlation, non-empty output, and n8n execution reference; it is not a semantic quality certification.']};
async function checkpoint(){const temp=evidencePath+'.tmp';await writeFile(temp,JSON.stringify(report,null,2)+'\n');await rename(temp,evidencePath);}
await checkpoint();
for(const role of roles){
 const prompt=`For role ${role.role_id}, produce one concise smoke-test criterion grounded in your responsibilities. Synthetic only; no tools, private data, or external actions. Do not claim execution.`;
 const entry={role_id:role.role_id,started_at:new Date().toISOString(),result:'FAIL'};
 try{
  const response=await fetch('http://127.0.0.1:8766/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({role_id:role.role_id,input:prompt}),signal:AbortSignal.timeout(300000)});
  const data=await response.json();entry.http_status=response.status;entry.task_id=data.task_id||null;entry.trace_id=data.trace_id||null;entry.n8n_execution_id=data.n8n_execution_id||null;entry.model=data.model||null;entry.output_chars=typeof data.output==='string'?data.output.trim().length:0;entry.completed_at=new Date().toISOString();
  const issues=[];if(!response.ok)issues.push(data.detail||data.error||`HTTP_${response.status}`);if(data.role_id!==role.role_id)issues.push('ROLE_ID_MISMATCH');if(!data.task_id)issues.push('MISSING_TASK_ID');if(!data.trace_id)issues.push('MISSING_TRACE_ID');if(!data.n8n_execution_id)issues.push('MISSING_N8N_EXECUTION_ID');if(entry.output_chars<10)issues.push('EMPTY_OR_SHORT_OUTPUT');if(data.provider!=='ollama-local'||data.model!=='qwen3:8b')issues.push('PROVIDER_MODEL_MISMATCH');entry.issues=issues;entry.result=issues.length?'FAIL':'PASS';
 }catch(error){entry.completed_at=new Date().toISOString();entry.issues=[String(error.message||error)];}
 report.entries.push(entry);report.completed++;if(entry.result==='PASS')report.passed++;else report.failed++;await checkpoint();
 console.log(`${report.completed}/${roles.length} ${role.role_id} ${entry.result}${entry.issues?.length?` ${entry.issues.join(',')}`:''}`);
}
report.completed_at=new Date().toISOString();report.overall=report.failed===0&&report.passed===roles.length?'PASS':'FAIL';await checkpoint();
console.log(JSON.stringify({overall:report.overall,expected_roles:report.expected_roles,completed:report.completed,passed:report.passed,failed:report.failed,evidencePath}));
if(report.overall!=='PASS')process.exitCode=1;
