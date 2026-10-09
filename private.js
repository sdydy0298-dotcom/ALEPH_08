
import {startRegistration,startAuthentication} from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13.2.2/+esm';
const el=id=>document.getElementById(id);
const show=text=>el('message').textContent=text;
function keyNotice(text,isError=false){
 const panel=el('key-message');
 panel.textContent=text;
 panel.hidden=!text;
 panel.classList.toggle('is-error',isError);
 if(text)panel.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function registrationError(err){
 const msg=String(err?.message||'');
 if(/previously registered|already registered|already exists|excluded|invalidstateerror|authenticator.*registered/i.test(msg)||err?.name==='InvalidStateError'){
  return '이미 이 계정에 등록된 패스키입니다. 기존 Google 비밀번호 관리자 대신 다른 패스키 저장소, 별도의 휴대전화 패스키 또는 보안 키를 선택하세요. 같은 계정에 동기화된 기존 패스키를 다시 선택해도 새 패스키로 추가되지 않습니다.';
 }
 if(err?.name==='NotAllowedError')return '등록을 취소했거나 기기 인증이 완료되지 않았습니다.';
 return '패스키 추가에 실패했습니다. '+(msg||'기기의 패스키 지원 여부를 확인해주세요.');
}
async function api(path,method='GET',body=null){
 const result=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw new Error(data.error||'요청을 처리하지 못했습니다.');
 return data;
}
async function busy(button,run){button.disabled=true;try{await run()}finally{button.disabled=false}}
async function refresh(){
 const account=await api('auth?action=me');
 if(!account.authenticated){
  el('visitor').hidden=false;
  el('signed').hidden=true;
  return false;
 }
 const [records,profile,keys]=await Promise.all([api('private'),api('info'),api('passkeys')]);
 el('username').textContent=account.username;
 el('notes-total').textContent=String(records.notes.length+profile.fields.length);
 el('keys-total').textContent=String(keys.passkeys.length);
 const list=el('passkeys');list.replaceChildren();
 for(const key of keys.passkeys){
  const row=document.createElement('div');row.className='passkey';
  const info=document.createElement('div');const name=document.createElement('strong');name.textContent=key.label;
  const date=document.createElement('small');date.textContent=new Date(key.created_at).toLocaleDateString('ko-KR')+' 등록';
  info.append(name,date);
  const del=document.createElement('button');del.textContent='삭제';del.disabled=keys.passkeys.length<=1;
  del.onclick=()=>busy(del,async()=>{
   if(!confirm('이 패스키를 삭제할까요?'))return;
   try{await api('passkeys','DELETE',{credentialId:key.credential_id});show('패스키를 삭제했습니다.');await refresh();}
   catch(error){show(error.message);}
  });
  row.append(info,del);list.append(row);
 }
 el('visitor').hidden=true;
 el('signed').hidden=false;
 return true;
}
async function registration(additional){
 const username=(additional?el('username').textContent:el('reg-name').value).trim();
 const label=(additional?el('add-label'):el('reg-label')).value.trim();
 const {options,challengeId}=await api('auth?action=register-options','POST',{username});
 const response=await startRegistration({optionsJSON:options});
 await api('auth?action=register-verify','POST',{challengeId,response,label});
 if(additional){show('새 패스키가 등록되었습니다.');await refresh();}
 else{
  el('login-name').value=username;
  show('패스키 등록이 완료되었습니다. 왼쪽에서 패스키 로그인을 진행해주세요.');
  el('login').focus();
 }
}
el('register').onclick=e=>busy(e.currentTarget,async()=>{try{await registration(false)}catch(e){show(e.name==='NotAllowedError'?'등록을 취소했습니다.':e.message)}});
el('add-key').onclick=e=>busy(e.currentTarget,async()=>{
 keyNotice('');
 try{
  await registration(true);
  keyNotice('두 번째 패스키가 정상적으로 등록되었습니다.');
 }catch(error){
  keyNotice(registrationError(error),true);
 }
});
el('login').onclick=e=>busy(e.currentTarget,async()=>{
 try{
 const username=el('login-name').value.trim();
 const {options,challengeId}=await api('auth?action=login-options','POST',{username});
 const response=await startAuthentication({optionsJSON:options});
 await api('auth?action=login-verify','POST',{challengeId,response});
 const ready=await refresh();
 if(!ready)throw new Error('패스키 인증은 통과했지만 세션이 유지되지 않았습니다. 브라우저 쿠키 설정을 확인하고 다시 로그인해주세요.');
 show('로그인 완료! 정보와 기록을 관리하려면 내 비공개 공간을 열어주세요.');
 el('signed').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){show(e.name==='NotAllowedError'?'인증을 취소했습니다.':e.message)}
});
el('logout').onclick=e=>busy(e.currentTarget,async()=>{try{await api('auth?action=logout','POST',{});show('로그아웃했습니다.');await refresh()}catch(e){show(e.message)}});
refresh().then(ok=>{if(ok)show('인증된 세션으로 내 보관함을 열었습니다.');}).catch(()=>show('세션 또는 비공개 자료를 불러오지 못했습니다. 새로고침 후 다시 로그인해주세요.'));
