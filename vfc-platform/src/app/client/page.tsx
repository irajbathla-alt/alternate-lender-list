import {DocumentVault} from '../../components/document-vault'
import {supabase} from '../../lib/server'
import {redirect} from 'next/navigation'
import {Shell,Alert,StateTag} from '../../components/shell'
import {submitAnswer,postMessage} from '../actions'
export default async function Client({searchParams}:{searchParams:Promise<{error?:string,success?:string}>}){
 const s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('role,active,full_name').eq('id',user.id).single();if(!p?.active||p.role!=='client')redirect('/');
 const {data:clients}=await s.from('clients').select('id').eq('user_id',user.id);
 const ids=(clients||[]).map(c=>c.id);
 const {data:apps}=ids.length?await s.from('applications').select('id,application_number,business_name,status,financing_product').in('client_id',ids):{data:[]};
 const appIds=(apps||[]).map(a=>a.id);
 const [{data:tasks},{data:messages}]=await Promise.all([appIds.length?s.from('checklist_items').select('id,application_id,title,description,item_type,status').in('application_id',appIds).order('created_at',{ascending:false}):Promise.resolve({data:[]}),appIds.length?s.from('messages').select('id,application_id,channel,sender_id,body,created_at').in('application_id',appIds).order('created_at',{ascending:false}):Promise.resolve({data:[]})]);
 return <Shell role="client" title="My Client Workspace" subtitle={'Welcome '+(p.full_name||'Client')+'. Your required tasks and financing updates.'}>
 <Alert {...(await searchParams)}/>
 {!apps?.length?<div className="card"><h2>No Linked Applications</h2><p className="muted">Ask your broker to share your secure invitation link. Confirm your email and accept it to connect your application.</p></div>:<div className="stack">
 {(apps||[]).map(a=><section className="card" key={a.id}><div className="detail-header"><div><div className="eyebrow">VFC-{String(a.application_number).padStart(4,'0')}</div><h2>{a.business_name}</h2></div><StateTag status={a.status}/></div>
 <p className="muted small">{a.financing_product} · Only information assigned to your account is displayed.</p>
 <hr className="line"/><h3>Required Actions</h3>
 {(tasks||[]).filter(t=>t.application_id===a.id).length?(tasks||[]).filter(t=>t.application_id===a.id).map(t=><div className="subtle-box" style={{marginBottom:10}} key={t.id}><div className="detail-header"><b>{t.title}</b><StateTag status={t.status}/></div><p className="muted small">{t.description}</p>
 {t.item_type==='form'&&<form action={submitAnswer}><input type="hidden" name="task" value={t.id}/><div className="field"><label>Your Information</label><textarea name="answer" required maxLength={10000}/></div><button className="btn small">Submit Information</button></form>}
 {t.item_type!=='form'&&<p className="muted small">{t.item_type==='signature'?'Electronic signing will be available after signing integration.':'Use the secure document vault below to submit your requested file. It will remain pending verification until reviewed.'}</p>}</div>):<p className="muted small">No outstanding items.</p>}
 <DocumentVault applicationId={a.id} role="client"/><hr className="line"/><h3>Messages with Broker</h3>
 {(messages||[]).filter(m=>m.application_id===a.id&&m.channel==='broker_client').map(m=><div className="message" key={m.id}><small>{m.sender_id===user.id?'You':'Broker'}</small><p>{m.body}</p></div>)}
 <form action={postMessage}><input type="hidden" name="application" value={a.id}/><input type="hidden" name="returnTo" value="/client"/><input type="hidden" name="channel" value="broker_client"/><div className="field"><label>Message to Broker</label><textarea name="body" required/></div><button className="btn">Send Message</button></form></section>)}</div>}
 </Shell>
}