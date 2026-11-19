const STORAGE='vice-ledger-v1';
const state=Object.assign({done:[],spoilers:false,revealed:[],grade:'all',kind:'all',view:'list',selected:1},JSON.parse(localStorage.getItem(STORAGE)||'{}'));
let trophies=[];
const $=s=>document.querySelector(s);
const save=()=>localStorage.setItem(STORAGE,JSON.stringify(state));
const title=t=>state.spoilers&&t.hidden&&!state.done.includes(t.id)&&!state.revealed.includes(t.id)?'████████ ██████':t.name;
const desc=t=>state.spoilers&&t.hidden&&!state.done.includes(t.id)&&!state.revealed.includes(t.id)?'Hidden story requirement. Earn or reveal to read.':t.description;
async function boot(){const data=await fetch('data/trophies.json').then(r=>r.json());trophies=data.trophies;const demo=new URLSearchParams(location.search);if(demo.has('view'))state.view=demo.get('view');if(demo.has('selected'))state.selected=+demo.get('selected');if(demo.has('spoilers'))state.spoilers=demo.get('spoilers')==='1';bind();render();}
function bind(){
  $('#search').oninput=renderList;
  $('#spoilerBtn').onclick=()=>{state.spoilers=!state.spoilers;save();render();};
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;save();render();});
  $('#exportBtn').onclick=exportProgress; $('#importInput').onchange=importProgress;
}
function filterButtons(){
 const groups=[['gradeFilters',['all','platinum','gold','silver','bronze'],'grade'],['kindFilters',['all','story','missable','collectibles','activities','other'],'kind']];
 for(const [id,vals,key] of groups){$('#'+id).innerHTML=vals.map(v=>`<button class="chip ${state[key]===v?'on':''}" data-v="${v}">${v}</button>`).join('');$('#'+id).querySelectorAll('button').forEach(b=>b.onclick=()=>{state[key]=b.dataset.v;save();renderList();filterButtons();});}
}
function render(){
 const road=state.view==='roadmap'; $('#listView').classList.toggle('hidden-view',road);$('#roadmapView').classList.toggle('hidden-view',!road);
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
 $('#heroTitle').textContent=road?'The shortest safe route.':'One state. Fifty-five marks.';
 $('#spoilerBtn').textContent=`Spoilers: ${state.spoilers?'shielded':'visible'}`;
 filterButtons();renderProgress();renderList();renderRoadmap();
}
function renderProgress(){
 const pct=Math.round(state.done.length/trophies.length*100);$('#ringValue').textContent=pct+'%';$('#ring').style.background=`conic-gradient(var(--accent) ${pct*3.6}deg,#d8d2c6 0)`;
 const grades=['platinum','gold','silver','bronze'];$('#tierProgress').innerHTML=grades.map(g=>{const all=trophies.filter(t=>t.grade===g),n=all.filter(t=>state.done.includes(t.id)).length;return `<div class="tier"><div class="tier-top"><span>${g}</span><span>${n}/${all.length}</span></div><div class="tier-bar"><i style="width:${n/all.length*100}%"></i></div></div>`}).join('');
}
function renderList(){
 if(!trophies.length)return;const q=$('#search').value.toLowerCase();
 const list=trophies.filter(t=>(state.grade==='all'||t.grade===state.grade)&&(state.kind==='all'||(state.kind==='missable'?t.missable:t.kind===state.kind))&&(!q||`${t.name} ${t.description} ${t.guide}`.toLowerCase().includes(q)));
 $('#resultCount').textContent=`SHOWING ${list.length} / 55`;
 $('#trophyList').innerHTML=list.map(t=>`<article class="trophy ${state.selected===t.id?'selected':''}" data-id="${t.id}"><input class="check" type="checkbox" ${state.done.includes(t.id)?'checked':''} aria-label="Mark ${t.name} complete"><div><h3 class="${state.spoilers&&t.hidden&&!state.done.includes(t.id)&&!state.revealed.includes(t.id)?'spoiled':''}">${title(t)}</h3><p>${desc(t)}</p><div class="badges">${t.missable?'<span class="badge missable">Missable</span>':''}${t.hidden?'<span class="badge">Hidden</span>':''}<span class="badge">${t.kind}</span></div></div><span class="grade">${t.grade}</span></article>`).join('')||'<p style="padding:30px">No trophies match this filter.</p>';
 $('#trophyList').querySelectorAll('.trophy').forEach(row=>{row.onclick=e=>{const id=+row.dataset.id;if(e.target.classList.contains('check')){state.done=e.target.checked?[...new Set([...state.done,id])]:state.done.filter(x=>x!==id);save();render();}else{state.selected=id;save();renderList();}}});
 renderDetail(trophies.find(t=>t.id===state.selected)||list[0]||trophies[0]);
}
function renderDetail(t){const shield=state.spoilers&&t.hidden&&!state.done.includes(t.id)&&!state.revealed.includes(t.id);$('#detail').innerHTML=`<span class="num">NO. ${String(t.id).padStart(2,'0')} · ${t.grade.toUpperCase()}</span><h2 class="${shield?'spoiled':''}">${title(t)}</h2><p class="official">${desc(t)}</p>${shield?`<button class="reveal" id="reveal">Reveal this trophy</button>`:''}<h4>FIELD NOTES</h4><p class="guide">${shield?'Guide withheld while spoiler shield is active.':t.guide}</p><h4>SOURCES</h4><div class="sources">${t.sources.map((s,i)=>`<a href="${s}" target="_blank" rel="noreferrer">${i+1}. ${new URL(s).hostname} ↗</a>`).join('')}</div>`;if(shield)$('#reveal').onclick=()=>{state.revealed.push(t.id);save();renderList();};}
function renderRoadmap(){$('#missableList').innerHTML=trophies.filter(t=>t.missable).map(t=>`<div class="warning-item"><b>${t.name}</b><span>${t.description}</span></div>`).join('');}
function exportProgress(){const blob=new Blob([JSON.stringify({schema:'vice-ledger/progress-v1',done:state.done,spoilers:state.spoilers,revealed:state.revealed},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vice-ledger-progress.json';a.click();URL.revokeObjectURL(a.href);}
function importProgress(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);state.done=(x.done||[]).filter(id=>trophies.some(t=>t.id===id));state.spoilers=!!x.spoilers;state.revealed=x.revealed||[];save();render();}catch{alert('That progress file is not valid.')}};r.readAsText(f);}
boot();
