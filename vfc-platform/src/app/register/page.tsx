import {supabase} from '../../lib/server';import {redirect} from 'next/navigation'
export default async function Register({searchParams}:{searchParams:Promise<{error?:string}>}){
 async function create(f:FormData){'use server';const s=await supabase();const password=String(f.get('password')||''),email=String(f.get('email')||'');
 if(password.length<12||!email.includes('@'))redirect('/register?error=validation');
 const {error}=await s.auth.signUp({email,password,options:{emailRedirectTo:process.env.NEXT_PUBLIC_APP_URL?process.env.NEXT_PUBLIC_APP_URL+'/auth/callback':undefined}});
 if(error)redirect('/register?error=signup');redirect('/login?registered=1');
 }
 return <main className="auth card"><h1>Client Registration</h1><p className="muted">Create a client account. Broker and Admin access is assigned only by VFC.</p>{(await searchParams).error&&<p className="alert">Registration could not be completed.</p>}<form action={create}><div className="field"><label>Email Address</label><input name="email" type="email" required/></div><div className="field"><label>Password (12+ characters)</label><input name="password" type="password" required minLength={12}/></div><button className="btn">Register Client Account</button></form><p className="small muted">New accounts require email verification and VFC account activation before client records can be accessed.</p></main>
}