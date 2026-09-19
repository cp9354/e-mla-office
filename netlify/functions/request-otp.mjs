import crypto from 'node:crypto';
const COOKIE='emla_otp';
const normalize=s=>String(s||'').trim().toLowerCase();
const allowed={mla:normalize(process.env.MLA_LOGIN_EMAIL),pa:normalize(process.env.PA_LOGIN_EMAIL)};
function sign(v){return crypto.createHmac('sha256',process.env.SESSION_SECRET||'change-this-secret').update(v).digest('base64url');}
function token(email,otp){const exp=Date.now()+5*60*1000;const hash=crypto.createHash('sha256').update(email+'|'+otp+'|'+process.env.SESSION_SECRET).digest('hex');const p=Buffer.from(JSON.stringify({email,hash,exp})).toString('base64url');return p+'.'+sign(p);}
export default async(req)=>{
 if(req.method!=='POST')return Response.json({message:'Method not allowed'},{status:405});
 try{
  const {role,email}=await req.json();const e=normalize(email),r=normalize(role);
  if(!allowed[r]||e!==allowed[r])return Response.json({message:'This email is not authorized.'},{status:403});
  if(!process.env.RESEND_API_KEY)return Response.json({message:'Email OTP service is not configured yet.'},{status:503});
  const otp=String(Math.floor(100000+Math.random()*900000));
  const from=process.env.OTP_FROM_EMAIL||'onboarding@resend.dev';
  const html=`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;border:1px solid #eee;border-radius:16px"><h2 style="color:#f36b21">e-MLA Office Dharampur</h2><p>Your secure login OTP is:</p><div style="font-size:34px;font-weight:800;letter-spacing:8px;margin:22px 0">${otp}</div><p>This OTP expires in 5 minutes. If you did not request it, you can ignore this email.</p></div>`;
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from,to:[e],subject:'e-MLA Office Login OTP',html})});
  if(!rr.ok)return Response.json({message:'OTP email could not be sent. Please try again.'},{status:502});
  return new Response(JSON.stringify({ok:true,message:'OTP sent to your authorized email.',role:r}),{status:200,headers:{'content-type':'application/json','set-cookie':`${COOKIE}=${encodeURIComponent(token(e,otp))}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`}});
 }catch{return Response.json({message:'Invalid request.'},{status:400});}
};