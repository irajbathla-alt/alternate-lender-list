'use client'
import {useState} from 'react'
import {sendBrokerEmail} from '../app/actions'
type History={email_id:string,recipient_email:string,subject:string,status:string,created_at:string}
export function BrokerEmail({applicationId,businessName,clientName,amount,product,history,connected,recipientMode}:{applicationId:string,businessName:string,clientName:string,amount:number,product:string,history:History[],connected:boolean,recipientMode:string}){
 const [audience,setAudience]=useState<'client'|'admin'>('client')
 const [confirmed,setConfirmed]=useState(false)
 const [subject,setSubject]=useState('VFC Financing Update | '+businessName)
 const [body,setBody]=useState('Hello,\n\nWe are writing regarding the financing application for '+businessName+'.\n\nRequested financing: CAD $'+Number(amount).toLocaleString('en-CA')+'\nProduct: '+product+'\n\nPlease let us know if you have any questions or require further details.\n\nThank you,\nVancouver Finance Company Inc.')
 const [sending,setSending]=useState(false)
 return <section className="card broker-email-card" id="broker-email">
  <div className="detail-header"><div><div className="eyebrow">SECURE OUTBOUND COMMUNICATION</div><h2>Email Client / VFC Admin</h2></div><span className={'broker-mail-connection '+(connected?'connected':'')}>{connected?'Provider configured':'Sender setup required'}</span></div>
  <p className="muted small">Send a financing update to your client or the VFC Admin team. The system chooses the recipient based on the application; brokers cannot type arbitrary recipient addresses.</p>
  {!connected&&<div className="broker-mail-alert">Direct email is not active yet. A verified sending domain and Resend API key must be connected before this portal can deliver messages.</div>}
  <form action={sendBrokerEmail} onSubmit={()=>setSending(true)}>
   <input type="hidden" name="application" value={applicationId}/>
   <div className="field"><label>Send To</label><select name="audience" value={audience} onChange={e=>{setAudience(e.target.value as 'client'|'admin');setConfirmed(false)}}>
    <option value="client">Client — {clientName}</option><option value="admin">Vancouver Finance Company — Admin</option>
   </select></div>
   <div className="field"><label>Subject</label><input name="subject" value={subject} onChange={e=>setSubject(e.target.value)} minLength={4} maxLength={180} required/></div>
   <div className="field"><label>Email Message</label><textarea name="body" value={body} onChange={e=>setBody(e.target.value)} minLength={10} maxLength={5000} rows={8} required/></div>
   <label className="broker-mail-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I have reviewed the recipient and message, and have client authority to share this information.</label>
   <div className="broker-mail-actions"><button className="btn" disabled={!connected||!confirmed||sending||!subject.trim()||body.trim().length<10}>{sending?'Sending securely...':'Send Email'}</button><span className="muted small">Sending is logged against this client file.</span></div>
  </form>
  <hr className="line"/><div className="detail-header"><h3>Outbound Email History</h3><span className="muted small">{history.length} messages</span></div>
  {history.length?history.map(e=><div className="broker-mail-history" key={e.email_id}>
   <div><strong>{e.subject}</strong><small>{e.recipient_email} · {new Date(e.created_at).toLocaleString('en-CA')}</small></div>
   <span className={'broker-delivery '+e.status}>{e.status==='sent'?'Accepted by Email Provider':e.status==='failed'?'Failed':e.status==='pending'?'Processing':e.status}</span>
  </div>):<p className="muted small">No outbound emails from this file yet.</p>}
  <p className="muted small">Email-provider acceptance is recorded, but recipient inbox delivery is not yet tracked. Secure file attachments and automated lender distribution are not enabled.</p>
 </section>
}
