/* 0.39: combined spatial/temporal packages with explicit pedagogical profiles. */
const pedagogyKey39=(g,s)=>JSON.stringify([g,key26(s)]);
function pedagogy39(cards,profile){
 const days=new Map(),out={cards:cards.length,rated:0,usableDays:0,excludedDays:0,late:0,heavyPairs:0,peak:0,links:0,repeats:0,practiceFirst:0,partialDays:0};
 for(const q of cards){if(!days.has(q.date))days.set(q.date,[]);days.get(q.date).push(q);if(profile.ratings[pedagogyKey39(q.group,q.subject)]!==undefined)out.rated++}
 const relations=new Set(profile.links.map(x=>JSON.stringify([x.group,x.from,x.to]))),rate=q=>profile.ratings[pedagogyKey39(q.group,q.subject)];
 for(const list of days.values()){
  if(list.some(q=>!q.time)||collision29(list)){out.excludedDays++;continue}
  const a=sorted29(list),weights=a.map(rate),complete=weights.every(v=>v!==undefined);
  out.usableDays++;if(!complete)out.partialDays++;
  if(complete)out.peak=Math.max(out.peak,weights.reduce((s,v)=>s+v,0));
  const seen=new Set();
  for(let i=0;i<a.length;i++){
   const q=a[i],v=weights[i],s=key26(q.subject);
   if(v!==undefined&&v>=4&&q.start>=895)out.late++;
   if(seen.has(s))out.repeats++;seen.add(s);
   if(i&&v>=4&&weights[i-1]>=4)out.heavyPairs++;
   if(i&&relations.has(JSON.stringify([q.group,key26(a[i-1].subject),s])))out.links++;
  }
 }
 // First visible practice before first lecture is descriptive only, not a curriculum violation.
 const subjects=new Map();
 for(const q of cards.filter(q=>q.time)){const k=key26(q.subject);if(!subjects.has(k))subjects.set(k,[]);subjects.get(k).push(q)}
 for(const a of subjects.values()){const order=a.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start),l=order.find(q=>key26(q.type)==="лекция"),p=order.find(q=>key26(q.type)==="практика");if(l&&p&&(p.date<l.date||p.date===l.date&&p.start<l.start))out.practiceFirst++}
 return out;
}
function protectPed39(a,b){
 return a.rated===b.rated&&a.excludedDays===b.excludedDays&&b.late<=a.late&&b.heavyPairs<=a.heavyPairs&&b.peak<=a.peak&&b.links>=a.links&&b.practiceFirst<=a.practiceFirst&&b.partialDays<=a.partialDays;
}
const actionKey39=x=>JSON.stringify([x.id,x.newDate,x.newStart,x.newRoom]);
function apply39(cards,moves){
 const by=new Map(moves.map(x=>[x.id,x]));if(by.size!==moves.length)throw Error("Повторная карточка");
 return cards.map(q=>{const x=by.get(q.id);return x?{...q,date:x.newDate,start:x.newStart,end:x.newEnd,room:x.newRoom,roomKey:key26(x.newRoom),roomLabel:x.newRoom,building:x.newBuilding}:q});
}
function incompatible39(a,b,by){
 const p=by.get(a.id),q=by.get(b.id);
 return a.id===b.id||a.weekStart===b.weekStart&&(p.group===q.group||p.teacher===q.teacher)||a.newDate===b.newDate&&key26(a.newRoom)===key26(b.newRoom)&&a.newStart<b.newEnd&&b.newStart<a.newEnd;
}
function edges39(before,after){
 const old=new Map(),stats={before:0,after:0};
 for(const list of before){const a=sorted29(list);for(let i=1;i<a.length;i++){const p=a[i-1],q=a[i];old.set(JSON.stringify([p.id,q.id]),{from:p.building,to:q.building,gap:q.start-p.end});if(p.building&&q.building&&p.building!==q.building)stats.before++}}
 for(const list of after){if(collision29(list))throw Error("Пересечение итогового дня");const a=sorted29(list);for(let i=1;i<a.length;i++){const p=a[i-1],q=a[i],gap=q.start-p.end,prev=old.get(JSON.stringify([p.id,q.id])),same=prev&&prev.from===p.building&&prev.to===q.building;
  if(!p.building||!q.building||p.building!==q.building){if(!same||gap<prev.gap)throw Error("Новый или сокращённый непроверенный переход");if(p.building&&q.building)stats.after++}
  else if((!same||gap<prev.gap)&&gap<15)throw Error("Недостаточный перерыв внутри корпуса");
 }}
 if(stats.after>stats.before)throw Error("Больше межкорпусных переходов");return stats;
}
function pool39(ctx,screen,inter,room,config,profile){
 const t=pool37(ctx,screen,inter,config.strict,config.week,config.course).map(x=>({...x,newRoom:ctx.byId.get(x.id).room,newBuilding:ctx.byId.get(x.id).building,groupSaved:0,teacherSaved:0}));
 if(room.checked!==ctx.ready.checked)throw Error("Разные снимки");
 const floorRoom=config.register?floorAlternatives41(ctx,config.register):{results:[]};
 const r=[...room.results,...floorRoom.results].filter(x=>(!config.strict||!x.unclearCards)&&(config.week==="all"||config.week===x.weekType)&&(config.course==="all"||config.course===String(x.course))).map(x=>({...x,kind:"room",oldDate:x.date,newDate:x.date,oldStart:x.start,oldEnd:x.end,newStart:x.start,newEnd:x.end,uncertainty:x.unclearCards}));
 const combined=combinedCandidates50(ctx,config),candidates=[...t,...r,...combined.results],out=[],passportExcluded={};let pedExcluded=0,workloadExcluded=0,weeklyExcluded=0,orderExcluded=0;const weeklyIndex=weekIndex43(ctx,ctx.ready.cards);
 for(const x of candidates){
  const q=ctx.byId.get(x.id),week=ctx.ready.cards.filter(v=>v.group===q.group&&monday32(v.date)===x.weekStart),a=pedagogy39(week,profile),b=pedagogy39(apply39(week,[x]),profile);
  if(config.pedProtect&&!protectPed39(a,b)){pedExcluded++;continue}
  const order=auditOrder49(ctx,[x],config);if(!order.ok){orderExcluded++;continue}
  if(config.register){const check=check40(ctx,apply39(ctx.ready.cards,[x]),[x],config.register,config.requireRoom);if(!check.ok){for(const code of new Set(check.issues.map(v=>v.code)))passportExcluded[code]=(passportExcluded[code]||0)+1;continue}}
  const d=x.kind==="room"?{windows:0,span:0,days:0,teacher:0}:{windows:x.groupBefore.windows-x.groupAfter.windows,span:x.groupBefore.span-x.groupAfter.span,days:x.kind==="inter"||x.kind==="combined"?x.groupBefore.activeDays-x.groupAfter.activeDays:0,teacher:x.teacherBefore.windows-x.teacherAfter.windows};
  const floor=x.floor||floorAction41(ctx,x,config.register),workload=assess42(week,x,profile,config,floor);
  if(reject42(workload,config)){workloadExcluded++;continue}
  const weekly=assessWeek43(ctx,x,weeklyIndex);
  if(config.weekProtect&&x.kind!=="room"&&(!weekly.group.nonWorse||!weekly.teacher.nonWorse)){weeklyExcluded++;continue}
  out.push({...x,floor,workload,weekly,gains:{...d,cross:x.groupSaved||0,teacherCross:x.teacherSaved||0,vertical:x.floor?x.floor.group.saved+x.floor.teacher.saved:0,route:workload.route.gain,routeUnknown:workload.route.known?0:1,fatigue:workload.fatigue.gain,ped:a.late-b.late+a.heavyPairs-b.heavyPairs+b.links-a.links+order.gain},order,pedBefore:a,pedAfter:b});
 }
 const pool={candidates:out,excluded:pedExcluded,workloadExcluded,weeklyExcluded,orderExcluded,weeklyIndex,passportExcluded,temporal:t,room:r,combined:{frames:combined.frames,placements:combined.placements,found:combined.results.length,truncated:combined.truncated,limit:combined.limit,reasons:combined.reasons}};pool.atomic=bundlePool47(ctx,pool,profile,config);return pool;
}
function audit39(ctx,selected,pool,profile,config){
 const allowed=new Map(pool.candidates.map(x=>[actionKey39(x),x])),moves=selected.map(x=>{const a=allowed.get(actionKey39(x));if(!a)throw Error("Недопустимый кандидат");return a}),cards=ctx.ready.cards,by=ctx.byId;
 for(let i=0;i<moves.length;i++)for(let j=0;j<i;j++)if(incompatible39(moves[i],moves[j],by))throw Error("Несовместимый пакет");
 for(const k of new Set(moves.filter(v=>v.swapKey).map(v=>v.swapKey))){if(!validCycle48(moves.filter(v=>v.swapKey===k)))throw Error("Неполный обмен аудиториями")}
 const temporal=moves.filter(x=>x.kind==="same"||x.kind==="inter");audit37(ctx,temporal,pool.temporal);
 const simultaneous=moves.filter(x=>x.kind==="combined");if(simultaneous.length){const rooms=combinedRooms50(ctx);for(const x of simultaneous)if(!verifyCombined50(ctx,x,config,rooms))throw Error("Одновременный перенос не прошёл повторную проверку");}
 const final=apply39(cards,moves),fBy=new Map(final.map(q=>[q.id,q])),occ=ctx.occ,changed=new Set(moves.map(x=>x.id));
 const actualOcc=q=>{const o=occ.get(q.id);return changed.has(q.id)?{...o,date:q.date,start:q.start,end:q.end,knownRooms:[q.roomKey],unknownRooms:[],roomComplete:true}:o};
 const occupancy=new Map(final.map(q=>[q.id,actualOcc(q)]));
 let groupCross=0,teacherCross=0;const pedagogy=[],workload={comparable:0,fullyRated:0,routeGain:0,routeUnknown:0,fatigueGain:0,details:[]},vertical={group:{before:0,after:0,unknownBefore:0,unknownAfter:0},teacher:{before:0,after:0,unknownBefore:0,unknownAfter:0}};
 for(const x of moves){
  const q=by.get(x.id),next=fBy.get(x.id),o=occupancy.get(q.id);
  if(q.group!==next.group||q.teacher!==next.teacher||q.subject!==next.subject||q.type!==next.type||next.end-next.start!==q.end-q.start||monday32(q.date)!==monday32(next.date))throw Error("Нарушена исходная карточка");
  if(x.kind==="room"||x.kind==="combined"){
   if(q.room===next.room||x.kind==="room"&&(q.date!==next.date||q.start!==next.start))throw Error("Неверный пространственный перенос");
   const busy=roomBusy38([...occupancy.values()].filter(e=>e.date===next.date),q.id,next.roomKey,next.start,next.end);if(busy.conflicts.length)throw Error("Конфликт целевой аудитории");
  }
  for(const v of final){if(v.id===q.id||v.date!==next.date)continue;const e=occupancy.get(v.id);if(possibleConflict31(e,o).length||v.group===q.group&&(!v.time||overlap29(v,next)))throw Error("Итоговый конфликт ресурсов")}
  const floorPair={};
  for(const kind of ["group","teacher"]){
   const dates=[...new Set([q.date,next.date])],get=(arr,date)=>{const list=arr.filter(v=>v.date===date&&(kind==="group"?v.group===q.group:occ.get(v.id).knownTeachers.includes(q.teacher)));return kind==="teacher"?unique29(list):list};
   const a=dates.map(d=>get(cards,d)),b=dates.map(d=>get(final,d));
   if([...a,...b].some(list=>list.some(v=>!v.time||kind==="teacher"&&v.teacher!==q.teacher)||collision29(list)))throw Error("Неоднозначный затронутый день");
   const e=edges39(a,b);if(kind==="group")groupCross+=e.before-e.after;else teacherCross+=e.before-e.after;
   const fa=floorDay41(a,config.register),fb=floorDay41(b,config.register);floorPair[kind]={before:fa,after:fb};vertical[kind].before+=fa.levels;vertical[kind].after+=fb.levels;vertical[kind].unknownBefore+=fa.unknown;vertical[kind].unknownAfter+=fb.unknown;
   if(x.kind==="room"&&(x.swapKey||x.oldBuilding===x.newBuilding)&&(fa.unknown||fb.unknown||fb.levels>fa.levels))throw Error("Ухудшение вертикального маршрута");
   const old=scoreDays33(a),now=scoreDays33(b);if(!old||!now||now.activeDays>old.activeDays||now.windows>old.windows||now.span>old.span||now.maxSpan>old.maxSpan||now.maxBlocks>old.maxBlocks||now.lessonMinutes!==old.lessonMinutes)throw Error("Ухудшение нагрузки");
  }
  const select=arr=>arr.filter(v=>v.group===q.group&&monday32(v.date)===x.weekStart),a=pedagogy39(select(cards),profile),b=pedagogy39(select(final),profile);
  if(config.pedProtect&&!protectPed39(a,b))throw Error("Ухудшение педагогического критерия");
  pedagogy.push({group:q.group,week:x.weekStart,before:a,after:b});
  const settings=scenario42(config),fBefore=fatigueWeek42(select(cards),profile,settings),fAfter=fatigueWeek42(select(final),profile,settings),fatigue=compareFatigue42(fBefore,fAfter),route=routeCost42(floorPair,settings);
  if(reject42({fatigue,route},config))throw Error("Ухудшение сценарного индекса или неполное сравнение");
  workload.comparable+=Number(fatigue.comparable);workload.fullyRated+=Number(fatigue.fullyRated);workload.fatigueGain+=fatigue.gain;workload.routeGain+=route.gain;workload.routeUnknown+=Number(!route.known);workload.details.push({group:q.group,week:x.weekStart,fatigue,route,before:fBefore,after:fAfter});
 }
 const before=aggregateDays30(cards),after=aggregateDays30(final);
 if(final.length!==cards.length||fBy.size!==cards.length||final.some(q=>!changed.has(q.id)&&q!==by.get(q.id)))throw Error("Нарушение состава");
 for(const k of ["group","teacher"])if(after[k].windows>before[k].windows||after[k].span>before[k].span||after[k].lessonMinutes!==before[k].lessonMinutes||after[k].days>before[k].days||before[k].days-before[k].usableDays!==after[k].days-after[k].usableDays)throw Error("Нарушение общего баланса");
 const passport=config.register?check40(ctx,final,moves,config.register,config.requireRoom):null;if(passport&&!passport.ok)throw Error("Нарушен паспорт ограничений: "+passport.issues[0].code);
 const order=auditOrder49(ctx,moves,config,final);if(!order.ok)throw Error("Нарушена обязательная последовательность дисциплин");
 const weekly=compareWeekPackage43(ctx,final,moves,pool.weeklyIndex);
 if(config.weekProtect){for(const x of moves.filter(v=>v.kind!=="room")){const q=by.get(x.id);for(const kind of ["group","teacher"]){const id=kind==="group"?q.group:q.teacher,row=weekly.rows[kind].find(r=>r.id===id&&r.monday===x.weekStart);if(!row?.nonWorse)throw Error("Ухудшение недельного распределения")}}}
 return {moves,before,after,groupCross,teacherCross,pedagogy,passport,vertical,workload,weekly,order,uncertain:moves.filter(x=>x.uncertainty).length};
}
function solve39(ctx,pool,profile,config,priority){return optimize47(ctx,pool,profile,config,priority)}
const multi39={source:null,room:null,inter:null,profile:{ratings:{},links:[],notes:{}},pedOpen:false,group:"",week:"all",course:"all",strict:true,pedProtect:true,limit:30,runs:[],active:0,msg:"",running:false,token:0};
function sync39(){const s=multi39;if(s.source!==inter33.context){stopJob51("Исходные данные изменились.");s.source=inter33.context;s.room=null;s.inter=null;s.runs=[];s.active=0;s.msg="";s.running=false;s.token++;s.group="";s.profile={ratings:{},links:[],notes:{}};s.pedOpen=false}return s}
function invalidate39(){stopJob51("Настройки изменены.");multi39.runs=[];multi39.active=0;multi39.msg="Настройки изменены. Выполните новый расчёт."}
function renderMulti39(){
 const s=sync39(),ctx=s.source;
 let h='<section class="panel" id="multi39"><div class="eyebrow23">Комплексная лаборатория · 0.51</div><h2>Расписание: пространство, время и педагогика</h2><p>В едином пакете сравниваются изменения времени, дня и аудитории. Педагогические оценки вводятся для конкретной группы, а не назначаются автоматически по названиям предметов.</p>';
 if(!ctx)return h+'<p>Сначала загрузите исходные данные в лаборатории расписания.</p></section>';
 const groups=ctx.ready.groups.map(g=>g.group);if(!groups.includes(s.group))s.group=groups[0]||"";
 const subjectMap=new Map(ctx.ready.cards.filter(q=>q.group===s.group&&q.subject).map(q=>[key26(q.subject),q.subject])),subjects=[...subjectMap].sort((a,b)=>a[1].localeCompare(b[1],"ru"));
 const select=(id,rows,v)=>'<select id="'+id+'">'+rows.map(([k,n])=>'<option value="'+esc(k)+'" '+(v===k?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select>';
 const coverage=ctx.ready.cards.filter(q=>s.profile.ratings[pedagogyKey39(q.group,q.subject)]!==undefined).length;
 h+='<details id="pedDetails39" '+(s.pedOpen?"open":"")+'><summary>1. Педагогический профиль · оценено '+coverage+' из '+ctx.ready.cards.length+' карточек</summary><p>Субъективная шкала сложности 1–5; 4–5 считаются повышенной нагрузкой. Позднее занятие — с 14:55. Смежность задаётся направленной парой предметов, которые желательно проводить последовательно в один день. Это предпочтения, не официальные пререквизиты.</p><label>Учебная группа'+select("pedGroup39",groups.map(g=>[g,g]),s.group)+'</label><label>Основание оценок и связей (необязательно)<input id="pedNote39" maxlength="300" value="'+esc(s.profile.notes[s.group]||"")+'" placeholder="Например, оценка преподавателя, рабочая программа, опрос"></label><div class="scroll"><table><tr><th>Предмет</th><th>Сложность</th></tr>'+subjects.map(([k,n])=>'<tr><td>'+esc(n)+'</td><td><select data-rating39="'+esc(k)+'"><option value="">Не оценена</option>'+[1,2,3,4,5].map(v=>'<option value="'+v+'" '+(s.profile.ratings[pedagogyKey39(s.group,k)]===v?"selected":"")+'>'+v+'</option>').join("")+'</select></td></tr>').join("")+'</table></div><h4>Желательная последовательность разных предметов</h4><div class="row"><label>Сначала'+select("pedFrom39",subjects,"")+'</label><label>Затем'+select("pedTo39",subjects,"")+'</label><button id="pedLink39">Добавить связь</button></div>'+s.profile.links.filter(x=>x.group===s.group).map(x=>'<div class="row"><span>'+esc((subjectMap.get(x.from)||x.from)+" → "+(subjectMap.get(x.to)||x.to))+'</span><button data-unlink39="'+esc(JSON.stringify([x.group,x.from,x.to]))+'">Удалить</button></div>').join("")+'<p class="muted">Профиль действует в текущем сеансе и включается в экспорт вместе с введёнными основаниями; введённые сведения не проверяются автоматически. Неоценённые предметы не получают нулевую сложность. Пиковая сумма баллов считается только для полностью оценённых непересекающихся дней.</p></details>';
 h+='<h3>2. Параметры модели</h3><div class="row"><label>Неделя'+select("multiWeek39",[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]],s.week)+'</label><label>Курс'+select("multiCourse39",[["all","Все"],...["1","2","3","4","5"].map(x=>[x,x])],s.course)+'</label><label>Лимит изменений<input id="multiLimit39" type="number" min="1" max="50" value="'+esc(s.limit)+'"></label></div><label style="display:block"><input id="multiStrict39" type="checkbox" '+(s.strict?"checked":"")+'> Только без неясных карточек в интервалах</label><label style="display:block"><input id="multiPed39" type="checkbox" '+(s.pedProtect?"checked":"")+'> Не ухудшать измеримые педагогические критерии</label><p class="notice">Не более одного изменения на группу и преподавателя в конкретной неделе. Введённые паспорта ограничений применяются при расчёте. Не подтверждены внешняя занятость, реальные времена ходьбы и содержание тем. Поиск комбинаций с оценкой верхней границы; не глобальный оптимум всех возможных расписаний.</p><button id="runMulti39" class="primary" '+(s.running||opportunities29.loading?"disabled":"")+'>'+(s.running?"Расчёт…":"Рассчитать четыре комплексные модели")+'</button><p role="status">'+esc(s.msg)+'</p>';
 if(!s.runs.length)return h+'</section>';
 const r=s.runs[s.active],sum=(key,side)=>r.pedagogy.reduce((n,p)=>n+p[side][key],0);
 h+='<h3>3. Сравнение моделей</h3><div class="scroll"><table><tr><th>Модель</th><th>Время / день / аудитория / время и место</th><th>Устранено переходов групп / преподавателей</th><th>Окна групп</th><th>Группо-мин</th><th>С неясностью</th></tr>'+s.runs.map((x,i)=>'<tr><td><button data-multi39="'+i+'" aria-pressed="'+(s.active===i)+'">'+esc(x.name)+'</button></td><td>'+["same","inter","room","combined"].map(k=>x.moves.filter(v=>v.kind===k).length).join(" / ")+'</td><td>'+x.groupCross+' / '+x.teacherCross+'</td><td>'+(x.before.group.windows-x.after.group.windows)+'</td><td>'+(x.before.group.span-x.after.group.span)+'</td><td>'+x.uncertain+'</td></tr>').join("")+'</table></div><p>Кандидатов: '+r.considered+'; отсеяно педагогическим фильтром: '+r.pedExcluded+'; отсеяно индексом нагрузки и маршрутов: '+r.workloadExcluded+'; по недельной нагрузке: '+r.weeklyExcluded+'; по обязательным связям: '+(r.orderExcluded||0)+'. '+(r.moves.length?"Итоговая проверка пакета пройдена.":"Нет выбранных изменений.")+'</p><h3>Педагогические показатели затронутых группо-недель</h3><div class="grid">'+[["Карточки с оценкой",sum("rated","before")+" / "+sum("cards","before")],["Поздние сложные занятия",sum("late","before")+" → "+sum("late","after")],["Соседние сложные занятия",sum("heavyPairs","before")+" → "+sum("heavyPairs","after")],["Желательные связи",sum("links","before")+" → "+sum("links","after")],["Практика раньше первой видимой лекции",sum("practiceFirst","before")+" → "+sum("practiceFirst","after")],["Неполностью оценённые пригодные дни",sum("partialDays","before")+" → "+sum("partialDays","after")]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><p class="muted">При нулевом охвате сложность не оценена. Практика раньше лекции в наблюдаемой неделе не доказывает нарушения программы.</p><div class="scroll"><table><tr><th>Группа</th><th>Занятие</th><th>Было</th><th>Стало</th></tr>'+r.moves.map(x=>{const q=ctx.byId.get(x.id);return '<tr><td>'+esc(x.group)+'</td><td>'+esc(x.subject)+'</td><td>'+esc(q.date+" · "+clock26(q.start)+" · "+q.room)+'</td><td>'+esc(x.newDate+" · "+clock26(x.newStart)+" · "+x.newRoom)+'</td></tr>'}).join("")+'</table></div><button id="exportMulti39">Скачать протокол JSON</button>';
 h+='<h3>Перепады этажей в затронутых днях</h3><div class="grid">'+[["Группы",r.vertical.group],["Преподаватели",r.vertical.teacher]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v.before+' → '+v.after+'</strong><small>Неизвестные переходы: '+v.unknownBefore+' → '+v.unknownAfter+'</small></div>').join("")+'</div><p class="muted">Сумма абсолютных перепадов этажей внутри одного корпуса. Изменение числа межкорпусных переходов может менять состав измеряемых переходов; это не время ходьбы.</p><h3>Проверка введённых ограничений</h3><p>Исключения по паспортам (причины могут пересекаться): '+esc(Object.entries(r.passportExcluded||{}).map(([k,v])=>(labels40[k]||k)+": "+v).join("; ")||"нет")+'.</p><p>Выбранных изменений с недостающими сведениями в паспортах: '+new Set((r.passport?.unknown||[]).map(x=>x.id)).size+' из '+r.moves.length+'.</p><details><summary>Что не установлено для выбранного пакета</summary>'+Object.entries((r.passport?.unknown||[]).reduce((m,x)=>(m[x.code]=(m[x.code]||0)+1,m),{})).map(([k,n])=>'<p>'+esc(labels40[k]||k)+': '+n+'</p>').join("")+'</details><details><summary>Педагогические показатели по затронутым группам</summary><p>Пиковая дневная нагрузка измеряется только для полностью оценённых дней. При неполном охвате результат частичный; ноль не означает отсутствие нагрузки.</p><div class="scroll"><table><tr><th>Группа / неделя</th><th>Оценено карточек</th><th>Пиковая нагрузка (баллы)</th><th>Поздние сложные</th><th>Смежные сложные</th><th>Желательные связи</th><th>Основание</th></tr>'+r.pedagogy.map(p=>{const a=p.before,b=p.after,peak=x=>x.usableDays>x.partialDays?x.peak:"—";return '<tr><td>'+esc(p.group+" · "+p.week)+'</td><td>'+a.rated+' / '+a.cards+'</td><td>'+peak(a)+' → '+peak(b)+'</td><td>'+a.late+' → '+b.late+'</td><td>'+a.heavyPairs+' → '+b.heavyPairs+'</td><td>'+a.links+' → '+b.links+'</td><td>'+esc(s.profile.notes[p.group]||"Не указано")+'</td></tr>'}).join("")+'</table></div></details>'+(!coverage?'<p class="notice">Сложность ни одной дисциплины не оценена: модель с педагогическим приоритетом пока использует остальные критерии, а не доказанное качество учебной нагрузки.</p>':"")+'<details><summary>Какие ограничения ещё не подтверждены?</summary><p>Этажи, конкретные входы, лестницы и лифты; доступность для МГН; оборудование и численность групп; смены и индивидуальные ограничения преподавателей; потоки и подгруппы; содержание и пререквизиты тем; фактическая длительность переходов, включая сезонные условия; внешнее расписание других институтов. До получения данных они не подменяются предположениями.</p></details>';
 return h+'</section>';
}
function bindMulti39(){
 const s=sync39();
 on("pedDetails39","toggle",e=>{s.pedOpen=e.target.open});
 on("pedNote39","input",e=>{s.profile.notes[s.group]=e.target.value});
 on("pedGroup39","change",e=>{s.group=e.target.value;render()});
 document.querySelectorAll("[data-rating39]").forEach(el=>el.onchange=()=>{const k=pedagogyKey39(s.group,el.dataset.rating39);if(el.value)s.profile.ratings[k]=+el.value;else delete s.profile.ratings[k];invalidate39();render()});
 on("pedLink39","click",()=>{const from=$("pedFrom39")?.value,to=$("pedTo39")?.value;if(!from||!to||from===to){s.msg="Выберите два разных предмета.";render();return}if(!s.profile.links.some(x=>x.group===s.group&&x.from===from&&x.to===to))s.profile.links.push({group:s.group,from,to});invalidate39();render()});
 document.querySelectorAll("[data-unlink39]").forEach(el=>el.onclick=()=>{s.profile.links=s.profile.links.filter(x=>JSON.stringify([x.group,x.from,x.to])!==el.dataset.unlink39);invalidate39();render()});
 for(const [id,k] of [["multiWeek39","week"],["multiCourse39","course"]])on(id,"change",e=>{s[k]=e.target.value;invalidate39();render()});
 on("multiLimit39","change",e=>{s.limit=e.target.valueAsNumber;invalidate39();render()});
 for(const [id,k] of [["multiStrict39","strict"],["multiPed39","pedProtect"]])on(id,"change",e=>{s[k]=e.target.checked;invalidate39();render()});
 on("runMulti39","click",()=>startJob51(s));
 document.querySelectorAll("[data-multi39]").forEach(el=>el.onclick=()=>{s.active=+el.dataset.multi39;render()});
 on("exportMulti39","click",()=>{if(s.runs.length)download("kantor-integrated-models.json",JSON.stringify({version:"0.51",checked:s.source.ready.checked,status:"observed-only",profile:s.profile,runs:s.runs},null,2),"application/json")});
}
