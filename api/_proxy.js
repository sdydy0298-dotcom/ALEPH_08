const upstream='https://gbhmupoxedmyphjnudhb.supabase.co/functions/v1/t08-passkey';
export async function forward(req,res,route){
 try{
  const url=new URL(req.url,'https://aleph-08-sdydy0298-dotcom.vercel.app');
  const target=upstream+'?route='+route+'&'+url.searchParams.toString();
  const response=await fetch(target,{
   method:req.method,
   headers:{'content-type':'application/json','cookie':req.headers.cookie||'','x-t08-origin':'https://'+req.headers.host},
   ...(req.method==='GET'?{}:{body:JSON.stringify(req.body||{})})
  });
  res.statusCode=response.status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  const action=url.searchParams.get('action');
  const sessionAction=route==='auth'&&(action==='login-verify'||action==='logout');
  if(sessionAction){
   const cookie=response.headers.get('x-t08-session-cookie')||response.headers.get('set-cookie');
   if(cookie)res.setHeader('Set-Cookie',cookie);
   res.setHeader('X-T08-Session-Issued',cookie?'1':'0');
  }
  if(route==='auth'&&action==='me')res.setHeader('X-T08-Session-Received',String(req.headers.cookie||'').includes('t08_session=')?'1':'0');
  return res.end(await response.text());
 }catch(err){
  console.error('T08 upstream',err.message);
  return res.status(502).json({error:'인증 서버를 일시적으로 사용할 수 없습니다.'});
 }
}
