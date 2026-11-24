/* 0.52: compare calendar versions without changing the active optimization snapshot. */
const updates52={busy:false,latest:null,diff:null,msg:"",lastCheck:0,group:"all",page:0,token:0,started:false,details:false};
function calendarRows52(snap,files){
 if(files.length!==snap.manifest.groups.length)throw Error("Неполный снимок");
 const rows=[];
 for(let i=0;i<files.length;i++){
  const f=files[i],g=snap.manifest.groups[i];
  if(f.group!==g.group||f.checked!==snap.manifest.checked||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок");
  for(const x of f.comparisons){const c=x.calendar,t=x.timing||{};rows.push({group:g.group,date:c.date,subject:String(c.subject??""),type:String(c.type??""),teacher:String(c.teachers??""),room:String(c.rooms??""),start:t.start??null,end:t.end??null,week:String(c.weekLabel??""),sourceStatus:String(x.status??"")})}
 }
 return rows;
}
const rowKey52=q=>JSON.stringify([q.group,q.date,q.subject,q.type,q.teacher,q.room,q.start,q.end,q.week].map(v=>typeof v==="string"?v.trim().replace(/\s+/gu," ").toLocaleLowerCase("ru"):v));
function diffCalendar52(oldRows,newRows){
 const counts=new Map(),oldBy=new Map(),newBy=new Map(),add=(m,q)=>{const k=rowKey52(q);if(!m.has(k))m.set(k,[]);m.get(k).push(q)};
 for(const q of oldRows)add(oldBy,q);for(const q of newRows)add(newBy,q);
 const removed=[],added=[];let unchanged=0,sourceChanged=0;
 for(const k of new Set([...oldBy.keys(),...newBy.keys()])){
  const a=(oldBy.get(k)||[]).slice(),b=(newBy.get(k)||[]).slice(),n=Math.min(a.length,b.length);unchanged+=n;
  // First pair identical source statuses, then pair remaining cards. Unpaired
  // records must retain the actual unmatched source status, not sorted position.
  const byStatus=new Map(),leftA=[],leftB=[];
  for(const q of a){if(!byStatus.has(q.sourceStatus))byStatus.set(q.sourceStatus,[]);byStatus.get(q.sourceStatus).push(q)}
  for(const q of b){const bucket=byStatus.get(q.sourceStatus);if(bucket?.length)bucket.pop();else leftB.push(q)}
  for(const bucket of byStatus.values())leftA.push(...bucket);
  leftA.sort((x,y)=>x.sourceStatus.localeCompare(y.sourceStatus));leftB.sort((x,y)=>x.sourceStatus.localeCompare(y.sourceStatus));
  const changed=Math.min(leftA.length,leftB.length);sourceChanged+=changed;
  removed.push(...leftA.slice(changed));added.push(...leftB.slice(changed));
 }
 const dateBounds=rows=>{const d=rows.map(x=>x.date).sort();return {from:d[0]||null,to:d.at(-1)||null}},oldPeriod=dateBounds(oldRows),newPeriod=dateBounds(newRows);
 const oldDates=new Set(oldRows.map(q=>JSON.stringify([q.group,q.date]))),newDates=new Set(newRows.map(q=>JSON.stringify([q.group,q.date])));
 for(const [kind,rows] of [["removed",removed],["added",added]])for(const q of rows){if(!counts.has(q.group))counts.set(q.group,{group:q.group,added:0,removed:0,sharedAdded:0,sharedRemoved:0});const r=counts.get(q.group);r[kind]++;if(oldDates.has(JSON.stringify([q.group,q.date]))&&newDates.has(JSON.stringify([q.group,q.date])))r[kind==="added"?"sharedAdded":"sharedRemoved"]++}
 if(oldRows.length!==unchanged+removed.length||newRows.length!==unchanged+added.length)throw Error("Нарушен баланс сравнения");
 const rows=[...removed.map(q=>({...q,kind:"removed",shared:newDates.has(JSON.stringify([q.group,q.date]))})),...added.map(q=>({...q,kind:"added",shared:oldDates.has(JSON.stringify([q.group,q.date]))}))].sort((a,b)=>a.date.localeCompare(b.date)||a.group.localeCompare(b.group,"ru",{numeric:true})||(a.start??9999)-(b.start??9999)||a.kind.localeCompare(b.kind));
 return {oldCount:oldRows.length,newCount:newRows.length,unchanged,sourceChanged,added:added.length,removed:removed.length,oldPeriod,newPeriod,groups:[...counts.values()].sort((a,b)=>b.added+b.removed-a.added-a.removed||a.group.localeCompare(b.group,"ru")),rows};
}
async function checkUpdates52(manual=false){
 const s=updates52,o=opportunities29,base=o.snapshot;if(!base||o.loading||s.busy||!manual&&Date.now()-s.lastCheck<15*60000)return;
 s.busy=true;s.lastCheck=Date.now();s.msg="Проверяем наличие новой версии…";const token=++s.token;
 if(manual&&visible16("scenarios"))render();
 try{
  const latest=await calendarSnapshot27(true);if(token!==s.token||o.snapshot!==base)return;
  if(latest.warning){s.msg=latest.warning+" Текущий расчёт сохранён.";return}
  if(Date.parse(latest.manifest.checked)<=Date.parse(base.manifest.checked)){s.latest=null;s.diff=null;s.msg="Более новой версии не найдено.";return}
  const [a,b]=await Promise.all([calendarFiles27(base),calendarFiles27(latest)]);
  if(token!==s.token||o.snapshot!==base)return;
  s.diff=diffCalendar52(calendarRows52(base,a),calendarRows52(latest,b));s.latest=latest;s.group="all";s.page=0;s.msg="Доступен новый снимок. Текущий расчёт не изменён.";
 }catch(e){s.msg="Не удалось проверить обновление: "+e.message}
 finally{if(token===s.token){s.busy=false;if(visible16("scenarios")){if(manual)render();else refreshUpdatePanel52()}}}
}
function resetUpdates52(){const s=updates52;s.token++;s.busy=false;s.latest=null;s.diff=null;s.msg="";s.group="all";s.page=0;s.details=false;s.lastCheck=Date.now()}
function renderUpdates52(){
 const s=updates52,o=opportunities29;if(!o.snapshot)return "";
 const d=s.diff,latest=s.latest,fmt=v=>new Date(v).toLocaleString("ru-RU",{timeZone:"Europe/Moscow",dateStyle:"short",timeStyle:"short"});
 let h='<section class="panel update52" id="updatePanel52"><h3>Актуальность расписания</h3><p>Используется снимок от '+esc(fmt(o.snapshot.manifest.checked))+' (МСК). Пока страница открыта, наличие новых данных проверяется каждые 15 минут. Обновление исходных данных не применяется без вашего выбора.</p><div class="row"><button id="checkUpdates52" '+(s.busy||o.loading?"disabled":"")+'>'+ (s.busy?"Проверяем…":"Проверить новую версию")+'</button>'+(latest?'<button class="primary" id="applyUpdates52" '+(multi39.running||o.loading?"disabled":"")+'>Перейти на новый снимок</button>':"")+'</div><p role="status">'+esc(s.msg||"")+'</p>';
 if(!d||!latest)return h+'</section>';
 const shared=d.rows.filter(r=>r.shared).length,shown=d.rows.filter(r=>s.group==="all"||r.group===s.group),pages=Math.max(1,Math.ceil(shown.length/20));s.page=Math.min(s.page,pages-1);
 h+='<p><b>Новая версия:</b> '+esc(fmt(latest.manifest.checked))+' (МСК).</p><div class="grid">'+[["Совпавшие карточки",d.unchanged],["Появились в снимке",d.added],["Отсутствуют в новом снимке",d.removed],["Различия на общих датах группы",shared],["Изменился статус сверки",d.sourceChanged]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><p>Период: '+esc(d.oldPeriod.from+" – "+d.oldPeriod.to+" → "+d.newPeriod.from+" – "+d.newPeriod.to)+'.</p><p class="notice">Это разница двух наборов наблюдений, не список отмен или подтверждённых переносов. При сдвиге периода многие записи исчезают или появляются естественно. После применения нового снимка прежние модели и привязанные к нему ограничения нужно пересчитать; сначала скачайте протокол текущих моделей.</p><details id="detailsUpdates52" '+(s.details?"open":"") +'><summary>Посмотреть различия по группам</summary><label>Группа<select id="updateGroup52"><option value="all">Все</option>'+d.groups.map(g=>'<option value="'+esc(g.group)+'" '+(s.group===g.group?"selected":"")+'>'+esc(g.group+" (+ "+g.added+" / − "+g.removed+")")+'</option>').join("")+'</select></label><div class="scroll"><table><tr><th>Дата / группа</th><th>Запись</th><th>Разница</th></tr>'+shown.slice(s.page*20,s.page*20+20).map(q=>'<tr><td>'+esc(q.date+" · "+q.group)+'</td><td>'+esc((q.start===null?"—":clock26(q.start))+" · "+q.subject+" · "+q.type+" · "+q.teacher+" · "+q.room)+'</td><td>'+esc((q.kind==="added"?"Появилась":"Отсутствует")+(q.shared?" · общая дата":" · дата вне общего набора"))+'</td></tr>').join("")+'</table></div><div class="row"><button id="prevUpdates52" '+(!s.page?"disabled":"")+'>Назад</button><span>'+(s.page+1)+' / '+pages+'</span><button id="nextUpdates52" '+(s.page>=pages-1?"disabled":"")+'>Далее</button><button id="exportUpdates52">Скачать сравнение JSON</button></div></details></section>';return h;
}
function refreshUpdatePanel52(){const el=$("updatePanel52");if(!el)return;el.outerHTML=renderUpdates52();bindUpdates52()}
function bindUpdates52(){
 const s=updates52;
 on("detailsUpdates52","toggle",e=>{s.details=e.target.open});
 on("checkUpdates52","click",()=>checkUpdates52(true));
 on("applyUpdates52","click",()=>{if(s.latest&&!multi39.running&&!opportunities29.loading)loadOpportunities29(s.latest)});
 on("updateGroup52","change",e=>{s.group=e.target.value;s.page=0;s.details=true;refreshUpdatePanel52()});
 on("prevUpdates52","click",()=>{s.page=Math.max(0,s.page-1);s.details=true;refreshUpdatePanel52()});on("nextUpdates52","click",()=>{s.page++;s.details=true;refreshUpdatePanel52()});
 on("exportUpdates52","click",()=>{if(s.diff&&s.latest)download("kantor-calendar-difference.json",JSON.stringify({version:"0.52",old:opportunities29.snapshot.manifest.checked,new:s.latest.manifest.checked,method:"multiset of observed calendar records; no inferred cancellation or rescheduling",...s.diff},null,2),"application/json")});
}
function startUpdates52(){if(updates52.started)return;updates52.started=true;setInterval(()=>{if(!document.hidden&&visible16("scenarios"))checkUpdates52()},60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden&&visible16("scenarios"))checkUpdates52()})}
