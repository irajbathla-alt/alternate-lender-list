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
 const s=await role('broker');
 const amount=Number(f.get('amount'));
 const {data,error}=await s.rpc('broker_create_application',{
 p_name:String(f.get('name')||''),p_email:String(f.get('email')||''),
 p_business:String(f.get('business')||''),p_product:String(f.get('product')||''),
 p_amount:amount,p_phone:String(f.get('phone')||'')
 });
 if(error||!data)redirect('/broker?error=application');
 redirect('/broker/applications/'+data);
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
