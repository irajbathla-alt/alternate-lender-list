import {supabase} from '../../lib/server'
import {redirect} from 'next/navigation'
import {Shell,Alert} from '../../components/shell'
import {AdminWorkspace} from '../../components/admin-workspace'
export default async function Admin({searchParams}:{searchParams:Promise<{error?:string,success?:string}>}){
 const s=await supabase(),{data:{user}}=await s.auth.getUser()
 if(!user)redirect('/login')
 const {data:p}=await s.from('profiles').select('role,active,full_name').eq('id',user.id).single()
 if(!p?.active||p.role!=='admin')redirect('/')
 const [{data:apps,error:appsError},{data:notifications}]=await Promise.all([
 s.from('applications').select('id,application_number,business_name,financing_product,requested_amount,source,status,submitted_at,updated_at,created_at,broker_id,clients(full_name,email,phone)').not('submitted_at','is',null).order('submitted_at',{ascending:false}).limit(250),
 s.from('notifications').select('id,title,body,created_at,read_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(12)
 ])
 const rows=(apps||[]).map(a=>({...a,client:Array.isArray(a.clients)?a.clients[0]:a.clients}))
 return <Shell role="admin" title="Application CRM" subtitle="One workspace for submitted applications, client details and financing decisions.">
 <Alert {...(await searchParams)}/>
 {appsError&&<p className="alert">Unable to load applications. Please refresh or contact support.</p>}
 <AdminWorkspace applications={rows} notifications={notifications||[]}/>
 </Shell>
}