import Link from 'next/link'
import {supabase} from '../../lib/server'
import {redirect} from 'next/navigation'
import {Shell,Alert,StateTag} from '../../components/shell'
import {createApplication} from '../actions'
export default async function Broker({searchParams}:{searchParams:Promise<{error?:string}>}){
 const s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 const {data:p}=await s.from('profiles').select('role,active,full_name').eq('id',user.id).single();
 if(!p?.active||p.role!=='broker')redirect('/');
 const {data:apps}=await s.from('applications').select('id,application_number,business_name,financing_product,requested_amount,status,created_at,clients(full_name,email)').order('created_at',{ascending:false});
 const rows=apps||[],stats=[['Applications',rows.length],['Drafts',rows.filter(x=>x.status==='draft').length],['Under Review',rows.filter(x=>x.status==='under_review').length],['Decisions',rows.filter(x=>['approved','declined','conditional_approval'].includes(x.status)).length]];
 return <Shell role="broker" title="My Applications" subtitle={'Welcome '+(p.full_name||'Broker')+'. Manage clients, application requests and updates.'}>
 <Alert error={(await searchParams).error}/><section className="cards">{stats.map(([name,val])=><div key={name} className="card metric"><small>{name}</small><b>{val}</b></div>)}</section>
 <div className="split"><section className="card"><div className="detail-header"><h2>Client Applications</h2><span className="muted small">{rows.length} records</span></div>
 {rows.length?rows.map(a=><Link key={a.id} href={'/broker/applications/'+a.id} className="item"><div><div className="eyebrow">VFC-{String(a.application_number).padStart(4,'0')}</div><b>{a.business_name}</b><div className="muted small">{a.financing_product} · CAD ${Number(a.requested_amount).toLocaleString()}</div></div><StateTag status={a.status}/></Link>):<p className="muted">No applications yet. Create your first client application.</p>}
 </section><section className="card"><h2>New Client Application</h2><p className="muted small">Create a private draft. It will not enter the Admin queue until submitted.</p><form action={createApplication}>
 <div className="grid2"><div className="field"><label>Client Full Name</label><input name="name" required minLength={2}/></div><div className="field"><label>Client Email</label><input name="email" type="email" required/></div></div>
 <div className="field"><label>Client Phone</label><input name="phone" type="tel"/></div>
 <div className="field"><label>Legal Business Name</label><input name="business" required minLength={2}/></div>
 <div className="grid2"><div className="field"><label>Financing Product</label><select name="product"><option>Term Loan</option><option>Business LOC</option><option>Flex Funds</option><option>Mortgage Financing</option></select></div>
 <div className="field"><label>Requested Amount (CAD)</label><input name="amount" type="number" min="1" step=".01" required/></div></div>
 <button className="btn">Save Draft Application</button></form></section></div>
 </Shell>
}