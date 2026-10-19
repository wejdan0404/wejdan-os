import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readdir,access} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHqServer,resolveWorkspaceUrl} from '../server.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const lifeRoot=path.resolve(here,'../../..');
const companyRoot=path.resolve(here,'../../../../../wejdan-company');
const lifeServer=path.join(lifeRoot,'ops/local-live/runtime/server.mjs');
const companyServer=path.join(companyRoot,'server/index.js');
const randomToken=()=>Buffer.from(cryptoRandom(48)).toString('base64url');
const cryptoRandom=n=>{const a=new Uint8Array(n);globalThis.crypto.getRandomValues(a);return a;};
const personalToken=randomToken(),companyToken=randomToken();
const originalEnv={...process.env};
let tempRoot;
let hqServer,hqBase;
let fakeSources=[];
const sourceUrls={};
let sourceHits={life:0,company:0};
let sourceModes={life:'ok',company:'ok'};
const summary=(workspace)=>({schema_version:'wejdan.hq-summary.v1',workspace_id:workspace,generated_at:new Date().toISOString(),system:{status:'HEALTHY',mode:'MOCK'},providers:[{id:'synthetic-local',status:'UNKNOWN',usage:'UNKNOWN'}],agents:{registered:2,by_status:{MOCK:2}},projects:workspace==='PERSONAL'?{total:0,by_status:{},availability:'NOT_IN_LOCAL_RUNTIME_SCHEMA'}:{total:1,by_status:{ACTIVE:1}},tasks:workspace==='PERSONAL'?{total:2,by_status:{COMPLETED:1,WAITING_FOR_APPROVAL:1},synthetic_total:1,unclassified_total:1,classification:'AVAILABLE_WITH_LEGACY_UNCLASSIFIED'}:{total:3,by_status:{COMPLETED:2,WAITING_FOR_APPROVAL:1},synthetic_total:4,archived_total:1},approvals:{pending:1},artifacts:workspace==='PERSONAL'?{completed:0,availability:'NOT_IN_LOCAL_RUNTIME_SCHEMA'}:{completed:1},activity:{latest_at:new Date().toISOString(),recent_count:2,synthetic_recent_count:1,unclassified_recent_count:1,items:[{kind:'TASK',at:new Date().toISOString()},{kind:'APPROVAL',at:new Date().toISOString()}]},trace_ref:null});
async function listen(server){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}`;}
async function close(server){if(server?.listening)await new Promise(resolve=>server.close(resolve));}
function makeSource(key,token,workspace){const server=http.createServer((req,res)=>{sourceHits[key]++;if(req.url!=='/api/hq/v1/summary'||req.method!=='GET'){res.writeHead(404);return res.end();}if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(403);return res.end();}if(sourceModes[key]==='unavailable'){res.writeHead(503);return res.end();}if(sourceModes[key]==='redirect'){res.writeHead(302,{location:'http://127.0.0.1:1/private'});return res.end();}if(sourceModes[key]==='large'){res.writeHead(200,{'content-type':'application/vnd.wejdan.hq-summary.v1+json','content-length':'20000'});return res.end(Buffer.alloc(20000,65));}const payload=summary(sourceModes[key]==='wrong-workspace'?'COMPANY':workspace);if(sourceModes[key]==='stale')payload.generated_at=new Date(Date.now()-5*60*1000).toISOString();if(sourceModes[key]==='expanded')payload.conversation='synthetic-private-content';res.writeHead(200,{'content-type':'application/vnd.wejdan.hq-summary.v1+json'});res.end(JSON.stringify(payload));});return server;}
async function api(pathname,options={}){return fetch(hqBase+pathname,{redirect:'manual',...options});}
async function login(){return {headers:new Headers()};}
async function waitFor(url,token,proc){for(let i=0;i<100;i++){if(proc.exitCode!==null)throw new Error(`source exited ${proc.exitCode}`);try{const res=await fetch(url,{headers:{authorization:`Bearer ${token}`}});if(res.status===200)return res;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('source did not become ready');}
async function stopChild(child){if(!child||child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(child.exitCode===null)child.kill('SIGKILL');}
async function startChild(script,env,cwd){const childEnv=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','LOCALAPPDATA','APPDATA'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));const child=spawn(process.execPath,[script],{cwd,env:{...childEnv,...env},stdio:['ignore','pipe','pipe'],windowsHide:true});child.testOutput='';child.stdout.on('data',chunk=>child.testOutput+=chunk);child.stderr.on('data',chunk=>child.testOutput+=chunk);return child;}

before(async()=>{
  tempRoot=await mkdtemp(path.join(os.tmpdir(),'wejdan-hq-'));
process.env.HQ_PERSONAL_READ_TOKEN=personalToken;process.env.HQ_COMPANY_READ_TOKEN=companyToken;
  const life=makeSource('life',personalToken,'PERSONAL'),company=makeSource('company',companyToken,'COMPANY');fakeSources=[life,company];
  const lifeUrl=await listen(life),companyUrl=await listen(company);
  sourceUrls.life=lifeUrl+'/api/hq/v1/summary';sourceUrls.company=companyUrl+'/api/hq/v1/summary';
  hqServer=createHqServer({sourceUrls});hqBase=await listen(hqServer);
});
after(async()=>{await close(hqServer);for(const source of fakeSources)await close(source);Object.assign(process.env,originalEnv);for(const key of Object.keys(process.env))if(!(key in originalEnv))delete process.env[key];if(tempRoot)await rm(tempRoot,{recursive:true,force:true});});

test('production workspace descriptors resolve to their fixed loopback URL while tests may inject strings',()=>{
  assert.equal(resolveWorkspaceUrl('life'),'http://127.0.0.1:8766/api/hq/v1/summary');
  assert.equal(resolveWorkspaceUrl('company'),'http://127.0.0.1:4174/api/hq/v1/summary');
  assert.equal(resolveWorkspaceUrl('life',{life:'http://127.0.0.1:12345/test'}),'http://127.0.0.1:12345/test');
  assert.equal(resolveWorkspaceUrl('life',{life:{url:'http://127.0.0.1:12346/test'}}),'http://127.0.0.1:12346/test');
});

test('loopback summary is password-free while session route is absent',async()=>{
  const result=await api('/api/hq/v1/summary?system=life');assert.equal(result.status,200);assert.equal((await api('/api/hq/session')).status,404);assert.equal((await api('/api/hq/session',{method:'POST',body:'{}'})).status,404);
});

test('valid requests connect to each independent workspace with the corresponding source token',async()=>{
  const cookie='';
  for(const [system,workspace] of [['life','PERSONAL'],['company','COMPANY']]){const res=await api('/api/hq/v1/summary?system='+system,{headers:{cookie}});assert.equal(res.status,200);const body=await res.json();assert.equal(body.connectionStatus,'Connected');assert.equal(body.summary.workspace_id,workspace);assert.equal(body.readOnly,true);assert.equal(body.summary.tasks.total,workspace==='PERSONAL'?2:3);assert.equal(body.summary.approvals.pending,1);assert.doesNotMatch(JSON.stringify(body),new RegExp(`${personalToken}|${companyToken}|task-content-sentinel`));}
  assert.equal(sourceHits.life,2);assert.equal(sourceHits.company,1);
});

test('bad source token, missing token, and unavailable source fail closed per workspace',async()=>{
  const cookie='';
  process.env.HQ_PERSONAL_READ_TOKEN='wrong-but-long-enough-synthetic-token-xxxxxxxx';
  let res=await api('/api/hq/v1/summary?system=life',{headers:{cookie}});assert.equal(res.status,502);assert.equal((await res.json()).state,'BLOCKED');
  delete process.env.HQ_PERSONAL_READ_TOKEN;
  res=await api('/api/hq/v1/summary?system=life',{headers:{cookie}});assert.equal(res.status,503);assert.equal((await res.json()).state,'NEEDS_CONFIGURATION');
  process.env.HQ_PERSONAL_READ_TOKEN=personalToken;sourceModes.company='unavailable';
  res=await api('/api/hq/v1/summary?system=company',{headers:{cookie}});assert.equal(res.status,502);assert.equal((await res.json()).state,'BLOCKED');sourceModes.company='ok';
});

test('workspace confusion, extra query filters, content reads and writes are rejected',async()=>{
  const cookie='';
  const hitsBefore=sourceHits.life+sourceHits.company;
  assert.equal((await api('/api/hq/v1/summary?system=life&task_id=123',{headers:{cookie}})).status,400);
  assert.equal((await api('/api/hq/v1/summary?system=unknown',{headers:{cookie}})).status,400);
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await api('/api/hq/v1/summary?system=life',{method,headers:{cookie}})).status,405,method);
  assert.equal((await api('/api/tasks/task-content-sentinel',{headers:{cookie}})).status,404);
  assert.equal((await api('/api/tasks',{method:'POST',headers:{cookie},body:'{}'})).status,404);
  assert.equal((await api('/api/approvals',{method:'POST',headers:{cookie},body:'{}'})).status,404);
  // Use the company credential at the Life source. It must not authenticate cross-space.
  process.env.HQ_PERSONAL_READ_TOKEN=companyToken;
  const cross=await api('/api/hq/v1/summary?system=life',{headers:{cookie}});assert.equal(cross.status,502);assert.equal((await cross.json()).state,'BLOCKED');
  process.env.HQ_PERSONAL_READ_TOKEN=personalToken;
  assert.equal(sourceHits.life+sourceHits.company,hitsBefore+1); // only the attempted summary reached its fixed source; content and write paths never forwarded.
});

test('summary DTO rejects stale, cross-workspace, expanded and malformed source responses',async()=>{
  const cookie='';
  for(const mode of ['wrong-workspace','expanded','stale','large','redirect']){sourceModes.life=mode;const result=await api('/api/hq/v1/summary?system=life',{headers:{cookie}});assert.equal(result.status,502,mode);assert.equal((await result.json()).state,'BLOCKED',mode);}sourceModes.life='ok';
});

test('Life OS source API uses only its temporary SQLite database and never returns row content',async()=>{
  const token=personalToken,dbPath=path.join(tempRoot,'life.sqlite'),port=await getPort();
  const legacyDb=new DatabaseSync(dbPath);legacyDb.exec(`CREATE TABLE tasks (
    task_id TEXT PRIMARY KEY, trace_id TEXT NOT NULL UNIQUE, role_id TEXT NOT NULL, input TEXT NOT NULL, status TEXT NOT NULL,
    result_json TEXT, error TEXT, created_at TEXT NOT NULL, completed_at TEXT, cancel_requested INTEGER NOT NULL DEFAULT 0,
    parent_task_id TEXT, attempt INTEGER NOT NULL DEFAULT 1, collaborate INTEGER NOT NULL DEFAULT 0, reviewer_role_id TEXT,
    requires_approval INTEGER NOT NULL DEFAULT 0, provider TEXT NOT NULL DEFAULT 'ollama-local'
  );`);legacyDb.prepare('INSERT INTO tasks(task_id,trace_id,role_id,input,status,created_at) VALUES(?,?,?,?,?,?)').run('legacy-before-migration','legacy-trace','D-00','PRIVATE_PRE_MIGRATION_SENTINEL','failed',new Date().toISOString());legacyDb.close();
  const child=await startChild(lifeServer,{WEJDAN_DB_PATH:dbPath,WEJDAN_API_PORT:String(port),HQ_PERSONAL_READ_TOKEN:token},lifeRoot);
  try{
    const url=`http://127.0.0.1:${port}/api/hq/v1/summary`;
    await waitFor(url,token,child).catch(error=>{throw new Error(`${error.message}\n${child.testOutput}`);});
    const empty=await (await fetch(url,{headers:{authorization:`Bearer ${token}`} })).json();assert.equal(empty.tasks.total,0);assert.equal(empty.tasks.unclassified_total,1);assert.equal(empty.activity.recent_count,0);assert.deepEqual(empty.activity.items,[]);
    const db=new DatabaseSync(dbPath);const migratedColumns=new Set(db.prepare('PRAGMA table_info(tasks)').all().map(column=>column.name));assert.ok(migratedColumns.has('hq_classification'));const stamp=new Date().toISOString();db.prepare('INSERT INTO tasks(task_id,trace_id,role_id,input,status,created_at,hq_classification) VALUES(?,?,?,?,?,?,?)').run('synthetic-task','synthetic-trace','D-00','PRIVATE_LIFE_TASK_SENTINEL','completed',stamp,'SYNTHETIC');db.prepare('INSERT INTO tasks(task_id,trace_id,role_id,input,status,created_at,hq_classification) VALUES(?,?,?,?,?,?,?)').run('operational-task','operational-trace','D-00','PRIVATE_OPERATIONAL_TASK_SENTINEL','waiting_approval',stamp,'OPERATIONAL');db.prepare('INSERT INTO approval_requests(approval_id,task_id,trace_id,proposal,status,created_at) VALUES(?,?,?,?,?,?)').run('synthetic-approval','synthetic-task','synthetic-trace','PRIVATE_APPROVAL_SENTINEL','pending',stamp);db.prepare('INSERT INTO approval_requests(approval_id,task_id,trace_id,proposal,status,created_at) VALUES(?,?,?,?,?,?)').run('operational-approval','operational-task','operational-trace','private operational approval','pending',stamp);db.prepare('INSERT INTO approval_requests(approval_id,task_id,trace_id,proposal,status,created_at) VALUES(?,?,?,?,?,?)').run('legacy-approval','legacy-before-migration','legacy-trace','private legacy approval','pending',stamp);db.close();
    const headers={authorization:`Bearer ${token}`};
    const ok=await fetch(url,{headers}).catch(error=>{throw new Error(`${error.message}; childExit=${child.exitCode}\n${child.testOutput}`);});assert.equal(ok.status,200);const body=await ok.json();assert.equal(body.workspace_id,'PERSONAL');assert.equal(body.tasks.total,1);assert.equal(body.tasks.synthetic_total,1);assert.equal(body.tasks.unclassified_total,1);assert.equal(body.tasks.by_status.WAITING_FOR_APPROVAL,1);assert.equal(body.tasks.classification,'AVAILABLE_WITH_LEGACY_UNCLASSIFIED');assert.equal(body.activity.recent_count,2);assert.equal(body.activity.synthetic_recent_count,2);assert.equal(body.activity.unclassified_recent_count,2);assert.equal(body.agents.by_status.MOCK,3);assert.equal(body.agents.by_status.BLOCKED,82);assert.equal(body.projects.availability,'NOT_IN_LOCAL_RUNTIME_SCHEMA');assert.equal(body.approvals.pending,1);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_PRE_MIGRATION_SENTINEL|PRIVATE_LIFE_TASK_SENTINEL|PRIVATE_OPERATIONAL_TASK_SENTINEL|PRIVATE_APPROVAL_SENTINEL/);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${randomToken()}`}})).status,403);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${companyToken}`}})).status,403);
    assert.equal((await fetch(url+'?task=synthetic-task',{headers})).status,400);
    assert.equal((await fetch(url,{method:'POST',headers})).status,405);
    const check=new DatabaseSync(dbPath);assert.equal(check.prepare('SELECT count(*) AS n FROM tasks').get().n,3);assert.equal(check.prepare('SELECT count(*) AS n FROM approval_requests').get().n,3);assert.equal(check.prepare('SELECT hq_classification FROM tasks WHERE task_id=\'legacy-before-migration\'').get().hq_classification,null);check.close();
    const broken=new DatabaseSync(dbPath);broken.exec('DROP TABLE approval_requests');broken.close();const dbFailure=await fetch(url,{headers});assert.equal(dbFailure.status,503);assert.deepEqual(await dbFailure.json(),{error:'SUMMARY_SOURCE_UNAVAILABLE'});
    // Full task reads and writes are denied at the HQ boundary in the dedicated BFF route tests above.
  }finally{await stopChild(child);}
});

