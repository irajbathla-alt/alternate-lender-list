import {supabase} from '../../../lib/server';import {redirect} from 'next/navigation';import {acceptInvitation} from '../../actions'
export default async function Invite({params}:{params:Promise<{token:string}>}){
 const {token}=await params,s=await supabase(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login');
 return <main className="auth card"><h1>Client Invitation</h1><p>Connect your verified client account to the financing request sent to your email address.</p><form action={acceptInvitation}><input name="token" type="hidden" value={token}/><button className="btn">Accept Invitation</button></form><p className="small muted">Invitations are single-use and expire after 7 days. If you receive an error, contact your broker.</p></main>
}