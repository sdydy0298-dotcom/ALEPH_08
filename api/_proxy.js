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
  const cookie=response.headers.get('set-cookie');if(cookie)res.setHeader('set-cookie',cookie);
  return res.end(await response.text());
 }catch(err){
  console.error('T08 upstream',err.message);
  return res.status(502).json({error:'인증 서버를 일시적으로 사용할 수 없습니다.'});
 }
}
