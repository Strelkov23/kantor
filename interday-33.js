/* 0.33 — dated, single-card inter-day experiments. No official availability is inferred.
   Source and target are within the same explicitly verified academic week.
   Candidate dates are already active group days; teacher must already teach that date.
   All explicit component resources block placement; no positional pairing is assumed. */
function context33(ready,registry,weeks,files,manifest){
 if(!ready||!registry||!weeks||ready.checked!==registry.checked||ready.checked!==weeks.checked||manifest.checked!==ready.checked)throw Error("Несогласованные источники");
 if(weeks.cycle!=="verified-alternation")throw Error("Учебный цикл не подтверждён для всех групп");
 const byId=new Map(ready.cards.map(q=>[q.id,q])),occ=new Map(registry.occupancy.entries.map(q=>[q.id,q]));
 if(byId.size!==ready.cards.length||occ.size!==byId.size||ready.cards.some(q=>!occ.has(q.id)))throw Error("Несогласованный реестр ресурсов");
 const metadata=new Map(),teacherDays=new Map(),roomDays=new Map(),groupDays=new Map(),datesByGroup=new Map(),subjectWeeks=new Map(),dateCards=new Map();
 const add=(m,k,x)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(x)};
 const key=(v,date)=>JSON.stringify([v,date]);
 for(let i=0;i<files.length;i++){
  const f=files[i],g=manifest.groups[i];
  if(f.group!==g.group||f.checked!==manifest.checked)throw Error("Несогласованная группа");
  for(let j=0;j<f.comparisons.length;j++){
   const id=g.file+":"+j,x=f.comparisons[j],q=byId.get(id);
   if(!q||q.date!==x.calendar.date)throw Error("Не совпадают карточки");
   metadata.set(id,{weekLabel:labelType32(x.calendar.weekLabel),pdfStatus:x.status,pdfId:x.pdfId||null});
  }
 }
 for(const q of ready.cards){
  const o=occ.get(q.id);
  add(groupDays,key(q.group,q.date),q);add(dateCards,q.date,q);add(subjectWeeks,JSON.stringify([q.group,monday32(q.date),key26(q.subject)]),q);
  if(!datesByGroup.has(q.group))datesByGroup.set(q.group,new Set());
  datesByGroup.get(q.group).add(q.date);
  for(const t of o.knownTeachers)add(teacherDays,key(t,q.date),q);
  for(const r of o.knownRooms)add(roomDays,key(r,q.date),q);
 }
 return {ready,registry,weeks,byId,occ,metadata,teacherDays,roomDays,groupDays,datesByGroup,subjectWeeks,dateCards,key};
}
function scoreDays33(days){
 const sum={windows:0,span:0,activeDays:0,lessonMinutes:0,maxSpan:0,maxBlocks:0};
 for(const a of days){
  if(!a.length)continue;
  const r=dayMetrics25(a.map(x=>({timing:{start:x.start,end:x.end}})),"");
  if(!r.usable)return null;
  sum.activeDays++;sum.windows+=r.windows;sum.span+=r.span;sum.lessonMinutes+=r.lessonMinutes;sum.maxSpan=Math.max(sum.maxSpan,r.span);sum.maxBlocks=Math.max(sum.maxBlocks,r.blocks);
 }
 return sum;
}
// New adjacency is allowed only in the same identified building with >=15 minutes;
// an existing adjacent pair may retain its old gap, never shorten inter-building/unknown gaps.
function adjacency33(before,after){
 const old=new Map();
 for(const a of before){const s=sorted29(a);for(let i=1;i<s.length;i++)old.set(s[i-1].id+"|"+s[i].id,s[i].start-s[i-1].end)}
 for(const a of after){const s=sorted29(a);if(collision29(s))return false;
  for(let i=1;i<s.length;i++){
   const p=s[i-1],q=s[i],gap=q.start-p.end,prev=old.get(p.id+"|"+q.id);
   if(prev!==undefined&&gap>=prev)continue;
   if(!p.building||p.building!==q.building||gap<15)return false;
  }
 }
 return true;
}
function possibleResource33(ctx,q,newDate,start){
 const next={...q,date:newDate,start,end:start+95},o=ctx.occ.get(q.id),moved={...o,date:newDate,start,end:start+95},unclear=new Set();
 // Scan both original and target intervals against every explicit resource token.
 for(const v of [...(ctx.dateCards.get(q.date)||[]),...(newDate===q.date?[]:ctx.dateCards.get(newDate)||[])]){
  if(v.id===q.id)continue;
  const e=ctx.occ.get(v.id);
  const original=v.date===q.date&&(!v.time||overlap29(v,q));
  const target=v.date===newDate&&(!v.time||overlap29(v,next));
  if(!original&&!target)continue;
  if(possibleConflict31(e,original?o:moved).length)return {ok:false,reason:"explicit-resource"};
  const surname=q.teacher.split(" ")[0];
  if(e.unknownTeachers.some(t=>key26(t).split(/[^\p{L}-]+/u).includes(surname))||e.unknownRooms.some(r=>key26(r).split(/[^\p{L}\p{N}-]+/u).includes(q.roomKey)))return {ok:false,reason:"ambiguous-match"};
  if(!e.valid||!e.teacherComplete||!e.roomComplete)unclear.add(v.id);
 }
 return {ok:true,unresolved:[...unclear].sort()};
}
function verifyInterday33(ctx,q,date,start){
 if(!q?.eligible||!starts29.includes(start)||q.date===date||monday32(date)!==monday32(q.date))return {reason:"not-eligible"};
 const w=ctx.weeks.byGroup.get(q.group)?.find(v=>v.monday===monday32(q.date)),meta=ctx.metadata.get(q.id);
 if(!w||!["upper","lower"].includes(w.status)||!w.dates.includes(date)||!meta||![w.status,"both"].includes(meta.weekLabel)||meta.pdfStatus!=="text-and-room-match")return {reason:"week-or-source"};
 if(!ctx.datesByGroup.get(q.group)?.has(date))return {reason:"inactive-group-day"};
 const k=ctx.key;
 const ga=ctx.groupDays.get(k(q.group,q.date))||[],gb=ctx.groupDays.get(k(q.group,date))||[];
 const ta=unique29(ctx.teacherDays.get(k(q.teacher,q.date))||[]),tb=unique29(ctx.teacherDays.get(k(q.teacher,date))||[]);
 // Teacher must have observed assignments on target date. Multi-resource entries
 // cannot be converted into confirmed individual duty, so keep those days fixed.
 if(!tb.length||!ta.some(x=>x.id===q.id))return {reason:"inactive-teacher-day"};
 if([...ta,...tb].some(x=>!x.teacher||x.teacher!==q.teacher||!x.time)||[ga,gb,ta,tb].some(x=>x.some(c=>!c.time)||collision29(x)))return {reason:"ambiguous-or-overlap-day"};
 // Protect sequence of the same subject, including other weekdays of this week.
 const next={...q,date,start,end:start+95},position=x=>x.date+"|"+String(x.start).padStart(4,"0");
 const sign=(a,b)=>Math.sign(position(a).localeCompare(position(b)));
 if((ctx.subjectWeeks.get(JSON.stringify([q.group,w.monday,key26(q.subject)]))||[]).some(x=>x.id!==q.id&&(!x.time||sign(q,x)!==sign(next,x))))return {reason:"subject-order"};
 const afterG=[ga.filter(x=>x.id!==q.id),[...gb,next]],afterT=[ta.filter(x=>x.id!==q.id),[...tb,next]];
 if(!adjacency33([ga,gb],afterG)||!adjacency33([ta,tb],afterT))return {reason:"order-travel-or-overlap"};
 const G=scoreDays33([ga,gb]),T=scoreDays33([ta,tb]),G2=scoreDays33(afterG),T2=scoreDays33(afterT);
 if(!G||!T||!G2||!T2)return {reason:"invalid-time"};
 // No additional active days, no longer peak day, no extra windows or total span.
 for(const [a,b] of [[G,G2],[T,T2]])if(b.activeDays>a.activeDays||b.windows>a.windows||b.span>a.span||b.maxSpan>a.maxSpan||b.maxBlocks>a.maxBlocks||b.lessonMinutes!==a.lessonMinutes)return {reason:"worse-load"};
 if(G2.windows===G.windows&&G2.span===G.span&&G2.activeDays===G.activeDays)return {reason:"no-gain"};
 const resources=possibleResource33(ctx,q,date,start);
 if(!resources.ok)return {reason:resources.reason};
 return {move:{id:q.id,group:q.group,course:q.course,subject:q.subject,teacher:q.teacherName,room:q.room,weekType:w.status,weekStart:w.monday,oldDate:q.date,newDate:date,oldStart:q.start,oldEnd:q.end,newStart:start,newEnd:start+95,groupBefore:G,groupAfter:G2,teacherBefore:T,teacherAfter:T2,unresolved:resources.unresolved.length,unresolvedIds:resources.unresolved}};
}
function interday33(ctx){
 let attempts=0;const reasons={},moves=[];
 for(const q of ctx.ready.cards){
  if(!q.eligible)continue;
  for(const date of ctx.datesByGroup.get(q.group)||[]){
   if(date===q.date||monday32(date)!==monday32(q.date))continue;
   for(const start of starts29){
    attempts++;const r=verifyInterday33(ctx,q,date,start);
    if(r.move)moves.push(r.move);else reasons[r.reason]=(reasons[r.reason]||0)+1;
   }
  }
 }
 const cmp=(a,b)=>(b.groupBefore.activeDays-b.groupAfter.activeDays)-(a.groupBefore.activeDays-a.groupAfter.activeDays)||(b.groupBefore.windows-b.groupAfter.windows)-(a.groupBefore.windows-a.groupAfter.windows)||(b.groupBefore.span-b.groupAfter.span)-(a.groupBefore.span-a.groupAfter.span)||a.unresolved-b.unresolved||a.id.localeCompare(b.id)||a.newDate.localeCompare(b.newDate)||a.newStart-b.newStart;
 moves.sort(cmp);
 if(attempts!==moves.length+Object.values(reasons).reduce((n,v)=>n+v,0))throw Error("Баланс попыток");
 for(const x of moves){const r=verifyInterday33(ctx,ctx.byId.get(x.id),x.newDate,x.newStart);if(!r.move||JSON.stringify(r.move)!==JSON.stringify(x))throw Error("Повторная проверка не пройдена")}
 return {checked:ctx.ready.checked,attempts,reasons,moves};
}
let inter33={data:null,error:"",context:null,source:null,week:"all",course:"all",strict:false,selected:"",running:false,token:0};
function prepareInterday33(snap,files){
 const s=inter33;s.token++;s.running=false;s.data=null;s.context=null;s.error="";s.selected="";s.source=snap;
 try{s.context=context33(opportunities29.readiness,review31.data,week32.data,files,snap.manifest)}catch(e){s.error=e.message}
}
function rows33(){const s=inter33;return (s.data?.moves||[]).filter(x=>(s.week==="all"||x.weekType===s.week)&&(s.course==="all"||x.course===+s.course)&&(!s.strict||!x.unresolved))}
function keyMove33(x){return x.id+"|"+x.newDate+"|"+x.newStart}
function renderInterday33(){
 const s=inter33,d=s.data,rows=rows33();
 if(!opportunities29.data)return "";
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 let h='<section class="panel"><div class="eyebrow23">Эксперимент расширенной оптимизации</div><h2>Переносы между днями одной учебной недели</h2><p>Проверяются одиночные занятия с однозначными ресурсами и совпадением календаря с PDF. Сохраняются вид занятия, преподаватель, аудитория и учебная неделя. Перенос допускается только в уже учебный день группы, когда преподаватель уже ведёт занятия в институте.</p><p class="notice">Это независимые кандидаты, не готовое расписание. Не объединяйте их с другими переносами без нового расчёта. Доступность вне института, фактические маршруты и учебные требования не подтверждены.</p><div class="row"><button class="primary" id="runInterday33" '+(!s.context||s.running?"disabled":"")+'>'+(s.running?"Расчёт…":d?"Пересчитать":"Проверить переносы между днями")+'</button></div><p role="status">'+esc(s.error)+'</p>';
 if(!d)return h+'</section>';
 h+='<div class="source23">'+esc(calendarStatus27(s.source))+'</div><div class="grid">'+metric("Проверено вариантов",d.attempts)+metric("Независимые кандидаты",d.moves.length)+metric("Без неясных карточек в интервалах",d.moves.filter(x=>!x.unresolved).length)+metric("По фильтру",rows.length)+'</div><p>Нельзя увеличить число активных дней, окна, суммарную длительность, максимальную длительность или максимальное число блоков в затронутых днях группы и преподавателя. Сохраняется порядок занятий по тому же предмету. Новые соседства допустимы только в одном корпусе с запасом ≥15 мин; существующие межкорпусные интервалы не сокращаются. Явные компоненты составных записей блокируют перенос, неизвестные не считаются свободными.</p><div class="row"><label>Неделя<select id="interWeek33">'+[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]].map(([k,n])=>'<option value="'+k+'" '+(s.week===k?"selected":"")+'>'+n+'</option>').join("")+'</select></label><label>Курс<select id="interCourse33">'+["all",1,2,3,4,5].map(k=>'<option value="'+k+'" '+(s.course===String(k)?"selected":"")+'>'+(k==="all"?"Все":k)+'</option>').join("")+'</select></label><label><input id="interStrict33" type="checkbox" '+(s.strict?"checked":"")+'>Без неясных карточек</label><button id="interExport33">CSV</button><button id="interJSON33">JSON</button></div><div class="scroll"><table><tr><th>Группа / неделя</th><th>Предмет</th><th>Было → стало</th><th>Дни группы</th><th>Окна</th><th>Группо-мин</th><th>Неясных карточек</th></tr>'+rows.slice(0,100).map(x=>'<tr><td><button data-inter33="'+esc(keyMove33(x))+'">'+esc(x.group)+'</button><br>'+esc(weekName32(x.weekType))+'</td><td>'+esc(x.subject)+'</td><td>'+esc(x.oldDate+" "+clock26(x.oldStart)+" → "+x.newDate+" "+clock26(x.newStart))+'</td><td>'+x.groupBefore.activeDays+' → '+x.groupAfter.activeDays+'</td><td>'+x.groupBefore.windows+' → '+x.groupAfter.windows+'</td><td>'+x.groupBefore.span+' → '+x.groupAfter.span+'</td><td>'+x.unresolved+'</td></tr>').join("")+'</table></div><p>'+esc(rows.length?"Показано "+Math.min(100,rows.length)+" из "+rows.length+".":"При этих ограничениях кандидатов нет.")+'</p>';
 const x=rows.find(q=>keyMove33(q)===s.selected);
 if(x){h+='<section id="interDetail33"><h3>'+esc(x.group+" · "+x.subject)+'</h3><p>'+esc(x.teacher+" · "+x.room)+'</p><p>Окна преподавателя: '+x.teacherBefore.windows+' → '+x.teacherAfter.windows+'; длительность двух дней: '+x.teacherBefore.span+' → '+x.teacherAfter.span+' мин.</p><div class="row"><button data-inter-group33="'+esc(x.group)+'" data-inter-date33="'+x.oldDate+'">Исходный день</button><button data-inter-group33="'+esc(x.group)+'" data-inter-date33="'+x.newDate+'">Целевой день</button></div><details><summary>Неясные исходные карточки ('+x.unresolved+')</summary><div class="scroll"><table><tr><th>Группа</th><th>Дата</th><th>Предмет</th><th>Преподаватели</th><th>Аудитории</th></tr>'+x.unresolvedIds.map(id=>s.context.byId.get(id)).map(q=>'<tr><td>'+esc(q.group)+'</td><td>'+esc(q.date)+'</td><td>'+esc(q.subject)+'</td><td>'+esc(q.teacherName)+'</td><td>'+esc(q.roomLabel)+'</td></tr>').join("")+'</table></div></details></section>'}
 return h+'<details><summary>Причины отклонения вариантов</summary><p>Счётчики — число попыток, исключённых на первом препятствии.</p><div class="scroll"><table>'+Object.entries(d.reasons).map(([k,n])=>'<tr><td>'+esc(({"not-eligible":"Дата / пригодность","week-or-source":"Учебная неделя или сверка PDF","inactive-group-day":"Нет занятий группы","inactive-teacher-day":"Нет наблюдаемой работы преподавателя","ambiguous-or-overlap-day":"Неясный или пересекающийся день","subject-order":"Порядок предмета","order-travel-or-overlap":"Новый переход или пересечение","invalid-time":"Неизвестное время","worse-load":"Ухудшение нагрузки","no-gain":"Нет улучшения","explicit-resource":"Занятость явного ресурса","ambiguous-match":"Неоднозначное совпадение ресурса"})[k]||k)+'</td><td>'+n+'</td></tr>').join("")+'</table></div></details></section>';
}
function bindInterday33(){
 const s=inter33;
 on("runInterday33","click",()=>{if(s.running||!s.context)return;const token=++s.token,ctx=s.context;s.running=true;s.error="";render();setTimeout(()=>{if(token!==s.token)return;try{s.data=interday33(ctx);s.selected=""}catch(e){s.error=e.message;s.data=null}finally{s.running=false;render()}},20)});
 for(const [id,k] of [["interWeek33","week"],["interCourse33","course"]])on(id,"change",e=>{s[k]=e.target.value;s.selected="";render()});
 on("interStrict33","change",e=>{s.strict=e.target.checked;s.selected="";render()});
 document.querySelectorAll("[data-inter33]").forEach(b=>b.onclick=()=>{s.selected=b.dataset.inter33;render();$("interDetail33")?.scrollIntoView?.({block:"start"})});
 document.querySelectorAll("[data-inter-group33]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.interGroup33,b.dataset.interDate33)});
 on("interJSON33","click",()=>{if(s.data)download("kantor-interday.json",JSON.stringify({version:"0.33",checked:s.data.checked,status:"independent-review-only",attempts:s.data.attempts,reasons:s.data.reasons,rows:rows33()},null,2),"application/json")});
 on("interExport33","click",()=>{if(!s.data)return;const cols=["group","course","weekType","weekStart","subject","teacher","room","oldDate","oldStart","newDate","newStart","groupDaysBefore","groupDaysAfter","groupWindowsBefore","groupWindowsAfter","groupSpanBefore","groupSpanAfter","unresolved"];let rows=rows33().map(x=>({...x,groupDaysBefore:x.groupBefore.activeDays,groupDaysAfter:x.groupAfter.activeDays,groupWindowsBefore:x.groupBefore.windows,groupWindowsAfter:x.groupAfter.windows,groupSpanBefore:x.groupBefore.span,groupSpanAfter:x.groupAfter.span}));download("kantor-interday.csv","\ufeff"+[[...cols,"snapshot","status"],...rows.map(x=>[...cols.map(k=>x[k]),s.data.checked,"review-only"])].map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
