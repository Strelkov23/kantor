/* 0.29: calendar readiness and independent, single-move opportunities.
 * Never a joint feasible timetable; unknown external commitments remain unknown.
 */
const starts29=[540,655,780,895,1010];
const overlap29=(a,b)=>a.start<b.end&&b.start<a.end;
const order29=(a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id);
const sorted29=a=>a.slice().sort(order29);
const unique29=a=>[...new Map(a.map(x=>[x.signature,x])).values()];
const collision29=a=>{const s=sorted29(a);return s.some((x,i)=>i>0&&s.slice(0,i).some(y=>overlap29(x,y)))};
function readiness29(m,files,catalog,aliases){
 if(m.complete!==true||m.groups.length!==83||files.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||m.groups.some(g=>!catalog.groups.some(c=>c.id===g.group)))throw Error("Нужны все 83 группы");
 const cards=[],groups=[],byDate=new Map(),byGroup=new Map(),byTeacher=new Map(),byRoom=new Map();
 const append=(map,key,x)=>{if(!map.has(key))map.set(key,[]);map.get(key).push(x)};
 const fields=["cards","unknownTime","unknownTeacher","unknownRoom","unknownBuilding","nonstandard","sharedOrRepeated","eligible"];
 const totals=Object.fromEntries(fields.map(k=>[k,0]));
 for(let i=0;i<83;i++){
  const g=m.groups[i],f=files[i];if(f.checked!==m.checked||f.group!==g.group||f.course!==g.course||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок");
  const row={group:g.group,course:g.course,...Object.fromEntries(fields.map(k=>[k,0]))};groups.push(row);
  for(let j=0;j<f.comparisons.length;j++){
   const x=f.comparisons[j],c=x.calendar,t=x.timing;
   if(typeof c.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!Number.isFinite(Date.parse(c.date)))throw Error("Неверная дата");
   const teacher=teacherClass26(c.teachers),room=roomClass18(norm26(c.rooms),catalog.buildings),building=classifyLocation28(c.rooms,catalog.buildings,aliases.aliases,"strict").building;
   const time=validTime25(t),standard=time&&starts29.includes(t.start)&&t.end-t.start===95;
   const q={id:g.file+":"+j,group:g.group,course:g.course,date:c.date,start:t?.start,end:t?.end,subject:norm26(c.subject),type:norm26(c.type),teacher:teacher.id||null,teacherName:norm26(c.teachers),room:room.room||null,roomKey:room.room?key26(room.room):null,roomLabel:norm26(c.rooms),building,time,standard,signature:JSON.stringify([c.date,t?.start,t?.end,key26(c.subject),key26(c.type),key26(c.teachers),key26(c.rooms)])};
   cards.push(q);row.cards++;if(!time)row.unknownTime++;if(!q.teacher)row.unknownTeacher++;if(!q.room)row.unknownRoom++;if(!building)row.unknownBuilding++;if(time&&!standard)row.nonstandard++;
   append(byDate,q.date,q);append(byGroup,q.group+"|"+q.date,q);if(q.teacher)append(byTeacher,q.teacher+"|"+q.date,q);if(q.roomKey)append(byRoom,q.roomKey+"|"+q.date,q);
  }
 }
 const signatures=new Map();for(const q of cards)append(signatures,q.signature,q);
 const rows=new Map(groups.map(g=>[g.group,g]));
 for(const q of cards){
  q.shared=signatures.get(q.signature).length>1;
  q.eligible=!!(q.standard&&q.teacher&&q.room&&q.building&&q.subject&&q.type&&!q.shared);
  if(q.shared)rows.get(q.group).sharedOrRepeated++;
  if(q.eligible)rows.get(q.group).eligible++;
 }
 for(const g of groups)for(const k of fields)totals[k]+=g[k];
 if(totals.cards!==m.totals.cards)throw Error("Не совпадает число карточек");
 return {checked:m.checked,groups,totals,cards,byDate,byGroup,byTeacher,byRoom};
}
function dayScore29(a){
 const m=dayMetrics25(a.map(x=>({timing:{start:x.start,end:x.end}})),"");
 let cross=0,unknown=0;const s=sorted29(a);
 for(let i=1;i<s.length;i++){const x=s[i-1],y=s[i];if(!x.building||!y.building)unknown++;else if(x.building!==y.building)cross++}
 return {windows:m.windows,span:m.span,breakMinutes:m.breakMinutes,cross,unknown};
}
// Preserve order of all observed lessons and do not shorten cross-building or unknown
// transitions. For same-building transitions require at least 15 minutes if shortened.
function routeSafe29(before,after){
 const a=sorted29(before),b=sorted29(after);
 if(a.length!==b.length||a.some((x,i)=>x.id!==b[i].id))return false;
 for(let i=1;i<a.length;i++){
  const old=a[i].start-a[i-1].end,now=b[i].start-b[i-1].end;
  if(now>=old)continue;
  if(!b[i].building||!b[i-1].building||b[i].building!==b[i-1].building||now<15)return false;
 }
 return true;
}
function candidates29(d){
 const results=[],reasons={},groupCounts=new Map(d.groups.map(g=>[g.group,0]));
 const skip=k=>reasons[k]=(reasons[k]||0)+1;
 let attempts=0,eligible=0;
 for(const q of d.cards){
  if(!q.eligible){skip("notEligible");continue}eligible++;
  const g=d.byGroup.get(q.group+"|"+q.date),t=unique29(d.byTeacher.get(q.teacher+"|"+q.date)),r=d.byRoom.get(q.roomKey+"|"+q.date),date=d.byDate.get(q.date);
  if(g.some(x=>!x.time)||t.some(x=>!x.time)||r.some(x=>!x.time)||collision29(g)||collision29(t)||r.some(x=>x.id!==q.id&&overlap29(x,q))){skip("sourceOverlapOrTime");continue}
  const gb=dayScore29(g),tb=dayScore29(t);
  if(!gb.windows){skip("noGroupWindow");continue}
  for(const start of starts29){
   if(start===q.start)continue;attempts++;
   const next={...q,start,end:start+95};
   if(g.some(x=>x.id!==q.id&&overlap29(x,next))||t.some(x=>x.id!==q.id&&overlap29(x,next))||r.some(x=>x.id!==q.id&&overlap29(x,next))){skip("occupied");continue}
   const ga=g.map(x=>x.id===q.id?next:x),ta=t.map(x=>x.id===q.id?next:x);
   if(!routeSafe29(g,ga)||!routeSafe29(t,ta)){skip("orderOrTravel");continue}
   const gs=dayScore29(ga),ts=dayScore29(ta);
   if(gs.windows>=gb.windows||gs.span>gb.span||ts.windows>tb.windows||ts.span>tb.span){skip("noJointImprovement");continue}
   // Ambiguous records are not treated as free. Reject explicit matching tokens;
   // other unresolved labels are counted and disclosed as residual uncertainty.
   const at=date.filter(x=>x.id!==q.id&&(!x.time||overlap29(x,next)||overlap29(x,q)));
   const surname=q.teacher.split(" ")[0];
   if(at.some(x=>!x.teacher&&key26(x.teacherName).split(/[^\p{L}-]+/u).includes(surname)||!x.room&&key26(x.roomLabel).split(/[^\p{L}\p{N}-]+/u).includes(key26(q.room)))){skip("ambiguousMatchingResource");continue}
   const unresolved=at.filter(x=>!x.time||!x.teacher||!x.room).length;
   results.push({id:q.id,group:q.group,course:q.course,date:q.date,subject:q.subject,type:q.type,teacher:q.teacherName,room:q.room,oldStart:q.start,oldEnd:q.end,newStart:start,newEnd:start+95,groupBefore:gb,groupAfter:gs,teacherBefore:tb,teacherAfter:ts,unresolved,groupDayBefore:sorted29(g).map(x=>({subject:x.subject,start:x.start,end:x.end,room:x.roomLabel,id:x.id})),groupDayAfter:sorted29(ga).map(x=>({subject:x.subject,start:x.start,end:x.end,room:x.roomLabel,id:x.id}))});
   groupCounts.set(q.group,groupCounts.get(q.group)+1);
  }
 }
 results.sort((a,b)=>(b.groupBefore.windows-b.groupAfter.windows)-(a.groupBefore.windows-a.groupAfter.windows)||(b.groupBefore.span-b.groupAfter.span)-(a.groupBefore.span-a.groupAfter.span)||a.unresolved-b.unresolved||a.group.localeCompare(b.group,"ru")||a.date.localeCompare(b.date)||a.oldStart-b.oldStart||a.newStart-b.newStart);
 const rejected=["occupied","orderOrTravel","noJointImprovement","ambiguousMatchingResource"].reduce((n,k)=>n+(reasons[k]||0),0);
 if(eligible!==d.totals.eligible||attempts!==rejected+results.length||results.length!==[...groupCounts.values()].reduce((a,b)=>a+b,0))throw Error("Нарушен баланс проверки вариантов");
 // Recheck each reported move against the original flat snapshot rather than relying
 // on the indexes used to generate it.
 for(const x of results)if(!auditMove29(d.cards,x))throw Error("Независимая проверка переноса не пройдена");
 return {checked:d.checked,eligible,attempts,reasons,results,groupCounts:Object.fromEntries(groupCounts)};
}
function auditMove29(cards,x){
 const q=cards.find(c=>c.id===x.id);
 if(!q||!q.eligible||q.date!==x.date||q.group!==x.group||q.subject!==x.subject||q.teacherName!==x.teacher||q.room!==x.room||q.start!==x.oldStart||q.end!==x.oldEnd||!starts29.includes(x.newStart)||x.newStart===q.start||x.newEnd-x.newStart!==q.end-q.start)return false;
 const day=cards.filter(c=>c.date===q.date),next={...q,start:x.newStart,end:x.newEnd};
 if(day.some(c=>c.id!==q.id&&c.time&&c.start<next.end&&next.start<c.end&&(c.group===q.group||c.teacher===q.teacher||c.roomKey===q.roomKey)))return false;
 const group=day.filter(c=>c.group===q.group),teacher=unique29(day.filter(c=>c.teacher===q.teacher));
 for(const [a,oldScore,newScore] of [[group,x.groupBefore,x.groupAfter],[teacher,x.teacherBefore,x.teacherAfter]]){
  const b=a.map(c=>c.id===q.id?next:c);
  if(collision29(a)||collision29(b)||!routeSafe29(a,b)||JSON.stringify(dayScore29(a))!==JSON.stringify(oldScore)||JSON.stringify(dayScore29(b))!==JSON.stringify(newScore))return false;
 }
 return x.groupAfter.windows<x.groupBefore.windows&&x.groupAfter.span<=x.groupBefore.span&&x.teacherAfter.windows<=x.teacherBefore.windows&&x.teacherAfter.span<=x.teacherBefore.span;
}
let opportunities29={data:null,readiness:null,snapshot:null,loading:false,error:"",course:"all",group:"",selected:"",view:"moves"};
async function loadOpportunities29(){
 const s=opportunities29;if(s.loading)return;s.loading=true;s.error="";render();
 try{const snap=await calendarSnapshot27(true),[files,aliases]=await Promise.all([calendarFiles27(snap),getJson08("data/location-aliases-14.json")]);const ready=readiness29(snap.manifest,files,instituteCatalog,aliases),data=candidates29(ready);s.readiness=ready;s.data=data;s.snapshot=snap;s.selected="";prepareJoint30(ready,data);prepareReport30(snap,files,aliases,ready,data)}catch(e){s.error=e.message}
 s.loading=false;if(visible16("scenarios"))render();
}
function opportunityRows29(){let s=opportunities29;return (s.data?.results||[]).filter(x=>(s.course==="all"||x.course===+s.course)&&key26(x.group).includes(key26(s.group)))}
function renderOpportunities29(){
 const s=opportunities29,d=s.data,r=s.readiness;
 let html='<section class="panel"><div class="eyebrow23">Все 83 группы · предварительная проверка</div><h2>Что можно изменить в действующем расписании?</h2><p>Найдите отдельные переносы пары в пределах того же дня, которые сокращают окна группы без ухудшения наблюдаемых окон и длительности дня преподавателя. Проверка учитывает занятые интервалы группы, преподавателя и аудитории во всём снимке института.</p><div class="row"><button class="primary" id="runOpportunities29" '+(s.loading?"disabled":"")+'>'+(s.loading?"Проверяем 83 группы…":d?"Пересчитать":"Найти возможные переносы")+'</button><button data-tab="baseline09">Анализ исходного расписания</button></div><p role="status">'+esc(s.error)+'</p><p class="notice">Это независимые предложения для ручной проверки, а не готовое расписание. Не объединяйте их без повторного расчёта. Неизвестны занятия других институтов, реальная доступность, состав подгрупп, вместимость и требования учебной программы.</p>';
 if(!d)return html+'</section>';
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 html+='<div class="source23">'+esc(calendarStatus27(s.snapshot))+'</div><div class="row"><button data-view29="moves" aria-pressed="'+(s.view==="moves")+'" class="'+(s.view==="moves"?"primary":"")+'">Возможные переносы</button><button data-view29="readiness" aria-pressed="'+(s.view==="readiness")+'" class="'+(s.view==="readiness"?"primary":"")+'">Готовность данных</button></div><div class="row"><label>Курс<select id="course29">'+["all",1,2,3,4,5].map(v=>'<option value="'+v+'" '+(String(v)===s.course?"selected":"")+'>'+(v==="all"?"Все":v)+'</option>').join("")+'</select></label><label>Группа<input id="group29" value="'+esc(s.group)+'"></label><button id="export29">Скачать JSON</button><button id="csv29">Скачать CSV</button></div>';
 if(s.view==="readiness"){
  const t=r.totals,gs=r.groups.filter(x=>(s.course==="all"||x.course===+s.course)&&key26(x.group).includes(key26(s.group)));
  return html+'<h3>Что известно для расчёта?</h3><div class="grid">'+metric("Карточки",t.cards)+metric("Первично пригодны для проверки",t.eligible)+metric("Неоднозначное ФИО",t.unknownTeacher)+metric("Неоднозначная аудитория",t.unknownRoom)+metric("Неизвестный корпус",t.unknownBuilding)+metric("Повторные сигнатуры",t.sharedOrRepeated)+metric("Нестандартное время",t.nonstandard)+metric("Неизвестное время",t.unknownTime)+'</div><p>Причины могут пересекаться; их нельзя складывать. Пригодность означает только наличие одиночных меток и стандартного времени, а не подтверждённую возможность переноса.</p><div class="scroll"><table><tr><th>Группа</th><th>Карточки</th><th>Первично пригодны</th><th>ФИО неизвестно</th><th>Аудитория неизвестна</th><th>Повторы</th><th>Нестандартные / неизвестные интервалы</th><th>Предложения</th></tr>'+gs.map(g=>'<tr><td>'+esc(g.group)+'</td><td>'+g.cards+'</td><td>'+g.eligible+'</td><td>'+g.unknownTeacher+'</td><td>'+g.unknownRoom+'</td><td>'+g.sharedOrRepeated+'</td><td>'+(g.nonstandard+g.unknownTime)+'</td><td>'+d.groupCounts[g.group]+'</td></tr>').join("")+'</table></div><p class="muted">Для полноценного решателя нужны также идентификаторы людей, потоки и подгруппы, внешние назначения, подтверждённая доступность, вместимость, оборудование, учебные требования и измеренные переходы. Ни один из этих наборов не считается автоматически заполненным.</p></section>';
 }
 const rows=opportunityRows29(),sel=rows.find(x=>x.id+"|"+x.newStart===s.selected)||((s.selected&&d.results.find(x=>x.id+"|"+x.newStart===s.selected))||null);
 const day=(a,id)=>a.map(x=>'<div class="compare-lesson24 '+(x.id===id?"changed24":"")+'"><strong>'+clock26(x.start)+'</strong><div><b>'+esc(x.subject)+'</b><small>'+clock26(x.start)+'–'+clock26(x.end)+' · '+esc(x.room)+'</small></div></div>').join("");
 return html+'<div class="grid">'+metric("Проверено вариантов времени",d.attempts)+metric("Независимые предложения",d.results.length)+metric("Группы с предложениями",Object.values(d.groupCounts).filter(n=>n>0).length)+metric("По фильтру",rows.length)+'</div><p>Сохраняются день, длительность, дисциплина, преподаватель, аудитория и порядок всех известных занятий. Не сокращаются интервалы между разными или неизвестными корпусами; при сокращении интервала внутри корпуса оставляется не менее 15 минут (консервативное предположение, не измерение).</p><div class="scroll"><table><tr><th>Группа и дата</th><th>Дисциплина</th><th>Было → стало</th><th>Окна группы</th><th>Длительность дня, мин</th><th>Неясные карточки в обоих интервалах</th></tr>'+rows.slice(0,100).map(x=>'<tr><td><button data-move29="'+esc(x.id+"|"+x.newStart)+'">'+esc(x.group)+'</button><br>'+esc(x.date)+'</td><td>'+esc(x.subject)+'</td><td>'+clock26(x.oldStart)+' → '+clock26(x.newStart)+'</td><td>'+x.groupBefore.windows+' → '+x.groupAfter.windows+'</td><td>'+x.groupBefore.span+' → '+x.groupAfter.span+'</td><td>'+x.unresolved+'</td></tr>').join("")+'</table></div><p class="muted">'+(rows.length?"Показано "+Math.min(100,rows.length)+" из "+rows.length+". Выберите группу в строке для подробностей.":"Нет предложений при заданных ограничениях и фильтре. Это не доказательство оптимальности.")+'</p>'+(sel?'<section class="panel" id="moveDetail29"><h3>'+esc(sel.group+" · "+sel.date+" · "+sel.subject)+'</h3><p>'+esc(sel.teacher+" · "+sel.room)+'</p><p>Окна преподавателя: '+sel.teacherBefore.windows+' → '+sel.teacherAfter.windows+'; длительность его наблюдаемого дня: '+sel.teacherBefore.span+' → '+sel.teacherAfter.span+' мин. Неясных карточек в исходном и новом интервалах: '+sel.unresolved+'.</p><div class="compare-grid24"><div><h4>Исходное</h4>'+day(sel.groupDayBefore,sel.id)+'</div><div><h4>Предложение</h4>'+day(sel.groupDayAfter,sel.id)+'</div></div><button data-original29="'+esc(sel.group)+'" data-date29="'+esc(sel.date)+'">Открыть исходный день</button>'+renderUncertainty30(sel)+'</section>':"")+'<details><summary>Почему другие варианты исключены?</summary><p>Счётчики разных этапов (карточки и попытки переноса), не суммируются.</p><div class="scroll"><table>'+Object.entries(d.reasons).map(([k,n])=>'<tr><td>'+esc(({notEligible:"Непригодная карточка",sourceOverlapOrTime:"Исходное пересечение или неизвестное время",noGroupWindow:"Нет полного окна",occupied:"Занятый интервал",orderOrTravel:"Порядок или время перехода",noJointImprovement:"Нет совместного улучшения",ambiguousMatchingResource:"Неоднозначная запись того же ресурса"})[k]||k)+'</td><td>'+n+'</td></tr>').join("")+'</table></div></details></section>';
}
function bindOpportunities29(){
 const s=opportunities29;
 on("runOpportunities29","click",loadOpportunities29);
 for(const [id,k] of [["course29","course"],["group29","group"]])on(id,"change",e=>{s[k]=e.target.value;s.selected="";render()});
 document.querySelectorAll("[data-view29]").forEach(b=>b.onclick=()=>{s.view=b.dataset.view29;render()});
 document.querySelectorAll("[data-move29]").forEach(b=>b.onclick=()=>{s.selected=b.dataset.move29;render();$("moveDetail29")?.scrollIntoView?.({block:"start"})});
 document.querySelectorAll("[data-original29]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.original29,b.dataset.date29)});
 const readinessRows=()=>s.readiness.groups.filter(g=>(s.course==="all"||g.course===+s.course)&&key26(g.group).includes(key26(s.group)));
 on("export29","click",()=>{if(!s.data)return;download("kantor-preliminary-"+s.view+".json",JSON.stringify({version:"0.29",checked:s.data.checked,status:"independent-review-only",assumptions:{sameDay:true,preserveOrder:true,minShortenedSameBuildingGap:15,externalAvailability:"unknown"},totals:s.readiness.totals,reasons:s.data.reasons,rows:s.view==="moves"?opportunityRows29():readinessRows()},null,2),"application/json")});
 on("csv29","click",()=>{if(!s.data)return;const ready=s.view==="readiness",cols=ready?["group","course","cards","eligible","unknownTime","unknownTeacher","unknownRoom","unknownBuilding","nonstandard","sharedOrRepeated"]:["group","course","date","subject","teacher","room","oldStart","newStart","groupWindowsBefore","groupWindowsAfter","groupSpanBefore","groupSpanAfter","teacherWindowsBefore","teacherWindowsAfter","teacherSpanBefore","teacherSpanAfter","unresolved"],rows=ready?readinessRows():opportunityRows29().map(x=>({...x,groupWindowsBefore:x.groupBefore.windows,groupWindowsAfter:x.groupAfter.windows,groupSpanBefore:x.groupBefore.span,groupSpanAfter:x.groupAfter.span,teacherWindowsBefore:x.teacherBefore.windows,teacherWindowsAfter:x.teacherAfter.windows,teacherSpanBefore:x.teacherBefore.span,teacherSpanAfter:x.teacherAfter.span}));download("kantor-preliminary-"+s.view+".csv","\ufeff"+[[...cols,"snapshot","status"],...rows.map(x=>[...cols.map(k=>x[k]),s.data.checked,"review-only"])].map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
