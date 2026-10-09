const el = id => document.getElementById(id);
const notify = text => {el('info-message').textContent = text;};
const fixedKinds = ['phone','address','birthdate'];
let entries = [], editing = null;

async function api(path, method='GET', payload=null) {
 const response = await fetch('/api/'+path,{
  method, credentials:'same-origin',
  headers:payload===null?{}:{'Content-Type':'application/json'},
  ...(payload===null?{}:{body:JSON.stringify(payload)})
 });
 const data = await response.json().catch(()=>({}));
 if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
 return data;
}

function clearEditor(focus=false) {
 editing = null;
 el('custom-label').maxLength = 80;
 el('custom-value').maxLength = 5000;
 el('custom-label').value = '프로젝트 메모';
 el('custom-value').value = '';
 el('custom-chars').textContent = '0 / 5,000';
 el('save-custom').textContent = '항목 추가 →';
 el('cancel-custom').hidden = true;
 if (location.search) history.replaceState(null,'','/info.html');
 if (focus) el('custom-label').focus();
}

function openEditor(item) {
 editing = {id:item.id, source:item.source};
 el('custom-label').maxLength = item.source==='note'?120:80;
 el('custom-value').maxLength = item.source==='note'?10000:5000;
 el('custom-label').value = item.label;
 el('custom-value').value = item.value;
 el('custom-chars').textContent = item.value.length.toLocaleString('ko-KR')+' / '+(item.source==='note'?'10,000':'5,000');
 el('save-custom').textContent = '수정 내용 저장 →';
 el('cancel-custom').hidden = false;
 history.replaceState(null,'','/info.html?edit='+encodeURIComponent(item.id));
 el('custom-label').focus();
}

function renderEntries() {
 const list=el('custom-list');
 list.replaceChildren();
 if (!entries.length) {
  const empty=document.createElement('div');
  empty.className='info-custom-empty';
  empty.textContent='아직 추가한 항목이 없어요. 위에서 첫 항목을 작성해보세요.';
  list.append(empty);
  return;
 }
 for (const entry of entries) {
  const card=document.createElement('article');card.className='info-custom-item';
  const details=document.createElement('div');details.className='info-custom-body';
  const title=document.createElement('strong');title.textContent=entry.label;
  const description=document.createElement('p');
  description.textContent=entry.value || '내용 없음';
  if (!entry.value) description.className='is-blank';
  const date=document.createElement('small');date.className='info-entry-date';
  date.textContent='마지막 수정 '+new Date(entry.updated_at||entry.created_at).toLocaleDateString('ko-KR');
  details.append(title,description,date);
  const actions=document.createElement('div');actions.className='info-item-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.onclick=()=>openEditor(entry);
  const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='삭제';
  remove.onclick=async()=>{
   if (!confirm('이 항목을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.')) return;
   remove.disabled=true;
   try {
    await api(entry.source==='note'?'private':'info','DELETE',{id:entry.id});
    if (editing && editing.id===entry.id) clearEditor();
    await reload(false);
    notify('항목을 삭제했습니다.');
   } catch(error) {notify(error.message);}
   finally {remove.disabled=false;}
  };
  actions.append(edit,remove);
  card.append(details,actions);
  list.append(card);
 }
}

async function reload(updateFixed=true) {
 const [privateInfo,oldNotes]=await Promise.all([api('info'),api('private')]);
 const fixed={};
 const custom=[];
 for (const field of privateInfo.fields) {
  if (field.kind==='custom') custom.push({
   id:field.id,source:'custom',label:field.label,value:field.value,
   created_at:field.created_at,updated_at:field.updated_at
  });
  else fixed[field.kind]=field.value;
 }
 const notes=oldNotes.notes.map(note=>({
  id:note.id,source:'note',label:note.title,value:note.body,
  created_at:note.created_at,updated_at:note.updated_at
 }));
 entries=[...custom,...notes].sort((a,b)=>
  (Date.parse(b.updated_at||b.created_at)||0)-(Date.parse(a.updated_at||a.created_at)||0));
 if(updateFixed)for(const kind of fixedKinds)el('info-'+kind).value=fixed[kind]||'';
 el('info-total').textContent=String(privateInfo.fields.length+notes.length);
 el('custom-count').textContent=String(entries.length);
 renderEntries();
 return entries;
}

el('fixed-form').onsubmit=async event=>{
 event.preventDefault();
 const values={phone:el('info-phone').value,address:el('info-address').value,birthdate:el('info-birthdate').value};
 const button=el('save-fixed');button.disabled=true;
 try {
  for(const kind of fixedKinds)await api('info','PUT',{kind,value:values[kind]});
  await reload();
  notify('기본 비공개 정보를 저장했습니다.');
 } catch(error) {notify(error.message+' 저장된 값을 확인해주세요.');}
 finally {button.disabled=false;}
};

el('custom-form').onsubmit=async event=>{
 event.preventDefault();
 const label=el('custom-label').value.trim();
 const value=el('custom-value').value.trim();
 if(!label) return notify('항목 이름을 입력해주세요.');
 if(editing?.source==='note'&&!value)
  return notify('기존 비공개 기록은 내용을 한 글자 이상 입력해야 수정할 수 있습니다.');
 const button=el('save-custom');button.disabled=true;
 try {
  const wasEditing=!!editing;
  if(!editing)await api('info','POST',{label,value});
  else if(editing.source==='note')await api('private','PATCH',{id:editing.id,title:label,body:value});
  else await api('info','PATCH',{id:editing.id,label,value});
  clearEditor();
  await reload(false);
  notify(wasEditing?'변경사항을 저장했습니다.':'새 항목을 저장했습니다.');
 } catch(error) {notify(error.message);}
 finally {button.disabled=false;}
};

el('custom-value').oninput=e=>{
 el('custom-chars').textContent=e.target.value.length.toLocaleString('ko-KR')+
   ' / '+(editing?.source==='note'?'10,000':'5,000');
};
el('cancel-custom').onclick=()=>clearEditor(true);

(async()=>{
 try {
  const me=await api('auth?action=me');
  if(!me.authenticated){el('info-unauth').hidden=false;return;}
  el('info-username').textContent=me.username;
  await reload();
  el('info-app').hidden=false;
  const editId=new URLSearchParams(location.search).get('edit');
  if(editId){const found=entries.find(item=>item.id===editId);if(found)openEditor(found);}
 } catch(error) {
  el('info-unauth').hidden=false;
  notify('비공개 공간을 불러오지 못했습니다. '+error.message);
 }
})();
