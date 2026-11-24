
/* KANTOR 0.7 — group-level official source schedule and institute-wide review. */
let group07={course:1,group:"",half:0,data:null,report:null,status:"idle",error:"",view:"timetable"};
let groupToken07=0;
function groupsFor07(){return instituteCatalog.groups.filter(g=>g.course===group07.course)}
function groupRows07(){return group07.data?.records?.filter(r=>r.groups.includes(group07.group)&&r.halves.includes(group07.half))||[]}
function groupSchedule07(){
 let a=groupRows07(),d=group07.data;
 if(!d)return "";
 const timesEnd=["10:35","12:30","14:35","16:30","18:25"];
 function lessonCard(r){
   let kind=/^лек\s*\./u.test(r.raw)?"lecture":/^пр\s*\./u.test(r.raw)?"practice":"other",label=kind==="lecture"?"Лекция":kind==="practice"?"Практика":"Другой вид";
   let s=r.suggestion;
   return '<div class="schedulecard12 '+kind+'"><span class="lesson-type12 '+kind+'">'+label+'</span>'+(s?'<b>'+esc(s.title)+'</b><small>'+esc(s.teacher)+'</small><span class="room12">'+esc(s.room)+'</span>':'<div style="white-space:pre-line">'+esc(r.raw)+'</div>')+'<details><summary>Источник и статус</summary><div style="white-space:pre-line">'+esc(r.raw)+'</div><small>'+ (r.parseStatus==="simple"?"Структурный кандидат":"Нужна сверка")+' · <a target="_blank" rel="noopener" href="'+esc(d.source)+'#page='+r.page+'">'+esc(r.id)+'</a></small></details></div>';
 }
 let rows=Array.from({length:5},(_,p)=>'<tr><th>'+times[p]+'<small>'+timesEnd[p]+'</small></th>'+days.slice(0,5).map((_,day)=>{
  let list=a.filter(r=>r.day===day&&r.period===p);
  return '<td style="vertical-align:top;min-width:155px">'+(list.length?list.map(lessonCard).join(""):'<span class="muted">—</span>')+'</td>'
 }).join("")+'</tr>').join("");
 let mobile=days.map((n,day)=>'<section class="daycard12"><h3>'+esc(["Понедельник","Вторник","Среда","Четверг","Пятница"][day])+'</h3>'+a.filter(r=>r.day===day).sort((x,y)=>x.period-y.period).map(r=>'<div class="daylesson12"><div class="daytime12">'+times[r.period]+'<small>'+timesEnd[r.period]+'</small></div>'+lessonCard(r)+'</div>').join("")+(a.some(r=>r.day===day)?"":'<p class="muted">Нет извлечённых занятий</p>')+'</section>').join("");
 return '<p>В этой половине расписания: '+a.length+' непустых позиций. Цвет показывает предполагаемый вид занятия; исходный текст доступен в карточке. Время окончания — стандартное из PDF, не оперативный журнал.</p><div class="schedule-desktop12 scroll"><table><thead><tr><th>Время</th>'+days.slice(0,5).map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="schedule-mobile12">'+mobile+'</div><p class="muted">Отсутствие записи не исключает оперативных изменений.</p><p><button id="groupCSV07">CSV расписания группы</button> <button id="groupJSON07">JSON исходного курса</button></p>'
}
function reportView07(){
 let r=group07.report;if(!r)return '<p>Нажмите «Загрузить отчёт».</p>';
 let total=k=>r.courses.reduce((s,c)=>s+c[k],0);
 return '<div class="grid">'+[["Группы",total("groups")],["Физические ячейки",total("physicalCells")],["Позиции групп",total("positions")],["Простой разбор",total("simple")],["Ручная сверка",total("manual")],["Предварительные события",r.candidateEvents],["Возможные потоки",r.possibleFlows],["Возможные конфликты",r.conflicts.length]].map(([n,v])=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>').join("")+'</div><p>Геометрические несоответствия: '+total("geometryIssues")+'. Сверка 5 курса: '+r.pilotComparison.sourcePositions+' позиций, расхождений с ручным пилотом '+r.pilotComparison.differences.length+'.</p><div class="scroll"><table><tr><th>Курс</th><th>Группы</th><th>Ячейки</th><th>Позиции</th><th>Простой разбор</th><th>Ручная сверка</th></tr>'+r.courses.map(c=>'<tr><td>'+c.course+'</td><td>'+c.groups+'</td><td>'+c.physicalCells+'</td><td>'+c.positions+'</td><td>'+c.simple+'</td><td>'+c.manual+'</td></tr>').join("")+'</table></div><h3>Потенциальные пересечения ресурсов</h3><p class="notice">Показаны только конфликты среди распознанных простых кандидатов. Они не доказывают ошибки утверждённого расписания: необходимо проверить объединённые занятия, дистанционный формат, подгруппы, замены и первоисточники. Непростые записи здесь не проверены.</p>'+r.conflicts.map(c=>'<details><summary>'+esc(c.key[3])+' · '+days[c.key[1]]+' '+times[c.key[2]]+' · половина '+(c.key[0]+1)+'</summary><div class="scroll"><table><tr><th>Группы</th><th>Дисциплина</th><th>Преподаватель</th><th>Аудитория</th><th>Источник</th></tr>'+c.events.map(e=>'<tr><td>'+esc(e.groups.join(", "))+'</td><td>'+esc(e.title)+'</td><td>'+esc(e.teacher)+'</td><td>'+esc(e.room)+'</td><td>'+e.sourceIds.map(id=>{let m=id.match(/^C(\d)P(\d)-/),g=m&&instituteCatalog.groups.find(g=>g.course===+m[1]&&g.page===+m[2]);return g?'<a target="_blank" rel="noopener" href="'+esc(g.url)+'#page='+m[2]+'">'+esc(id)+'</a>':esc(id)}).join(" · ")+'</td></tr>').join("")+'</table></div></details>').join("")+'<p><a href="data/normalized/review-report.json">Полный отчёт JSON</a></p>';
}
function renderGroup07(){
 let gs=groupsFor07();if(!gs.some(g=>g.id===group07.group))group07.group=gs[0]?.id||"";
 return '<section class="panel"><h2>Расписание всех 83 очных групп</h2><p>Первый семестр 2026/2027, только Институт экономики и управления АПК. Данные из пяти опубликованных PDF, не из оперативного журнала. Исходный текст сохранён без исправлений; верхняя/нижняя половина не приравнивается к календарной чётности без проверки.</p><div class="row"><label>Режим<select id="groupView07"><option value="timetable" '+(group07.view==="timetable"?"selected":"")+'>Расписание группы</option><option value="report" '+(group07.view==="report"?"selected":"")+'>Отчёт по институту</option></select></label>'+(group07.view==="timetable"?'<label>Курс<select id="groupCourse07">'+[1,2,3,4,5].map(k=>'<option value="'+k+'" '+(k===group07.course?"selected":"")+'>'+k+'</option>').join("")+'</select></label><label>Группа<select id="groupId07">'+gs.map(g=>'<option value="'+esc(g.id)+'" '+(g.id===group07.group?"selected":"")+'>'+esc(g.id)+'</option>').join("")+'</select></label><label>Половина<select id="groupHalf07"><option value="0" '+(!group07.half?"selected":"")+'>Верхняя</option><option value="1" '+(group07.half?"selected":"")+'>Нижняя</option></select></label><button id="loadGroup07">Загрузить расписание</button><a target="_blank" rel="noopener" href="'+esc(gs.find(g=>g.id===group07.group)?.url||instituteCatalog.officialSchedule)+'#page='+(gs.find(g=>g.id===group07.group)?.page||1)+'">Исходный PDF</a>':'<button id="loadReport07">Загрузить отчёт</button>')+'</div><p role="status">'+(group07.status==="loading"?"Загрузка…":esc(group07.error))+'</p>'+(group07.view==="report"?reportView07():groupSchedule07())+'<p class="muted">Автоматическая геометрическая оцифровка не означает, что все 83 группы готовы к оптимизации. Сложные записи, потоки и внешние ограничения требуют проверки. Неутверждённые данные не передаются в расчёт автоматически.</p></section>'
}
async function loadGroup07(report=false){
 const token=++groupToken07,course=group07.course;group07.status="loading";group07.error="";render();
 try{
  const url=report?"data/normalized/review-report.json":"data/normalized/course-"+course+".json";
  let res=await fetch(url,{cache:"no-cache"});if(!res.ok)throw Error("HTTP "+res.status+" — данные ещё не опубликованы");
  let d=await res.json();if(token!==groupToken07)return;
  if(report){if(!Array.isArray(d.courses)||d.courses.length!==5)throw Error("Некорректный отчёт");group07.report=d}
  else{if(d.course!==course||!Array.isArray(d.records)||!Array.isArray(d.groups))throw Error("Некорректный набор курса");group07.data=d}
  group07.status="ready";
 }catch(e){if(token!==groupToken07)return;group07.status="error";group07.error=e.message}
 if(tab==="group07")render()
}
function bindGroup07(){
 on("groupView07","change",e=>{group07.view=e.target.value;group07.error="";if(group07.view==="report"&&!group07.report)loadGroup07(true);else if(group07.view==="timetable"&&!group07.data)loadGroup07();else render()});
 on("groupCourse07","change",e=>{group07.course=+e.target.value;group07.group="";group07.data=null;loadGroup07()});
 on("groupId07","change",e=>{group07.group=e.target.value;render()});
 on("groupHalf07","change",e=>{group07.half=+e.target.value;render()});
 on("loadGroup07","click",()=>loadGroup07());
 on("loadReport07","click",()=>loadGroup07(true));
 on("groupCSV07","click",()=>{let a=[["Группа","Половина","День","Пара","Исходная запись","Статус","Источник"],...groupRows07().map(r=>[group07.group,group07.half+1,days[r.day],times[r.period],r.raw,r.parseStatus,group07.data.source+"#page="+r.page])];download("kantor-group-source.csv","\ufeff"+a.map(row=>row.map(csv).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
 on("groupJSON07","click",()=>{if(group07.data)download("kantor-course-"+group07.course+".json",JSON.stringify(group07.data,null,2),"application/json")});
}
