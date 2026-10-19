const bridgeStatus=document.querySelector('#company-delegations-status');
const bridgeList=document.querySelector('#company-delegations-list');
let delegationRefreshTimer=null;
const escapeBridge=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function loadCompanyDelegations(){
  if(!bridgeStatus||!bridgeList)return;
  bridgeStatus.textContent='جارٍ فحص صندوق الطلبات…';
  try{
    const response=await fetch('/api/bridge/life/requests',{cache:'no-store'}),data=await response.json();
    if(!response.ok)throw new Error(data.error||'تعذر الاتصال بصندوق الطلبات.');
    const requests=data.requests||[];
    clearTimeout(delegationRefreshTimer);
    if(requests.some(item=>item.status==='RUNNING'&&item.task_status!=='completed'))delegationRefreshTimer=setTimeout(loadCompanyDelegations,1200);
    bridgeStatus.textContent=requests.length?`طلبات Life OS: ${requests.length}`:'لا توجد طلبات واردة من Company OS.';
    bridgeList.innerHTML=requests.length?requests.map(item=>{
      const completed=item.task_status==='completed';
      const pending=item.status==='PENDING_LIFE_OWNER';
      const approved=item.status==='APPROVED_WAITING_TO_START';
      const output=item.result?.output||'';
      return `<article class="inbox-item company-delegation-item"><div class="company-delegation-copy"><strong>${escapeBridge(item.title)}</strong><p>${escapeBridge(item.request_text)}</p><small dir="ltr">${escapeBridge(item.packet_id)} · ${escapeBridge(item.created_at)}</small><p>الحالة: ${escapeBridge(item.status)}${item.task_status?` · المهمة: ${escapeBridge(item.task_status)}`:''}</p>${completed&&!item.shared_summary?`<label class="field-label" for="bridge-summary-${escapeBridge(item.packet_id)}">ملخص منقح للمشاركة اختياريًا</label><textarea class="form-control" rows="3" maxlength="1000" id="bridge-summary-${escapeBridge(item.packet_id)}">${escapeBridge(output.slice(0,1000))}</textarea><label class="bridge-consent"><input type="checkbox" data-share-consent="${escapeBridge(item.packet_id)}"> راجعت الملخص وأوافق على إرساله إلى Company OS.</label><button type="button" class="button quiet" data-share="${escapeBridge(item.packet_id)}">إرسال الملخص الموافق عليه</button>`:item.shared_summary?`<p>الملخص المرسل إلى Company OS: ${escapeBridge(item.shared_summary)}</p>`:''}</div><div class="task-action-row">${pending?`<button type="button" class="button primary" data-decision="approve" data-request="${escapeBridge(item.packet_id)}">موافقة Life OS</button><button type="button" class="button quiet" data-decision="reject" data-request="${escapeBridge(item.packet_id)}">رفض</button>`:''}${approved?`<button type="button" class="button primary" data-start="${escapeBridge(item.packet_id)}">بدء مهمة D-00</button>`:''}</div></article>`;
    }).join(''):'<p>لا توجد طلبات واردة.</p>';
    bridgeList.querySelectorAll('[data-decision]').forEach(button=>button.addEventListener('click',()=>decideCompanyDelegation(button.dataset.request,button.dataset.decision)));
    bridgeList.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>startCompanyDelegation(button.dataset.start)));
    bridgeList.querySelectorAll('[data-share]').forEach(button=>button.addEventListener('click',()=>shareCompanyDelegation(button.dataset.share)));
  }catch(error){bridgeStatus.textContent=error.message==='LOCAL_OWNER_AUTH_NOT_CONFIGURED'?'يحتاج إعداد رمز مالكة Life OS في الخدمة المحلية.':error.message==='LIFE_API_UNAVAILABLE'?'خدمة Life OS غير متاحة حاليًا.':`صندوق الطلبات محجوب: ${error.message}`;bridgeList.innerHTML='';}
}
async function delegationAction(packetId,action,body={}){
  const response=await fetch(`/api/bridge/life/requests/${encodeURIComponent(packetId)}/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
  if(!response.ok)throw new Error(data.error||'تعذر تنفيذ الإجراء.');
  return data;
}
async function decideCompanyDelegation(packetId,decision){
  const message=decision==='approve'?'الموافقة تسجل قبول المهمة في Life OS فقط. لن تبدأ المهمة حتى تضغطي زر البدء لاحقًا. هل توافقين؟':'هل ترفضين طلب Life OS؟';
  if(!window.confirm(message))return;
  try{await delegationAction(packetId,'decision',{decision});await loadCompanyDelegations();}catch(error){bridgeStatus.textContent=error.message;}
}
async function startCompanyDelegation(packetId){
  if(!window.confirm('سيُنشئ هذا مهمة D-00 ويشغلها عبر مسار Life OS المحلي. قد يستخدم ذلك n8n المحلي وOllama. هل تبدئينها؟'))return;
  try{await delegationAction(packetId,'start');bridgeStatus.textContent='بدأت المهمة في Life OS؛ لا تنتقل نتيجة تلقائيًا إلى Company OS.';await loadCompanyDelegations();}catch(error){bridgeStatus.textContent=error.message;}
}
async function shareCompanyDelegation(packetId){
  const consent=bridgeList.querySelector(`[data-share-consent="${CSS.escape(packetId)}"]`),summary=bridgeList.querySelector(`#bridge-summary-${CSS.escape(packetId)}`);
  if(!consent?.checked){bridgeStatus.textContent='أكدي مراجعة الملخص قبل مشاركته.';return;}
  try{await delegationAction(packetId,'share-result',{summary:summary?.value||'',ownerConfirmed:true});await loadCompanyDelegations();}catch(error){bridgeStatus.textContent=error.message;}
}
document.querySelector('#refresh-company-delegations')?.addEventListener('click',loadCompanyDelegations);
document.addEventListener('DOMContentLoaded',loadCompanyDelegations);
