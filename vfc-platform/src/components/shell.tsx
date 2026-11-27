import Link from 'next/link'
import {logOut} from '../app/actions'
import {supabase} from '../lib/server'
import {NotificationBell} from './admin-workspace'
export async function Shell({role,title,subtitle,children}:{role:'broker'|'client'|'admin',title:string,subtitle:string,children:React.ReactNode}){
 const nav=role==='broker'?[['/broker','My Applications']]:role==='client'?[['/client','My Tasks']]:[['/admin','Application CRM']]
 const s=await supabase()
 const {data:{user}}=await s.auth.getUser()
 const {data:notifications}=user?await s.from('notifications').select('id,title,body,created_at,read_at').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(40):{data:[]}
 return <><header className="top"><div className="topinner"><Link href="/" className="brand">VANCOUVER FINANCE COMPANY INC.<span>{role.toUpperCase()} PORTAL</span></Link><nav>{nav.map(([href,t])=><Link href={href} key={href}>{t}</Link>)}<NotificationBell notifications={notifications||[]}/><form action={logOut}><button className="exit">Sign Out</button></form></nav></div></header><main className="workspace"><div className="heading"><div><div className="eyebrow">VFC / SECURE WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main></>
}
export function Alert({error,success}:{error?:string,success?:string}){
 return error?<p className="alert">Action could not be completed. Check your information and access permissions.</p>:success?<p className="success">Your update has been saved.</p>:null
}
export function StateTag({status}:{status:string}){return <span className="status">{status.replaceAll('_',' ')}</span>}
