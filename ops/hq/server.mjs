import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
try{process.loadEnvFile(path.join(here,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
const PUBLIC_DIR=path.join(here,'public');
const WORKSPACES={
  life:{workspaceId:'PERSONAL',tokenEnv:'HQ_PERSONAL_READ_TOKEN',url:'http://127.0.0.1:8766/api/hq/v1/summary'},
  company:{workspaceId:'COMPANY',tokenEnv:'HQ_COMPANY_READ_TOKEN',url:'http://127.0.0.1:4174/api/hq/v1/summary'}
};
const VALID_SYSTEMS=new Set(['HEALTHY','DEGRADED','UNAVAILABLE','BLOCKED']);
const VALID_MODES=new Set(['LIVE','MOCK','MANUAL','LOCAL','UNKNOWN']);
const VALID_PROVIDER_STATES=new Set(['AVAILABLE','DISABLED','BLOCKED','UNKNOWN']);
const VALID_USAGE=new Set(['KNOWN','UNKNOWN','NOT_APPLICABLE']);
const VALID_COUNTS=new Set(['LIVE','MOCK','MANUAL','BLOCKED','COMPLETED','FAILED','RUNNING','QUEUED','WAITING_FOR_APPROVAL','WAITING_FOR_INPUT','ARCHIVED','ACTIVE','OTHER']);
const LIMITS={host:8870,timeoutMs:1800,maxUpstreamBytes:16*1024,maxAgeMs:2*60*1000,maxFutureMs:30*1000};
export function resolveWorkspaceUrl(systemKey,sourceUrls=WORKSPACES){
  const configured=sourceUrls?.[systemKey];
  return typeof configured==='string'?configured:typeof configured?.url==='string'?configured.url:WORKSPACES[systemKey]?.url;
}

function json(res,status,payload,headers={}){
  const text=JSON.stringify(payload);
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",...headers});
  res.end(text);
}
function isLoopback(address='') {return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);}
function secretConfigured(value){return typeof value==='string'&&value.length>=43&&/^[A-Za-z0-9_-]+$/.test(value);}
async function readJson(req,maxBytes=4096){let total=0,chunks=[];for await(const chunk of req){total+=chunk.length;if(total>maxBytes)throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400});}}
function exactKeys(object,keys){return Boolean(object&&typeof object==='object'&&!Array.isArray(object)&&JSON.stringify(Object.keys(object).sort())===JSON.stringify([...keys].sort()));}
function countMapValid(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length<=16&&Object.entries(value).every(([key,count])=>VALID_COUNTS.has(key)&&Number.isSafeInteger(count)&&count>=0&&count<=1_000_000_000));}
function validSummary(value,expectedWorkspace){
  if(!exactKeys(value,['schema_version','workspace_id','generated_at','system','providers','agents','projects','tasks','approvals','artifacts','activity','trace_ref']))return false;
  if(value.schema_version!=='wejdan.hq-summary.v1'||value.workspace_id!==expectedWorkspace||typeof value.generated_at!=='string')return false;
  const generated=Date.parse(value.generated_at),age=Date.now()-generated;if(!Number.isFinite(generated)||age>LIMITS.maxAgeMs||age< -LIMITS.maxFutureMs)return false;
  if(!exactKeys(value.system,['status','mode'])||!VALID_SYSTEMS.has(value.system.status)||!VALID_MODES.has(value.system.mode))return false;
  if(!Array.isArray(value.providers)||value.providers.length>8||!value.providers.every(item=>exactKeys(item,['id','status','usage'])&&typeof item.id==='string'&&/^[a-z0-9-]{1,40}$/.test(item.id)&&VALID_PROVIDER_STATES.has(item.status)&&VALID_USAGE.has(item.usage)))return false;
  if(!exactKeys(value.agents,['registered','by_status'])||!Number.isSafeInteger(value.agents.registered)||value.agents.registered<0||!countMapValid(value.agents.by_status))return false;
  if(!(exactKeys(value.projects,['total','by_status'])||exactKeys(value.projects,['total','by_status','availability']))||!Number.isSafeInteger(value.projects.total)||value.projects.total<0||!countMapValid(value.projects.by_status)||value.projects.availability!==undefined&&value.projects.availability!=='NOT_IN_LOCAL_RUNTIME_SCHEMA')return false;
  if(!(exactKeys(value.tasks,['total','by_status'])||exactKeys(value.tasks,['total','by_status','synthetic_total','archived_total'])||exactKeys(value.tasks,['total','by_status','classification'])||exactKeys(value.tasks,['total','by_status','synthetic_total','unclassified_total','classification']))||!Number.isSafeInteger(value.tasks.total)||value.tasks.total<0||!countMapValid(value.tasks.by_status))return false;
  if(value.tasks.synthetic_total!==undefined&&(!Number.isSafeInteger(value.tasks.synthetic_total)||value.tasks.synthetic_total<0)||value.tasks.archived_total!==undefined&&(!Number.isSafeInteger(value.tasks.archived_total)||value.tasks.archived_total<0)||value.tasks.unclassified_total!==undefined&&(!Number.isSafeInteger(value.tasks.unclassified_total)||value.tasks.unclassified_total<0)||value.tasks.classification!==undefined&&!['UNAVAILABLE_IN_LIFE_TASK_SCHEMA','AVAILABLE_WITH_LEGACY_UNCLASSIFIED'].includes(value.tasks.classification))return false;
  if(!exactKeys(value.approvals,['pending'])||!Number.isSafeInteger(value.approvals.pending)||value.approvals.pending<0)return false;
  if(!(exactKeys(value.artifacts,['completed'])||exactKeys(value.artifacts,['completed','availability']))||!Number.isSafeInteger(value.artifacts.completed)||value.artifacts.completed<0||value.artifacts.availability!==undefined&&value.artifacts.availability!=='NOT_IN_LOCAL_RUNTIME_SCHEMA')return false;
  if(!(exactKeys(value.activity,['latest_at','recent_count','items'])||exactKeys(value.activity,['latest_at','recent_count','items','synthetic_recent_count'])||exactKeys(value.activity,['latest_at','recent_count','items','synthetic_recent_count','unclassified_recent_count']))||!(value.activity.latest_at===null||typeof value.activity.latest_at==='string'&&Number.isFinite(Date.parse(value.activity.latest_at)))||!Number.isSafeInteger(value.activity.recent_count)||value.activity.recent_count<0||value.activity.synthetic_recent_count!==undefined&&(!Number.isSafeInteger(value.activity.synthetic_recent_count)||value.activity.synthetic_recent_count<0)||value.activity.unclassified_recent_count!==undefined&&(!Number.isSafeInteger(value.activity.unclassified_recent_count)||value.activity.unclassified_recent_count<0)||!Array.isArray(value.activity.items)||value.activity.items.length>5||!value.activity.items.every(item=>exactKeys(item,['kind','at'])&&['TASK','AGENT','APPROVAL','PROJECT','SYSTEM','OTHER'].includes(item.kind)&&typeof item.at==='string'&&Number.isFinite(Date.parse(item.at))))return false;
  return value.trace_ref===null||typeof value.trace_ref==='string'&&/^[A-Za-z0-9:_-]{1,64}$/.test(value.trace_ref);
}
async function readBoundedBody(response){
  const declared=Number(response.headers.get('content-length')||0);if(declared>LIMITS.maxUpstreamBytes)throw new Error('UPSTREAM_TOO_LARGE');
  if(!response.body)return '';
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>LIMITS.maxUpstreamBytes){await reader.cancel();throw new Error('UPSTREAM_TOO_LARGE');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const joined=new Uint8Array(size);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
  return new TextDecoder().decode(joined);
}
async function fetchWorkspace(systemKey,sourceUrls=WORKSPACES){
  const workspace=WORKSPACES[systemKey],token=process.env[workspace.tokenEnv];
  if(!secretConfigured(token))return {connectionStatus:'Needs Configuration',state:'NEEDS_CONFIGURATION',summary:null,reason:'SOURCE_TOKEN_MISSING'};
  try{
    const response=await fetch(resolveWorkspaceUrl(systemKey,sourceUrls),{method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/vnd.wejdan.hq-summary.v1+json'},signal:AbortSignal.timeout(LIMITS.timeoutMs),redirect:'error',cache:'no-store'});
    if(!response.ok)return {connectionStatus:'Blocked',state:'BLOCKED',summary:null,reason:response.status===403||response.status===401?'SOURCE_AUTH_REJECTED':'SOURCE_UNAVAILABLE'};
    if(!response.headers.get('content-type')?.toLowerCase().startsWith('application/vnd.wejdan.hq-summary.v1+json'))return {connectionStatus:'Blocked',state:'BLOCKED',summary:null,reason:'SOURCE_CONTENT_TYPE_INVALID'};
    const raw=await readBoundedBody(response);let summary;try{summary=JSON.parse(raw);}catch{return {connectionStatus:'Blocked',state:'BLOCKED',summary:null,reason:'SOURCE_JSON_INVALID'};}
    if(!validSummary(summary,workspace.workspaceId))return {connectionStatus:'Blocked',state:'BLOCKED',summary:null,reason:'SOURCE_SUMMARY_REJECTED'};
    return {connectionStatus:'Connected',state:'CONNECTED',summary,reason:null};
  }catch{return {connectionStatus:'Blocked',state:'BLOCKED',summary:null,reason:'SOURCE_UNAVAILABLE'};}
}
async function api(req,res,url,sourceUrls){
  if(url.pathname==='/api/hq/session')return json(res,404,{error:'NOT_FOUND'});
  if(url.pathname==='/api/hq/v1/summary'){
    if(req.method!=='GET')return json(res,405,{error:'READ_ONLY'},{allow:'GET'});

    const query=[...url.searchParams.entries()];if(query.length!==1||query[0][0]!=='system')return json(res,400,{error:'SYSTEM_REQUIRED'});
    const systemKey=query[0][1];if(!Object.hasOwn(WORKSPACES,systemKey))return json(res,400,{error:'UNKNOWN_SYSTEM'});
    const result=await fetchWorkspace(systemKey,sourceUrls);
    return json(res,result.state==='CONNECTED'?200:result.state==='NEEDS_CONFIGURATION'?503:502,{system:systemKey,...result,readOnly:true,generatedAt:new Date().toISOString()});
  }
  return json(res,404,{error:'NOT_FOUND'});
}
function staticFile(req,res,url){
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'READ_ONLY'},{allow:'GET, HEAD'});
  const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
  const name=files[url.pathname];if(!name)return json(res,404,{error:'NOT_FOUND'});
  readFile(path.join(PUBLIC_DIR,name)).then(body=>{const type=name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8';res.writeHead(200,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','cross-origin-resource-policy':'same-origin','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);}).catch(()=>json(res,404,{error:'NOT_FOUND'}));
}
export function createHqServer({sourceUrls=WORKSPACES}={}){

  return http.createServer(async(req,res)=>{
    if(!isLoopback(req.socket.remoteAddress))return json(res,403,{error:'LOOPBACK_ONLY'});
    const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return json(res,400,{error:'INVALID_HOST'});
    const url=new URL(req.url||'/',`http://${host}`);
    try{if(url.pathname.startsWith('/api/'))await api(req,res,url,sourceUrls);else staticFile(req,res,url);}catch(error){if(!res.headersSent)json(res,error.status||500,{error:'HQ_REQUEST_FAILED'});else res.destroy();}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const port=Number(process.env.HQ_PORT||8870);
  const server=createHqServer();server.listen(port,'127.0.0.1',()=>console.log(`Wejdan HQ loopback server listening on http://127.0.0.1:${port}`));
  const close=()=>server.close(()=>process.exit(0));process.on('SIGINT',close);process.on('SIGTERM',close);
}
