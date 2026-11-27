import {DocumentVault} from '../../../../components/document-vault'
import Link from 'next/link'
import {supabase} from '../../../../lib/server'
import {redirect,notFound} from 'next/navigation'
import {Shell,Alert,StateTag} from '../../../../components/shell'
import {createInvitation,requestTask,postMessage,submitToAdmin,submitTestToAdmin} from '../../../actions'
export default async function Deal({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{error?:string,success?:string,invite?:string}>}){
 const {id}=await params,s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('role,active').eq('id',user.id).single();if(!p?.active||p.role!=='broker')redirect('/');
 const {data:a}=await s.from('applications').select('*,clients(id,full_name,email,phone,user_id)').eq('id',id).single();if(!a)notFound();
 const [{data:tasks},{data:messages}]=await Promise.all([s.from('checklist_items').select('id,title,description,item_type,status,created_at').eq('application_id',id).order('created_at',{ascending:false}),s.from('messages').select('id,body,channel,created_at,sender_id').eq('application_id',id).order('created_at',{ascending:true})]);
 const q=await searchParams,client=a.clients as unknown as {id:string,full_name:string,email:string,phone:string,user_id:string|null};
 return <Shell role="broker" title={a.business_name} subtitle={'VFC-'+String(a.application_number).padStart(4,'0')+' · '+client.full_name}>
 <Alert error={q.error} success={q.success}/>
 <section className="card"><div className="detail-header"><div><div className="eyebrow">APPLICATION WORKFLOW</div><StateTag status={a.status}/></div>
 <div className="buttonrow"><button className="btn secondary small" disabled title="Secure electronic signing is being developed">Send E-Sign · Soon</button><a className="btn secondary small" href="#document-vault">Docs Upload</a><form action={submitToAdmin}><input type="hidden" name="application" value={id}/><button className="btn small" title="Submission requires verified signature and accepted checklist">Submit to Admin</button></form></div></div>
 <p className="muted small">Submit to Admin is protected: it will reject unsigned applications or outstanding required tasks.</p>
 {a.business_name.startsWith('TEST - ')&&client.email.toLowerCase().endsWith('@example.invalid')&&
 <div className="callout" style={{marginTop:12}}>
 <b>Test Application Only</b>
 <p className="small">Send a fictional application to your Admin queue to check the broker-to-Admin workflow. This bypasses e-signatures <strong>only</strong> for fake TEST records with example.invalid email addresses and no documents. Not available for real clients.</p>
 <form action={submitTestToAdmin}><input type="hidden" name="application" value={id}/><button className="btn secondary small" disabled={Boolean(a.submitted_at)}>Submit TEST Application to Admin</button></form>
 </div>}</section>
 <div className="split" style={{marginTop:16}}><div className="stack"><section className="card"><h2>Client Information</h2>
 <div className="item"><span>Client</span><b>{client.full_name}</b></div><div className="item"><span>Email</span><b>{client.email}</b></div><div className="item"><span>Financing</span><b>{a.financing_product}</b></div><div className="item"><span>Requested</span><b>CAD ${Number(a.requested_amount).toLocaleString()}</b></div>
 <hr className="line"/><h3>Client Portal Invitation</h3><p className="muted small">Your client must have an active, verified client account to accept an invitation. The invitation matches the client's email address.</p>
 {client.user_id?<p className="success">Client account connected.</p>:<form action={createInvitation}><input type="hidden" name="application" value={id}/><input type="hidden" name="client" value={client.id}/><button className="btn secondary">Generate Client Invitation</button></form>}
 {q.invite&&<div className="callout"><b>New invitation link — copy and share privately</b><div className="readonly">{'/invite/'+q.invite}</div><p className="small">Prefix this path with the new portal's full HTTPS domain. Link expires in 7 days and must be used by the matching verified email account.</p></div>}
 </section>
 <section className="card"><h2>Requested Client Items</h2>{(tasks||[]).length?(tasks||[]).map(t=><div className="item" key={t.id}><div><b>{t.title}</b><span className="muted small">{t.description||t.item_type}</span></div><StateTag status={t.status}/></div>):<p className="muted">No requests yet.</p>}
 <hr className="line"/><h3>New Request</h3><form action={requestTask}><input type="hidden" name="application" value={id}/><div className="field"><label>Title</label><input name="title" required minLength={3} placeholder="Most recent six months bank statements"/></div><div className="field"><label>Request Type</label><select name="type"><option value="document">Document</option><option value="form">Information Form</option><option value="signature">Signature</option></select></div><div className="field"><label>Instructions</label><textarea name="description"/></div><button className="btn">Add Client Request</button></form></section></div>
 <div className="stack"><DocumentVault applicationId={id} role="broker"/><section className="card"><h2>Secure Conversations</h2><p className="muted small">Broker / Client and Broker / Admin threads are separate.</p>
 {(messages||[]).map(m=><div className="message" key={m.id}><small>{m.channel==='broker_admin'?'Broker / Admin':'Broker / Client'} · {m.sender_id===user.id?'You':'Other participant'} · {new Date(m.created_at).toLocaleDateString('en-CA')}</small><p>{m.body}</p></div>)}
 <form action={postMessage}><input type="hidden" name="application" value={id}/><input type="hidden" name="returnTo" value={'/broker/applications/'+id}/><div className="field"><label>Recipient</label><select name="channel"><option value="broker_client">Client</option>{a.submitted_at&&<option value="broker_admin">VFC Admin</option>}</select></div><div className="field"><label>Message</label><textarea name="body" required maxLength={10000}/></div><button className="btn">Send Secure Message</button></form><p className="small muted">Messages are stored in the portal. Email alerts are not connected yet.</p>
 </section></div></div><p style={{marginTop:20}}><Link className="textlink muted" href="/broker">Back to applications</Link></p></Shell>
}