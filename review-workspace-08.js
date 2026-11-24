
/* Review workspace: explicit decisions and source-hash-bound export. No automatic solver admission. */
const labels08={ordinary:"Простая структура",recovered:"Восстановленная структура","named-room":"Именованное помещение",parallel:"Несколько ресурсов",subgroup:"Явная подгруппа",elective:"Выборное / специальное",sport:"Спортивные занятия",incomplete:"Неоднозначные ресурсы"};
let state08={mode:"cells",course:1,filter:"complex",search:"",page:0,status:"idle",error:"",manifest:null,courseData:{},flows:null,decisions:{}};
const PAGE08=25;let token08=0;
function dataset08(){
 if(state08.mode==="cells")return state08.courseData[state08.course]?.records||[];
 if(state08.mode==="flows")return state08.flows?.flows||[];
 return state08.manifest?.conflicts||[];
}
function fingerprint08(item){
 if(state08.mode==="cells")return state08.courseData[state08.course]?.hash||"";
 return (item.evidence||item.events?.flatMap(e=>e.evidence)||[]).map(x=>(x.hash||x.sourceHash)+":"+x.id).sort().join("|");
}
function reviewKey08(item){return state08.mode+":"+item.id}
function filtered08(){
 let q=state08.search.toLocaleLowerCase("ru-RU").trim();
 return dataset08().filter(x=>{
  if(state08.mode==="cells"&&state08.filter==="complex"&&x.kind==="ordinary")return false;
  if(state08.mode==="cells"&&!["all","complex","pending"].includes(state08.filter)&&x.kind!==state08.filter)return false;
  if(state08.filter==="pending"&&state08.decisions[reviewKey08(x)])return false;
  return !q||JSON.stringify(x).toLocaleLowerCase("ru-RU").includes(q)
 })
}
function reviewEvidence08(x){
 let evidence=state08.mode==="cells"?[{id:x.id,page:x.page,raw:x.raw,source:instituteCatalog.groups.find(g=>g.course===state08.course&&g.page===x.page)?.url}]:x.evidence||x.events?.flatMap(e=>e.evidence)||[];
 return evidence.map(e=>'<div style="margin:6px 0"><a target="_blank" rel="noopener" href="'+esc(e.source)+'#page='+e.page+'">'+esc(e.id)+'</a><div style="white-space:pre-line">'+esc(e.raw)+'</div></div>').join("")
}
function reviewItem08(x,i){
 let key=reviewKey08(x),d=state08.decisions[key]||{},status=d.status||"pending";
 let description=state08.mode==="cells"?esc(labels08[x.kind])+" · "+esc(x.reason):state08.mode==="flows"?esc(x.title)+" · "+esc(x.groups.join(", "))+" · "+esc(x.teacher)+" · "+esc(x.room):esc(x.key[3])+" · "+esc(days[x.key[1]])+" "+esc(times[x.key[2]])+" · половина "+(x.key[0]+1);
 let resources=state08.mode==="cells"&&x.resources.length?'<p class="muted">Извлечённые обозначения: '+x.resources.map(r=>esc(r.teacher+" / "+r.room)+(r.nameBoundaryAmbiguous?" (граница имени неясна)":"")).join("; ")+'</p>':"";
 return '<details><summary><b>'+esc(x.id)+'</b> · '+description+' · '+esc(status==="pending"?"не рассмотрено":status==="confirmed"?"подтверждено проверяющим":status==="correction"?"нужна коррекция":"не разрешено")+'</summary><div style="padding:8px"><p>'+description+'</p>'+resources+reviewEvidence08(x)+'<label>Решение проверяющего<select id="decision08-'+i+'">'+[["pending","Не рассмотрено"],["confirmed","Подтверждено по источнику"],["correction","Нужна коррекция"],["unresolved","Нельзя разрешить без дополнительных данных"]].map(([v,t])=>'<option value="'+v+'" '+(v===status?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>Основание / что необходимо исправить<textarea id="note08-'+i+'" rows="2" placeholder="Источник, дата, подтверждённые сведения">'+esc(d.note||"")+'</textarea></label><button data-decision08="'+i+'">Сохранить решение</button></div></details>'
}
function renderReview08(){
 let m=state08.manifest,list=filtered08(),pages=Math.max(1,Math.ceil(list.length/PAGE08));state08.page=Math.min(state08.page,pages-1);let items=list.slice(state08.page*PAGE08,(state08.page+1)*PAGE08);
 let filters=state08.mode==="cells"?["complex","all","pending",...Object.keys(labels08)]:["all","pending"];
 return '<section class="panel"><h2>Семантическая сверка · 83 очные группы</h2><p>Реестр содержит исходные записи, варианты общего потока и потенциальные конфликты. Подтверждение требует основания. Решения сохраняются в текущем сеансе и экспортируются; они не изменяют PDF и не передаются в решатель автоматически.</p>'+(m?'<div class="grid">'+Object.entries(m.counts).map(([k,v])=>'<div class="metric"><small>'+esc(labels08[k]||k)+'</small><strong>'+v+'</strong></div>').join("")+'</div><p>Возможные потоки: '+m.possibleFlows+' · потенциальные конфликты: '+m.conflicts.length+'</p>':"")+'<div class="row"><label>Режим<select id="mode08">'+[["cells","Ячейки"],["flows","Возможные потоки"],["conflicts","Потенциальные конфликты"]].map(([k,v])=>'<option value="'+k+'" '+(state08.mode===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+(state08.mode==="cells"?'<label>Курс<select id="course08">'+[1,2,3,4,5].map(v=>'<option value="'+v+'" '+(state08.course===v?"selected":"")+'>'+v+'</option>').join("")+'</select></label>':"")+'<label>Фильтр<select id="filter08">'+filters.map(v=>'<option value="'+v+'" '+(state08.filter===v?"selected":"")+'>'+esc(labels08[v]||({complex:"Сложные записи",all:"Все",pending:"Не рассмотренные"})[v])+'</option>').join("")+'</select></label><label>Поиск<input id="search08" value="'+esc(state08.search)+'"></label><button id="load08">Загрузить</button></div><p role="status">'+(state08.status==="loading"?"Загрузка…":esc(state08.error))+'</p><p>Записей по фильтру: '+list.length+' · решений в журнале: '+Object.keys(state08.decisions).length+'</p>'+items.map(reviewItem08).join("")+'<div class="row"><button id="prev08" '+(state08.page===0?"disabled":"")+'>Назад</button><span>'+(state08.page+1)+' / '+pages+'</span><button id="next08" '+(state08.page>=pages-1?"disabled":"")+'>Далее</button><button id="exportDecisions08">Экспорт журнала JSON</button><label>Импорт журнала<input id="importDecisions08" type="file" accept=".json"></label></div><p class="muted">Не вносите непубличные персональные сведения. Сверка не подтверждает актуальность замен в электронном журнале и не снимает требования к полному составу подгрупп, маршрутам и доступности ресурсов.</p></section>'
}
async function getJson08(path){let r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status+" — "+path);return r.json()}
async function load08(){
 let t=++token08,mode=state08.mode,course=state08.course;state08.status="loading";state08.error="";render();
 try{
  let m=state08.manifest||await getJson08("data/review-08/manifest.json");if(m.version!=="0.8"||!Array.isArray(m.courses))throw Error("Некорректный манифест");
  let d=mode==="cells"?(state08.courseData[course]||await getJson08("data/review-08/course-"+course+".json")):mode==="flows"?(state08.flows||await getJson08("data/review-08/flows.json")):null;
  if(mode==="cells"&&(!Array.isArray(d.records)||d.hash!==m.courses.find(c=>c.course===course)?.hash))throw Error("Версия источника не совпадает");
  if(mode==="flows"&&!Array.isArray(d.flows))throw Error("Некорректные потоки");
  if(t!==token08)return;state08.manifest=m;if(mode==="cells")state08.courseData[course]=d;if(mode==="flows")state08.flows=d;state08.status="ready";
 }catch(e){if(t!==token08)return;state08.status="error";state08.error=e.message}
 if(visible16("review08"))render()
}
function bind08(){
 on("load08","click",load08);on("mode08","change",e=>{state08.mode=e.target.value;state08.filter=state08.mode==="cells"?"complex":"all";state08.page=0;load08()});on("course08","change",e=>{state08.course=+e.target.value;state08.page=0;load08()});
 on("filter08","change",e=>{state08.filter=e.target.value;state08.page=0;render()});on("search08","change",e=>{state08.search=e.target.value;state08.page=0;render()});on("prev08","click",()=>{state08.page=Math.max(0,state08.page-1);render()});on("next08","click",()=>{state08.page++;render()});
 const list=filtered08().slice(state08.page*PAGE08,(state08.page+1)*PAGE08);
 document.querySelectorAll("[data-decision08]").forEach(b=>b.onclick=()=>{let i=+b.dataset.decision08,x=list[i];if(!x)return;let status=$("decision08-"+i).value,note=$("note08-"+i).value.trim();if(status!=="pending"&&!note){state08.error="Укажите основание решения.";render();return}let k=reviewKey08(x);if(status==="pending")delete state08.decisions[k];else state08.decisions[k]={status,note,sourceFingerprint:fingerprint08(x),recordedAt:new Date().toISOString()};state08.error="Решение сохранено в журнале.";render()});
 on("exportDecisions08","click",()=>download("kantor-review-decisions.json",JSON.stringify({version:"0.8",decisions:state08.decisions},null,2),"application/json"));
 on("importDecisions08","change",async e=>{try{
  let j=JSON.parse(await e.target.files[0].text());if(j.version!=="0.8"||!j.decisions||Array.isArray(j.decisions)||typeof j.decisions!=="object")throw Error("Некорректный журнал");
  // Validate each import against source identifiers and fingerprints, not merely file shape.
  let m=state08.manifest||await getJson08("data/review-08/manifest.json"),allowed=new Map();
  for(let c of m.courses){let d=state08.courseData[c.course]||await getJson08("data/review-08/course-"+c.course+".json");if(d.hash!==c.hash)throw Error("Несовпадение источника");for(let r of d.records)allowed.set("cells:"+r.id,d.hash)}
  let f=state08.flows||await getJson08("data/review-08/flows.json");
  const fp=x=>(x.evidence||x.events?.flatMap(e=>e.evidence)||[]).map(y=>(y.hash||y.sourceHash)+":"+y.id).sort().join("|");
  for(let x of f.flows)allowed.set("flows:"+x.id,fp(x));for(let x of m.conflicts)allowed.set("conflicts:"+x.id,fp(x));
  let accepted={},skipped=0;
  for(let [k,v] of Object.entries(j.decisions)){if(allowed.has(k)&&v&&allowed.get(k)===v.sourceFingerprint&&["confirmed","correction","unresolved"].includes(v.status)&&typeof v.note==="string"&&v.note.trim())accepted[k]=v;else skipped++}
  state08.decisions={...state08.decisions,...accepted};state08.error="Импортировано "+Object.keys(accepted).length+"; отклонено "+skipped+".";
 }catch(e){state08.error=e.message}render()})
}
