import {NextRequest,NextResponse} from 'next/server';import {supabase} from '../../../lib/server'
export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code');if(code){const s=await supabase();const {error}=await s.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/',request.url))}
 return NextResponse.redirect(new URL('/login?error=verification',request.url))
}
