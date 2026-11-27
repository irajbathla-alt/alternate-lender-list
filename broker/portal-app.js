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
async function refresh(scroll=true){
 if(!authorized())return;
 const r=await db.from('applications').select('id,application_number,business_name,financing_product,requested_amount,status,submitted_at,created_at,deal_summary,clients(id,full_name,email,phone)').eq('broker_id',user.id).order('created_at',{ascending:false}).limit(250);
 if(r.error)throw r.error;apps=r.data||[];render();
 if(selected){const exists=apps.find(a=>a.id===selected);if(exists)await openFile(selected,scroll);else{$('detail').innerHTML='';selected=null;}}
}
function signingStatus(x){if(!x)return 'Not sent';if(x.status==='signed')return 'Signed';if(x.status==='pending'&&new Date(x.expires_at).getTime()<Date.now())return 'Link expired';if(x.status==='pending')return 'Awaiting signature';return label(x.status);}
function signingRows(rows){return rows.map(x=>'<div class="broker-mini broker-sign-row"><span><b>'+esc(signingStatus(x))+'</b><small>Created: '+new Date(x.created_at).toLocaleString('en-CA')+(x.signed_at?' · Signed: '+new Date(x.signed_at).toLocaleString('en-CA'):'')+(x.status==='signed'&&x.email_status?' · PDF email: '+esc(label(x.email_status)):'')+'</small></span>'+(x.status==='signed'?'<button type="button" class="btn secondary signed-copy" data-id="'+esc(x.id)+'">Download Signed PDF</button>':'')+'</div>').join('')||'<p class="subtle">No signing requests created.</p>';}
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
 try{await func();}catch(e){notice(errText(e),true);}finally{working=false;if(button){button.disabled=false;button.textContent=button.dataset.pending==='true'?'Reissue Signing Link':text;}}
}
let fileRequest=0,activeFileTab='information';
function isEditingInfo(){return $('editClientForm')?.classList.contains('is-editing')===true;}
function selectFileTab(name){if(name!=='information'&&isEditingInfo()){notice('Save or cancel your changes before switching tabs.',true);return false;}activeFileTab=name;document.querySelectorAll('#openedFile [data-file-tab]').forEach(b=>{const active=b.dataset.fileTab===name;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});document.querySelectorAll('#openedFile [data-file-panel]').forEach(p=>p.hidden=p.dataset.filePanel!==name);return true;}
function infoRow(k,v){return '<div class="broker-kv"><span>'+esc(k)+'</span><b>'+esc(v==null||v===''?'—':v)+'</b></div>';}
function editableInfoRow(k,name,value,options={}){
 const shown=options.display??value,raw=esc(value??''),id='inline-'+name;
 const attrs=' id="'+id+'" name="'+name+'" disabled'+(options.required?' required':'');
 let control;
 if(options.choices){const choices=[...new Set([...options.choices,...(value?[String(value)]:[])])];control='<select'+attrs+'>'+choices.map(p=>'<option value="'+esc(p)+'"'+(String(value)===p?' selected':'')+'>'+esc(p)+'</option>').join('')+'</select>';}
 else if(options.type==='textarea'){control='<textarea'+attrs+' rows="3">'+raw+'</textarea>';}
 else{control='<input'+attrs+' type="'+(options.type||'text')+'" value="'+raw+'"'+(options.min!=null?' min="'+options.min+'"':'')+(options.max!=null?' max="'+options.max+'"':'')+(options.step?' step="'+options.step+'"':'')+'>';}
 return '<div class="broker-kv inline-info-row"><label for="'+id+'">'+esc(k)+'</label><b class="inline-read">'+esc(shown==null||shown===''?'—':shown)+'</b><div class="inline-field" hidden>'+control+'</div></div>';
}
async function openFile(id,scroll=true){
 if(!authorized()||!apps.some(a=>a.id===id))return;if(selected!==id)activeFileTab='information';selected=id;const request=++fileRequest;const a=apps.find(x=>x.id===id);
 const [details,tasks,msg,docs,activity,signing]=await Promise.all([
 db.from('application_details').select('*').eq('application_id',id).maybeSingle(),
 db.from('checklist_items').select('id,title,description,status,item_type,required,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.from('messages').select('id,body,channel,sender_id,created_at').eq('application_id',id).order('created_at',{ascending:true}),
 db.from('documents').select('id,original_filename,category,storage_path,scan_status,created_at').eq('application_id',id).order('created_at',{ascending:false}),
 db.rpc('vfc_application_activity',{p_application:id}),
 db.rpc('vfc_broker_signing_history',{p_application:id})
 ]);
 if(request!==fileRequest||selected!==id||!authorized())return;
 for(const r of [details,tasks,msg,docs,activity,signing])if(r.error)throw r.error;
 detailData={details:details.data,tasks:tasks.data||[],messages:msg.data||[],docs:docs.data||[],activity:activity.data||[],signing:signing.data||[]};
 const signed=detailData.signing.find(x=>x.status==='signed'),pending=detailData.signing.find(x=>x.status==='pending'&&new Date(x.expires_at).getTime()>Date.now());
 const cleanTest=a.business_name.startsWith('TEST - ')&&String(a.clients?.email||'').endsWith('@example.invalid');
 const d=details.data||{},canEdit=!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>['pending','signed'].includes(x.status));
 const tab=(key,name,count)=>'<button type="button" role="tab" id="file-tab-'+key+'" aria-controls="file-panel-'+key+'" data-file-tab="'+key+'" aria-selected="false">'+name+(count==null?'':' <span class="file-tab-count">'+count+'</span>')+'</button>';
 const panel=(key)=>'<div role="tabpanel" id="file-panel-'+key+'" aria-labelledby="file-tab-'+key+'" data-file-panel="'+key+'" hidden>';
 $('detail').innerHTML='<section class="card broker-form" id="openedFile"><div class="broker-detail-top"><div><div class="eyebrow">VFC-'+String(a.application_number).padStart(4,'0')+'</div><h2>'+esc(a.business_name)+'</h2><p><b>'+esc(label(a.status))+'</b> · '+fmt(a.requested_amount)+' · '+esc(a.financing_product)+'</p></div><button type="button" class="btn secondary" id="closeFile">Close</button></div>'+
 '<nav class="file-tabs" role="tablist" aria-label="Client file sections">'+tab('information','Client &amp; Business')+tab('documents','Documents',detailData.docs.length+(signed?1:0))+tab('signing','Application &amp; Signing')+tab('activity','Messages &amp; Activity')+'</nav>'+
 panel('information')+'<form id="editClientForm" class="file-inline-form"><div class="file-info-toolbar"><span class="sign-state '+(signed?'is-signed':pending?'is-pending':'')+'">'+esc(signingStatus(signed||pending||detailData.signing[0]))+'</span>'+(canEdit?'<div class="inline-edit-actions"><button type="button" class="btn secondary" id="editClientInfo">Edit Information</button><button type="button" class="btn secondary" id="cancelClientEdit" hidden>Cancel</button><button type="submit" class="btn" id="saveClientEdit" hidden>Save Changes</button></div>':'')+'</div><div class="file-info-grid"><section class="file-section"><h3>Business Information</h3>'+editableInfoRow('Legal Business Name','business',a.business_name,{required:true})+editableInfoRow('Nature of Business','nature',d.nature_of_business)+editableInfoRow('Annual Revenue','revenue',d.annual_revenue,{type:'number',min:0,step:'.01',display:d.annual_revenue==null?null:fmt(d.annual_revenue)})+editableInfoRow('Employees','employees',d.employee_count,{type:'number',min:0,step:'1'})+editableInfoRow('Business Address','businessAddress',d.business_address)+editableInfoRow('Registration Year','registrationYear',d.registration_year,{type:'number',min:1800,max:2030,step:'1'})+editableInfoRow('Business Bank','bank',d.business_bank)+'</section><section class="file-section"><h3>Client Information</h3>'+editableInfoRow('Full Name','name',a.clients?.full_name,{required:true})+editableInfoRow('Email Address','email',a.clients?.email,{type:'email',required:true})+editableInfoRow('Phone Number','phone',a.clients?.phone,{type:'tel'})+editableInfoRow('Date of Birth','dob',d.owner_date_of_birth,{type:'date'})+editableInfoRow('Residential Address','ownerAddress',d.owner_address)+'</section></div><section class="file-section file-financing"><h3>Financing Information</h3>'+editableInfoRow('Product','product',a.financing_product,{choices:['Term Loan','Business LOC','Flex Funds','Mortgage Financing']})+editableInfoRow('Requested Amount','amount',a.requested_amount,{type:'number',min:1,step:'.01',required:true,display:fmt(a.requested_amount)})+editableInfoRow('Deal Summary','summary',a.deal_summary,{type:'textarea'})+'</section><p class="inline-edit-hint subtle" hidden>Changes are saved securely to this application.</p></form></div>'+
 panel('documents')+
 '<section class="file-section"><div class="file-section-heading"><h3>Uploaded Documents</h3><span class="file-count">'+(detailData.docs.length+(signed?1:0))+'</span></div>'+(signed?'<div class="broker-signed-document"><b>Signed Application.pdf</b><small>Electronically signed · '+fmtDate(signed.signed_at)+'</small><button type="button" class="btn secondary signed-copy" data-id="'+esc(signed.id)+'">Download Signed PDF</button></div>':'')+'<div id="docList">'+(detailData.docs.map(d=>'<div class="file-document-row"><span class="file-type-icon" aria-hidden="true">'+esc((d.original_filename.split('.').pop()||'FILE').toUpperCase().slice(0,5))+'</span><div class="file-document-name"><b>'+esc(d.original_filename)+'</b><small>'+esc(label(d.category))+' · '+esc(label(d.scan_status))+'</small></div><button type="button" class="btn secondary small doc-download" data-path="'+esc(d.storage_path)+'">Download</button></div>').join('')||(signed?'':'<p class="file-empty">No documents uploaded yet.</p>'))+'</div><details class="file-disclosure" id="uploadDisclosure"><summary>Upload Document</summary><p class="subtle">PDF, JPG or PNG · up to 20 MB. Files are private.</p><form id="uploadForm"><label>Category<select name="category">'+['bank_statements','identification','financial_statements','business_registration','tax_documents','property_documents','application','other'].map(s=>'<option value="'+s+'">'+esc(s.replace(/_/g,' '))+'</option>').join('')+'</select></label><label>Private Document<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required></label><button class="btn" type="submit">Upload Securely</button></form></details></section>'+

 '<section class="file-section"><div class="file-section-heading"><h3>Document Checklist</h3><span class="file-count">'+detailData.tasks.length+'</span></div><div id="taskList">'+(detailData.tasks.map(t=>'<div class="broker-mini"><b>'+esc(t.title)+'</b><small>'+esc(label(t.status))+' · '+esc(t.description||'')+'</small>'+(t.item_type==='document'&&t.status!=='accepted'&&detailData.docs.length?'<div class="broker-checklist-action"><select aria-label="Select uploaded file" data-task="'+esc(t.id)+'" class="choose-checklist-file"><option value="">Select uploaded file</option>'+detailData.docs.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.original_filename)+'</option>').join('')+'</select><button type="button" class="btn secondary mark-received" data-task="'+esc(t.id)+'">Mark Received</button></div>':'')+'</div>').join('')||'<p class="subtle">No document checklist items yet.</p>')+'</div><details class="file-disclosure"><summary>Add Checklist Item</summary><form id="taskForm"><label>Add document to checklist<input name="title" required minlength="3" maxlength="180" placeholder="Six months business bank statements"></label><input type="hidden" name="type" value="document"><label>Notes<textarea name="description" maxlength="2000"></textarea></label><button class="btn" type="submit">Add Checklist Item</button></form></details></section>'+

 '</div>'+
 panel('signing')+
 '<section class="broker-workflow-panel"><div class="broker-workflow-title"><div><h3>Client Application &amp; Signing</h3><p class="subtle">Send the application to the client by email. No client account required.</p></div><div class="broker-actions">'+(!a.submitted_at&&a.status==='draft'&&!detailData.signing.some(x=>x.status==='signed')?'<button type="button" class="btn" id="sendForSignature">'+(pending?'Reissue Signing Link':'Send Application for Signature')+'</button>':'')+'</div></div><div id="signingEmailPanel"></div><div class="broker-sign-summary"><span class="sign-state '+(signed?'is-signed':pending?'is-pending':'')+'">'+esc(signingStatus(signed||pending||detailData.signing[0]))+'</span><button type="button" class="btn secondary" id="refreshSignature">Refresh Status</button></div><div id="signingHistory">'+signingRows(detailData.signing)+'</div></section>'+

 '<div class="broker-actions"><button class="btn secondary" id="downloadPdf">Download Draft PDF</button><button class="btn" id="submitAdmin" '+(a.submitted_at?'disabled':'')+'>'+(a.submitted_at?'Submitted to Admin':'Submit to Admin')+'</button>'+(cleanTest&&!a.submitted_at?'<button class="btn secondary" id="testSubmit">Submit Fictional TEST File</button>':'')+'</div><p class="subtle">Submission requires a recorded electronic signature and accepted required checklist items. The test exception accepts only fictional records without documents.</p>'+

 '</div>'+
 panel('activity')+
 '<section class="file-section"><h3>Admin Messages</h3><div class="broker-chat-list">'+(detailData.messages.filter(m=>m.channel==='broker_admin').map(m=>'<div class="broker-chat"><b>'+esc(m.sender_id===user.id?'Broker':'VFC Admin')+'</b><p>'+esc(m.body)+'</p><small>'+fmtDate(m.created_at)+'</small></div>').join('')||'<p class="subtle">No Admin messages yet.</p>')+'</div>'+(a.submitted_at?'<form id="messageForm"><input type="hidden" name="channel" value="broker_admin"><label>Message to VFC Admin<textarea name="body" required maxlength="10000"></textarea></label><button class="btn" type="submit">Send to Admin</button></form>':'<p class="subtle">Admin messaging becomes available after submitting the application.</p>')+'<p class="subtle">Messages are stored in Supabase. Email delivery is not enabled.</p></section><section class="file-section"><div class="file-section-heading"><h3>Document Activity</h3></div><button type="button" class="btn secondary" id="refreshActivity">Refresh Activity</button><p class="subtle">Supabase records the upload, broker identity, filename, category and time for each document.</p><div class="broker-activity">'+(detailData.activity.map(ev=>'<div class="broker-mini"><b>'+esc(label(ev.action))+'</b><small>'+new Date(ev.created_at).toLocaleString('en-CA')+' · '+esc(ev.actor_role)+(ev.filename?' · '+esc(ev.filename):'')+'</small></div>').join('')||'<p class="subtle">No activity recorded.</p>')+'</div></section></div></section>';
 selectFileTab(activeFileTab);
 document.querySelectorAll('#openedFile [data-file-tab]').forEach((b,i,all)=>{b.onclick=()=>selectFileTab(b.dataset.fileTab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;if(selectFileTab(all[n].dataset.fileTab))all[n].focus();};});
 $('closeFile').onclick=()=>{if(working)return;if(isEditingInfo()){notice('Save or cancel your changes before closing the file.',true);return;}selected=null;fileRequest++;$('detail').innerHTML='';$('cards').scrollIntoView({behavior:'smooth',block:'nearest'})};
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
 setEditing(false);notice('Information saved with an audit entry.');await refresh(false);
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


 document.querySelectorAll('.mark-received').forEach(button=>button.onclick=e=>busyRun(e.currentTarget,async()=>{
 const select=document.querySelector('.choose-checklist-file[data-task="'+button.dataset.task+'"]');
 const docId=select?.value;if(!docId)throw Error('Choose the uploaded document first.');
 const r=await db.rpc('vfc_broker_mark_document_received',{p_item:button.dataset.task,p_document:docId});
 if(r.error)throw r.error;
 notice('Document matched to the checklist and recorded.');await openFile(id);
 }));
 $('refreshActivity').onclick=e=>busyRun(e.currentTarget,async()=>{await openFile(id);notice('Activity history refreshed.');});
 $('downloadPdf').onclick=()=>{try{window.downloadVFCApplication({...a,...(details.data||{}),id:'VFC-'+String(a.application_number).padStart(4,'0'),business:a.business_name,name:a.clients?.full_name,email:a.clients?.email,phone:a.clients?.phone,requestedAmount:a.requested_amount,product:a.financing_product,summary:a.deal_summary})}catch(e){notice(errText(e),true)}};
 $('submitAdmin').onclick=e=>busyRun(e.currentTarget,async()=>{const {error}=await db.rpc('broker_submit_application',{p_application:id});if(error)throw error;notice('Application submitted to VFC Admin.');await refresh();});
 if($('testSubmit'))$('testSubmit').onclick=e=>busyRun(e.currentTarget,async()=>{if(!confirm('Submit fictional TEST application to Admin?'))return;const {error}=await db.rpc('broker_submit_test_application',{p_application:id});if(error)throw error;notice('Fictional test application submitted.');await refresh()});
 $('taskForm').onsubmit=e=>{e.preventDefault();busyRun(e.submitter||$('taskForm').querySelector('button'),async()=>{const f=new FormData(e.currentTarget);const {error}=await db.rpc('broker_request_task',{p_application:id,p_title:String(f.get('title')).trim(),p_description:String(f.get('description')||''),p_type:String(f.get('type'))});if(error)throw error;notice('Checklist entry recorded.');await openFile(id)})};
 if($('messageForm')) $('messageForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter||form.querySelector('button'),async()=>{const f=new FormData(form);const {error}=await db.rpc('send_portal_message',{p_application:id,p_channel:'broker_admin',p_body:String(f.get('body')).trim()});if(error)throw error;notice('Secure message saved.');await openFile(id)})};
 $('uploadForm').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter||form.querySelector('button'),async()=>{const f=new FormData(form),file=f.get('file');if(!(file instanceof File)||!file.size||file.size>20*1024*1024)throw Error('Choose a file up to 20 MB.');const signatures={'application/pdf':b=>[37,80,68,70,45].every((x,i)=>b[i]===x),'image/png':b=>[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x),'image/jpeg':b=>b[0]===255&&b[1]===216&&b[2]===255};const ext={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[file.type];const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);if(!ext||!signatures[file.type](bytes))throw Error('Only valid PDF, JPG and PNG files are permitted.');const digest=await crypto.subtle.digest('SHA-256',buffer);const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');const path=id+'/'+user.id+'/'+crypto.randomUUID()+'.'+ext;const uploaded=await db.storage.from('application-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;const {error}=await db.rpc('register_document',{p_application:id,p_storage_path:path,p_filename:file.name.slice(0,180),p_mime:file.type,p_size:file.size,p_sha256:sha,p_category:String(f.get('category')),p_visibility:'broker_admin'});if(error)throw Error('Upload succeeded but registration failed. Contact VFC support; do not reupload sensitive data.');notice('Broker upload recorded in Supabase audit history, pending document verification.');await openFile(id)})};
 document.querySelectorAll('.doc-download').forEach(button=>button.onclick=()=>busyRun(button,async()=>{const path=button.dataset.path;const {data,error}=await db.storage.from('application-documents').createSignedUrl(path,60);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer')}));
 if(scroll)$('detail').scrollIntoView({behavior:'smooth',block:'start'});
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
$('refreshList').onclick=e=>{if(isEditingInfo()){notice('Save or cancel your changes before refreshing.',true);return;}return busyRun(e.currentTarget,async()=>{await refresh();notice('Application list updated.')});};
$('cards').onclick=e=>{const b=e.target.closest('[data-id]');if(b&&isEditingInfo()){notice('Save or cancel your changes before opening another file.',true);return;}if(b&&!working)openFile(b.dataset.id).catch(err=>notice(errText(err),true))};
$('application').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;busyRun(e.submitter,async()=>{const f=new FormData(form);if(!f.get('email'))throw Error('Client email is required for secure intake.');const payload=Object.fromEntries(f.entries());payload.amount=payload.requestedAmount;delete payload.requestedAmount;const {data,error}=await db.rpc('broker_create_full_application',{p_payload:payload});if(error)throw error;notice('Application saved securely to your broker account.');form.reset();$('form').hidden=true;await refresh();await openFile(data)})};
(async()=>{try{await loadIdentity();}catch(e){gate();notice('Unable to connect: '+errText(e),true,true)}})();
})();