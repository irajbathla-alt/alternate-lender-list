(()=>{'use strict';
const URL='https://wyejyzxecvvspdruryzh.supabase.co';
const KEY='sb_publishable_JAC4bzslO4RRdlgmGdD_Gg_ywwkuXGC';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0});
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-CA'):'—';
const errText=e=>e?.message||'Please try again.';
const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null,profile=null,apps=[],selected=null,detailData=null,working=false,listSort='newest',statusFilter='all',productFilter='all';
function notice(text,bad=false,auth=false){const el=$(auth?'loginNotice':'notice');if(!el)return;el.textContent=text;el.className=bad?'portal-alert error':'portal-alert';el.hidden=!text;}
function authorized(){return Boolean(user&&profile?.role==='broker'&&profile?.active)}
function gate(){ $('loginPanel').hidden=authorized();$('appView').hidden=!authorized();$('logout').hidden=!authorized(); }
async function loadIdentity(){
 const {data,error}=await db.auth.getUser();user=error?null:data.user;profile=null;
 if(user){const r=await db.from('profiles').select('id,role,active,full_name').eq('id',user.id).maybeSingle();if(r.error)throw r.error;profile=r.data;}
 gate();
 if(user&&!authorized())notice('Your Supabase account is not an active Broker account. Please contact VFC Admin.',true,true);
 if(authorized()){ showWorkspace(workspaceView,false); $('welcome').textContent='Welcome, '+(profile.full_name||user.email?.split('@')[0]||'Broker')+'.'; $('accountEmail').textContent=user.email||''; await refresh(); }
}
let chatCounts=new Map(),chatPolling=false,dashboardUpdates=[],notificationBusy=false,unreadOnly=false,metricFilter='all';
const metricGroups={all:null,review:['under_review'],approved:['approved','conditional_approval'],action:['additional_documents_required','pending_client_info'],funded:['funded']};
function metricMatch(a,key){return !metricGroups[key]||metricGroups[key].includes(a.status);}
function renderPriority(){
 const root=$('priorityDeals');if(!root)return;const rows=apps.filter(a=>metricMatch(a,'action')||Number(chatCounts.get(a.id)?.unread||0)>0).sort((a,b)=>Number(chatCounts.get(b.id)?.unread||0)-Number(chatCounts.get(a.id)?.unread||0)||new Date(b.created_at)-new Date(a.created_at));
 const total=$('priorityCount');total.textContent=String(rows.length);total.hidden=!rows.length;
 const html=rows.slice(0,8).map(a=>{const n=Number(chatCounts.get(a.id)?.unread||0);return '<div class="priority-deal-row"><div><b>'+esc(a.business_name)+'</b><small>VFC-'+String(a.application_number).padStart(4,'0')+' · '+esc(a.clients?.full_name||'Client')+'</small></div><div class="priority-deal-state">'+(n?'<span class="unread-chip">'+n+' unread</span>':'')+(metricMatch(a,'action')?'<small>'+esc(label(a.status))+'</small>':'')+'</div><button type="button" class="btn secondary priority-open" data-priority="'+esc(a.id)+'">Open</button></div>'}).join('');
 if(root.dataset.content!==html){root.innerHTML=html||'<p class="subtle">No deals currently need your attention.</p>';root.dataset.content=html;}const more=$('priorityMore');more.hidden=rows.length<=8;
}
function renderDashboardNotifications(){
 const root=$('dashboardNotifications');if(!root)return;const own=new Map(apps.map(a=>[a.id,a]));const rows=dashboardUpdates.filter(n=>!n.application_id||own.has(n.application_id));const unread=rows.filter(n=>!n.read_at).length;const count=$('notificationCount');count.textContent=String(unread);count.hidden=!unread;
 const visibleRows=unreadOnly?rows.filter(n=>!n.read_at):rows;const rail=$('railUnread');if(rail){rail.textContent=String(unread);rail.hidden=!unread;}const html=visibleRows.map(n=>{const a=own.get(n.application_id),deal=a?'VFC-'+String(a.application_number).padStart(4,'0')+' · '+a.business_name:'General update';return '<article class="dashboard-notification-row '+(!n.read_at?'is-unread':'')+'"><span class="notification-dot" aria-label="'+(n.read_at?'Read':'Unread')+'"></span><div class="notification-copy"><b>'+esc(n.title)+'</b><p>'+esc(n.body)+'</p><small>'+esc(deal)+' · '+esc(new Date(n.created_at).toLocaleString('en-CA'))+'</small></div>'+(a?'<button type="button" class="btn secondary notification-open" data-notification="'+esc(n.id)+'">Open File</button>':(!n.read_at?'<button type="button" class="btn secondary notification-open" data-notification="'+esc(n.id)+'">Mark Read</button>':''))+'</article>';}).join('');
 if(root.dataset.content!==html){root.innerHTML=html||'<p class="subtle">'+(unreadOnly?'No unread notifications.':'You’re all caught up. New Admin updates will appear here.')+'</p>';root.dataset.content=html;}
}
async function refreshDashboardNotifications(){
 if(!authorized()||notificationBusy)return;notificationBusy=true;const uid=user.id;
 try{const r=await db.from('notifications').select('id,application_id,event_type,title,body,read_at,created_at').eq('recipient_id',uid).neq('event_type','test_fixture_created').order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;if(!authorized()||user.id!==uid)return;dashboardUpdates=r.data||[];renderDashboardNotifications();if(workspaceView==='deals')render();}
 catch(e){if(authorized()&&user.id===uid){$('dashboardNotifications').textContent='Unable to load updates. Use Refresh to try again.';delete $('dashboardNotifications').dataset.content;}throw e;}finally{notificationBusy=false;}
}

