'use server'
import {redirect} from 'next/navigation'
import {supabase} from '../lib/server'
async function role(required:'broker'|'client'|'admin'){
 const s=await supabase();const {data:{user}}=await s.auth.getUser();
 if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('role,active').eq('id',user.id).single();
 if(!p?.active||p.role!==required)throw new Error('Not authorized');
 return s;
}
export async function createApplication(f:FormData){
 const s=await role('broker')
 const keys=['name','email','phone','business','product','amount','nature','employees','revenue','businessAddress','registrationYear','bank','dob','ownerAddress','summary']
 const payload:Record<string,string>={}
 for(const key of keys)payload[key]=String(f.get(key)||'').trim()
 const {data,error}=await s.rpc('broker_create_full_application',{p_payload:payload})
 if(error||!data)redirect('/broker?error=application')
 redirect('/broker/applications/'+data)
}

export async function requestTask(f:FormData){
 const s=await role('broker'),id=String(f.get('application')||'');
 const {error}=await s.rpc('broker_request_task',{
 p_application:id,p_title:String(f.get('title')||''),
 p_description:String(f.get('description')||''),p_type:String(f.get('type')||'document')
 });
 redirect('/broker/applications/'+id+(error?'?error=task':'?success=task'));
}
export async function createInvitation(f:FormData){
 const s=await role('broker'),app=String(f.get('application')||'');
 const {data,error}=await s.rpc('broker_invite_client',{p_client:String(f.get('client')||'')});
 if(error||!data)redirect('/broker/applications/'+app+'?error=invite');
 redirect('/broker/applications/'+app+'?invite='+encodeURIComponent(data));
}
export async function acceptInvitation(f:FormData){
 const s=await role('client'),token=String(f.get('token')||'');
 const {error}=await s.rpc('client_accept_invite',{p_token:token});
 redirect('/client'+(error?'?error=invite':'?success=invite'));
}
export async function submitAnswer(f:FormData){
 const s=await role('client'),task=String(f.get('task')||'');
 const answer=String(f.get('answer')||'').trim();
 if(!answer||answer.length>10000)redirect('/client?error=answer');
 const {error}=await s.rpc('client_submit_task',{p_task:task,p_answers:{response:answer}});
 redirect('/client'+(error?'?error=answer':'?success=answer'));
}
export async function postMessage(f:FormData){
 const s=await supabase(),{data:{user}}=await s.auth.getUser();
 if(!user)redirect('/login');
 const app=String(f.get('application')||''),channel=String(f.get('channel')||'');
 if(!['broker_client','broker_admin','direct_client_admin'].includes(channel))throw new Error('Invalid channel');
 const {error}=await s.rpc('send_portal_message',{p_application:app,p_channel:channel,p_body:String(f.get('body')||'')});
 const destination=String(f.get('returnTo')||'');
 const path=/^\/(broker\/applications\/[0-9a-f-]{36}|client|admin)$/.test(destination)?destination:'/';
 redirect(path+(error?'?error=message':'?success=message'));
}
export async function submitToAdmin(f:FormData){
 const s=await role('broker'),id=String(f.get('application')||'');
 const {error}=await s.rpc('broker_submit_application',{p_application:id});
 redirect('/broker/applications/'+id+(error?'?error=signature':'?success=submitted'));
}
export async function updateStatus(f:FormData){
 const s=await role('admin');
 const {error}=await s.rpc('admin_update_application_status',{
 p_application:String(f.get('application')||''),p_status:String(f.get('status')||''),
 p_reason:String(f.get('reason')||'')
 });
 redirect('/admin'+(error?'?error=status':'?success=status'));
}
export async function logOut(){const s=await supabase();await s.auth.signOut();redirect('/login')}

