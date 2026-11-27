import {supabase} from '../../lib/server'
import {redirect} from 'next/navigation'
import {Shell,Alert} from '../../components/shell'
import {BrokerDashboard} from '../../components/broker-dashboard'
export default async function Broker({searchParams}:{searchParams:Promise<{error?:string,success?:string}>}){
 const s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const {data:p}=await s.from('profiles').select('role,active,full_name').eq('id',user.id).single()
 if(!p?.active||p.role!=='broker')redirect('/')
 const {data:apps,error}=await s.from('applications').select('id,application_number,business_name,financing_product,requested_amount,status,created_at,submitted_at,clients(full_name,email)').order('created_at',{ascending:false}).limit(300)
 const rows=(apps||[]).map(a=>({...a,client:Array.isArray(a.clients)?a.clients[0]:a.clients}))
 return <Shell role="broker" title="Broker Workspace" subtitle="Your personal financing applications and client relationships.">
  <Alert {...(await searchParams)}/>
  {error&&<p className="alert">Your application list could not be loaded. Refresh the page and try again.</p>}
  <BrokerDashboard name={p.full_name||user.email?.split('@')[0]||'Broker'} applications={rows}/>
 </Shell>
}
