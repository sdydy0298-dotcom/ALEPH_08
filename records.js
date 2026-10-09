const by=id=>document.getElementById(id);
const status=text=>by('records-message').textContent=text;
let notes=[],editing=null;
async function call(method='GET',payload){
 const res=await fetch('/api/private',{method,credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||'요청을 처리할 수 없습니다.');
 return data;
}
function reset(){
 editing=null;by('record-form').reset();by('editor-heading').textContent='새 기록 작성';
 by('record-submit').textContent='기록 저장 →';by('cancel-edit').hidden=true;
 by('record-length').textContent='0 / 10,000';
 history.replaceState(null,'','/records.html');
}
function choose(note){
 editing=note.id;by('record-title').value=note.title;by('record-content').value=note.body;
 by('editor-heading').textContent='기록 수정';by('record-submit').textContent='변경사항 저장 →';
 by('cancel-edit').hidden=false;
 by('record-length').textContent=note.body.length.toLocaleString()+' / 10,000';
 history.replaceState(null,'','?edit='+encodeURIComponent(note.id));
 by('record-title').focus();
}
function view(){
 const list=by('records-list');list.replaceChildren();by('records-count').textContent=String(notes.length);
 if(!notes.length){
  const e=document.createElement('div');e.className='records-empty';
  const h=document.createElement('h2');h.textContent='아직 작성한 기록이 없어요.';
  const p=document.createElement('p');p.textContent='왼쪽에서 첫 기록을 직접 작성해 보세요.';
  e.append(h,p);list.append(e);return;
 }
 for(const n of notes){
  const card=document.createElement('article');card.className='records-item';
  const title=document.createElement('div');title.className='records-item-title';title.textContent=n.title;
  const body=document.createElement('p');body.className='records-item-body';body.textContent=n.body;
  const bottom=document.createElement('div');bottom.className='records-item-bottom';
  const date=document.createElement('small');date.textContent=new Date(n.updated_at||n.created_at).toLocaleString('ko-KR');
  const actions=document.createElement('div');actions.className='records-item-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.onclick=()=>choose(n);
  const del=document.createElement('button');del.type='button';del.className='delete';del.textContent='삭제';
  del.onclick=async()=>{if(!confirm('이 기록을 삭제할까요? 삭제 후 복구할 수 없습니다.'))return;
   del.disabled=true;try{await call('DELETE',{id:n.id});if(editing===n.id)reset();await load();status('기록을 삭제했습니다.')}catch(e){status(e.message)}finally{del.disabled=false}
  };
  actions.append(edit,del);bottom.append(date,actions);card.append(title,body,bottom);list.append(card);
 }
}
async function load(){
 const data=await call();notes=data.notes||[];view();
 const id=new URLSearchParams(location.search).get('edit');
 if(id){const item=notes.find(n=>n.id===id);if(item)choose(item)}
}
by('record-form').onsubmit=async event=>{
 event.preventDefault();
 const title=by('record-title').value.trim(),body=by('record-content').value.trim();
 if(!title||!body)return status('제목과 내용을 모두 입력해 주세요.');
 const button=by('record-submit');button.disabled=true;
 try{const changed=!!editing;await call(changed?'PATCH':'POST',{...(changed?{id:editing}:{}),title,body});
 reset();await load();status(changed?'수정한 기록을 저장했습니다.':'새 기록을 저장했습니다.');
 }catch(e){status(e.message)}finally{button.disabled=false}
};
by('record-content').oninput=e=>by('record-length').textContent=e.target.value.length.toLocaleString()+' / 10,000';
by('cancel-edit').onclick=reset;by('new-record').onclick=()=>{reset();by('record-title').focus()};
(async()=>{
 try{
  const response=await fetch('/api/auth?action=me',{credentials:'same-origin'});
  if(!response.ok)throw Error('로그인 상태를 확인하지 못했습니다.');
  const me=await response.json();
  if(!me.authenticated){by('records-auth').hidden=false;return}
  by('records-user').textContent=me.username;await load();by('records-app').hidden=false;
 }catch(e){by('records-auth').hidden=false;status(e.message)}
})();