export async function uploadDocument(f:FormData){
 const s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('role,active').eq('id',user.id).single();
 if(!p?.active||!['broker','client','admin'].includes(p.role))throw new Error('Account inactive');
 const app=String(f.get('application')||'');
 const {data:allowed}=await s.from('applications').select('id').eq('id',app).single();
 const dest=p.role==='broker'?'/broker/applications/'+app:p.role==='client'?'/client':'/admin';
 if(!allowed)redirect(dest+'?error=access');
 const file=f.get('document');
 if(!(file instanceof File)||!file.size||file.size>20*1024*1024)redirect(dest+'?error=file');
 const types:{[key:string]:{ext:string,match:(b:Uint8Array)=>boolean}}={
  'application/pdf':{ext:'pdf',match:b=>b.length>5&&[37,80,68,70,45].every((x,i)=>b[i]===x)},
  'image/jpeg':{ext:'jpg',match:b=>b.length>3&&b[0]===255&&b[1]===216&&b[2]===255},
  'image/png':{ext:'png',match:b=>b.length>8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x)}
 };
 const t=types[file.type];if(!t)redirect(dest+'?error=filetype');
 const buffer=Buffer.from(await file.arrayBuffer());
 if(!t.match(buffer))redirect(dest+'?error=filetype');
 const {createHash,randomUUID}=await import('node:crypto');
 const name=(file.name||'document').replace(/[\x00-\x1f]/g,'').slice(0,200);
 const path=app+'/'+user.id+'/'+randomUUID()+'.'+t.ext;
 const {error:storageError}=await s.storage.from('application-documents').upload(path,buffer,{contentType:file.type,upsert:false});
 if(storageError)redirect(dest+'?error=upload');
 const {error}=await s.rpc('register_document',{
  p_application:app,p_storage_path:path,p_filename:name,p_mime:file.type,p_size:file.size,
  p_sha256:createHash('sha256').update(buffer).digest('hex'),
  p_category:String(f.get('category')||'other'),p_visibility:p.role==='client'?'broker_client':String(f.get('visibility')||'broker_client')
 });
 redirect(dest+(error?'?error=register':'?success=upload'));
}

export async function markNotificationRead(notificationId:string){
 const s=await supabase();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 if(!/^[0-9a-f-]{36}$/i.test(notificationId))return
 const {error}=await s.rpc('mark_notification_read',{p_notification:notificationId})
 if(error)throw new Error('Unable to mark notification as read')
}
export async function broadcastAnnouncement(f:FormData){
 const s=await role('admin')
 const {data,error}=await s.rpc('admin_broadcast_announcement',{
  p_title:String(f.get('title')||'').trim(),
  p_body:String(f.get('body')||'').trim(),
  p_audience:String(f.get('audience')||'all_clients')
 })
 if(error)redirect('/admin?error=broadcast')
 redirect('/admin?success=broadcast&sent='+Number(data||0))
}

export async function submitTestToAdmin(f:FormData){
 const s=await role('broker'),id=String(f.get('application')||'');
 const {error}=await s.rpc('broker_submit_test_application',{p_application:id});
 redirect('/broker/applications/'+id+(error?'?error=testsubmission':'?success=testsubmitted'));
}


export async function sendBrokerEmail(f:FormData){
 const s=await role('broker')
 const id=String(f.get('application')||'')
 const audience=String(f.get('audience')||'')
 const subject=String(f.get('subject')||'').trim()
 const body=String(f.get('body')||'').trim()
 if(!/^[0-9a-f-]{36}$/i.test(id)||!['client','admin'].includes(audience)||subject.length<4||subject.length>180||body.length<10||body.length>5000)
 redirect('/broker?error=email-invalid')
 const destination='/broker/applications/'+id
 const key=process.env.RESEND_API_KEY
 const from=process.env.VFC_EMAIL_FROM
 if(!key||!from||!/^.+<[^<>@\s]+@[^<>@\s]+>$/.test(from))redirect(destination+'?error=email-not-configured')
 const {data:record,error:prepareError}=await s.rpc('broker_prepare_email',{
 p_application:id,p_audience:audience,p_subject:subject,p_body:body
 })
 const queued=Array.isArray(record)?record[0]:null
 if(prepareError||!queued?.email_id||!queued?.recipient_email)redirect(destination+'?error=email-permission')
 let providerId:string|null=null,errorMessage:string|null=null
 try{
  const email=String(queued.recipient_email)
  const allowed=process.env.VFC_EMAIL_TEST_RECIPIENT
  if(process.env.VFC_EMAIL_LIVE_ENABLED!=='true'&&(!allowed||email.toLowerCase()!==allowed.toLowerCase())){
   errorMessage='Staging recipient is not allowlisted'
  }else{
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':queued.email_id},
    body:JSON.stringify({from,to:[email],subject,text:body}),
    signal:AbortSignal.timeout(12000)
   })
   const result=await response.json() as {id?:string,message?:string,name?:string}
   if(response.ok&&result.id)providerId=result.id
   else errorMessage='Email service rejected the message ('+response.status+')'
  }
 }catch{errorMessage='Email service did not respond'}
 await s.rpc('broker_finish_email',{p_email:queued.email_id,p_provider_id:providerId,p_error:errorMessage})
 redirect(destination+(providerId?'?success=email-sent':'?error=email-send-failed'))
}
