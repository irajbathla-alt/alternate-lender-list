'use client'
import {useState,useTransition} from 'react'
import {useRouter} from 'next/navigation'
import {markNotificationRead} from '../app/actions'
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
