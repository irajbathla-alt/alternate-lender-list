import Link from 'next/link'
import {logOut} from '../app/actions'
export function Shell({role,title,subtitle,children}:{role:'broker'|'client'|'admin',title:string,subtitle:string,children:React.ReactNode}){
 const nav=role==='broker'?[['/broker','Applications']]:role==='client'?[['/client','My Tasks']]:[['/admin','Admin CRM']];
 return <><header className="top"><div className="topinner"><Link href="/" className="brand">VANCOUVER FINANCE COMPANY INC.<span>{role.toUpperCase()} PORTAL</span></Link><nav>{nav.map(([href,t])=><Link href={href} key={href}>{t}</Link>)}<form action={logOut}><button className="exit">Sign Out</button></form></nav></div></header><main className="workspace"><div className="heading"><div><div className="eyebrow">VFC / SECURE WORKSPACE</div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main></>
}
export function Alert({error,success}:{error?:string,success?:string}){
 return error?<p className="alert">Action could not be completed. Check your information and access permissions.</p>:success?<p className="success">Your update has been saved.</p>:null
}
export function StateTag({status}:{status:string}){return <span className="status">{status.replaceAll('_',' ')}</span>}
