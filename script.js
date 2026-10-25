const $=s=>document.querySelector(s);
const K={s:'attendance.students',a:'attendance.records',t:'attendance.threshold'};
const load=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Storage is unavailable, so changes won’t be kept.')}};
let students=load(K.s,[]),att=load(K.a,{}),threshold=load(K.t,75);
const STATUS=['Present','Absent','Late','Leave'];
const iso=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
let date=iso(),editing=null,histId=null,delId=null,tt;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(id,d)=>id+'|'+d;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}

function calc(){
  const m={};students.forEach(s=>m[s.id]={Present:0,Absent:0,Late:0,Leave:0});
  for(const k in att){const id=k.slice(0,k.lastIndexOf('|'));if(m[id])m[id][att[k]]++}
  return m;
}
const pctOf=c=>{const n=c.Present+c.Late+c.Absent;return n?Math.round((c.Present+c.Late)/n*1000)/10:null};
const isLow=p=>p!==null&&p<threshold;

function render(){
  const m=calc(),q=$('#q').value.trim().toLowerCase(),dp=$('#dept').value,sf=$('#stat').value,lo=$('#low').checked;
  // department filter options
  const depts=[...new Set(students.map(s=>s.dept))].sort();
  $('#dept').innerHTML='<option value="">All</option>'+depts.map(d=>`<option${d===dp?' selected':''}>${esc(d)}</option>`).join('');
  $('#deptList').innerHTML=depts.map(d=>`<option value="${esc(d)}">`).join('');
  // summary for selected date + overall
  let P=0,A=0;students.forEach(s=>{const v=att[key(s.id,date)];if(v==='Present')P++;if(v==='Absent')A++});
  let ap=0,an=0;students.forEach(s=>{const c=m[s.id];ap+=c.Present+c.Late;an+=c.Present+c.Late+c.Absent});
  $('#sTotal').textContent=students.length;$('#sPresent').textContent=P;$('#sAbsent').textContent=A;
  $('#sPct').textContent=an?(Math.round(ap/an*1000)/10)+'%':'—';
  const nice=new Date(date+'T00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#dateLabel').textContent=nice+(date===iso()?' (today)':'');
  const lowCount=students.filter(s=>isLow(pctOf(m[s.id]))).length;
  $('#thr').value=threshold;
  // filtered list
  const list=students.filter(s=>{
    const v=att[key(s.id,date)]||'none',p=pctOf(m[s.id]);
    return (!q||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!dp||s.dept===dp)&&(!sf||v===sf)&&(!lo||isLow(p));
  }).sort((a,b)=>a.name.localeCompare(b.name));
  if(!students.length){
    $('#list').innerHTML=`<li class="empty">No students yet. Add your first student to start marking attendance.<br><button class="btn primary" id="e1">Add student</button><button class="btn" id="e2">Load sample students</button></li>`;
    $('#e1').onclick=()=>openForm();$('#e2').onclick=sample;return;
  }
  if(!list.length){$('#list').innerHTML='<li class="empty">No students match these filters.</li>';return}
  $('#list').innerHTML=list.map(s=>{
    const p=pctOf(m[s.id]),low=isLow(p),cur=att[key(s.id,date)];
    return `<li class="row${low?' low':''}" data-id="${esc(s.id)}">
      <div class="who"><b>${esc(s.name)}</b><span>${esc(s.id)} · ${esc(s.dept)}</span></div>
      <div class="pct">${p===null?'<small>No records yet</small>':`<span class="num">${p}%</span><span class="track"><i style="--w:${p}%"></i></span>${low?`<em>Below ${threshold}%</em>`:''}`}</div>
      <div class="seg" role="group" aria-label="Status for ${esc(s.name)}">${STATUS.map(x=>`<button class="${x}" data-st="${x}" aria-pressed="${cur===x}">${x}</button>`).join('')}</div>
      <div class="acts"><button class="btn sm" data-act="hist">History</button><button class="btn sm" data-act="edit">Edit</button><button class="btn sm danger" data-act="del">Delete</button></div>
    </li>`}).join('');
  $('.note').textContent=`Percentage = (Present + Late) ÷ (Present + Late + Absent). Leave is excused and not counted. Tap a selected status again to clear it.${lowCount?` ${lowCount} student${lowCount>1?'s are':' is'} below ${threshold}%.`:''}`;
}

function mark(id,st){
  const k=key(id,date),had=att[k];
  if(had===st){delete att[k]}           // toggle off
  else{att[k]=st;if(had)toast('Updated the existing entry for this date.')} // one entry per student per date
  save(K.a,att);render();
}

// Student form
function openForm(id){
  editing=id||null;const s=students.find(x=>x.id===id);
  $('#stTitle').textContent=s?'Edit student':'Add student';
  $('#fId').value=s?s.id:'';$('#fId').readOnly=!!s;$('#fName').value=s?s.name:'';$('#fDept').value=s?s.dept:'';$('#stErr').textContent='';
  $('#stDlg').showModal();
}
$('#stForm').addEventListener('submit',e=>{
  e.preventDefault();
  const id=$('#fId').value.trim(),name=$('#fName').value.trim(),dept=$('#fDept').value.trim();
  if(!id||!name||!dept){$('#stErr').textContent='Fill in every field.';return}
  if(id.includes('|')){$('#stErr').textContent='Student ID can’t contain “|”.';return}
  if(editing){const s=students.find(x=>x.id===editing);s.name=name;s.dept=dept}
  else{
    if(students.some(x=>x.id.toLowerCase()===id.toLowerCase())){$('#stErr').textContent='That student ID already exists.';return}
    students.push({id,name,dept});
  }
  save(K.s,students);$('#stDlg').close();toast(editing?'Student updated.':'Student added.');render();
});

