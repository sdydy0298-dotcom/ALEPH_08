
import {startRegistration,startAuthentication} from 'https://cdn.jsdelivr.net/npm/@simplewebauthn/browser@13.2.2/+esm';
const el=id=>document.getElementById(id);
const show=text=>el('message').textContent=text;
async function api(path,method='GET',body=null){
 const result=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw new Error(data.error||'요청을 처리하지 못했습니다.');
 return data;
}
async function busy(button,run){button.disabled=true;try{await run()}finally{button.disabled=false}}
async function refresh(){
 const info=await api('auth?action=me');
 el('visitor').hidden=!!info.authenticated;el('signed').hidden=!info.authenticated;
 if(!info.authenticated)return;
 el('username').textContent=info.username;
 const [records,keys]=await Promise.all([api('private'),api('passkeys')]);
 const notes=el('notes');notes.replaceChildren();
 for(const note of records.notes){
  const card=document.createElement('article');card.className='note';
  const heading=document.createElement('h3');heading.textContent=note.title;
  const body=document.createElement('p');body.textContent=note.body;card.append(heading,body);notes.append(card);
 }
 const list=el('passkeys');list.replaceChildren();
 for(const key of keys.passkeys){
  const row=document.createElement('div');row.className='passkey';
  const info=document.createElement('div');const name=document.createElement('strong');name.textContent=key.label;
  const date=document.createElement('small');date.textContent=new Date(key.created_at).toLocaleDateString('ko-KR')+' 등록';info.append(name,date);
  const del=document.createElement('button');del.textContent='삭제';del.disabled=keys.passkeys.length<=1;
  del.onclick=()=>busy(del,async()=>{if(!confirm('이 패스키를 삭제할까요?'))return;
    try{await api('passkeys','DELETE',{credentialId:key.credential_id});show('패스키를 삭제했습니다.');await refresh()}catch(e){show(e.message)}
  });
  row.append(info,del);list.append(row);
 }
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
el('add-key').onclick=e=>busy(e.currentTarget,async()=>{try{await registration(true)}catch(e){show(e.name==='NotAllowedError'?'등록을 취소했습니다.':e.message)}});
el('login').onclick=e=>busy(e.currentTarget,async()=>{
 try{
 const username=el('login-name').value.trim();
 const {options,challengeId}=await api('auth?action=login-options','POST',{username});
 const response=await startAuthentication({optionsJSON:options});
 await api('auth?action=login-verify','POST',{challengeId,response});
 show('로그인했습니다.');await refresh();
 }catch(e){show(e.name==='NotAllowedError'?'인증을 취소했습니다.':e.message)}
});
el('logout').onclick=e=>busy(e.currentTarget,async()=>{try{await api('auth?action=logout','POST',{});show('로그아웃했습니다.');await refresh()}catch(e){show(e.message)}});
refresh().catch(()=>show('인증 서버에 연결하지 못했습니다. 잠시 후 다시 확인해주세요.'));
