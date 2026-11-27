'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import {createApplication} from '../app/actions'
type Application={id:string,application_number:number,business_name:string,financing_product:string,requested_amount:number,status:string,created_at:string,submitted_at:string|null,client:{full_name:string,email:string}|null}
const statusLabel=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase())
const money=(v:number)=>Number(v||0).toLocaleString('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0})
export function BrokerDashboard({name,applications}:{name:string,applications:Application[]}){
 const [newOpen,setNewOpen]=useState(false)
 const [query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
 const [busy,setBusy]=useState(false)
 const filtered=useMemo(()=>applications.filter(a=>{
   const key=[a.business_name,a.client?.full_name,a.client?.email,'VFC-'+String(a.application_number).padStart(4,'0')].join(' ').toLowerCase()
   return key.includes(query.trim().toLowerCase())&&(filter==='all'||a.status===filter)
 }),[applications,query,filter])
 const metrics=[
  ['My Applications',applications.length],
  ['Under Review',applications.filter(a=>a.status==='under_review').length],
  ['Approvals',applications.filter(a=>['conditional_approval','approved'].includes(a.status)).length],
  ['Action Required',applications.filter(a=>['additional_documents_required','pending_client_info'].includes(a.status)).length],
  ['Funded',applications.filter(a=>a.status==='funded').length]
 ] as const
 return <div className="vfc-broker">
   <section className="broker-hero">
    <div><div className="eyebrow">Broker Workspace</div><h2>Welcome, {name}.</h2><p>Manage your clients, financing submissions and secure communication.</p></div>
    <div className="broker-hero-actions"><span className="broker-active"><i/> Secure Workspace</span><button type="button" className="btn" onClick={()=>{setNewOpen(!newOpen);setBusy(false)}}>{newOpen?'Close Application':'Submit New Client'}</button></div>
   </section>
   <section className="broker-metrics" aria-label="My application statistics">{metrics.map(([name,n])=><article className="card broker-metric" key={name}><span>{name}</span><strong>{n}</strong></article>)}</section>
   {newOpen&&<section className="card broker-new-form" id="broker-new-application">
     <div className="broker-form-title"><div><div className="eyebrow">NEW BUSINESS FINANCING REQUEST</div><h2>New Client Application</h2><p>Saved privately to your Broker workspace until the required client steps are complete.</p></div><button className="btn secondary small" type="button" onClick={()=>setNewOpen(false)}>Close</button></div>
     <form action={createApplication} onSubmit={()=>setBusy(true)}>
       <h3>Business Information</h3>
       <div className="broker-form-grid">
        <div className="field"><label>Legal Business Name *</label><input name="business" required minLength={2} maxLength={180} placeholder="Registered business name"/></div>
        <div className="field"><label>Nature of Business</label><input name="nature" maxLength={300} placeholder="Industry / business activity"/></div>
        <div className="field"><label>Number of Employees</label><input name="employees" type="number" min={0} max={100000}/></div>
        <div className="field"><label>Annual Revenue (Last 12 Months)</label><input name="revenue" type="number" min={0} step=".01" placeholder="CAD"/></div>
        <div className="field"><label>Business Address</label><input name="businessAddress" maxLength={500}/></div>
        <div className="field"><label>Business Registration Year</label><input name="registrationYear" type="number" min={1800} max={new Date().getFullYear()}/></div>
        <div className="field"><label>Business Bank</label><select name="bank" defaultValue=""><option value="">Select bank</option>{['TD','RBC','BMO','Scotiabank','CIBC','National Bank','Credit Union','Other'].map(x=><option key={x}>{x}</option>)}</select></div>
       </div>
       <h3>Business Owner Information</h3>
       <div className="broker-form-grid">
        <div className="field"><label>Full Name *</label><input name="name" minLength={2} maxLength={150} required/></div>
        <div className="field"><label>Date of Birth</label><input name="dob" type="date" max={new Date().toISOString().slice(0,10)}/></div>
        <div className="field"><label>Phone Number</label><input name="phone" type="tel" maxLength={100}/></div>
        <div className="field"><label>Email Address *</label><input name="email" type="email" required placeholder="client@example.com"/></div>
        <div className="field broker-full"><label>Residential Address</label><input name="ownerAddress" maxLength={500}/></div>
       </div>
       <h3>Financing Information</h3>
       <div className="broker-form-grid">
        <div className="field"><label>Requested Amount (CAD) *</label><input name="amount" type="number" min={1} max={100000000} step=".01" required placeholder="e.g. 50000"/></div>
        <div className="field"><label>Financing Product</label><select name="product" defaultValue="Term Loan">{['Term Loan','Business LOC','Flex Funds','Mortgage Financing'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field broker-full"><label>Deal Summary</label><textarea name="summary" rows={3} maxLength={2000} placeholder="Purpose of financing, business background, lender considerations..."/></div>
       </div>
       <div className="broker-form-actions"><p>Test environment: only use fictional information until production security review is complete.</p><button className="btn" disabled={busy}>{busy?'Saving...':'Save to My Applications'}</button></div>
     </form>
   </section>}
   <section className="broker-list-heading"><div><div className="eyebrow">YOUR PIPELINE</div><h2>My Applications</h2></div><div className="broker-search-row"><input aria-label="Search applications" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search my clients"/><select aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All Statuses</option>{Array.from(new Set(applications.map(a=>a.status))).map(x=><option key={x} value={x}>{statusLabel(x)}</option>)}</select></div></section>
   <div className="broker-card-grid">
    {filtered.map(a=><article className="card broker-application-card" key={a.id}>
     <div className="eyebrow">VFC-{String(a.application_number).padStart(4,'0')}</div>
     <h3>{a.business_name}</h3>
     <div className="broker-client">{a.client?.full_name||'Client details pending'}</div>
     <div className="broker-badge"><span className={'admin-status '+(['approved','funded'].includes(a.status)?'green':['declined'].includes(a.status)?'red':['under_review'].includes(a.status)?'blue':'')}>{statusLabel(a.status)}</span></div>
     <div className="broker-amount">Requested: <b>{money(a.requested_amount)}</b></div>
     <div className="broker-product">{a.financing_product} · {a.submitted_at?'Submitted to Admin':'Private broker file'}</div>
     <Link href={'/broker/applications/'+a.id} className="btn secondary">Open Application</Link>
    </article>)}
    {!filtered.length&&<div className="broker-empty"><h3>{applications.length?'No matching applications':'No applications yet'}</h3><p>{applications.length?'Try a different search or status.':'Select Submit New Client to create your first private application.'}</p>{!applications.length&&<button type="button" className="btn" onClick={()=>setNewOpen(true)}>Submit New Client</button>}</div>}
   </div>
   <footer className="broker-footer">Vancouver Finance Company Inc. · This staging portal is for test information only.</footer>
 </div>
}
