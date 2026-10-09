import postgres from 'npm:postgres@3.4.7';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from 'npm:@simplewebauthn/server@13.2.2';
const ORIGIN='https://sdy-task08.vercel.app',RPID='sdy-task08.vercel.app';
const db=postgres(Deno.env.get('SUPABASE_DB_URL')!,{prepare:false,max:2,idle_timeout:10});
const enc=new TextEncoder(), cookieName='t08_session';
function reply(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}})}
const deny=(status=400)=>reply({error:status===401?'인증이 필요하거나 인증 정보가 올바르지 않습니다.':status===403?'요청 권한이 없습니다.':'요청을 처리하지 못했습니다.'},status);
const cookie=(v,max)=>cookieName+'='+v+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+max;
const value=req=>(req.headers.get('cookie')||'').match(/(?:^|;\s*)t08_session=([^;]+)/)?.[1]||'';
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async t=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(t)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const b64=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const unb64=t=>Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-t.length%4)%4)),x=>x.charCodeAt(0));
const safe=x=>String(x||'').trim();
const safeTransports=input=>{let items=input;if(typeof items==='string'){try{items=JSON.parse(items)}catch{items=[]}}return Array.isArray(items)?items.filter(x=>typeof x==='string'&&['usb','nfc','ble','internal','hybrid','smart-card'].includes(x)):[]};
async function user(req){const token=value(req);if(!token)return null;const u=await db.unsafe('select user_id from t08.sessions where token_hash=$1 and expires_at>now()',[await hash(token)]);return u[0]?.user_id||null}
async function oneTime(id,purpose){const c=await db.unsafe('delete from t08.challenges where id=$1 and purpose=$2 and expires_at>now() returning *',[id,purpose]);if(!c.length)throw Error('challenge missing');return c[0]}
Deno.serve(async req=>{
 const url=new URL(req.url),route=url.searchParams.get('route')||'auth',action=url.searchParams.get('action')||'';
 try{
 if(req.headers.get('x-t08-origin')!==ORIGIN)return deny(403);
 if(!['GET','POST','PUT','PATCH','DELETE'].includes(req.method))return deny(405);
 const uid=await user(req);
 if(route==='info'){
  if(!uid)return deny(401);
  if(req.method==='GET'){
   const rows=await db.unsafe('select id,kind,label,value,created_at,updated_at from t08.private_fields where user_id=$1 order by created_at asc',[uid]);
   return reply({fields:rows});
  }
  const b=await req.json().catch(()=>({}));
  if(req.method==='PUT'){
   const kind=safe(b.kind);
   const labels={phone:'전화번호',address:'상세 주소',birthdate:'생년월일'};
   if(!Object.hasOwn(labels,kind)||typeof b.value!=='string')return deny(400);
   const val=b.value.trim();
   if(val.length>5000)return reply({error:'입력값이 너무 깁니다.'},422);
   if(kind==='phone'&&val.length>64)return reply({error:'전화번호는 64자 이내로 입력해주세요.'},422);
   if(kind==='address'&&val.length>500)return reply({error:'주소는 500자 이내로 입력해주세요.'},422);
   if(kind==='birthdate'&&val){
    const validDate=/^\d{4}-\d{2}-\d{2}$/.test(val) && !Number.isNaN(Date.parse(val)) && new Date(val).toISOString().slice(0,10)===val;
    if(!validDate)return reply({error:'생년월일을 올바른 날짜로 입력해주세요.'},422);
   }
   if(!val){
    await db.unsafe('delete from t08.private_fields where user_id=$1 and kind=$2',[uid,kind]);
    return reply({cleared:true,kind});
   }
   const stored=await db.unsafe("insert into t08.private_fields(user_id,kind,label,value) values($1,$2,$3,$4) on conflict(user_id,kind) where kind <> 'custom' do update set value=excluded.value,updated_at=now() returning id,kind,label,value,created_at,updated_at",[uid,kind,labels[kind],val]);
   return reply({field:stored[0]});
  }
  if(req.method==='POST'||req.method==='PATCH'){
   const label=typeof b.label==='string'?b.label.trim():'';
   const val=typeof b.value==='string'?b.value.trim():null;
   if(!label||label.length>80||val===null||val.length>5000)return reply({error:'항목 이름은 1~80자, 내용은 최대 5000자로 입력해주세요.'},422);
   if(req.method==='POST'){
    const created=await db.unsafe("insert into t08.private_fields(user_id,kind,label,value) values($1,'custom',$2,$3) returning id,kind,label,value,created_at,updated_at",[uid,label,val]);
    return reply({field:created[0]},201);
   }
   const id=safe(b.id);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return deny(400);
   const updated=await db.unsafe("update t08.private_fields set label=$1,value=$2,updated_at=now() where id=$3 and user_id=$4 and kind='custom' returning id,kind,label,value,created_at,updated_at",[label,val,id,uid]);
   return updated.length?reply({field:updated[0]}):reply({error:'접근할 수 없는 항목입니다.'},404);
  }
  if(req.method==='DELETE'){
   const id=safe(b.id);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return deny(400);
   const removed=await db.unsafe("delete from t08.private_fields where id=$1 and user_id=$2 and kind='custom' returning id",[id,uid]);
   return removed.length?reply({deleted:true}):reply({error:'접근할 수 없는 항목입니다.'},404);
  }
  return deny(405);
 }
 if(route==='private'){
  if(!uid)return deny(401);
  if(req.method==='GET'){
   const records=await db.unsafe('select id,title,body,created_at,updated_at from t08.notes where user_id=$1 order by updated_at desc,id desc',[uid]);
   return reply({notes:records});
  }
  const body=await req.json().catch(()=>({}));
  if(req.method==='POST'||req.method==='PATCH'){
   const title=typeof body.title==='string'?body.title.trim():'';
   const content=typeof body.body==='string'?body.body.trim():'';
   if(!title||!content||title.length>120||content.length>10000)return reply({error:'제목은 1~120자, 내용은 1~10000자로 입력해주세요.'},422);
   if(req.method==='POST'){
    const row=await db.unsafe('insert into t08.notes(user_id,title,body) values($1,$2,$3) returning id,title,body,created_at,updated_at',[uid,title,content]);
    return reply({note:row[0]},201);
   }
   const noteId=safe(body.id);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(noteId))return deny(400);
   const row=await db.unsafe('update t08.notes set title=$1,body=$2,updated_at=now() where id=$3 and user_id=$4 returning id,title,body,created_at,updated_at',[title,content,noteId,uid]);
   return row.length?reply({note:row[0]}):reply({error:'이 기록을 수정할 권한이 없거나 존재하지 않습니다.'},404);
  }
  if(req.method==='DELETE'){
   const noteId=safe(body.id);
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(noteId))return deny(400);
   const removed=await db.unsafe('delete from t08.notes where id=$1 and user_id=$2 returning id',[noteId,uid]);
   return removed.length?reply({deleted:true}):reply({error:'이 기록을 삭제할 권한이 없거나 존재하지 않습니다.'},404);
  }
  return deny(405);
 }
 if(route==='passkeys'){
  if(!uid)return deny(401);
  if(req.method==='GET'){const list=await db.unsafe('select credential_id,label,created_at from t08.passkeys where user_id=$1 order by created_at',[uid]);return reply({passkeys:list})}
  if(req.method!=='DELETE')return deny(405);
  const body=await req.json().catch(()=>({}));
  const result=await db.begin(async tx=>{
   await tx.unsafe('select id from t08.users where id=$1 for update',[uid]);
   const count=await tx.unsafe('select count(*)::int as n from t08.passkeys where user_id=$1',[uid]);
   if(count[0].n<2)return false;
   const deleted=await tx.unsafe('delete from t08.passkeys where user_id=$1 and credential_id=$2 returning credential_id',[uid,safe(body.credentialId)]);
   return !!deleted.length;
  });
  return result?reply({deleted:true}):reply({error:'마지막 패스키는 삭제할 수 없습니다.'},409);
 }
 if(route!=='auth')return deny(404);
 if(action==='me'&&req.method==='GET'){
  if(!uid)return reply({authenticated:false});
  const accounts=await db.unsafe('select username from t08.users where id=$1',[uid]);
  return accounts.length?reply({authenticated:true,username:accounts[0].username}):reply({authenticated:false});
 }
 if(req.method!=='POST')return deny(405);
 const b=await req.json().catch(()=>({}));
 if(action==='register-options'){
  const name=safe(b.username);if(!/^[A-Za-z0-9_-]{2,48}$/.test(name))return deny();
  if(uid){const a=await db.unsafe('select username from t08.users where id=$1',[uid]);if(a[0]?.username!==name)return deny(403)}
  else{
   const a=await db.unsafe('select id from t08.users where username=$1',[name]);if(a.length)return deny(403);
  }
  const keys=uid?await db.unsafe('select credential_id,transports from t08.passkeys where user_id=$1',[uid]):[];
  const options=await generateRegistrationOptions({rpName:'ALEPH Private Workspace',rpID:RPID,userName:name,userID:enc.encode(uid||crypto.randomUUID()),attestationType:'none',authenticatorSelection:{residentKey:'preferred',userVerification:'required'},excludeCredentials:keys.map(k=>({id:k.credential_id,transports:safeTransports(k.transports)}))});
  const challenge=await db.unsafe('insert into t08.challenges(challenge,purpose,user_id,username) values($1,$2,$3,$4) returning id',[options.challenge,'register',uid,name]);
  return reply({options,challengeId:challenge[0].id});
 }
 if(action==='register-verify'){
  const ch=await oneTime(safe(b.challengeId),'register');
  if(ch.user_id&&ch.user_id!==uid)return deny(403);
  const v=await verifyRegistrationResponse({response:b.response,expectedChallenge:ch.challenge,expectedOrigin:ORIGIN,expectedRPID:RPID,requireUserVerification:true});
  if(!v.verified||!v.registrationInfo)return deny(401);
  const {credential,credentialDeviceType,credentialBackedUp}=v.registrationInfo;
  await db.begin(async tx=>{
   let account=ch.user_id;
   if(!account){
    const created=await tx.unsafe('insert into t08.users(username) values($1) returning id',[ch.username]);account=created[0].id;
   }
   await tx`insert into t08.passkeys(credential_id,user_id,public_key,counter,transports,device_type,backed_up,label) values(${credential.id},${account},${b64(credential.publicKey)},${credential.counter},${tx.json(safeTransports(b.response?.response?.transports))},${credentialDeviceType},${credentialBackedUp},${safe(b.label).slice(0,60)||'기본 패스키'})`;
  });
  return reply({registered:true});
 }
 if(action==='login-options'){
  const name=safe(b.username);if(!/^[A-Za-z0-9_-]{2,48}$/.test(name))return deny();
  const accounts=await db.unsafe('select id from t08.users where username=$1',[name]);const account=accounts[0]?.id||null;
  const keys=account?await db.unsafe('select credential_id,transports from t08.passkeys where user_id=$1',[account]):[];
  const options=await generateAuthenticationOptions({rpID:RPID,userVerification:'required',allowCredentials:keys.map(k=>({id:k.credential_id,transports:safeTransports(k.transports)}))});
  const c=await db.unsafe('insert into t08.challenges(challenge,purpose,user_id,username) values($1,$2,$3,$4) returning id',[options.challenge,'login',account,name]);
  return reply({options,challengeId:c[0].id});
 }
 if(action==='login-verify'){
  const ch=await oneTime(safe(b.challengeId),'login');if(!ch.user_id)return deny(401);
  const keys=await db.unsafe('select * from t08.passkeys where user_id=$1 and credential_id=$2',[ch.user_id,safe(b.response?.id)]);
  const key=keys[0];if(!key)return deny(401);
  const v=await verifyAuthenticationResponse({response:b.response,expectedChallenge:ch.challenge,expectedOrigin:ORIGIN,expectedRPID:RPID,requireUserVerification:true,credential:{id:key.credential_id,publicKey:unb64(key.public_key),counter:Number(key.counter),transports:safeTransports(key.transports)}});
  if(!v.verified)return deny(401);
  const done=await db.unsafe('update t08.passkeys set counter=$1 where credential_id=$2 and counter=$3 returning credential_id',[v.authenticationInfo.newCounter,key.credential_id,key.counter]);if(!done.length)return deny(401);
  const token=random();await db.unsafe("insert into t08.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '4 hours')",[await hash(token),ch.user_id]);
  const sessionCookie=cookie(token,14400);
  return reply({authenticated:true},200,{'set-cookie':sessionCookie,'x-t08-session-cookie':sessionCookie});
 }
 if(action==='logout'){
  const token=value(req);if(token)await db.unsafe('delete from t08.sessions where token_hash=$1',[await hash(token)]);
  const clearedCookie=cookie('',0);
  return reply({loggedOut:true},200,{'set-cookie':clearedCookie,'x-t08-session-cookie':clearedCookie});
 }
 return deny(404);
 }catch(e){console.error('T08 error',e instanceof Error?e.message:'unknown');return deny(400)}
});