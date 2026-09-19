import crypto from 'node:crypto';
const COOKIE='emla_otp',SESSION='emla_session';
const normalize=s=>String(s||'').trim().toLowerCase();
function sign(v){return crypto.createHmac('sha256',process.env.SESSION_SECRET||'change-this-secret').update(v).digest('base64url');}
function cookie(req,name){const raw=req.headers.get('cookie')||'';const x=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));return x?decodeURIComponent(x.slice(name.length+1)):null;}
function session(user){const p=Buffer.from(JSON.stringify({...user,exp:Date.now()+8*60*60*1000})).toString('base64url');return p+'.'+sign(p);}
export default async(req)=>{
 if(req.method!=='POST')return Response.json({message:'Method not allowed'},{status:405});
 try{
  const {email,otp}=await req.json(),e=normalize(email),o=String(otp||'').trim(),t=cookie(req,COOKIE);
  if(!t)return Response.json({message:'OTP expired. Please request a new OTP.'},{status:401});
  const [p,s]=t.split('.');if(!p||s!==sign(p))return Response.json({message:'Invalid OTP session.'},{status:401});
  const data=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));if(data.email!==e||data.exp<Date.now())return Response.json({message:'OTP expired. Please request a new OTP.'},{status:401});
  const hash=crypto.createHash('sha256').update(e+'|'+o+'|'+process.env.SESSION_SECRET).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(data.hash)))return Response.json({message:'Incorrect OTP.'},{status:401});
  const role=e===normalize(process.env.MLA_LOGIN_EMAIL)?'MLA':'PA';
  const name=role==='MLA'?'Shri Arvindbhai Patel':'Personal Assistant';
  const u={email:e,name,role};
  return new Response(JSON.stringify({ok:true,user:u}),{status:200,headers:{'content-type':'application/json','set-cookie':`${SESSION}=${encodeURIComponent(session(u))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`}});
 }catch{return Response.json({message:'Verification failed.'},{status:400});}
};