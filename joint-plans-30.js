/* 0.30: conservative simultaneous packages of independent candidate moves.
 * These packages are feasible only for the observed, labeled subset.
 * The method deliberately selects at most one move per group-day and teacher-day.
 */
const moveKey30=x=>x.id+"|"+x.newStart;
function conflict30(a,b,byId){
 if(a.date!==b.date)return false;
 const p=byId.get(a.id),q=byId.get(b.id);
 return a.id===b.id||p.group===q.group||p.teacher===q.teacher||
   (p.roomKey===q.roomKey&&a.newStart<b.newEnd&&b.newStart<a.newEnd);
}
function aggregateDays30(cards){
 const g=new Map(),t=new Map();
 const add=(m,k,x)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(x)};
 for(const x of cards){add(g,JSON.stringify([x.group,x.date]),x);if(x.teacher)add(t,JSON.stringify([x.teacher,x.date]),x)}
 const summarize=(m,teacher)=>{let out={days:m.size,usableDays:0,windows:0,span:0,lessonMinutes:0,breakMinutes:0};
  for(const a of m.values()){const list=teacher?unique29(a):a;
   const r=dayMetrics25(list.map(x=>({timing:{start:x.start,end:x.end}})),"");
   if(!r.usable)continue;out.usableDays++;for(const k of ["windows","span","lessonMinutes","breakMinutes"])out[k]+=r[k];
  }return out;
 };
 return {group:summarize(g,false),teacher:summarize(t,true)};
}
function applyJoint30(cards,moves){
 const map=new Map(moves.map(x=>[x.id,x]));
 if(map.size!==moves.length)throw Error("Повторный перенос занятия");
 return cards.map(q=>{const x=map.get(q.id);return x?{...q,start:x.newStart,end:x.newEnd}:q});
}
function auditJoint30(ready,moves,allowed){
 const cards=ready.cards,byId=new Map(cards.map(q=>[q.id,q])),keys=new Set(allowed.map(moveKey30)),errors=[];
 const fail=msg=>errors.push(msg);
 const seen=new Set();
 for(let i=0;i<moves.length;i++){
  const x=moves[i],q=byId.get(x.id);
  if(!q||!keys.has(moveKey30(x))||!auditMove29(cards,x)){fail("Не подтверждён исходный кандидат: "+x.id);continue}
  if(seen.has(x.id))fail("Повторный перенос: "+x.id);seen.add(x.id);
  // Repeat explicit ambiguous resource matching independently, both intervals.
  const surname=q.teacher.split(" ")[0],next={...q,start:x.newStart,end:x.newEnd};
  const ambiguous=cards.filter(c=>c.id!==q.id&&c.date===q.date&&(!c.time||overlap29(c,q)||overlap29(c,next)));
  if(ambiguous.some(c=>(!c.teacher&&key26(c.teacherName).split(/[^\p{L}-]+/u).includes(surname))||(!c.room&&key26(c.roomLabel).split(/[^\p{L}\p{N}-]+/u).includes(q.roomKey))))fail("Неоднозначное совпадение ресурса: "+q.id);
  if(x.unresolved!==ambiguous.filter(c=>!c.time||!c.teacher||!c.room).length)fail("Неверный счётчик неопределённости: "+q.id);
  for(let j=0;j<i;j++){const y=moves[j];if(byId.has(y.id)&&conflict30(x,y,byId))fail("Несовместимые переносы: "+x.id+" / "+y.id)}
 }
 if(errors.length)return {ok:false,errors};
 const final=applyJoint30(cards,moves),finalById=new Map(final.map(q=>[q.id,q]));
 for(const x of moves){
  const q=byId.get(x.id),next=finalById.get(x.id);
  if(final.some(c=>c.id!==q.id&&c.date===q.date&&c.time&&overlap29(c,next)&&(c.group===q.group||c.teacher===q.teacher||c.roomKey===q.roomKey)))fail("Конфликт после всех переносов: "+q.id);
  for(const [before,after] of [
   [cards.filter(c=>c.date===q.date&&c.group===q.group),final.filter(c=>c.date===q.date&&c.group===q.group)],
   [unique29(cards.filter(c=>c.date===q.date&&c.teacher===q.teacher)),unique29(final.filter(c=>c.date===q.date&&c.teacher===q.teacher))]
  ]){
   if(before.some(c=>!c.time)||after.some(c=>!c.time)||collision29(after)||!routeSafe29(before,after))fail("Порядок или переход после всех переносов: "+q.id);
   const a=dayScore29(before),b=dayScore29(after);
   if(b.windows>a.windows||b.span>a.span)fail("Ухудшение дня после всех переносов: "+q.id);
  }
  const a=dayScore29(cards.filter(c=>c.date===q.date&&c.group===q.group)),b=dayScore29(final.filter(c=>c.date===q.date&&c.group===q.group));
  if(b.windows>=a.windows)fail("Не устранено окно группы: "+q.id);
 }
 const before=aggregateDays30(cards),after=aggregateDays30(final);
 if(final.length!==cards.length||before.group.days!==after.group.days||before.teacher.days!==after.teacher.days||before.group.usableDays!==after.group.usableDays||before.teacher.usableDays!==after.teacher.usableDays||after.group.windows>before.group.windows||after.teacher.windows>before.teacher.windows||after.group.span>before.group.span||after.teacher.span>before.teacher.span||before.group.lessonMinutes!==after.group.lessonMinutes||before.teacher.lessonMinutes!==after.teacher.lessonMinutes)fail("Нарушен баланс итоговых показателей");
 return {ok:!errors.length,errors,before,after};
}
function jointPlans30(ready,screen){
 if(ready.checked!==screen.checked)throw Error("Разные версии исходных данных");
 const byId=new Map(ready.cards.map(q=>[q.id,q])),candidates=screen.results;
 const saved=x=>x.groupBefore.windows-x.groupAfter.windows,span=x=>x.groupBefore.span-x.groupAfter.span;
 const tie=(a,b)=>moveKey30(a).localeCompare(moveKey30(b));
 const profiles=[
  {id:"windows",name:"Приоритет устранения окон",list:candidates,compare:(a,b)=>saved(b)-saved(a)||span(b)-span(a)||a.unresolved-b.unresolved||tie(a,b)},
  {id:"time",name:"Приоритет сокращения дня",list:candidates,compare:(a,b)=>span(b)-span(a)||saved(b)-saved(a)||a.unresolved-b.unresolved||tie(a,b)},
  {id:"strict",name:"Только без неоднозначных карточек в интервалах",list:candidates.filter(x=>x.unresolved===0),compare:(a,b)=>saved(b)-saved(a)||span(b)-span(a)||tie(a,b)}
 ];
 return profiles.map(p=>{
  const moves=[];
  for(const x of p.list.slice().sort(p.compare))if(!moves.some(y=>conflict30(x,y,byId)))moves.push(x);
  const audit=auditJoint30(ready,moves,candidates);
  if(!audit.ok)throw Error("Пакет не прошёл контроль: "+audit.errors[0]);
  const windows=audit.before.group.windows-audit.after.group.windows,spanMinutes=audit.before.group.span-audit.after.group.span;
  if(windows!==moves.reduce((n,x)=>n+saved(x),0)||spanMinutes!==moves.reduce((n,x)=>n+span(x),0))throw Error("Эффекты пакета не совпадают с повторным расчётом");
  return {id:p.id,name:p.name,moves:moves.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.group.localeCompare(b.group,"ru")||a.oldStart-b.oldStart),considered:p.list.length,excluded:p.list.length-moves.length,windows,spanMinutes,before:audit.before,after:audit.after,unresolvedMoves:moves.filter(x=>x.unresolved>0).length,audit:"passed-observed-constraints"};
 });
}
function renderUncertainty30(x){
 const ready=opportunities29.readiness,q=ready?.cards.find(c=>c.id===x.id);
 if(!q)return "";
 const next={...q,start:x.newStart,end:x.newEnd};
 const rows=ready.cards.filter(c=>c.id!==q.id&&c.date===q.date&&(!c.time||overlap29(c,q)||overlap29(c,next))&&(!c.time||!c.teacher||!c.room));
 if(!rows.length)return '<p class="muted">В исходном и новом интервале нет карточек с нераспознанным временем, преподавателем или аудиторией в этом снимке. Внешняя доступность всё равно не подтверждена.</p>';
 return '<details open><summary>Что необходимо уточнить: '+rows.length+' карточек</summary><p>Это неопределённые записи в исходном или новом интервале. Они не доказывают конфликт, но требуют сверки до переноса.</p><div class="scroll"><table><tr><th>Группа</th><th>Время</th><th>Дисциплина</th><th>Исходная метка преподавателя</th><th>Исходная аудитория</th><th>Неясность</th></tr>'+rows.map(c=>'<tr><td><button data-original29="'+esc(c.group)+'" data-date29="'+esc(c.date)+'">'+esc(c.group)+'</button></td><td>'+esc(c.time?clock26(c.start)+"–"+clock26(c.end):"Неизвестно")+'</td><td>'+esc(c.subject)+'</td><td>'+esc(c.teacherName||"—")+'</td><td>'+esc(c.roomLabel||"—")+'</td><td>'+esc([!c.time?"время":"",!c.teacher?"преподаватель":"",!c.room?"аудитория":""].filter(Boolean).join(", "))+'</td></tr>').join("")+'</table></div></details>';
}
let joint30={plans:null,checked:null,choice:"windows",error:""};
function prepareJoint30(ready,data){joint30.plans=null;joint30.checked=null;joint30.error="";try{joint30.plans=jointPlans30(ready,data);joint30.checked=ready.checked}catch(e){joint30.error=e.message}}
function selectedJoint30(){return joint30.plans?.find(p=>p.id===joint30.choice)||joint30.plans?.[0]}
function renderJoint30(){
 const s=opportunities29,p=selectedJoint30();
 if(!s.data)return "";
 if(!p||joint30.checked!==s.data.checked)return '<section class="panel"><h2>Совместимый пакет переносов</h2><p role="status">'+esc(joint30.error||"Пакет пока не рассчитан.")+'</p></section>';
 const metrics=[["Окна групп, пар",p.before.group.windows,p.after.group.windows],["Длительность группо-дней, мин",p.before.group.span,p.after.group.span],["Окна преподавателей, пар",p.before.teacher.windows,p.after.teacher.windows],["Длительность дней преподавателей, мин",p.before.teacher.span,p.after.teacher.span]];
 return '<section class="panel" id="jointPanel30"><div class="eyebrow23">Совместная проверка</div><h2>Пакет изменений на одном расписании</h2><p>Система выбирает совместимые предложения из независимых переносов и заново проверяет итоговое расписание. Каждый перенос сохраняет исходную дату: верхняя и нижняя недели не смешиваются. Не более одного переноса на группу и преподавателя в один день; одновременная занятость одной аудитории запрещена. Это консервативный поиск, не глобальный оптимум.</p><div class="source23">'+esc(calendarStatus27(s.snapshot))+'</div><div class="row"><label>Приоритет<select id="jointChoice30">'+joint30.plans.map(x=>'<option value="'+x.id+'" '+(p.id===x.id?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></label><button id="jointCSV30">CSV переносов</button><button id="jointJSON30">Протокол JSON</button></div><div class="grid">'+[["Совместимых переносов",p.moves.length],["Устранено полных окон",p.windows],["Сокращение длительности, группо-мин",p.spanMinutes],["Переносов с остаточной неопределённостью",p.unresolvedMoves]].map(([n,v])=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>').join("")+'</div><h3>Показатели всего наблюдаемого расписания</h3><div class="scroll"><table><tr><th>Показатель</th><th>Исходное</th><th>Пакет</th><th>Разница</th></tr>'+metrics.map(([n,a,b])=>'<tr><td>'+esc(n)+'</td><td>'+a+'</td><td>'+b+'</td><td>'+(b-a)+'</td></tr>').join("")+'</table></div><p class="muted">Длительность суммируется по групповым или преподавательским дням, не по численности людей. Дни с неизвестным временем исключены из временных показателей; преподаватели учитываются только по однозначно распознанным полным ФИО.</p><h3>Сравнение трёх вариантов</h3><div class="scroll"><table><tr><th>Приоритет</th><th>Переносы</th><th>Окна устранены</th><th>Группо-мин сэкономлено</th><th>С неопределённостью</th></tr>'+joint30.plans.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.moves.length+'</td><td>'+x.windows+'</td><td>'+x.spanMinutes+'</td><td>'+x.unresolvedMoves+'</td></tr>').join("")+'</table></div><h3>Список выбранных изменений</h3><div class="scroll"><table><tr><th>Группа</th><th>Дата и неделя</th><th>Дисциплина</th><th>Было → стало</th><th>Аудитория</th><th>Окна группы</th></tr>'+p.moves.map(x=>'<tr><td><button data-joint-move30="'+esc(moveKey30(x))+'">'+esc(x.group)+'</button></td><td>'+esc(x.date)+(x.weekType?' · '+esc(x.weekType==="upper"?"Верхняя":x.weekType==="lower"?"Нижняя":x.weekType==="conflict"?"Противоречие":"Не установлена"):"")+'</td><td>'+esc(x.subject)+'</td><td>'+clock26(x.oldStart)+' → '+clock26(x.newStart)+'</td><td>'+esc(x.room)+'</td><td>'+x.groupBefore.windows+' → '+x.groupAfter.windows+'</td></tr>').join("")+'</table></div><p class="muted">'+(p.moves.length?"Внутренняя проверка пакета пройдена.":"Нет совместимых улучшений в этом наборе; это не доказательство оптимальности.")+' Все назначения сохраняются; реальные возможности переноса требуют подтверждения академии. Пакеты не являются независимыми от внешней занятости, подгрупп, доступности помещений и фактических переходов.</p></section>';
}
function bindJoint30(){
 on("jointChoice30","change",e=>{joint30.choice=e.target.value;render()});
 document.querySelectorAll("[data-joint-move30]").forEach(b=>b.onclick=()=>{opportunities29.view="moves";opportunities29.course="all";opportunities29.group="";opportunities29.week="all";opportunities29.selected=b.dataset.jointMove30;render();$("moveDetail29")?.scrollIntoView?.({block:"start"})});
 on("jointCSV30","click",()=>{const p=selectedJoint30();if(!p)return;const cols=["group","date","weekStart","weekType","subject","teacher","room","oldStart","newStart","unresolved"],rows=[cols.concat("snapshot","status"),...p.moves.map(x=>cols.map(k=>x[k]).concat(joint30.checked,"observed-only"))];download("kantor-joint-moves.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
 on("jointJSON30","click",()=>{const p=selectedJoint30();if(p)download("kantor-joint-plan.json",JSON.stringify({version:"0.30",checked:joint30.checked,status:"observed-only",method:"conservative greedy; one group-day and teacher-day; preserve duration/order; no shortened cross-building gaps",plan:p},null,2),"application/json")});
}