async function refreshChatCounts(){if(!authorized())return;const uid=user.id;const r=await db.rpc('vfc_deal_chat_list');if(r.error)throw r.error;if(!authorized()||user.id!==uid)return;chatCounts=new Map((r.data||[]).map(x=>[x.application_id,x]));apps.forEach(a=>{const v=chatCounts.get(a.id);if(v?.status)a.status=v.status;});if(workspaceView==='dashboard'||workspaceView==='deals')render();const status=$('decisionShortcut'),current=apps.find(a=>a.id===selected);if(status&&current){status.textContent=label(current.status);status.dataset.status=current.status;}const b=$('dealUnread');if(b){const n=Number(chatCounts.get(selected)?.unread||0);b.textContent=n?String(n):'';b.hidden=!n;}}
async function refreshDealChat(id){if(!authorized()||selected!==id||activeFileTab!=='activity'||document.hidden)return;const r=await db.rpc('vfc_deal_chat_messages',{p_application:id});if(r.error)throw r.error;if(!authorized()||selected!==id||activeFileTab!=='activity'||document.hidden||!$('dealChatList'))return;const rows=(r.data||[]).slice().reverse();const list=$('dealChatList'),nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<70;const sig=rows.map(m=>m.id).join(',');if(list.dataset.signature!==sig){list.innerHTML=rows.map(m=>'<div class="broker-chat '+(m.sender_id===user.id?'chat-own':'chat-other')+'"><b>'+esc(m.sender_id===user.id?'You':m.actor_role==='admin'?'VFC Admin':'Broker')+'</b><p>'+esc(m.body)+'</p><small>'+esc(new Date(m.created_at).toLocaleString('en-CA'))+'</small></div>').join('')||'<p class="subtle">No messages yet. Send a message to start the conversation.</p>';list.dataset.signature=sig;if(nearBottom)list.scrollTop=list.scrollHeight;}const ids=rows.filter(m=>m.sender_id!==user.id).map(m=>m.id);if(ids.length&&list.dataset.readSignature!==sig){const mark=await db.rpc('vfc_deal_chat_read',{p_application:id,p_messages:ids});if(mark.error)throw mark.error;list.dataset.readSignature=sig;}await refreshChatCounts();}
function groupDealDocs(){
 const list=$('docList'),grid=$('docFolderGrid'),content=$('docFolderView');if(!list||!grid||!content)return;
 const categories=[['bank_statements','Bank Statements'],['identification','Identification'],['business_registration','Business Registration'],['financial_statements','Financial Statements'],['tax_documents','Tax Documents'],['property_documents','Property Documents'],['application','Applications'],['signed_application','Signed Applications'],['other','Other Documents']];
 const signed=document.querySelector('.signed-library-row');if(signed){signed.dataset.category='signed_application';list.prepend(signed);}
 const rows=[...list.querySelectorAll('.file-document-row')],buckets=new Map(categories.map(([k,n])=>[k,{name:n,rows:[]}]));
 rows.forEach(row=>{const key=row.dataset.category||'other';if(!buckets.has(key))buckets.set(key,{name:label(key),rows:[]});buckets.get(key).rows.push(row);});
 const folderIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h7l2 2h9v12H3z"/></svg>';
 let active=null;
 function showFolder(key){active=active===key?null:key;grid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.folder===active)));content.replaceChildren();content.hidden=!active;if(!active)return;const group=buckets.get(active);const title=document.createElement('div');title.className='doc-folder-view-title';title.textContent=group.name+' · '+group.rows.length+' files';content.append(title);
 if(!group.rows.length){const p=document.createElement('p');p.className='file-empty';p.textContent='No documents in this folder.';content.append(p);return;}
 group.rows.forEach(row=>{const copy=row.cloneNode(true);copy.classList.add('folder-preview-row');copy.querySelectorAll('.doc-pick').forEach(x=>x.remove());const originals=[...row.querySelectorAll('.doc-row-actions button')];copy.querySelectorAll('.doc-row-actions button').forEach((button,i)=>{button.onclick=()=>{if(!working&&!originals[i].disabled)originals[i].click();};});content.append(copy);});
 }
 grid.replaceChildren();for(const [key,b] of buckets){const button=document.createElement('button');button.type='button';button.className='doc-folder-card';button.dataset.folder=key;button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','docFolderView');button.innerHTML='<span class="doc-folder-card-top">'+folderIcon+'<b>'+b.rows.length+'</b></span><span class="doc-folder-card-name">'+esc(b.name)+'</span>';button.onclick=()=>showFolder(key);grid.append(button);}
}
async function refresh(scroll=true){
 if(!authorized())return;
 const r=await db.from('applications').select('id,application_number,business_name,financing_product,requested_amount,status,submitted_at,created_at,deal_summary,clients(id,full_name,email,phone)').eq('broker_id',user.id).order('created_at',{ascending:false}).limit(250);
 if(r.error)throw r.error;apps=r.data||[];await refreshChatCounts().catch(()=>{});render();await refreshDashboardNotifications().catch(()=>{});
 if(selected){const exists=apps.find(a=>a.id===selected);if(exists)await openFile(selected,scroll);else{$('detail').innerHTML='';selected=null;showWorkspace('deals',false);}}
}
function signingStatus(x){if(!x)return 'Not sent';if(x.status==='signed')return 'Signed';if(x.status==='pending'&&new Date(x.expires_at).getTime()<Date.now())return 'Link expired';if(x.status==='pending')return 'Awaiting signature';return label(x.status);}
function signingRows(rows){return rows.map(x=>'<div class="broker-mini broker-sign-row"><span><b>'+esc(signingStatus(x))+'</b><small>Created: '+new Date(x.created_at).toLocaleString('en-CA')+(x.signed_at?' · Signed: '+new Date(x.signed_at).toLocaleString('en-CA'):'')+(x.status==='signed'&&x.email_status?' · PDF email: '+esc(label(x.email_status)):'')+'</small></span>'+(x.status==='signed'?'<button type="button" class="btn secondary signed-copy" data-id="'+esc(x.id)+'">Download Signed PDF</button>':'')+'</div>').join('')||'<p class="subtle">No signing requests created.</p>';}
function label(s){return String(s||'draft').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
const dealBellIcon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/><circle cx="19" cy="4" r="2.5" fill="currentColor" stroke="#fff" stroke-width="1"/></svg>';
function dealUnreadUpdate(id){return dashboardUpdates.find(n=>n.application_id===id&&!n.read_at);}
function renderDealRow(a){
 const hasUnread=Boolean(dealUnreadUpdate(a.id)||Number(chatCounts.get(a.id)?.unread||0)),docs=Number(chatCounts.get(a.id)?.document_count||0);
 const id=esc(a.id),file='VFC-'+String(a.application_number).padStart(4,'0'),name=esc(a.clients?.full_name||'Client'),business=esc(a.business_name);
 return '<article class="broker-list-row" role="listitem"><div class="broker-list-client"><div class="deal-list-meta"><span class="eyebrow">'+file+'</span>'+(docs?'<span class="deal-list-docs"> · '+docs+' '+(docs===1?'doc':'docs')+'</span>':'')+'</div><strong title="'+name+'">'+name+'</strong><small class="deal-business-name" title="'+business+'">'+business+'</small></div><div class="broker-list-financing"><strong>'+fmt(a.requested_amount)+'</strong><small>'+esc(a.financing_product||'')+'</small></div><div class="broker-list-status"><span class="broker-status-chip decision-status" data-status="'+esc(a.status)+'">'+esc(label(a.status))+'</span><small class="deal-list-date">'+fmtDate(a.created_at)+'</small></div><div class="deal-list-actions">'+(hasUnread?'<button type="button" class="deal-notification-bell" data-deal-bell="'+id+'" title="Unread updates" aria-label="View unread updates for '+file+'">'+dealBellIcon+'</button>':'')+'<button type="button" class="btn secondary open-deal" data-id="'+id+'" aria-label="Open file '+file+'">Open</button></div></article>';
}
function render(){
 const mine=apps;
 const metrics=[['My Applications','all'],['Under Review','review'],['Approvals','approved'],['Action Required','action'],['Funded','funded']].map(([k,key])=>'<button type="button" class="metric card metric-link" data-metric="'+key+'" title="View '+esc(k)+'"><span>'+esc(k)+'</span><strong>'+mine.filter(a=>metricMatch(a,key)).length+'</strong></button>').join('');if($('metrics').dataset.content!==metrics){$('metrics').innerHTML=metrics;$('metrics').dataset.content=metrics;}renderPriority();
 const term=$('search').value.trim().toLowerCase();
 const rows=mine.filter(a=>{
   const haystack=[a.business_name,a.clients?.full_name,a.clients?.email,a.clients?.phone,a.financing_product,a.status,'VFC-'+String(a.application_number).padStart(4,'0')].join(' ').toLowerCase();
   return haystack.includes(term)&&metricMatch(a,metricFilter)&&(statusFilter==='all'||a.status===statusFilter)&&(productFilter==='all'||a.financing_product===productFilter);
 }).sort((a,b)=>listSort==='amount-desc'?Number(b.requested_amount)-Number(a.requested_amount):listSort==='amount-asc'?Number(a.requested_amount)-Number(b.requested_amount):listSort==='oldest'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
 $('resultsCount').textContent=rows.length+' of '+mine.length+' applications';
 const metricNames={review:'Under Review',approved:'Approvals',action:'Action Required',funded:'Funded'};const mc=$('metricFilterChip');mc.hidden=metricFilter==='all';mc.textContent=metricNames[metricFilter]||'';const activeFilters=Number(statusFilter!=='all')+Number(productFilter!=='all')+Number(listSort!=='newest')+Number(metricFilter!=='all');const filterCount=$('filterCount');if(filterCount){filterCount.textContent=String(activeFilters);filterCount.hidden=!activeFilters;$('dealsFilters').classList.toggle('has-filters',activeFilters>0);}
 const dealHtml=rows.map(renderDealRow).join('')||'<p class="subtle">No applications match your search.</p>';if($('cards').dataset.content!==dealHtml){$('cards').innerHTML=dealHtml;$('cards').dataset.content=dealHtml;}
}
async function busyRun(button,func){
 if(working)return;working=true;const text=button?.textContent;if(button){button.disabled=true;button.textContent='Working…';}
 try{await func();}catch(e){notice(errText(e),true,!authorized());}finally{working=false;if(button){button.disabled=false;button.textContent=button.dataset.pending==='true'?'Reissue Signing Link':text;}}
}
let fileRequest=0,activeFileTab='information',workspaceView='dashboard';
const sectionNames={decision:'Financing Decision',information:'Client & Business',documents:'Documents',signing:'Application & Signing',activity:'Messages & Activity'};
function showWorkspace(view,scroll=true){workspaceView=view;$('appView').classList.toggle('deal-open',view==='file');$('appView').classList.remove('deal-drawer-open');['dashboard','deals','new','file','sample'].forEach(name=>{const el=$('view-'+name);if(el)el.hidden=name!==view;});document.querySelectorAll('[data-workspace]').forEach(b=>{const active=b.dataset.workspace===(view==='file'?'deals':view==='sample'?'dashboard':view);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(view==='dashboard'||view==='deals')render();if(scroll)window.scrollTo({top:0,behavior:'auto'});}
function navigateWorkspace(view){if(working)return;if(isEditingInfo()){notice('Save or cancel your changes before leaving the file.',true);return;}selected=null;fileRequest++;$('detail').innerHTML='';showWorkspace(view);notice('');}
function isEditingInfo(){return $('editClientForm')?.classList.contains('is-editing')===true;}
function setDealDrawer(open,focus=false){const drawer=$('dealDrawer'),toggle=$('dealMenuToggle'),backdrop=$('dealDrawerBackdrop');if(!drawer||!toggle||!backdrop)return;drawer.hidden=!open;backdrop.hidden=!open;toggle.setAttribute('aria-expanded',String(open));$('appView').classList.toggle('deal-drawer-open',open);if(focus){if(open)$('dealDrawerClose').focus({preventScroll:true});else toggle.focus({preventScroll:true});}}
function selectFileTab(name){if(!sectionNames[name])return false;if(name!=='information'&&isEditingInfo()){notice('Save or cancel your changes before switching sections.',true);return false;}activeFileTab=name;document.querySelectorAll('#openedFile [data-file-tab]').forEach(b=>{if(b.dataset.fileTab===name)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});document.querySelectorAll('#openedFile [data-file-panel]').forEach(p=>p.hidden=p.dataset.filePanel!==name);$('fileSectionTitle').textContent=sectionNames[name];setDealDrawer(false);if(name==='activity')refreshDealChat(selected).catch(e=>notice(errText(e),true));if(name==='decision')refreshDecision(selected).catch(e=>notice(errText(e),true));return true;}
function openSampleDecision(){
 if(!authorized()||working||isEditingInfo())return;
 navigateWorkspace('sample');
 const sample={status:'conditional_approval',amount:75000,product:'Business Term Loan',conditions:'Term: 24 months\nInterest rate: 12.99% per annum\nRepayment: Monthly\nOutstanding: October and November bank statements; signed financing agreement.',note:'Conditional approval received. Please provide the outstanding documents for final review. No funds have been disbursed.',published_at:'2026-11-26T18:00:00Z'};
 $('sampleDecisionCurrent').innerHTML=decisionRecord(sample);
 $('sampleDecisionHistory').innerHTML=decisionRecord({status:'under_review',note:'Application received and assigned for underwriting.',published_at:'2026-11-25T18:00:00Z'});
}
function decisionRecord(d){return '<div class="decision-record"><div class="decision-record-top"><span class="decision-status" data-status="'+esc(d.status)+'">'+esc(label(d.status))+'</span><small>'+esc(new Date(d.published_at).toLocaleString('en-CA'))+'</small></div>'+(d.amount!=null?'<div class="decision-amount-label">Approved Amount (CAD)</div><div class="decision-amount">'+fmt(d.amount)+'</div><p class="decision-product">'+esc(d.product||'')+'</p>':'')+(d.conditions?'<div class="decision-detail"><b>Conditions / Terms</b><p>'+esc(d.conditions)+'</p></div>':'')+(d.note?'<div class="decision-detail"><b>Admin Comments</b><p>'+esc(d.note)+'</p></div>':'')+'</div>';}
async function refreshDecision(id){
 if(!authorized()||selected!==id||activeFileTab!=='decision')return;const uid=user.id,req=fileRequest;
 const r=await db.rpc('vfc_deal_decision_history',{p_application:id});if(r.error)throw r.error;if(!authorized()||user.id!==uid||selected!==id||fileRequest!==req||activeFileTab!=='decision')return;
 const a=apps.find(x=>x.id===id),rows=r.data||[],latest=rows[0];if(!a)return;
 const current=$('decisionCurrent'),history=$('decisionHistory');if(!current||!history)return;
 const matches=latest&&latest.status===a.status;
 current.innerHTML='<div class="decision-current-status"><span>Current status</span><span class="decision-status" data-status="'+esc(a.status)+'">'+esc(label(a.status))+'</span></div>'+(matches?decisionRecord(latest):'<p class="subtle decision-empty">'+(a.submitted_at?'No published decision details for the current status.':'Official decisions become available after submitting the application to Admin.')+'</p>');
 const older=matches?rows.slice(1):rows;history.innerHTML=older.length?'<details class="decision-history"><summary>Previous Updates ('+older.length+')</summary>'+older.map(decisionRecord).join('')+'</details>':'';
}
function infoRow(k,v){return '<div class="broker-kv"><span>'+esc(k)+'</span><b>'+esc(v==null||v===''?'—':v)+'</b></div>';}
function editableInfoRow(k,name,value,options={}){
 const shown=options.display??value,raw=esc(value??''),id='inline-'+name;
 const attrs=' id="'+id+'" name="'+name+'" disabled'+(options.required?' required':'');
 let control;
 if(options.choices){const choices=[...new Set([...options.choices,...(value?[String(value)]:[])])];control='<select'+attrs+'>'+choices.map(p=>'<option value="'+esc(p)+'"'+(String(value)===p?' selected':'')+'>'+esc(p)+'</option>').join('')+'</select>';}
 else if(options.type==='textarea'){control='<textarea'+attrs+' rows="3">'+raw+'</textarea>';}
 else{control='<input'+attrs+' type="'+(options.type||'text')+'" value="'+raw+'"'+(options.min!=null?' min="'+options.min+'"':'')+(options.max!=null?' max="'+options.max+'"':'')+(options.step?' step="'+options.step+'"':'')+'>';}
 const display=esc(shown==null||shown===''?'—':shown);
 return '<div class="broker-kv inline-info-row'+(options.type==='textarea'?' inline-summary-row':'')+'"><label for="'+id+'" title="'+esc(k)+'">'+esc(k)+'</label><b class="inline-read" title="'+display+'" tabindex="0">'+display+'</b><div class="inline-field" hidden>'+control+'</div></div>';
}
async function openFile(id,scroll=true){
 if(!authorized()||!apps.some(a=>a.id===id))return;if(selected!==id)activeFileTab='information';selected=id;const request=++fileRequest;const a=apps.find(x=>x.id===id);
 const [details,tasks,docs,activity,signing,shared]=await Promise.all([
 db.from('application_details').select('*').eq('application_id',id).maybeSingle(),
 db.from('checklist_items').select('id,title,description,status,item_type,required,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.from('documents').select('id,original_filename,category,storage_path,scan_status,mime_type,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.rpc('vfc_application_activity',{p_application:id}),
 db.rpc('vfc_broker_signing_history',{p_application:id}),db.rpc('vfc_shared_doc_ids',{p_application:id})
 ]);
 if(request!==fileRequest||selected!==id||!authorized())return;
 for(const r of [details,tasks,docs,activity,signing,shared])if(r.error)throw r.error;
 detailData={details:details.data,tasks:tasks.data||[],docs:docs.data||[],activity:activity.data||[],signing:signing.data||[]};
 const sharedIds=new Set((shared.data||[]).map(x=>x.document_id));
 const signed=detailData.signing.find(x=>x.status==='signed'),pending=detailData.signing.find(x=>x.status==='pending'&&new Date(x.expires_at).getTime()>Date.now());
 const cleanTest=a.business_name.startsWith('TEST - ')&&String(a.clients?.email||'').endsWith('@example.invalid');
 const d=details.data||{},canEdit=!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>['pending','signed'].includes(x.status));
 const tab=(key,name,count,side=false)=>'<button type="button" id="'+(side?'deal-side-':'file-tab-')+key+'" aria-controls="file-panel-'+key+'" data-file-tab="'+key+'">'+name+(count==null?'':' <span class="file-tab-count">'+count+'</span>')+'</button>';
 const panel=(key)=>'<div role="region" id="file-panel-'+key+'" aria-labelledby="fileSectionTitle" data-file-panel="'+key+'" hidden>';
 const fileNav=(side=false)=>tab('decision','Financing Decision',null,side)+tab('information','Client &amp; Business',null,side)+tab('documents','Documents',detailData.docs.length+(signed?1:0),side)+tab('signing','Application &amp; Signing',null,side)+tab('activity','Messages &amp; Activity',null,side);
 $('detail').innerHTML='<section class="card broker-form" id="openedFile"><button type="button" id="dealDrawerBackdrop" class="deal-drawer-backdrop" aria-label="Close deal navigation" tabindex="-1" hidden></button><aside class="deal-sidebar" id="dealDrawer" aria-label="Current deal navigation" hidden><div class="deal-drawer-top"><button type="button" class="deal-side-back" id="dealSideBack">&#8592; Back to Deals</button><button type="button" id="dealDrawerClose" class="deal-drawer-close" aria-label="Close deal navigation">&#215;</button></div><div class="deal-side-identity"><span>VFC-'+String(a.application_number).padStart(4,'0')+'</span><strong>'+esc(a.business_name)+'</strong><small>'+esc(label(a.status))+' · '+fmt(a.requested_amount)+'</small></div><nav class="deal-side-links" aria-label="Deal sections">'+fileNav(true)+'</nav></aside><div class="deal-header-compact"><div class="deal-header-line"><button type="button" class="file-back" id="closeFile" aria-label="Back to Deals">&#8592; Deals</button><span class="eyebrow deal-header-id">VFC-'+String(a.application_number).padStart(4,'0')+'</span></div><div class="deal-header-main"><h2 title="'+esc(a.business_name)+'">'+esc(a.business_name)+'</h2><div class="deal-header-meta"><button type="button" class="deal-header-status decision-status" id="decisionShortcut" data-status="'+esc(a.status)+'" title="View financing decision">'+esc(label(a.status))+'</button><strong>'+fmt(a.requested_amount)+'</strong><span title="'+esc(a.financing_product)+'">'+esc(a.financing_product)+'</span></div></div></div>'+
 '<div class="file-section-nav"><div class="file-section-nav-title"><button type="button" id="dealMenuToggle" class="deal-menu-toggle" aria-label="Open deal navigation" aria-controls="dealDrawer" aria-expanded="false"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><h3 id="fileSectionTitle">Client &amp; Business</h3></div><button type="button" class="btn secondary" id="dealChatShortcut">Chat <span class="unread-chip" id="dealUnread" hidden></span></button></div>'+
 panel('information')+'<form id="editClientForm" class="file-inline-form"><div class="file-info-toolbar"><span class="sign-state '+(signed?'is-signed':pending?'is-pending':'')+'">'+esc(signingStatus(signed||pending||detailData.signing[0]))+'</span>'+(canEdit?'<div class="inline-edit-actions"><button type="button" class="btn secondary" id="editClientInfo">Edit Information</button><button type="button" class="btn secondary" id="cancelClientEdit" hidden>Cancel</button><button type="submit" class="btn" id="saveClientEdit" hidden>Save Changes</button></div>':'')+'</div><div class="file-info-grid"><section class="file-section"><h3>Business Information</h3>'+editableInfoRow('Legal Business Name','business',a.business_name,{required:true})+editableInfoRow('Nature of Business','nature',d.nature_of_business)+editableInfoRow('Annual Revenue','revenue',d.annual_revenue,{type:'number',min:0,step:'.01',display:d.annual_revenue==null?null:fmt(d.annual_revenue)})+editableInfoRow('Employees','employees',d.employee_count,{type:'number',min:0,step:'1'})+editableInfoRow('Business Address','businessAddress',d.business_address)+editableInfoRow('Registration Year','registrationYear',d.registration_year,{type:'number',min:1800,max:2030,step:'1'})+editableInfoRow('Business Bank','bank',d.business_bank)+'</section><section class="file-section"><h3>Client Information</h3>'+editableInfoRow('Full Name','name',a.clients?.full_name,{required:true})+editableInfoRow('Email Address','email',a.clients?.email,{type:'email',required:true})+editableInfoRow('Phone Number','phone',a.clients?.phone,{type:'tel'})+editableInfoRow('Date of Birth','dob',d.owner_date_of_birth,{type:'date'})+editableInfoRow('Residential Address','ownerAddress',d.owner_address)+'</section></div><section class="file-section file-financing"><h3>Financing Information</h3>'+editableInfoRow('Product','product',a.financing_product,{choices:['Term Loan','Business LOC','Flex Funds','Mortgage Financing']})+editableInfoRow('Requested Amount','amount',a.requested_amount,{type:'number',min:1,step:'.01',required:true,display:fmt(a.requested_amount)})+editableInfoRow('Deal Summary','summary',a.deal_summary,{type:'textarea'})+'</section><p class="inline-edit-hint subtle" hidden>Changes are saved securely to this application.</p></form></div>'+
 panel('documents')+
 '<section class="file-section doc-upload-card"><details class="file-disclosure" id="uploadDisclosure" open><summary>Upload Document</summary><p class="subtle">PDF, JPG or PNG · up to 20 MB per file · select up to 10 files.</p><form id="uploadForm"><label>Category<select name="category">'+['bank_statements','identification','financial_statements','business_registration','tax_documents','property_documents','application','other'].map(s=>'<option value="'+s+'">'+esc(label(s))+'</option>').join('')+'</select></label><label>Files<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" multiple required></label><button class="btn" type="submit">Upload</button></form></details></section><section class="file-section document-library"><div class="file-section-heading"><h3>Uploaded Documents</h3><span class="file-count">'+(detailData.docs.length+(signed?1:0))+'</span></div><div class="document-actions-bar"><label class="doc-select-all"><input type="checkbox" id="selectAllDocs"> Select all</label><button type="button" class="btn" id="shareDocs" disabled>Send to Admin <span id="selectedDocCount">0</span></button></div>'+(signed?'<div class="file-document-row signed-library-row"><span class="file-type-icon">PDF</span><div class="file-document-name"><b>Signed Application.pdf</b><small>Electronically signed · '+fmtDate(signed.signed_at)+'</small></div><div class="doc-row-actions"><button type="button" class="btn secondary signed-preview" data-id="'+esc(signed.id)+'">Preview</button><button type="button" class="btn secondary signed-copy" data-id="'+esc(signed.id)+'">Download</button></div></div>':'')+'<div id="docList">'+(detailData.docs.map(d=>{const sent=sharedIds.has(d.id),allowed=['pending','clean'].includes(d.scan_status);return '<div class="file-document-row" data-category="'+esc(d.category)+'"><input class="doc-pick" type="checkbox" aria-label="Select '+esc(d.original_filename)+'" value="'+esc(d.id)+'" '+(sent||!allowed?'disabled':'')+'><span class="file-type-icon" aria-hidden="true">'+esc((d.original_filename.split('.').pop()||'FILE').toUpperCase().slice(0,5))+'</span><div class="file-document-name"><b title="'+esc(d.original_filename)+'">'+esc(d.original_filename)+'</b><small>'+esc(label(d.category))+' · '+esc(label(d.scan_status))+(sent?' · <span class="doc-shared">Sent to Admin</span>':'')+'</small></div><div class="doc-row-actions"><button type="button" class="btn secondary doc-preview" data-id="'+esc(d.id)+'" '+(!allowed?'disabled':'')+'>Preview</button><button type="button" class="btn secondary doc-download" data-id="'+esc(d.id)+'" '+(!allowed?'disabled':'')+'>Download</button></div></div>'}).join('')||(signed?'':'<p class="file-empty">No documents uploaded yet.</p>'))+'</div><p class="subtle doc-share-hint">Selected files go to Admin. Pending files require verification before Admin can download.</p></section><section class="file-section document-folders"><div class="file-section-heading"><h3>Document Folders</h3></div><div id="docFolderGrid" class="doc-folder-grid"></div><div id="docFolderView" class="doc-folder-view" hidden></div></section><dialog id="docPreviewDialog" class="doc-preview-dialog" aria-labelledby="docPreviewTitle"><div class="doc-preview-header"><h3 id="docPreviewTitle">Document preview</h3><button type="button" id="closeDocPreview" aria-label="Close preview">×</button></div><div id="docPreviewBody"></div><div class="doc-preview-footer"><a id="openDocPreview" class="btn secondary" target="_blank" rel="noopener noreferrer">Open in New Tab</a></div></dialog>'+

 '</div>'+
 panel('decision')+'<section class="decision-section"><div class="decision-heading"><div><h3>Financing Decision</h3><p class="subtle">Official updates from VFC Admin.</p></div><button type="button" class="btn secondary" id="refreshDecision">Refresh</button></div><div id="decisionCurrent" aria-live="polite"></div><div id="decisionHistory"></div></section></div>'+
 panel('signing')+
 '<section class="broker-workflow-panel"><div class="broker-workflow-title"><div><h3>Client Application &amp; Signing</h3><p class="subtle">Send the application to the client by email. No client account required.</p></div><div class="broker-actions">'+(!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>x.status==='signed')?'<button type="button" class="btn" id="sendForSignature">'+(pending?'Reissue Signing Link':'Send Application for Signature')+'</button>':'')+'</div></div><div id="signingEmailPanel"></div><div class="broker-sign-summary"><span class="sign-state '+(signed?'is-signed':pending?'is-pending':'')+'">'+esc(signingStatus(signed||pending||detailData.signing[0]))+'</span><button type="button" class="btn secondary" id="refreshSignature">Refresh Status</button></div><div id="signingHistory">'+signingRows(detailData.signing)+'</div></section>'+

 '<div class="broker-actions"><button class="btn secondary" id="downloadPdf">Download Draft PDF</button><button class="btn" id="submitAdmin" '+(a.submitted_at?'disabled':'')+'>'+(a.submitted_at?'Submitted to Admin':'Submit to Admin')+'</button>'+(cleanTest&&!a.submitted_at?'<button class="btn secondary" id="testSubmit">Submit Fictional TEST File</button>':'')+'</div><p class="subtle">Submission requires a recorded electronic signature and accepted required checklist items. The test exception accepts only fictional records without documents.</p>'+

 '</div>'+
 panel('activity')+
 '<section class="file-section deal-chat-section"><div class="file-section-heading"><h3>Deal Conversation</h3><button type="button" id="refreshChat" class="btn secondary">Refresh</button></div><p class="subtle">Private conversation with VFC Admin. Your first message makes this conversation visible to Admin, not your entire draft.</p><div class="broker-chat-list" id="dealChatList" role="log" aria-live="polite"></div><form id="messageForm" class="deal-chat-form"><textarea name="body" aria-label="Message to Admin" placeholder="Type a message or request…" required maxlength="10000" rows="2"></textarea><button class="btn" type="submit">Send</button></form></section><section class="file-section"><div class="file-section-heading"><h3>Document Activity</h3></div><button type="button" class="btn secondary" id="refreshActivity">Refresh Activity</button><p class="subtle">Supabase records the upload, broker identity, filename, category and time for each document.</p><div class="broker-activity">'+(detailData.activity.map(ev=>'<div class="broker-mini"><b>'+esc(label(ev.action))+'</b><small>'+new Date(ev.created_at).toLocaleString('en-CA')+' · '+esc(ev.actor_role)+(ev.filename?' · '+esc(ev.filename):'')+'</small></div>').join('')||'<p class="subtle">No activity recorded.</p>')+'</div></section></div></section>';
 showWorkspace('file',scroll);selectFileTab(activeFileTab);
 $('dealMenuToggle').onclick=()=>setDealDrawer($('dealDrawer').hidden,true);
 $('dealDrawerClose').onclick=$('dealDrawerBackdrop').onclick=()=>setDealDrawer(false,true);
 document.querySelectorAll('#openedFile [data-file-tab]').forEach(b=>{b.onclick=()=>{if(selectFileTab(b.dataset.fileTab))$('dealMenuToggle').focus({preventScroll:true});};});
 $('closeFile').onclick=$('dealSideBack').onclick=()=>navigateWorkspace('deals');
 $('refreshSignature').onclick=e=>busyRun(e.currentTarget,async()=>{await openFile(id,false);notice('Signing status refreshed.')});
 if($('editClientInfo')){
 const form=$('editClientForm');
 const setEditing=(enabled)=>{
 form.classList.toggle('is-editing',enabled);
 form.querySelectorAll('.inline-read').forEach(el=>el.hidden=enabled);
 form.querySelectorAll('.inline-field').forEach(el=>{el.hidden=!enabled;el.querySelector('input,select,textarea').disabled=!enabled;});
 form.querySelector('.inline-edit-hint').hidden=!enabled;
 $('editClientInfo').hidden=enabled;$('cancelClientEdit').hidden=!enabled;$('saveClientEdit').hidden=!enabled;
 };
 $('editClientInfo').onclick=()=>{setEditing(true);form.querySelector('input:not(:disabled)')?.focus({preventScroll:true});};
 $('cancelClientEdit').onclick=()=>{if(working)return;form.reset();setEditing(false);$('editClientInfo').focus({preventScroll:true});notice('');};
 form.onsubmit=e=>{e.preventDefault();if(!isEditingInfo())return;busyRun(e.submitter||$('saveClientEdit'),async()=>{
 const p=Object.fromEntries(new FormData(form).entries());
 const {error}=await db.rpc('vfc_broker_edit_application',{p_application:id,p_payload:p});
 if(error)throw error;
 setEditing(false);await refresh(false);notice('Information saved with an audit entry.');
 })};
 }
 if($('sendForSignature'))$('sendForSignature').onclick=e=>{if(isEditingInfo()){notice('Save or cancel your changes before sending the application.',true);return;}if((pending||e.currentTarget.dataset.pending==='true')&&!confirm('Create a replacement signing link? The earlier link will no longer work.'))return;return busyRun(e.currentTarget,async()=>{
 const {data:token,error}=await db.rpc('vfc_broker_create_signing_link',{p_application:id});
 if(error||!token)throw error||Error('Unable to create signing request.');
 const link=location.origin+'/sign/?token='+token;
 const subject='Please Sign Your Financing Application — Vancouver Finance Company';
 const body='Hello '+(a.clients?.full_name||'')+',\n\nPlease review and electronically sign your Vancouver Finance Company financing application using the secure link below:\n\n'+link+'\n\nNo login is required. Your link expires in 72 hours.\n\nThank you,\nVancouver Finance Company Inc.';
 const draft='mailto:'+encodeURIComponent(a.clients?.email||'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 if(selected!==id)return;
 const edit=$('editClientInfo');if(edit)edit.hidden=true;const trigger=$('sendForSignature');if(trigger)trigger.dataset.pending='true';
 const panel=$('signingEmailPanel');panel.innerHTML='<div class="broker-link-ready"><p><b>Secure signing link created.</b> Automatic email is not confirmed. Open the email draft and press Send, or copy the confidential link.</p><div class="broker-actions"><a class="btn" href="'+esc(draft)+'" id="signingMailDraft">Open Signing Email</a><button type="button" class="btn secondary" id="copySigningLink">Copy Signing Link</button></div></div>';
 $('copySigningLink').onclick=async()=>{await navigator.clipboard.writeText(link);notice('Signing link copied. Treat it as confidential.')};
 const active=await db.rpc('vfc_broker_signing_history',{p_application:id});
 if(selected!==id)return;
 if(!active.error&&active.data?.length){const record=active.data[0];$('signingHistory').innerHTML=signingRows(active.data);document.querySelectorAll('#openedFile .sign-state').forEach(badge=>{badge.textContent='Awaiting signature';badge.className='sign-state is-pending';});const trigger=$('sendForSignature');if(trigger){trigger.dataset.pending='true';}
 const mailed=await db.functions.invoke('vfc-sign',{body:{action:'send_invitation',signing_id:record.id,token}});
 if(selected!==id)return;
 if(!mailed.error&&mailed.data?.email_status==='sent'){$('signingEmailPanel').innerHTML='<div class="broker-link-ready"><b>Signing email sent successfully through Apps Script.</b></div>';notice('Signing email sent and logged.')}else notice('Signing link created; open the email draft to send it.');
 }
 });};
 document.querySelectorAll('.signed-copy').forEach(button=>button.onclick=e=>busyRun(e.currentTarget,async()=>{
 const {data,error}=await db.functions.invoke('vfc-sign',{body:{action:'broker_download',signing_id:button.dataset.id}});
 if(error||!data?.url)throw error||Error(data?.error||'Unable to download signed PDF');
 const anchor=document.createElement('a');anchor.href=data.url;anchor.rel='noopener noreferrer';anchor.click();
 }));


 $('refreshActivity').onclick=e=>busyRun(e.currentTarget,async()=>{await openFile(id);notice('Activity history refreshed.');});
 $('downloadPdf').onclick=()=>{try{window.downloadVFCApplication({...a,...(details.data||{}),id:'VFC-'+String(a.application_number).padStart(4,'0'),business:a.business_name,name:a.clients?.full_name,email:a.clients?.email,phone:a.clients?.phone,requestedAmount:a.requested_amount,product:a.financing_product,summary:a.deal_summary})}catch(e){notice(errText(e),true)}};
 $('submitAdmin').onclick=e=>busyRun(e.currentTarget,async()=>{const {error}=await db.rpc('broker_submit_application',{p_application:id});if(error)throw error;notice('Application submitted to VFC Admin.');await refresh();});
 if($('testSubmit'))$('testSubmit').onclick=e=>busyRun(e.currentTarget,async()=>{if(!confirm('Submit fictional TEST application to Admin?'))return;const {error}=await db.rpc('broker_submit_test_application',{p_application:id});if(error)throw error;notice('Fictional test application submitted.');await refresh()});
 $('dealChatShortcut').onclick=()=>selectFileTab('activity');
 $('decisionShortcut').onclick=()=>selectFileTab('decision');
 $('refreshDecision').onclick=e=>busyRun(e.currentTarget,async()=>{await refreshChatCounts();await refreshDecision(id);});
 $('refreshChat').onclick=()=>refreshDealChat(id).catch(e=>notice(errText(e),true));
 $('messageForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,body=String(new FormData(form).get('body')).trim();if(!body)return;busyRun(e.submitter||form.querySelector('button'),async()=>{const r=await db.rpc('vfc_deal_chat_send',{p_application:id,p_body:body});if(r.error)throw r.error;form.reset();await refreshDealChat(id);})};
 groupDealDocs();const unread=Number(chatCounts.get(id)?.unread||0);$('dealUnread').textContent=String(unread);$('dealUnread').hidden=!unread;
 $('uploadForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,button=e.submitter||form.querySelector('button');busyRun(button,async()=>{
 const f=new FormData(form),files=f.getAll('file');if(!files.length||files.length>10)throw Error('Select 1–10 files at a time.');if(files.some(file=>!(file instanceof File)||!file.size||file.size>20*1024*1024))throw Error('Each file must be non-empty and no larger than 20 MB.');
 const signatures={'application/pdf':b=>[37,80,68,70,45].every((x,i)=>b[i]===x),'image/png':b=>[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x),'image/jpeg':b=>b[0]===255&&b[1]===216&&b[2]===255};
 const extensions={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'};
 let completed=0,failures=[];
 for(let i=0;i<files.length;i++){const file=files[i];button.textContent='Uploading '+(i+1)+'/'+files.length+'…';try{
 const ext=extensions[file.type];if(!ext)throw Error('Unsupported file type');const header=new Uint8Array(await file.slice(0,8).arrayBuffer());if(!signatures[file.type](header))throw Error('Invalid file format');
 const buffer=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buffer),sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');const path=id+'/'+user.id+'/'+crypto.randomUUID()+'.'+ext;
 const uploaded=await db.storage.from('application-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;
 const {error}=await db.rpc('register_document',{p_application:id,p_storage_path:path,p_filename:file.name.slice(0,180),p_mime:file.type,p_size:file.size,p_sha256:sha,p_category:String(f.get('category')),p_visibility:'broker_admin'});if(error)throw Error('Stored but registration failed; contact support before retrying');
 completed++;
 }catch(err){failures.push(file.name+': '+errText(err));}}
 if(completed)await openFile(id,false);
 notice(completed+' of '+files.length+' document(s) uploaded.'+(failures.length?' '+failures.join(' · '):' Pending verification.'),failures.length>0);
 if(!completed&&!failures.some(x=>x.includes('registration failed')))return;
 if(form.isConnected)form.reset();
 })};
 const picks=()=>[...document.querySelectorAll('#docList .doc-pick:not(:disabled)')];
 const updatePicks=()=>{const all=picks(),n=all.filter(x=>x.checked).length;$('selectedDocCount').textContent=String(n);$('shareDocs').disabled=n===0;$('selectAllDocs').disabled=all.length===0;$('selectAllDocs').checked=all.length>0&&n===all.length;$('selectAllDocs').indeterminate=n>0&&n<all.length;};
 picks().forEach(x=>x.onchange=updatePicks);$('selectAllDocs').onchange=e=>{picks().forEach(x=>x.checked=e.target.checked);updatePicks()};updatePicks();
 $('shareDocs').onclick=e=>{const ids=picks().filter(x=>x.checked).map(x=>x.value);if(!ids.length||!confirm('Send '+ids.length+' selected document(s) to the secure Admin inbox?'))return;busyRun(null,async()=>{const button=e.currentTarget||$('shareDocs');if(button)button.disabled=true;try{const r=await db.rpc('vfc_share_documents',{p_application:id,p_documents:ids});if(r.error)throw r.error;notice(r.data+' new document(s) sent to Admin inbox. No email sent.');await openFile(id,false);}finally{if(button?.isConnected)updatePicks();}})};
 const dialog=$('docPreviewDialog');const clearPreview=()=>{$('docPreviewBody').replaceChildren();$('openDocPreview').removeAttribute('href');};
 $('closeDocPreview').onclick=()=>dialog.close();dialog.addEventListener('close',clearPreview);
 async function previewUrl(url,name,mime){$('docPreviewTitle').textContent=name;$('openDocPreview').href=url;const node=document.createElement(mime==='application/pdf'?'iframe':'img');node.src=url;node.referrerPolicy='no-referrer';if(mime==='application/pdf'){node.title='PDF preview';}else{node.alt=name;}$('docPreviewBody').replaceChildren(node);if(!dialog.open)dialog.showModal();}
 async function docUrl(doc,download=false){if(!doc||!['pending','clean'].includes(doc.scan_status))throw Error('Document unavailable');const r=await db.storage.from('application-documents').createSignedUrl(doc.storage_path,120,download?{download:doc.original_filename}:{});if(r.error)throw r.error;return r.data.signedUrl;}
 document.querySelectorAll('.doc-preview').forEach(button=>button.onclick=()=>busyRun(button,async()=>{const doc=detailData.docs.find(x=>x.id===button.dataset.id);await previewUrl(await docUrl(doc),doc.original_filename,doc.mime_type)}));
 document.querySelectorAll('.doc-download').forEach(button=>button.onclick=()=>busyRun(button,async()=>{const doc=detailData.docs.find(x=>x.id===button.dataset.id);const link=document.createElement('a');link.href=await docUrl(doc,true);link.rel='noopener noreferrer';link.click()}));
 document.querySelectorAll('.signed-preview').forEach(button=>button.onclick=()=>busyRun(button,async()=>{const {data,error}=await db.functions.invoke('vfc-sign',{body:{action:'broker_download',signing_id:button.dataset.id}});if(error||!data?.url)throw error||Error('Signed PDF unavailable');await previewUrl(data.url,'Signed Application.pdf','application/pdf')}));

 // File opens in its own workspace; no scrolling below the Deals list.
}
$('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;await busyRun(button,async()=>{const {email,password}=Object.fromEntries(new FormData(e.currentTarget));const {error}=await db.auth.signInWithPassword({email:String(email).trim(),password:String(password)});if(error)throw error;notice('',false,true);await loadIdentity()})};
$('resetPassword').onclick=e=>busyRun(e.currentTarget,async()=>{const email=$('loginEmail').value.trim();if(!email)throw Error('Enter your account email first.');const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/broker/'});if(error)throw error;notice('If the email belongs to an account, password reset instructions have been sent.',false,true)});
$('logout').onclick=e=>busyRun(e.currentTarget,async()=>{if(isEditingInfo()&&!confirm('Discard unsaved changes and log out?'))return;const {error}=await db.auth.signOut();if(error)throw error;user=null;profile=null;selected=null;fileRequest++;apps=[];dashboardUpdates=[];chatCounts.clear();metricFilter='all';unreadOnly=false;$('unreadOnly').checked=false;$('search').value='';statusFilter='all';productFilter='all';listSort='newest';$('statusFilter').value='all';$('productFilter').value='all';$('sortFilter').value='newest';renderDashboardNotifications();$('detail').innerHTML='';showWorkspace('dashboard',false);gate();notice('You have signed out.',false,true)});
$('new').onclick=()=>navigateWorkspace('new');
function openMetric(key){if(working)return;metricFilter=key;statusFilter='all';productFilter='all';listSort='newest';$('search').value='';$('statusFilter').value='all';$('productFilter').value='all';$('sortFilter').value='newest';navigateWorkspace('deals');}
$('dashboardDeals').onclick=()=>openMetric('all');
$('openSampleDecision').onclick=openSampleDecision;
$('closeSampleDecision').onclick=()=>navigateWorkspace('dashboard');
$('metrics').onclick=e=>{const b=e.target.closest('[data-metric]');if(b)openMetric(b.dataset.metric);};
$('metricFilterChip').onclick=()=>{metricFilter='all';render();};
$('unreadOnly').onchange=e=>{unreadOnly=e.target.checked;renderDashboardNotifications();};
$('priorityMore').onclick=()=>{openMetric('all');};
$('priorityDeals').onclick=e=>{const b=e.target.closest('[data-priority]');if(!b||working)return;busyRun(b,async()=>{await openFile(b.dataset.priority);if(selected===b.dataset.priority&&Number(chatCounts.get(selected)?.unread||0))selectFileTab('activity');});};

$('refreshNotifications').onclick=e=>busyRun(e.currentTarget,async()=>{await refreshChatCounts();await refreshDashboardNotifications();});
async function openNotification(n){
 if(n.application_id){await openFile(n.application_id);if(selected!==n.application_id)return;if(n.event_type==='message_received')selectFileTab('activity');else if(['decision_published','status_changed'].includes(n.event_type))selectFileTab('decision');}
 if(!n.read_at){const r=await db.rpc('mark_notification_read',{p_notification:n.id});if(r.error)throw r.error;n.read_at=new Date().toISOString();renderDashboardNotifications();}
 await refreshDashboardNotifications();
}
$('dashboardNotifications').onclick=e=>{const b=e.target.closest('[data-notification]');if(!b||working)return;const n=dashboardUpdates.find(x=>x.id===b.dataset.notification);if(n)busyRun(b,()=>openNotification(n));};

$('newDealFromList').onclick=()=>navigateWorkspace('new');
const topHeader=document.querySelector('header.tfc-top');const fitRail=()=>{if(topHeader)$('appView').style.setProperty('--broker-header-height',Math.ceil(topHeader.getBoundingClientRect().height)+'px');};fitRail();if(window.ResizeObserver&&topHeader)new ResizeObserver(fitRail).observe(topHeader);else window.addEventListener('resize',fitRail);
$('cancelNew').onclick=()=>navigateWorkspace('deals');

document.querySelectorAll('[data-workspace]').forEach(b=>b.onclick=()=>navigateWorkspace(b.dataset.workspace));
document.addEventListener('keydown',e=>{const drawer=$('dealDrawer');if(e.key==='Escape'&&drawer&&!drawer.hidden){e.preventDefault();setDealDrawer(false,true);}});
const filterMenu=$('dealsFilters');
if(filterMenu){
 const closeFilters=()=>{filterMenu.open=false;filterMenu.querySelector('summary').focus({preventScroll:true});};
 $('applyFilters').onclick=closeFilters;
 document.addEventListener('click',e=>{if(filterMenu.open&&!filterMenu.contains(e.target))filterMenu.open=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&filterMenu.open){e.preventDefault();closeFilters();}});
}
$('search').oninput=render;
$('statusFilter').onchange=e=>{metricFilter='all';statusFilter=e.target.value;render()};
$('productFilter').onchange=e=>{productFilter=e.target.value;render()};
$('sortFilter').onchange=e=>{listSort=e.target.value;render()};
$('clearFilters').onclick=()=>{$('search').value='';$('statusFilter').value='all';$('productFilter').value='all';$('sortFilter').value='newest';metricFilter='all';statusFilter='all';productFilter='all';listSort='newest';render()};
$('refreshList').onclick=e=>{if(isEditingInfo()){notice('Save or cancel your changes before refreshing.',true);return;}return busyRun(e.currentTarget,async()=>{await refresh();notice('Application list updated.')});};
$('cards').onclick=e=>{const bell=e.target.closest('[data-deal-bell]');if(bell){if(working||isEditingInfo())return;const id=bell.dataset.dealBell;busyRun(null,async()=>{bell.disabled=true;try{const n=dealUnreadUpdate(id);if(n)await openNotification(n);else{await openFile(id);if(selected===id)selectFileTab('activity');}}catch(err){selected=null;fileRequest++;$('detail').innerHTML='';showWorkspace('deals',false);throw err;}finally{bell.disabled=false;}});return;}const b=e.target.closest('[data-id]');if(b&&isEditingInfo()){notice('Save or cancel your changes before opening another file.',true);return;}if(b&&!working)busyRun(b,async()=>{try{await openFile(b.dataset.id)}catch(err){selected=null;fileRequest++;$('detail').innerHTML='';showWorkspace('deals',false);throw err;}})};
$('application').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter,async()=>{const f=new FormData(form);if(!f.get('email'))throw Error('Client email is required for secure intake.');const payload=Object.fromEntries(f.entries());payload.amount=payload.requestedAmount;delete payload.requestedAmount;const {data,error}=await db.rpc('broker_create_full_application',{p_payload:payload});if(error)throw error;notice('Application saved securely to your broker account.');form.reset();await refresh();await openFile(data)})};
setInterval(async()=>{if(document.hidden||!authorized()||working||chatPolling)return;chatPolling=true;try{if(selected&&activeFileTab==='activity')await refreshDealChat(selected);else await refreshChatCounts();await refreshDashboardNotifications();if(selected&&activeFileTab==='decision')await refreshDecision(selected);}catch(e){console.warn('Deal updates unavailable');}finally{chatPolling=false;}},20000);
(async()=>{try{await loadIdentity();}catch(e){gate();notice('Unable to connect: '+errText(e),true,true)}})();
})();