import crypto from 'node:crypto';

const COOKIE='emla_session';
function sign(value){
  return crypto.createHmac('sha256',process.env.SESSION_SECRET||'change-this-secret').update(value).digest('base64url');
}
function getCookie(req){
  const raw=req.headers.get('cookie')||'';
  const found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  return found?decodeURIComponent(found.slice(COOKIE.length+1)):null;
}
export default async (req)=>{
  const token=getCookie(req);
  if(!token) return Response.json({message:'Not authenticated'},{status:401});
  const [payload,sig]=token.split('.');
  if(!payload||!sig||sig!==sign(payload)) return Response.json({message:'Invalid session'},{status:401});
  try{
    const user=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(!user.exp || user.exp<Date.now()) return Response.json({message:'Session expired'},{status:401});
    return Response.json({user:{email:user.email,name:user.name,role:user.role}});
  }catch{
    return Response.json({message:'Invalid session'},{status:401});
  }
};