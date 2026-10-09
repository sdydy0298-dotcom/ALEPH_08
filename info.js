const el=id=>document.getElementById(id);
const msg=text=>el('info-message').textContent=text;
const fixedKinds=['phone','address','birthdate'];
let customs=[],editingId=null;
async function api(path,method='GET',body){
 const res=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data.error||'서버 요청이 실패했습니다.');
 return data;
}
async function reload(){
 const {fields}=await api('info');
 const fixed={};customs=[];
 for(const f of fields){if(f.kind==='custom')customs.push(f);else fixed[f.kind]=f.value;}
 for(const kind of fixedKinds)el('info-'+kind).value=fixed[kind]||'';
 el('info-total').textContent=String(fields.length);
 el('custom-count').textContent=String(customs.length);
 drawCustoms();
}
function resetCustom(){
 editingId=null;
 el('custom-label').value='프로젝트 메모';
 el('custom-value').value='';
 el('custom-chars').textContent='0 / 5,000';
 el('save-custom').innerHTML='항목 추가 <span>→</span>';
 el('cancel-custom').hidden=true;
 el('custom-label').focus();
}
function editCustom(item){
 editingId=item.id;
 el('custom-label').value=item.label;
 el('custom-value').value=item.value;
 el('custom-chars').textContent=item.value.length.toLocaleString('ko-KR')+' / 5,000';
 el('save-custom').innerHTML='수정 내용 저장 <span>→</span>';
 el('cancel-custom').hidden=false;
 el('custom-label').focus();
}
function drawCustoms(){
 const list=el('custom-list');list.replaceChildren();
 if(!customs.length){
  const item=document.createElement('div');item.className='info-custom-empty';
  item.textContent='아직 저장한 항목이 없어요. 위에서 첫 항목을 직접 추가해보세요.';
  list.append(item);return;
 }
 for(const item of customs){
  const card=document.createElement('article');card.className='info-custom-item';
  const body=document.createElement('div');body.className='info-custom-body';
  const heading=document.createElement('strong');heading.textContent=item.label;
  const contents=document.createElement('p');contents.textContent=item.value||'내용 없음';
  if(!item.value)contents.classList.add('is-blank');
  body.append(heading,contents);
  const actions=document.createElement('div');actions.className='info-item-actions';
  const edit=document.createElement('button');edit.type='button';edit.textContent='수정';edit.onclick=()=>editCustom(item);
  const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.className='danger';
  remove.onclick=async()=>{
   if(!confirm('선택한 비공개 항목을 삭제할까요?'))return;
   remove.disabled=true;
   try{await api('info','DELETE',{id:item.id});if(editingId===item.id)resetCustom();await reload();msg('항목을 삭제했습니다.');}
   catch(err){msg(err.message)}finally{remove.disabled=false;}
  };
  actions.append(edit,remove);card.append(body,actions);list.append(card);
 }
}
el('fixed-form').onsubmit=async event=>{
 event.preventDefault();
 const values={phone:el('info-phone').value,address:el('info-address').value,birthdate:el('info-birthdate').value};
 const btn=el('save-fixed');btn.disabled=true;
 try{
  for(const kind of fixedKinds)await api('info','PUT',{kind,value:values[kind]});
  await reload();msg('기본 비공개 정보를 저장했습니다.');
 }catch(error){msg(error.message+' 저장된 항목을 확인해 주세요.');}
 finally{btn.disabled=false;}
};
el('custom-form').onsubmit=async event=>{
 event.preventDefault();
 const label=el('custom-label').value.trim(),value=el('custom-value').value.trim();
 if(!label)return msg('항목 이름을 입력해주세요.');
 const btn=el('save-custom');btn.disabled=true;
 try{
  const modifying=!!editingId;
  await api('info',modifying?'PATCH':'POST',{...(modifying?{id:editingId}:{}),label,value});
  resetCustom();await reload();msg(modifying?'항목을 수정했습니다.':'새로운 비공개 항목을 저장했습니다.');
 }catch(error){msg(error.message)}
 finally{btn.disabled=false;}
};
el('custom-value').oninput=event=>el('custom-chars').textContent=event.target.value.length.toLocaleString('ko-KR')+' / 5,000';
el('cancel-custom').onclick=resetCustom;
(async()=>{
 try{
  const me=await api('auth?action=me');
  if(!me.authenticated){el('info-unauth').hidden=false;return;}
  el('info-username').textContent=me.username;
  await reload();el('info-app').hidden=false;
 }catch(error){el('info-unauth').hidden=false;msg('비공개 정보를 불러오지 못했습니다. '+error.message);}
})();
