export default async ()=>{
  return new Response(JSON.stringify({ok:true}),{
    status:200,
    headers:{
      'content-type':'application/json',
      'set-cookie':'emla_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    }
  });
};