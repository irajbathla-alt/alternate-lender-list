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
 if(authorized()){ $('welcome').textContent='Welcome, '+(profile.full_name||user.email?.split('@')[0]||'Broker')+'.'; $('accountEmail').textContent=user.email||''; await refresh(); }
}
async function refresh(){
 if(!authorized())return;
 const r=await db.from('applications').select('id,application_number,business_name,financing_product,requested_amount,status,submitted_at,created_at,deal_summary,clients(id,full_name,email,phone)').eq('broker_id',user.id).order('created_at',{ascending:false}).limit(250);
 if(r.error)throw r.error;apps=r.data||[];render();
 if(selected){const exists=apps.find(a=>a.id===selected);if(exists)await openFile(selected);else{$('detail').innerHTML='';selected=null;}}
}
function label(s){return String(s||'draft').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function render(){
 const mine=apps;
 $('metrics').innerHTML=[['My Applications',mine.length],['Under Review',mine.filter(a=>a.status==='under_review').length],['Approvals',mine.filter(a=>['approved','conditional_approval'].includes(a.status)).length],['Action Required',mine.filter(a=>['additional_documents_required','pending_client_info'].includes(a.status)).length],['Funded',mine.filter(a=>a.status==='funded').length]].map(([k,v])=>'<article class="metric card"><span>'+esc(k)+'</span><strong>'+v+'</strong></article>').join('');
 const term=$('search').value.trim().toLowerCase();
 const rows=mine.filter(a=>{
   const haystack=[a.business_name,a.clients?.full_name,a.clients?.email,a.clients?.phone,a.financing_product,a.status,'VFC-'+String(a.application_number).padStart(4,'0')].join(' ').toLowerCase();
   return haystack.includes(term)&&(statusFilter==='all'||a.status===statusFilter)&&(productFilter==='all'||a.financing_product===productFilter);
 }).sort((a,b)=>listSort==='amount-desc'?Number(b.requested_amount)-Number(a.requested_amount):listSort==='amount-asc'?Number(a.requested_amount)-Number(b.requested_amount):listSort==='oldest'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
 $('resultsCount').textContent=rows.length+' of '+mine.length+' applications';
  $('cards').innerHTML=rows.map(a=>'<article class="broker-list-row" role="listitem"><div class="broker-list-client"><div class="eyebrow">VFC-'+String(a.application_number).padStart(4,'0')+'</div><strong>'+esc(a.clients?.full_name||'Client')+'</strong><small>'+esc(a.business_name)+'</small></div><div class="broker-list-financing"><strong>'+fmt(a.requested_amount)+'</strong><small>'+esc(a.financing_product||'')+'</small></div><div class="broker-list-status"><span class="broker-status-chip">'+esc(label(a.status))+'</span><small>'+fmtDate(a.created_at)+'</small></div><button class="btn secondary open-deal" data-id="'+esc(a.id)+'">Open File</button></article>').join('')||'<p class="subtle">No applications match your search.</p>';
}
async function busyRun(button,func){
 if(working)return;working=true;const text=button?.textContent;if(button){button.disabled=true;button.textContent='Working…';}
 try{await func();}catch(e){notice(errText(e),true);}finally{working=false;if(button){button.disabled=false;button.textContent=text;}}
}
async function openFile(id){
 if(!authorized()||!apps.some(a=>a.id===id))return;selected=id;const a=apps.find(x=>x.id===id);
 const [details,tasks,msg,docs,activity,signing]=await Promise.all([
 db.from('application_details').select('*').eq('application_id',id).maybeSingle(),
 db.from('checklist_items').select('id,title,description,status,item_type,required,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.from('messages').select('id,body,channel,sender_id,created_at').eq('application_id',id).order('created_at',{ascending:true}),
 db.from('documents').select('id,original_filename,category,storage_path,scan_status,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.rpc('vfc_application_activity',{p_application:id}),
 db.rpc('vfc_broker_signing_history',{p_application:id})
 ]);
 for(const r of [details,tasks,msg,docs,activity,signing])if(r.error)throw r.error;
 detailData={details:details.data,tasks:tasks.data||[],messages:msg.data||[],docs:docs.data||[],activity:activity.data||[],signing:signing.data||[]};
 const cleanTest=a.business_name.startsWith('TEST - ')&&String(a.clients?.email||'').endsWith('@example.invalid');
 $('detail').innerHTML='<section class="card broker-form" id="openedFile"><div class="broker-detail-top"><div><div class="eyebrow">VFC-'+String(a.application_number).padStart(4,'0')+'</div><h2>'+esc(a.business_name)+'</h2><p><b>'+esc(label(a.status))+'</b> · '+fmt(a.requested_amount)+' · '+esc(a.financing_product)+'</p></div><button class="btn secondary" id="closeFile">Close</button></div>'+
 '<section class="broker-workflow-panel"><div class="broker-workflow-title"><div><h3>Client Application &amp; Signing</h3><p class="subtle">Edit draft information before sending. Clients sign from an email link without an account.</p></div><div class="broker-actions">'+(!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>['pending','signed'].includes(x.status))?'<button type="button" class="btn secondary" id="editClientInfo">Edit Client Information</button>':'')+(!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>x.status==='signed')?'<button type="button" class="btn" id="sendForSignature">Prepare Signing Email</button>':'')+'</div></div><div id="editClientPanel" hidden></div><div id="signingEmailPanel"></div><div id="signingHistory">'+(detailData.signing.map(x=>'<div class="broker-mini broker-sign-row"><span><b>'+esc(label(x.status))+'</b><small>Created: '+new Date(x.created_at).toLocaleString('en-CA')+(x.signed_at?' · Signed: '+new Date(x.signed_at).toLocaleString('en-CA'):'')+'</small></span>'+(x.status==='signed'?'<button type="button" class="btn secondary signed-copy" data-id="'+esc(x.id)+'">Download Signed PDF</button>':'')+'</div>').join('')||'<p class="subtle">No signing requests created.</p>')+'</div></section>'+
 '<div class="broker-detail-columns"><div><h3>Client & Business</h3><div class="broker-kv"><span>Client</span><b>'+esc(a.clients?.full_name||'—')+'</b></div><div class="broker-kv"><span>Email</span><b>'+esc(a.clients?.email||'—')+'</b></div><div class="broker-kv"><span>Phone</span><b>'+esc(a.clients?.phone||'—')+'</b></div><div class="broker-kv"><span>Nature</span><b>'+esc(details.data?.nature_of_business||'—')+'</b></div><div class="broker-kv"><span>Annual Revenue</span><b>'+(details.data?.annual_revenue==null?'—':fmt(details.data.annual_revenue))+'</b></div><div class="broker-kv"><span>Employees</span><b>'+esc(details.data?.employee_count??'—')+'</b></div><div class="broker-kv"><span>Address</span><b>'+esc(details.data?.business_address||'—')+'</b></div><div class="broker-kv"><span>Business Bank</span><b>'+esc(details.data?.business_bank||'—')+'</b></div><p class="subtle">'+esc(a.deal_summary||'')+'</p>'+
 '<div class="broker-actions"><button class="btn secondary" id="downloadPdf">Download Application PDF</button><button class="btn" id="submitAdmin" '+(a.submitted_at?'disabled':'')+'>'+(a.submitted_at?'Submitted to Admin':'Submit to Admin')+'</button>'+(cleanTest&&!a.submitted_at?'<button class="btn secondary" id="testSubmit">Submit Fictional TEST File</button>':'')+'</div><p class="subtle">Real submission requires a verified electronic signature and accepted required items. The test exception accepts only fictional records without documents.</p>'+
 '<hr><h3>Document Checklist</h3><div id="taskList">'+(detailData.tasks.map(t=>'<div class="broker-mini"><b>'+esc(t.title)+'</b><small>'+esc(label(t.status))+' · '+esc(t.description||'')+'</small></div>').join('')||'<p class="subtle">No document requests yet.</p>')+'</div><form id="taskForm"><label>New Request<input name="title" required minlength="3" maxlength="180" placeholder="Most recent six months bank statements"></label><label>Type<select name="type"><option value="document">Document</option><option value="form">Information</option><option value="signature">Signature</option></select></label><label>Instructions<textarea name="description" maxlength="2000"></textarea></label><button class="btn" type="submit">Add to Checklist</button></form></div>'+
 '<div><h3>Broker Document Uploads</h3><p class="subtle">PDF, JPG or PNG · up to 20 MB. Uploaded documents remain private, pending verification.</p><div id="docList">'+(detailData.docs.map(d=>'<div class="broker-mini"><b>'+esc(d.original_filename)+'</b><small>'+esc(d.category)+' · '+esc(d.scan_status)+'</small><button type="button" class="btn secondary small doc-download" data-path="'+esc(d.storage_path)+'">Download</button></div>').join('')||'<p class="subtle">No documents uploaded.</p>')+'</div><form id="uploadForm"><label>Category<select name="category">'+['bank_statements','identification','financial_statements','business_registration','tax_documents','property_documents','application','other'].map(s=>'<option value="'+s+'">'+esc(s.replace(/_/g,' '))+'</option>').join('')+'</select></label><label>Private Document<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required></label><button class="btn" type="submit">Upload Securely</button></form><hr>'+
 '<h3>Admin Messages</h3><div class="broker-chat-list">'+(detailData.messages.filter(m=>m.channel==='broker_admin').map(m=>'<div class="broker-chat"><b>'+esc(m.sender_id===user.id?'Broker':'VFC Admin')+'</b><p>'+esc(m.body)+'</p><small>'+fmtDate(m.created_at)+'</small></div>').join('')||'<p class="subtle">No Admin messages yet.</p>')+'</div>'+(a.submitted_at?'<form id="messageForm"><input type="hidden" name="channel" value="broker_admin"><label>Message to VFC Admin<textarea name="body" required maxlength="10000"></textarea></label><button class="btn" type="submit">Send to Admin</button></form>':'<p class="subtle">Admin messaging becomes available after submitting the application.</p>')+'<p class="subtle">Messages are stored in Supabase. Email delivery is not enabled.</p><hr><h3>Document Activity</h3><button type="button" class="btn secondary" id="refreshActivity">Refresh Activity</button><p class="subtle">Supabase records the upload, broker identity, filename, category and time for each document.</p><div class="broker-activity">'+(detailData.activity.map(ev=>'<div class="broker-mini"><b>'+esc(label(ev.action))+'</b><small>'+new Date(ev.created_at).toLocaleString('en-CA')+' · '+esc(ev.actor_role)+(ev.filename?' · '+esc(ev.filename):'')+'</small></div>').join('')||'<p class="subtle">No activity recorded.</p>')+'</div></div></div></section>';
 $('closeFile').onclick=()=>{selected=null;$('detail').innerHTML=''};
 if($('editClientInfo'))$('editClientInfo').onclick=()=>{
 const container=$('editClientPanel');container.hidden=!container.hidden;if(container.hidden)return;
 const d=details.data||{};const value=(x)=>esc(x??'');
 container.innerHTML='<form id="editClientForm" class="broker-edit-form"><div class="form-grid">'+
 '<div class="field"><label>Owner Full Name<input name="name" required value="'+value(a.clients?.full_name)+'"></label></div>'+
 '<div class="field"><label>Client Email<input name="email" type="email" required value="'+value(a.clients?.email)+'"></label></div>'+
 '<div class="field"><label>Phone<input name="phone" type="tel" value="'+value(a.clients?.phone)+'"></label></div>'+
 '<div class="field"><label>Legal Business Name<input name="business" required value="'+value(a.business_name)+'"></label></div>'+
 '<div class="field"><label>Nature of Business<input name="nature" value="'+value(d.nature_of_business)+'"></label></div>'+
 '<div class="field"><label>Employees<input type="number" name="employees" min="0" value="'+value(d.employee_count)+'"></label></div>'+
 '<div class="field"><label>Annual Revenue<input name="revenue" type="number" min="0" step=".01" value="'+value(d.annual_revenue)+'"></label></div>'+
 '<div class="field"><label>Business Address<input name="businessAddress" value="'+value(d.business_address)+'"></label></div>'+
 '<div class="field"><label>Registration Year<input name="registrationYear" type="number" min="1800" max="2030" value="'+value(d.registration_year)+'"></label></div>'+
 '<div class="field"><label>Business Bank<input name="bank" value="'+value(d.business_bank)+'"></label></div>'+
 '<div class="field"><label>Date of Birth<input name="dob" type="date" value="'+value(d.owner_date_of_birth)+'"></label></div>'+
 '<div class="field"><label>Residential Address<input name="ownerAddress" value="'+value(d.owner_address)+'"></label></div>'+
 '<div class="field"><label>Requested Amount<input name="amount" type="number" min="1" step=".01" required value="'+value(a.requested_amount)+'"></label></div>'+
 '<div class="field"><label>Financing Product<select name="product">'+['Term Loan','Business LOC','Flex Funds','Mortgage Financing'].map(p=>'<option value="'+esc(p)+'" '+(p===a.financing_product?'selected':'')+'>'+esc(p)+'</option>').join('')+'</select></label></div>'+
 '<div class="field full"><label>Deal Summary<textarea name="summary" rows="3">'+esc(a.deal_summary||'')+'</textarea></label></div></div><div class="broker-actions"><button class="btn" type="submit">Save Changes</button><button class="btn secondary" type="button" id="cancelClientEdit">Cancel</button></div></form>';
 $('cancelClientEdit').onclick=()=>{container.hidden=true;container.innerHTML='';};
 $('editClientForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter,async()=>{
 const p=Object.fromEntries(new FormData(form).entries());
 const {error}=await db.rpc('vfc_broker_edit_application',{p_application:id,p_payload:p});
 if(error)throw error;notice('Client information saved with an audit entry.');await refresh();
 })};
 container.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 if($('sendForSignature'))$('sendForSignature').onclick=e=>busyRun(e.currentTarget,async()=>{
 const {data:token,error}=await db.rpc('vfc_broker_create_signing_link',{p_application:id});
 if(error||!token)throw error||Error('Unable to create signing request.');
 const link=location.origin+'/sign/?token='+token;
 const subject='Please Sign Your Financing Application — Vancouver Finance Company';
 const body='Hello '+(a.clients?.full_name||'')+',\n\nPlease review and electronically sign your Vancouver Finance Company financing application using the secure link below:\n\n'+link+'\n\nNo login is required. Your link expires in 72 hours.\n\nThank you,\nVancouver Finance Company Inc.';
 const draft='mailto:'+encodeURIComponent(a.clients?.email||'')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 const panel=$('signingEmailPanel');panel.innerHTML='<div class="broker-link-ready"><p><b>Signing request created.</b> Open the email draft and press Send. When Apps Script is connected, emails can be sent automatically.</p><div class="broker-actions"><a class="btn" href="'+esc(draft)+'" id="signingMailDraft">Open Signing Email</a><button type="button" class="btn secondary" id="copySigningLink">Copy Signing Link</button></div></div>';
 $('copySigningLink').onclick=async()=>{await navigator.clipboard.writeText(link);notice('Signing link copied. Treat it as confidential.')};
 const active=await db.rpc('vfc_broker_signing_history',{p_application:id});
 if(!active.error&&active.data?.length){const record=active.data[0];
 const mailed=await db.functions.invoke('vfc-sign',{body:{action:'send_invitation',signing_id:record.id,token}});
 if(!mailed.error&&mailed.data?.email_status==='sent'){$('signingEmailPanel').innerHTML='<div class="broker-link-ready"><b>Signing email sent successfully through Apps Script.</b></div>';notice('Signing email sent and logged.')}else notice('Signing link created; open the email draft to send it.');
 }
 });
 document.querySelectorAll('.signed-copy').forEach(button=>button.onclick=e=>busyRun(e.currentTarget,async()=>{
 const {data,error}=await db.functions.invoke('vfc-sign',{body:{action:'broker_download',signing_id:button.dataset.id}});
 if(error||!data?.url)throw error||Error(data?.error||'Unable to download signed PDF');
 window.open(data.url,'_blank','noopener,noreferrer');
 }));

 $('refreshActivity').onclick=e=>busyRun(e.currentTarget,async()=>{await openFile(id);notice('Activity history refreshed.');});
 $('downloadPdf').onclick=()=>{try{window.downloadVFCApplication({...a,...(details.data||{}),id:'VFC-'+String(a.application_number).padStart(4,'0'),business:a.business_name,name:a.clients?.full_name,email:a.clients?.email,phone:a.clients?.phone,requestedAmount:a.requested_amount,product:a.financing_product,summary:a.deal_summary})}catch(e){notice(errText(e),true)}};
 $('submitAdmin').onclick=e=>busyRun(e.currentTarget,async()=>{const {error}=await db.rpc('broker_submit_application',{p_application:id});if(error)throw error;notice('Application submitted to VFC Admin.');await refresh();});
 if($('testSubmit'))$('testSubmit').onclick=e=>busyRun(e.currentTarget,async()=>{if(!confirm('Submit fictional TEST application to Admin?'))return;const {error}=await db.rpc('broker_submit_test_application',{p_application:id});if(error)throw error;notice('Fictional test application submitted.');await refresh()});
 $('taskForm').onsubmit=e=>{e.preventDefault();busyRun(e.submitter||$('taskForm').querySelector('button'),async()=>{const f=new FormData(e.currentTarget);const {error}=await db.rpc('broker_request_task',{p_application:id,p_title:String(f.get('title')).trim(),p_description:String(f.get('description')||''),p_type:String(f.get('type'))});if(error)throw error;notice('Checklist entry recorded.');await openFile(id)})};
 if($('messageForm')) $('messageForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter||form.querySelector('button'),async()=>{const f=new FormData(form);const {error}=await db.rpc('send_portal_message',{p_application:id,p_channel:'broker_admin',p_body:String(f.get('body')).trim()});if(error)throw error;notice('Secure message saved.');await openFile(id)})};
 $('uploadForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter||form.querySelector('button'),async()=>{const f=new FormData(form),file=f.get('file');if(!(file instanceof File)||!file.size||file.size>20*1024*1024)throw Error('Choose a file up to 20 MB.');const signatures={'application/pdf':b=>[37,80,68,70,45].every((x,i)=>b[i]===x),'image/png':b=>[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x),'image/jpeg':b=>b[0]===255&&b[1]===216&&b[2]===255};const ext={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[file.type];const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);if(!ext||!signatures[file.type](bytes))throw Error('Only valid PDF, JPG and PNG files are permitted.');const digest=await crypto.subtle.digest('SHA-256',buffer);const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');const path=id+'/'+user.id+'/'+crypto.randomUUID()+'.'+ext;const uploaded=await db.storage.from('application-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;const {error}=await db.rpc('register_document',{p_application:id,p_storage_path:path,p_filename:file.name.slice(0,180),p_mime:file.type,p_size:file.size,p_sha256:sha,p_category:String(f.get('category')),p_visibility:'broker_admin'});if(error)throw Error('Upload succeeded but registration failed. Contact VFC support; do not reupload sensitive data.');notice('Broker upload recorded in Supabase audit history, pending document verification.');await openFile(id)})};
 document.querySelectorAll('.doc-download').forEach(button=>button.onclick=()=>busyRun(button,async()=>{const path=button.dataset.path;const {data,error}=await db.storage.from('application-documents').createSignedUrl(path,60);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}));
 $('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
$('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;await busyRun(button,async()=>{const {email,password}=Object.fromEntries(new FormData(e.currentTarget));const {error}=await db.auth.signInWithPassword({email:String(email).trim(),password:String(password)});if(error)throw error;notice('',false,true);await loadIdentity()})};
$('resetPassword').onclick=e=>busyRun(e.currentTarget,async()=>{const email=$('loginEmail').value.trim();if(!email)throw Error('Enter your account email first.');const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/broker/'});if(error)throw error;notice('If the email belongs to an account, password reset instructions have been sent.',false,true)});
$('logout').onclick=e=>busyRun(e.currentTarget,async()=>{const {error}=await db.auth.signOut();if(error)throw error;user=null;profile=null;selected=null;apps=[];$('detail').innerHTML='';gate();notice('You have signed out.',false,true)});
$('new').onclick=()=>{$('form').hidden=!$('form').hidden;if(!$('form').hidden)$('form').scrollIntoView({behavior:'smooth'})};
$('search').oninput=render;
$('statusFilter').onchange=e=>{statusFilter=e.target.value;render()};
$('productFilter').onchange=e=>{productFilter=e.target.value;render()};
$('sortFilter').onchange=e=>{listSort=e.target.value;render()};
$('clearFilters').onclick=()=>{$('search').value='';$('statusFilter').value='all';$('productFilter').value='all';$('sortFilter').value='newest';statusFilter='all';productFilter='all';listSort='newest';render()};
$('refreshList').onclick=e=>busyRun(e.currentTarget,async()=>{await refresh();notice('Application list updated.')});
$('cards').onclick=e=>{const b=e.target.closest('[data-id]');if(b)openFile(b.dataset.id).catch(err=>notice(errText(err),true))};
$('application').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter,async()=>{const f=new FormData(form);if(!f.get('email'))throw Error('Client email is required for secure intake.');const payload=Object.fromEntries(f.entries());payload.amount=payload.requestedAmount;delete payload.requestedAmount;const {data,error}=await db.rpc('broker_create_full_application',{p_payload:payload});if(error)throw error;notice('Application saved securely to your broker account.');form.reset();$('form').hidden=true;await refresh();await openFile(data)})};
(async()=>{try{await loadIdentity();}catch(e){gate();notice('Unable to connect: '+errText(e),true,true)}})();
})();