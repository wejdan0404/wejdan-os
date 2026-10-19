import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
try { process.loadEnvFile(resolve(root,'ops/local-live/private/hq.env')); } catch (error) { if(error.code!=='ENOENT')throw error; }
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(JSON.stringify(data));}
async function readBody(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>3000)throw Object.assign(new Error('BODY_TOO_LARGE'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400});}}
async function proxyDelegation(req,res,url){
  if(!url.pathname.startsWith('/api/bridge/life/'))return false;
  const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return reply(res,400,{error:'INVALID_HOST'}),true;
  const expectedOrigin=`http://${host}`,origin=req.headers.origin;
  const sameOrigin=origin?origin===expectedOrigin:req.headers['sec-fetch-site']==='same-origin'&&String(req.headers.referer||'').startsWith(`${expectedOrigin}/`);
  if(!sameOrigin)return reply(res,403,{error:'SAME_ORIGIN_REQUIRED'}),true;
  const token=process.env.WEJDAN_API_CONTROL_TOKEN;if(typeof token!=='string'||token.length<43)return reply(res,503,{error:'LOCAL_OWNER_AUTH_NOT_CONFIGURED'}),true;
  const apiBase=`http://127.0.0.1:${Number(process.env.WEJDAN_API_PORT||8766)}`;
  let target,body;
  if(url.pathname==='/api/bridge/life/requests'&&req.method==='GET')target='/api/hq/v1/delegations/inbox';
  else {
    const match=url.pathname.match(/^\/api\/bridge\/life\/requests\/(bridge-[a-f0-9-]{36})\/(decision|start|share-result)$/);
    if(!match||req.method!=='POST')return reply(res,404,{error:'NOT_FOUND'}),true;
    target=`/api/hq/v1/delegations/${encodeURIComponent(match[1])}/${match[2]}`;
    try{body=await readBody(req);}catch(error){return reply(res,error.status||400,{error:error.message}),true;}
  }
  try{
    const response=await fetch(apiBase+target,{method:req.method,headers:{'x-wejdan-local-control':token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(1800),redirect:'error'});
    const payload=await response.json().catch(()=>({error:'INVALID_LOCAL_RESPONSE'}));reply(res,response.status,payload);return true;
  }catch{reply(res,503,{error:'LIFE_API_UNAVAILABLE'});return true;}
}
const server = createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){res.writeHead(400);return res.end('Invalid host');}
  if(req.method==='OPTIONS'){res.writeHead(405,{'allow':'GET, HEAD, POST'});return res.end();}
  if(await proxyDelegation(req,res,url))return;
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'allow':'GET, HEAD'});return res.end();}
  const pathname = decodeURIComponent(url.pathname);
  let candidate = resolve(root, `.${pathname}`);
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate=resolve(candidate,'index.html');
  if (!(candidate === root || candidate.startsWith(root + sep)) || !existsSync(candidate) || !statSync(candidate).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type':mime[extname(candidate)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
  createReadStream(candidate).pipe(res);
});
const port=Number(process.env.WEJDAN_COMMAND_CENTER_PORT||8765);
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Local preview at http://127.0.0.1:${port}/command-center/\n`));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
