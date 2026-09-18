import crypto from 'node:crypto';

const COOKIE='emla_session';
const normalize=s=>String(s||'').trim().toLowerCase();

function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function sign(value){
  return crypto.createHmac('sha256',process.env.SESSION_SECRET||'change-this-secret').update(value).digest('base64url');
}
function tokenFor(user){
  const payload=Buffer.from(JSON.stringify({...user,exp:Date.now()+8*60*60*1000})).toString('base64url');
  return payload+'.'+sign(payload);
}

export default async (req)=>{
  if(req.method!=='POST') return Response.json({message:'Method not allowed'},{status:405});
  try{
    const {role,email,password}=await req.json();
    const r=normalize(role), e=normalize(email), p=String(password||'');
    const users={
      mla:{email:normalize(process.env.MLA_LOGIN_EMAIL),password:String(process.env.MLA_LOGIN_PASSWORD||''),name:'Shri Arvindbhai Patel',role:'MLA'},
      pa:{email:normalize(process.env.PA_LOGIN_EMAIL),password:String(process.env.PA_LOGIN_PASSWORD||''),name:'Personal Assistant',role:'PA'}
    };
    const u=users[r];
    if(!u || !u.email || !u.password || e!==u.email || !safeEqual(p,u.password)){
      return Response.json({message:'Invalid email, role or password.'},{status:401});
    }
    const token=tokenFor({email:u.email,name:u.name,role:u.role});
    return new Response(JSON.stringify({ok:true,user:{email:u.email,name:u.name,role:u.role}}),{
      status:200,
      headers:{
        'content-type':'application/json',
        'set-cookie':`${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
      }
    });
  }catch{
    return Response.json({message:'Invalid request.'},{status:400});
  }
};