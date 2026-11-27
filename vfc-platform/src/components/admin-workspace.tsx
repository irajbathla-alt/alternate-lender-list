'use client'
import {useMemo,useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {updateStatus,broadcastAnnouncement,markNotificationRead} from '../app/actions'
type Application={
 id:string;application_number:number;business_name:string;financing_product:string;requested_amount:number;
 source:string;status:string;submitted_at:string|null;updated_at:string|null;created_at:string;
 broker_id:string|null;client:{full_name:string;email:string;phone:string|null}|null
}
type Note={id:string;title:string;body:string;created_at:string;read_at:string|null}
type Broker={broker_id:string;broker_name:string;broker_email:string;submitted_count:number}
const statusLabels:Record<string,string>={
 draft:'Draft',pending_client_info:'Pending Client Info',pending_signature:'Pending Signature',
 preparing_documents:'Preparing Documents',ready_to_submit:'Ready to Submit',
 submitted:'Submitted',under_review:'Under Review',additional_documents_required:'Additional Documents Required',
 conditional_approval:'Conditional Approval',approved:'Approved',declined:'Declined',funded:'Funded',closed:'Closed',withdrawn:'Withdrawn'
}
const money=(n:number)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'}):'—'
export function AdminWorkspace({applications,notifications,brokers}:{applications:Application[],notifications:Note[],brokers:Broker[]}){
 const [search,setSearch]=useState('')
 const [status,setStatus]=useState('all')
 const [intake,setIntake]=useState('all')
 const [brokerFilter,setBrokerFilter]=useState('all')
 const [view,setView]=useState<'applications'|'brokers'|'announcements'>('applications')
 const [selectedId,setSelectedId]=useState<string|null>(null)
 const [activeTab,setActiveTab]=useState<'file'|'activity'>('file')
 const selected=applications.find(a=>a.id===selectedId)||null
 const matched=useMemo(()=>applications.filter(a=>{
  const terms=[a.business_name,a.client?.full_name,a.client?.email,'VFC-'+String(a.application_number).padStart(4,'0')].join(' ').toLowerCase()
  return terms.includes(search.trim().toLowerCase())&&(status==='all'||a.status===status)&&(intake==='all'||a.source===intake)&&(brokerFilter==='all'||(brokerFilter==='direct'?a.broker_id===null:a.broker_id===brokerFilter))
 }),[applications,search,status,intake,brokerFilter])
 const stages=[
  ['All Applications',applications.length],
  ['Action Required',applications.filter(a=>a.status==='additional_documents_required').length],
  ['Ready for Review',applications.filter(a=>a.status==='submitted').length],
  ['Under Review',applications.filter(a=>a.status==='under_review').length],
  ['Decisions',applications.filter(a=>['approved','declined','conditional_approval','funded'].includes(a.status)).length]
 ] as const
 const options=Object.keys(statusLabels).filter(s=>applications.some(a=>a.status===s))
 function clear(){setSearch('');setStatus('all');setIntake('all');setBrokerFilter('all')}
 return <div className="vfc-admin">
   <div className="admin-hero-actions">
     <div className="admin-hero-note"><span className="admin-dot"/> Secure operations <span className="muted">· Broker drafts are private</span></div>
     <a className="btn secondary" href="/admin">Refresh Applications</a>
   </div>
   <div className="admin-view-tabs" role="group" aria-label="Admin CRM sections"><button type="button" className={view==='applications'?'active':''} onClick={()=>setView('applications')}>Applications</button><button type="button" className={view==='brokers'?'active':''} onClick={()=>setView('brokers')}>Brokers ({brokers.length})</button><button type="button" className={view==='announcements'?'active':''} onClick={()=>setView('announcements')}>Announcements</button></div>
   {view==='applications'&&<>
   <section className="admin-metrics">
   {stages.map(([label,value])=><article className="card admin-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}
   </section>
   <section className="card admin-workspace">
    <div className="admin-section-head"><div><div className="eyebrow">FINANCING PIPELINE</div><h2>Submitted Applications</h2></div><div className="muted small">{matched.length} of {applications.length} files</div></div>
    <div className="admin-filters">
      <label className="admin-search"><span className="sr-only">Search applications</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search client, business, email or application ID"/></label>
      <select aria-label="Application status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All Statuses</option>{options.map(x=><option key={x} value={x}>{statusLabels[x]||x}</option>)}</select>
      <select aria-label="Application intake" value={intake} onChange={e=>setIntake(e.target.value)}><option value="all">All Intake</option><option value="broker">Broker</option><option value="direct">Direct</option></select>
      <select aria-label="Broker filter" value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)}><option value="all">All Brokers</option><option value="direct">Direct Applications</option>{brokers.map(b=><option value={b.broker_id} key={b.broker_id}>{b.broker_name} — {b.broker_email}</option>)}</select>
      <button onClick={clear} className="btn secondary">Clear Filters</button>
    </div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Application</th><th>Client</th><th>Business</th><th>Intake</th><th>Status</th><th>Financing</th><th>Updated</th><th></th></tr></thead><tbody>
    {matched.map(a=><tr key={a.id}><td><strong>VFC-{String(a.application_number).padStart(4,'0')}</strong><small>{date(a.submitted_at)}</small></td>
      <td><strong>{a.client?.full_name||'Not provided'}</strong><small>{a.client?.email||'—'}</small></td>
      <td><strong>{a.business_name}</strong><small>{a.financing_product}</small></td>
      <td><span className="admin-intake">{a.source==='broker'?(brokers.find(b=>b.broker_id===a.broker_id)?.broker_name||'Broker'):'Direct'}</span></td>
      <td><span className={'admin-status '+(['approved','funded'].includes(a.status)?'green':['declined'].includes(a.status)?'red':['under_review'].includes(a.status)?'blue':'')}>{statusLabels[a.status]||a.status}</span></td>
      <td><strong>{money(a.requested_amount)}</strong></td>
      <td>{date(a.updated_at||a.submitted_at)}</td>
      <td><button className="admin-open" onClick={()=>{setSelectedId(a.id);setActiveTab('file')}}>Open File</button></td></tr>)}
    </tbody></table>
    {!matched.length&&<div className="admin-empty"><div className="admin-empty-icon">⌕</div><h3>{applications.length?'No matching applications':'No submitted applications yet'}</h3><p>{applications.length?'Try adjusting the filters.':'Once a broker completes a signed application and submits it, it will appear here. Draft applications remain with the broker.'}</p>{applications.length>0&&<button className="btn secondary" onClick={clear}>Clear Filters</button>}</div>}
    </div>
   </section>
   </>}
   {view==='brokers'&&<section className="card admin-workspace"><div className="admin-section-head"><div><div className="eyebrow">BROKER SEGREGATION</div><h2>Broker Directory</h2></div><span className="muted small">{brokers.length} broker accounts</span></div><div className="admin-broker-grid">{brokers.length?brokers.map(b=><article className="admin-broker-card" key={b.broker_id}><div className="eyebrow">BROKER WORKSPACE</div><h3>{b.broker_name}</h3><p className="muted">{b.broker_email}</p><div className="admin-broker-bottom"><strong>{b.submitted_count} submitted files</strong><button className="btn secondary" type="button" onClick={()=>{clear();setBrokerFilter(b.broker_id);setView('applications')}}>View Broker Files</button></div></article>):<p className="admin-notice-empty">No broker accounts created yet.</p>}</div><p className="admin-broker-footnote">Only submitted broker applications appear in Admin. Each broker can access their own clients and drafts; other brokers cannot access them.</p></section>}
   {view==='announcements'&&<section className="card admin-announcement-card"><div className="eyebrow">ADMIN COMMUNICATIONS</div><h2>Send a Portal Announcement</h2><p className="muted small">Send one notification to every active, verified client account or every active, verified broker account. Recipients receive it through their notification bell. This does not send emails.</p><form action={broadcastAnnouncement} className="admin-announcement-form"><div className="field"><label>Recipients</label><select name="audience"><option value="all_clients">All Active Clients</option><option value="all_brokers">All Active Brokers</option></select></div><div className="field"><label>Title</label><input name="title" minLength={3} maxLength={140} required placeholder="Important update from Vancouver Finance Company"/></div><div className="field"><label>Message</label><textarea name="body" rows={5} minLength={3} maxLength={2000} required placeholder="Write your announcement here..."/></div><label className="admin-confirm"><input type="checkbox" required/> I confirm this message is ready to deliver to the selected audience.</label><button className="btn" type="submit">Send Portal Announcement</button></form></section>}
   <section className="card admin-notifications"><div className="admin-section-head"><div><div className="eyebrow">LATEST UPDATES</div><h2>Recent Notifications</h2></div><span className="admin-count">{notifications.length}</span></div>
   {notifications.length?<div className="admin-notification-list">{notifications.map(n=><div className="admin-notification" key={n.id}><span className="admin-notification-icon">•</span><div><strong>{n.title}</strong><p>{n.body}</p></div><small>{date(n.created_at)}</small></div>)}</div>:<p className="admin-notice-empty">No activity yet. New application submissions and updates will appear here.</p>}
   </section>
   {selected&&<div className="admin-overlay" onClick={()=>setSelectedId(null)}>
     <aside className="admin-drawer" role="dialog" aria-modal="true" aria-label={'Application VFC-'+selected.application_number} onClick={e=>e.stopPropagation()}>
       <header className="admin-drawer-head"><div><div className="eyebrow">APPLICATION FILE · VFC-{String(selected.application_number).padStart(4,'0')}</div><h2>{selected.business_name}</h2></div><button onClick={()=>setSelectedId(null)} aria-label="Close application file" className="admin-close">×</button></header>
       <div className="admin-drawer-body">
         <div className="admin-file-kpis"><div className="card"><small>Application Status</small><strong>{statusLabels[selected.status]||selected.status}</strong></div><div className="card"><small>Financing Requested</small><strong>{money(selected.requested_amount)}</strong></div></div>
         <div className="admin-tabs"><button className={activeTab==='file'?'active':''} onClick={()=>setActiveTab('file')}>Client & Application</button><button className={activeTab==='activity'?'active':''} onClick={()=>setActiveTab('activity')}>Activity</button></div>
         {activeTab==='file'?<><section className="card admin-file-section"><div className="eyebrow">APPLICATION INFORMATION</div><h3>Client & Financing</h3>
           {([['Client',selected.client?.full_name],['Email',selected.client?.email],['Phone',selected.client?.phone],['Business',selected.business_name],['Product',selected.financing_product],['Requested',money(selected.requested_amount)],['Intake',selected.source==='broker'?'Broker':'Direct'],['Broker',brokers.find(b=>b.broker_id===selected.broker_id)?.broker_name||'Direct'],['Submitted',date(selected.submitted_at)]] as [string,string|null|undefined][]).map(([key,value])=><div className="admin-kv" key={key}><span>{key}</span><strong>{value||'—'}</strong></div>)}
         </section>
         <section className="card admin-file-section"><div className="eyebrow">UNDERWRITING WORKFLOW</div><h3>Update Application Status</h3><p className="muted small">Changes are permission-checked, recorded in the database audit log, and generate portal notifications.</p>
          <form action={updateStatus}><input type="hidden" name="application" value={selected.id}/><div className="field"><label>New Status</label><select name="status" required defaultValue={selected.status==='submitted'?'under_review':selected.status}><option value="under_review">Under Review</option><option value="additional_documents_required">Additional Documents Required</option><option value="declined">Declined</option><option value="closed">Closed</option></select></div><div className="field"><label>Internal Reason (Recorded in Audit Trail)</label><textarea name="reason" placeholder="Add a brief note for the file" maxLength={2000}/></div><button className="btn">Save Status Update</button></form>
         </section></>:<section className="card admin-file-section"><div className="eyebrow">FILE HISTORY</div><h3>Audit Trail</h3><p className="muted small">Database audit events are being secured for Admin viewing. Status updates are already captured in the audit table; the full timeline will appear here after permissions testing.</p></section>}
         <section className="admin-file-footer">Staging portal · Please use test applications only</section>
       </div>
     </aside>
   </div>}
 </div>
}
type Note={id:string,title:string,body:string,created_at:string,read_at:string|null}
export function NotificationBell({notifications}:{notifications:Note[]}){
 const [open,setOpen]=useState(false),[pending,start]=useTransition(),router=useRouter()
 const unread=notifications.filter(n=>!n.read_at).length
 return <div className="bell-wrap">
  <button type="button" className="bell-button" onClick={()=>setOpen(!open)} aria-label={'Notifications, '+unread+' unread'} aria-expanded={open}>
    <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>
    {unread>0&&<span className="bell-count">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<div className="bell-panel">
   <div className="bell-panel-head"><strong>Notifications</strong><button type="button" onClick={()=>router.refresh()} disabled={pending}>Refresh</button></div>
   <div className="bell-list">{notifications.length?notifications.map(n=><div key={n.id} className={'bell-item'+(!n.read_at?' unread':'')}>
     <div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString('en-CA')}</small></div>
     {!n.read_at&&<button type="button" disabled={pending} aria-label={'Mark '+n.title+' as read'} onClick={()=>start(async()=>{await markNotificationRead(n.id);router.refresh()})}>Mark Read</button>}
    </div>):<p className="bell-empty">You have no notifications.</p>}</div>
   <div className="bell-foot">In-app alerts · Refresh for new updates</div>
  </div>}
 </div>
}