test('Company OS source API aggregates its temporary SQLite database only',async()=>{
  const token=companyToken,dbPath=path.join(tempRoot,'company.sqlite'),port=await getPort();
  const child=await startChild(companyServer,{COMPANY_OS_DB_PATH:dbPath,PORT:String(port),HQ_COMPANY_READ_TOKEN:token},companyRoot);
  try{
    const url=`http://127.0.0.1:${port}/api/hq/v1/summary`;
    await waitFor(url,token,child).catch(error=>{throw new Error(`${error.message}\n${child.testOutput}`);});
    const db=new DatabaseSync(dbPath);const initialCount=db.prepare("SELECT count(*) AS n FROM tasks t LEFT JOIN task_classifications c ON c.task_id=t.id WHERE t.synthetic=0 AND upper(coalesce(c.category,'')) NOT IN ('TEST','QA','SYNTHETIC_QA','ARCHIVED')").get().n;const initialSynthetic=db.prepare("SELECT count(*) AS n FROM tasks t LEFT JOIN task_classifications c ON c.task_id=t.id WHERE t.synthetic<>0 OR upper(coalesce(c.category,'')) IN ('TEST','QA','SYNTHETIC_QA')").get().n;const initialArchived=db.prepare("SELECT count(*) AS n FROM tasks t LEFT JOIN task_classifications c ON c.task_id=t.id WHERE t.synthetic=0 AND upper(coalesce(c.category,''))='ARCHIVED'").get().n;const initialPending=db.prepare("SELECT count(*) AS n FROM approvals ap LEFT JOIN tasks t ON t.id=ap.task_id LEFT JOIN task_classifications c ON c.task_id=t.id WHERE ap.status='WAITING_FOR_APPROVAL' AND ap.synthetic=0 AND (t.id IS NULL OR (t.synthetic=0 AND upper(coalesce(c.category,'')) NOT IN ('TEST','QA','SYNTHETIC_QA','ARCHIVED')))").get().n;const initialTaskRows=db.prepare('SELECT count(*) AS n FROM tasks').get().n;const cutoff=new Date(Date.now()-7*24*60*60*1000).toISOString();const initialSyntheticEvents=db.prepare("SELECT count(*) AS n FROM events e LEFT JOIN tasks t ON t.id=e.task_id LEFT JOIN task_classifications c ON c.task_id=t.id WHERE (e.synthetic<>0 OR t.synthetic<>0 OR upper(coalesce(c.category,'')) IN ('TEST','QA','SYNTHETIC_QA','ARCHIVED')) AND e.created_at>=?").get(cutoff).n;const initialOperationalEvents=db.prepare("SELECT count(*) AS n FROM events e LEFT JOIN tasks t ON t.id=e.task_id LEFT JOIN task_classifications c ON c.task_id=t.id WHERE e.synthetic=0 AND (t.id IS NULL OR (t.synthetic=0 AND upper(coalesce(c.category,'')) NOT IN ('TEST','QA','SYNTHETIC_QA','ARCHIVED')))").get().n;const stamp=new Date().toISOString();const agent=db.prepare('SELECT id FROM agents LIMIT 1').get();assert.ok(agent);
    db.prepare('INSERT INTO tasks(id,title,agent_id,status,mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run('synthetic-task','PRIVATE_COMPANY_TASK_SENTINEL',agent.id,'WAITING_FOR_APPROVAL','MOCK',stamp,stamp);
    db.prepare("INSERT INTO task_classifications(task_id,category,reason,classified_at) VALUES(?,'TEST','synthetic test record',?)").run('synthetic-task',stamp);
    db.prepare('INSERT INTO tasks(id,title,agent_id,status,mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run('operational-task','operational approval wait',agent.id,'WAITING_FOR_APPROVAL','MOCK',stamp,stamp);
    db.prepare('INSERT INTO tasks(id,title,agent_id,status,mode,synthetic,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run('synthetic-flagged-task','synthetic flag',agent.id,'COMPLETED','MOCK',1,stamp,stamp);
    db.prepare('INSERT INTO tasks(id,title,agent_id,status,mode,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run('archived-task','archived record',agent.id,'COMPLETED','MOCK',stamp,stamp);
    db.prepare("INSERT INTO task_classifications(task_id,category,reason,classified_at) VALUES(?,'ARCHIVED','archived operational task',?)").run('archived-task',stamp);
    db.prepare('INSERT INTO events(id,category,message,synthetic,created_at) VALUES(?,?,?,?,?)').run('real-event','task','operational event',0,stamp);
    db.prepare('INSERT INTO events(id,category,message,synthetic,created_at) VALUES(?,?,?,?,?)').run('qa-event','task','synthetic event',1,stamp);
    db.prepare('INSERT INTO events(id,category,task_id,message,synthetic,created_at) VALUES(?,?,?,?,0,?)').run('qa-task-event','task','synthetic-task','event tied to QA task',stamp);
    db.prepare('INSERT INTO approvals(id,task_id,action,summary,status,synthetic,created_at) VALUES(?,?,?,?,?,0,?)').run('synthetic-approval','synthetic-task','TEST','PRIVATE_APPROVAL_SENTINEL','WAITING_FOR_APPROVAL',stamp);db.close();
    const headers={authorization:`Bearer ${token}`};const ok=await fetch(url,{headers});assert.equal(ok.status,200);const body=await ok.json();assert.equal(body.workspace_id,'COMPANY');assert.equal(body.system.mode,'MOCK');assert.equal(body.tasks.total,initialCount+1);assert.equal(body.tasks.synthetic_total,initialSynthetic+2);assert.equal(body.tasks.archived_total,initialArchived+1);assert.equal(body.tasks.by_status.WAITING_FOR_APPROVAL,1);assert.equal(body.activity.synthetic_recent_count,initialSyntheticEvents+2);assert.equal(body.activity.items.length,Math.min(initialOperationalEvents+1,5));assert.equal(body.approvals.pending,initialPending);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_COMPANY_TASK_SENTINEL|PRIVATE_APPROVAL_SENTINEL/);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${randomToken()}`}})).status,403);
    assert.equal((await fetch(url,{headers:{authorization:`Bearer ${personalToken}`}})).status,403);
    assert.equal((await fetch(url+'?task_id=synthetic-task',{headers})).status,400);
    assert.equal((await fetch(url,{method:'POST',headers})).status,405);
    const check=new DatabaseSync(dbPath);assert.equal(check.prepare('SELECT count(*) AS n FROM tasks').get().n,initialTaskRows+4);assert.equal(check.prepare("SELECT count(*) AS n FROM approvals ap LEFT JOIN tasks t ON t.id=ap.task_id LEFT JOIN task_classifications c ON c.task_id=t.id WHERE ap.status='WAITING_FOR_APPROVAL' AND ap.synthetic=0 AND (t.id IS NULL OR (t.synthetic=0 AND upper(coalesce(c.category,'')) NOT IN ('TEST','QA','SYNTHETIC_QA','ARCHIVED')))").get().n,initialPending);check.close();
    const broken=new DatabaseSync(dbPath);broken.exec('DROP TABLE artifacts');broken.close();const dbFailure=await fetch(url,{headers});assert.equal(dbFailure.status,503);assert.deepEqual(await dbFailure.json(),{error:'SUMMARY_SOURCE_UNAVAILABLE'});
  }finally{await stopChild(child);}
});

test('HQ interface stays read-only, RTL, and fits desktop and mobile viewports',async()=>{
  const require=createRequire(path.join(process.env.APPDATA||'C:/Users/WinDows/AppData/Roaming','npm/node_modules/@playwright/cli/package.json'));
  const {chromium}=require('playwright');
  const browserRoot=path.join(process.env.LOCALAPPDATA||'C:/Users/WinDows/AppData/Local','ms-playwright');
  const versions=(await readdir(browserRoot)).filter(name=>/^chromium-\d+$/.test(name)).sort((a,b)=>Number(b.slice(9))-Number(a.slice(9)));
  let executable;
  for(const version of versions){for(const suffix of ['chrome-win64/chrome.exe','chrome-headless-shell-win64/chrome-headless-shell.exe']){const candidate=path.join(browserRoot,version,suffix);try{await access(candidate);executable=candidate;break;}catch{}}if(executable)break;}
  if(!executable)throw new Error('Playwright Chromium is not installed; install it before running HQ browser acceptance.');
  const browser=await chromium.launch({headless:true,executablePath:executable});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],browserTokens=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('request',request=>{const authorization=request.headers().authorization;if(authorization)browserTokens.push(authorization);});
    await page.goto(hqBase);await page.getByRole('button',{name:/Life OS/}).waitFor();assert.equal(await page.locator('#workspace').isVisible(),true);assert.equal(await page.locator('input[type=password]').count(),0);
    await page.getByText('قراءة فقط',{exact:true}).waitFor();await page.getByRole('button',{name:/Company OS/}).click();await page.getByText('Company OS',{exact:true}).first().waitFor();
    await page.locator('#disabled-message').evaluate(el=>{if(!el.disabled)throw new Error('chat input must be disabled');});await page.getByRole('button',{name:'إرسال'}).evaluate(el=>{if(!el.disabled)throw new Error('send must be disabled');});
    await page.getByText('سجل الاختبارات',{exact:true}).waitFor();await page.getByRole('button',{name:/Life OS/}).click();await page.getByText('مهام قديمة غير مصنفة',{exact:true}).waitFor();await page.getByText(/مهمة قديمة بلا تصنيف/).waitFor();
    const desktop=await page.evaluate(()=>({dir:document.documentElement.dir,width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.equal(desktop.dir,'rtl');assert.ok(desktop.width<=desktop.client+1,JSON.stringify(desktop));
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(mobile.width<=mobile.client+1,JSON.stringify(mobile));assert.deepEqual(errors,[]);assert.deepEqual(browserTokens,[]);const storage=await page.evaluate(()=>({local:JSON.stringify(localStorage),session:JSON.stringify(sessionStorage)}));assert.deepEqual(storage,{local:'{}',session:'{}'});assert.doesNotMatch(await page.locator('body').innerText(),new RegExp(`${personalToken}|${companyToken}`));
  }finally{await browser.close();}
});

async function getPort(){const server=http.createServer();const url=await listen(server);const port=server.address().port;await close(server);return port;}
