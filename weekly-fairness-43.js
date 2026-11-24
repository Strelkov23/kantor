/* 0.43: weekly distribution and coverage, using observed calendar cards only. */
const weekKey43=(id,monday)=>JSON.stringify([id,monday]);
function weeklyProfile43(cards,monday,teacher=false){
 const days=Array.from({length:7},(_,i)=>({date:plusDate32(monday,i),minutes:0,cards:0,span:0,windows:0})),by=new Map(days.map(d=>[d.date,d]));
 let excluded=0;
 for(const d of days){
  let list=cards.filter(q=>q.date===d.date);if(teacher)list=unique29(list);
  d.cards=list.length;
  if(!list.length)continue;
  if(list.some(q=>!q.time||teacher&&!q.teacher)||collision29(list)){d.minutes=null;d.span=null;d.windows=null;excluded++;continue}
  const a=sorted29(list),m=dayMetrics25(a.map(q=>({timing:{start:q.start,end:q.end}})),"");
  if(!m.usable){d.minutes=null;d.span=null;d.windows=null;excluded++;continue}
  d.minutes=m.lessonMinutes;d.span=m.span;d.windows=m.windows;
 }
 const active=days.filter(d=>d.cards).length;
 if(excluded)return {days,active,excluded,complete:false};
 const values=days.map(d=>d.minutes),total=values.reduce((s,v)=>s+v,0),avg=total/7,variance=values.reduce((s,v)=>s+(v-avg)**2,0)/7;
 let streak=0,maxStreak=0;
 for(const d of days){streak=d.cards?streak+1:0;maxStreak=Math.max(streak,maxStreak)}
 return {days,active,excluded,complete:true,total,maxMinutes:Math.max(...values),std:Math.sqrt(variance),variance,windows:days.reduce((n,d)=>n+d.windows,0),span:days.reduce((n,d)=>n+d.span,0),maxStreak};
}
function weekIndex43(ctx,cards){
 const out={group:new Map(),teacher:new Map()};
 const add=(kind,id,q)=>{const k=weekKey43(id,monday32(q.date)),m=out[kind];if(!m.has(k))m.set(k,{id,monday:monday32(q.date),cards:[]});m.get(k).cards.push(q)};
 for(const q of cards){add("group",q.group,q);for(const t of ctx.occ.get(q.id).knownTeachers)add("teacher",t,q)}
 return out;
}
function weekCompare43(a,b){
 const complete=!!(a?.complete&&b?.complete&&a.total===b.total);
 return {complete,nonWorse:complete&&b.maxMinutes<=a.maxMinutes&&b.variance<=a.variance+1e-7&&b.maxStreak<=a.maxStreak,
 gain:complete?(a.std-b.std)/95+(a.maxMinutes-b.maxMinutes)/95:0};
}
function assessWeek43(ctx,x,index){
 const q=ctx.byId.get(x.id),result={};
 for(const kind of ["group","teacher"]){
  const id=kind==="group"?q.group:q.teacher,k=weekKey43(id,x.weekStart),entry=index[kind].get(k);
  const a=weeklyProfile43(entry?.cards||[],x.weekStart,kind==="teacher"),b=weeklyProfile43(apply39(entry?.cards||[],[x]),x.weekStart,kind==="teacher");
  result[kind]={id,before:a,after:b,...weekCompare43(a,b)};
 }
 return result;
}
function compareWeekPackage43(ctx,final,moves,index){
 const next=weekIndex43(ctx,final),rows={group:[],teacher:[]},selected={group:new Set(),teacher:new Set()};
 for(const x of moves){const q=ctx.byId.get(x.id);selected.group.add(weekKey43(q.group,x.weekStart));selected.teacher.add(weekKey43(q.teacher,x.weekStart))}
 for(const kind of ["group","teacher"]){
  for(const [key,entry] of index[kind]){
   const a=weeklyProfile43(entry.cards,entry.monday,kind==="teacher"),b=weeklyProfile43(next[kind].get(key)?.cards||[],entry.monday,kind==="teacher"),c=weekCompare43(a,b);
   rows[kind].push({id:entry.id,monday:entry.monday,selected:selected[kind].has(key),before:a,after:b,...c});
  }
  if(next[kind].size!==index[kind].size||[...next[kind].keys()].some(k=>!index[kind].has(k)))throw Error("Изменён состав ресурс-недель");
 }
 const summary={};
 for(const kind of ["group","teacher"]){
  const all=rows[kind],complete=all.filter(r=>r.complete),eligible=complete.slice().sort((a,b)=>b.before.maxMinutes-a.before.maxMinutes||b.before.span-a.before.span||a.id.localeCompare(b.id)||a.monday.localeCompare(b.monday));
  const top=eligible.length?eligible[Math.ceil(eligible.length/4)-1].before.maxMinutes:null,heavy=top===null?[]:eligible.filter(r=>r.before.maxMinutes>=top);
  summary[kind]={weeks:all.length,complete:complete.length,selectedWeeks:all.filter(r=>r.selected).length,selectedResources:new Set(all.filter(r=>r.selected).map(r=>r.id)).size,heavyWeeks:heavy.length,heavySelected:heavy.filter(r=>r.selected).length,improved:complete.filter(r=>r.gain>1e-7&&r.nonWorse).length,worsened:complete.filter(r=>!r.nonWorse).length,selectedIncomplete:all.filter(r=>r.selected&&!r.complete).length};
 }
 return {summary,rows};
}
function chooseFair43(rows,by,limit,score){
 const selected=[],groupSeen=new Set(),teacherSeen=new Set(),remaining=rows.filter(x=>score(x)>0);
 while(selected.length<limit){
  let best=null,bestScore=-Infinity;
  for(const x of remaining){
   if(selected.some(y=>incompatible39(x,y,by)))continue;
   const q=by.get(x.id),v=score(x)+(groupSeen.has(q.group)?0:5)+(teacherSeen.has(q.teacher)?0:3)+(x.weekly?.group?.before?.maxMinutes||0)/95+(x.weekly?.teacher?.before?.maxMinutes||0)/190;
   if(v>bestScore||v===bestScore&&best&&actionKey39(x).localeCompare(actionKey39(best))<0){best=x;bestScore=v}
  }
  if(!best)break;selected.push(best);const q=by.get(best.id);groupSeen.add(q.group);teacherSeen.add(q.teacher);
 }
 return selected;
}
const fairness43={source:null,protect:true,kind:"group",onlySelected:false,filter:"",page:0,cache:null};
function sync43(){const s=fairness43;if(s.source!==inter33.context){s.source=inter33.context;s.cache=null;s.page=0;s.filter=""}return s}
function render43(){
 const s=sync43(),ctx=s.source;if(!ctx)return "";
 const model=multi39.runs[multi39.active],report=model?.weekly;
 if(!s.cache)s.cache=compareWeekPackage43(ctx,ctx.ready.cards,[],weekIndex43(ctx,ctx.ready.cards));
 const d=report||s.cache,k=s.kind,m=d.summary[k],names=k==="teacher"?catalog40(ctx).teachers:null;
 const rows=d.rows[k].filter(r=>(!s.onlySelected||r.selected)&&key26(names?.get(r.id)||r.id).includes(key26(s.filter))).slice().sort((a,b)=>Number(b.selected)-Number(a.selected)||Number(b.complete)-Number(a.complete)||(b.before.maxMinutes||0)-(a.before.maxMinutes||0)||a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(rows.length/25));s.page=Math.min(s.page,pages-1);
 const fmt=(a,b,key)=>a.complete&&b.complete?Number(a[key]).toFixed(key==="std"?1:0)+" → "+Number(b[key]).toFixed(key==="std"?1:0):"Не оценено";
 let h='<section class="panel" id="fairness43"><div class="eyebrow23">Распределение нагрузки · 0.43</div><h2>Равномерность и охват улучшений</h2><p>Сравниваются семь дат каждой наблюдаемой недели. Ноль означает отсутствие карточки в снимке, а не гарантированный выходной. Стандартное отклонение минут вычисляется по семи датам; дни с неизвестным временем или пересечениями исключают всю неделю из числового сравнения. Для преподавателей учитываются явно распознанные назначения; внешняя занятость не известна.</p><label style="display:block"><input id="protectWeek43" type="checkbox" '+(s.protect?"checked":"")+'> Не увеличивать максимум минут за день, разброс минут и длину серии учебных дней (при изменении времени)</label><p class="muted">Переносы аудиторий сохраняют распределение времени. При неполном недельном профиле временной перенос исключается в защитном режиме. Новый сценарий «Охват и равномерность» повышает приоритет ещё не затронутых групп и преподавателей, а также более длинных дней. Это эвристика, не доказательство справедливости.</p><div class="row"><label>Ресурс<select id="kindWeek43"><option value="group" '+(k==="group"?"selected":"")+'>Группы</option><option value="teacher" '+(k==="teacher"?"selected":"")+'>Преподаватели</option></select></label><label>Поиск<input id="filterWeek43" value="'+esc(s.filter)+'"></label><label><input id="selectedWeek43" type="checkbox" '+(s.onlySelected?"checked":"")+'> Только затронутые</label></div><p>'+(model?"Выбранная модель: "+esc(model.name):"Исходное расписание, модель ещё не выбрана")+'</p><div class="grid">'+[["Сравнимые недели",m.complete+" / "+m.weeks],["Затронутые ресурсы",m.selectedResources],["Затронутые недели с большой пиковой нагрузкой",m.heavySelected+" / "+m.heavyWeeks],["Улучшено по времени",m.improved],["Ухудшено по времени",m.worsened],["Затронуто неполных недель",m.selectedIncomplete]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><p class="muted">Высокая пиковая нагрузка: верхняя четверть сравнимых недель по максимальному числу минут в день, с включением всех равных пороговых значений. Число таких недель может превышать 25%.</p><div class="scroll"><table><tr><th>Ресурс / неделя</th><th>Активные даты</th><th>Максимум мин/день</th><th>Разброс (σ, мин)</th><th>Серия дней</th><th>Профиль дней до / после</th></tr>';
 const bars=w=>w.days.map(q=>'<span title="'+esc(q.date+": "+(q.minutes??"неизвестно"))+'" style="display:inline-block;width:12px;height:24px;vertical-align:bottom;background:#d9e1e5;margin-right:2px;position:relative"><i style="position:absolute;bottom:0;left:0;width:100%;height:'+(q.minutes===null?100:Math.min(100,q.minutes/475*100))+'%;background:'+(q.minutes===null?"#9ba4aa":"#168b82")+'"></i></span>').join("");
 h+=rows.slice(s.page*25,s.page*25+25).map(r=>'<tr><td>'+esc(names?.get(r.id)||r.id)+'<small>'+esc(r.monday+(r.selected?" · изменено":""))+'</small></td><td>'+r.before.active+' → '+r.after.active+'</td><td>'+fmt(r.before,r.after,"maxMinutes")+'</td><td>'+fmt(r.before,r.after,"std")+'</td><td>'+fmt(r.before,r.after,"maxStreak")+'</td><td><div style="white-space:nowrap">'+bars(r.before)+'</div><div style="white-space:nowrap">'+bars(r.after)+'</div></td></tr>').join("")+'</table></div><div class="row"><button id="prevWeek43" '+(!s.page?"disabled":"")+'>Назад</button><span>'+(s.page+1)+' / '+pages+'</span><button id="nextWeek43" '+(s.page>=pages-1?"disabled":"")+'>Далее</button><button id="exportWeek43">CSV распределения</button></div></section>';
 return h;
}
function bind43(){
 const s=sync43();if(!s.source)return;
 on("protectWeek43","change",e=>{s.protect=e.target.checked;invalidate39();render()});
 on("kindWeek43","change",e=>{s.kind=e.target.value;s.page=0;render()});on("filterWeek43","change",e=>{s.filter=e.target.value;s.page=0;render()});on("selectedWeek43","change",e=>{s.onlySelected=e.target.checked;s.page=0;render()});
 on("prevWeek43","click",()=>{s.page=Math.max(0,s.page-1);render()});on("nextWeek43","click",()=>{s.page++;render()});
 on("exportWeek43","click",()=>{const d=multi39.runs[multi39.active]?.weekly||s.cache;if(!d)return;const cols=["kind","id","monday","selected","complete","maxMinutesBefore","maxMinutesAfter","stdBefore","stdAfter","activeBefore","activeAfter","maxStreakBefore","maxStreakAfter","snapshot"],rows=[cols];for(const kind of ["group","teacher"])for(const r of d.rows[kind])rows.push([kind,r.id,r.monday,r.selected,r.complete,r.before.maxMinutes,r.after.maxMinutes,r.before.std,r.after.std,r.before.active,r.after.active,r.before.maxStreak,r.after.maxStreak,s.source.ready.checked]);download("kantor-weekly-distribution.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