// History
function openHist(id){
  histId=id;const s=students.find(x=>x.id===id);if(!s)return;
  const c=calc()[id],p=pctOf(c);
  $('#hiTitle').textContent=`${s.name} (${s.id})`;
  $('#hiChips').innerHTML=`<span style="background:var(--bg)">${p===null?'No percentage yet':p+'% attendance'}</span><span style="background:var(--okbg);color:var(--ok)">Present ${c.Present}</span><span style="background:var(--badbg);color:var(--bad)">Absent ${c.Absent}</span><span style="background:var(--latebg);color:var(--late)">Late ${c.Late}</span><span style="background:var(--leavebg);color:var(--leave)">Leave ${c.Leave}</span>`;
  const recs=Object.keys(att).filter(k=>k.startsWith(id+'|')&&k.lastIndexOf('|')===id.length).map(k=>k.slice(id.length+1)).sort().reverse();
  $('#hiList').innerHTML=recs.length?recs.map(d=>`<li><span>${new Date(d+'T00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</span><span><select data-d="${d}" aria-label="Status on ${d}">${STATUS.map(x=>`<option${att[key(id,d)]===x?' selected':''}>${x}</option>`).join('')}</select> <button class="btn sm danger" data-rm="${d}">Remove</button></span></li>`).join(''):'<li>No attendance recorded yet.</li>';
  if(!$('#hiDlg').open)$('#hiDlg').showModal();
}
$('#hiList').addEventListener('change',e=>{if(e.target.dataset.d){att[key(histId,e.target.dataset.d)]=e.target.value;save(K.a,att);openHist(histId);render()}});
$('#hiList').addEventListener('click',e=>{const d=e.target.dataset.rm;if(d){delete att[key(histId,d)];save(K.a,att);openHist(histId);render()}});

// List actions
$('#list').addEventListener('click',e=>{
  const li=e.target.closest('.row');if(!li)return;const id=li.dataset.id,b=e.target.closest('button');if(!b)return;
  if(b.dataset.st)mark(id,b.dataset.st);
  else if(b.dataset.act==='hist')openHist(id);
  else if(b.dataset.act==='edit')openForm(id);
  else if(b.dataset.act==='del'){delId=id;const s=students.find(x=>x.id===id);$('#cfText').textContent=`${s.name} and all their attendance records will be removed.`;$('#cfDlg').showModal()}
});
$('#cfOk').onclick=()=>{
  students=students.filter(s=>s.id!==delId);
  Object.keys(att).forEach(k=>{if(k.slice(0,k.lastIndexOf('|'))===delId)delete att[k]});
  save(K.s,students);save(K.a,att);$('#cfDlg').close();toast('Student deleted.');render();
};
document.addEventListener('click',e=>{if(e.target.matches('[data-close]'))e.target.closest('dialog').close()});

// Bulk + controls
$('#allP').onclick=()=>{
  const q=$('#q').value.trim().toLowerCase(),dp=$('#dept').value;let n=0;
  students.forEach(s=>{
    if((!q||s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!dp||s.dept===dp)){
      const k=key(s.id,date);if(!att[k]){att[k]='Present';n++}
    }
  });
  save(K.a,att);toast(n?`Marked ${n} student${n>1?'s':''} present.`:'Everyone shown is already marked.');render();
};
$('#addBtn').onclick=()=>openForm();
$('#date').max=iso();$('#date').value=date;
$('#date').onchange=e=>{date=e.target.value||iso();render()};
['q','dept','stat','low'].forEach(i=>$('#'+i).addEventListener('input',render));
$('#thr').addEventListener('input',e=>{const v=Number(e.target.value);if(v>=1&&v<=100){threshold=v;save(K.t,v);render();$('#thr').focus()}});

function sample(){
  students=[['BCA101','Priya Raman','BCA'],['BCA102','Arun Kumar','BCA'],['BCA103','Fathima Begum','BCA'],['BSC201','Karthik S','B.Sc Maths'],['BSC202','Divya Lakshmi','B.Sc Maths'],['COM301','Mohammed Irfan','B.Com']].map(([id,name,dept])=>({id,name,dept}));
  att={};const base=new Date(date+'T00:00');
  const prob={BCA101:.95,BCA102:.6,BCA103:.85,BSC201:.7,BSC202:.9,COM301:.8};
  for(let i=1;i<=12;i++){const d=new Date(base);d.setDate(d.getDate()-i);if(d.getDay()===0)continue;
    const ds=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
    students.forEach(s=>{const r=Math.random();att[key(s.id,ds)]=r<prob[s.id]?(r<.05?'Late':'Present'):(r>.97?'Leave':'Absent')})}
  save(K.s,students);save(K.a,att);render();toast('Sample students loaded.');
}
render();
