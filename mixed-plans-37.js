/* 0.37: mixed dated packages with conservative weekly independence and final audit. */
function conflict37(a,b,byId){
 if(a.id===b.id)return true;
 const x=byId.get(a.id),y=byId.get(b.id);
 if(a.weekStart===b.weekStart&&(x.group===y.group||x.teacher===y.teacher))return true;
 return a.newDate===b.newDate&&x.roomKey===y.roomKey&&a.newStart<b.newEnd&&b.newStart<a.newEnd;
}
function apply37(cards,moves){
 const by=new Map(moves.map(x=>[x.id,x]));
 if(by.size!==moves.length)throw Error("Повторный перенос");
 return cards.map(q=>{const x=by.get(q.id);return x?{...q,date:x.newDate,start:x.newStart,end:x.newEnd}:q});
}

function pool37(ctx,screen,inter,strict,week,course){
 if(!ctx||screen.checked!==ctx.ready.checked||inter?.checked!==ctx.ready.checked)throw Error("Нужен единый снимок и расчёт между днями");
 const reviews=new Map(resourceReview33(ctx,screen).map(x=>[moveKey30(x),x]));
 const same=filter34(screen.results,reviews,{week,course,strict}).map(x=>({...x,oldDate:x.date,newDate:x.date,kind:"same",uncertainty:Math.max(x.unresolved,reviews.get(moveKey30(x)).remainingUnclear)}));
 const other=inter.moves.filter(x=>["upper","lower"].includes(x.weekType)&&(week==="all"||x.weekType===week)&&(course==="all"||String(x.course)===course)&&(!strict||!x.unresolved)).map(x=>({...x,kind:"inter",uncertainty:x.unresolved}));
 return [...same,...other];
}
const key37=x=>JSON.stringify([x.id,x.newDate,x.newStart]);
function audit37(ctx,selected,pool){
 const allowed=new Map(pool.map(x=>[key37(x),x])),moves=selected.map(x=>{const a=allowed.get(key37(x));if(!a)throw Error("Неизвестный кандидат");return a}),cards=ctx.ready.cards,by=ctx.byId;
 for(let i=0;i<moves.length;i++){
  const x=moves[i],q=by.get(x.id);
  if(!q||x.oldDate!==q.date||x.oldStart!==q.start||x.newEnd-x.newStart!==q.end-q.start||monday32(x.oldDate)!==monday32(x.newDate))throw Error("Нарушена исходная карточка или неделя");
  if(x.kind==="inter"){if(!verifyInterday33(ctx,q,x.newDate,x.newStart).move)throw Error("Перенос между днями не прошёл проверку")}else if(!auditMove29(cards,x))throw Error("Перенос внутри дня не прошёл проверку");
  for(let j=0;j<i;j++)if(conflict37(x,moves[j],by))throw Error("Конфликт пакета");
 }
 const final=apply37(cards,moves),fBy=new Map(final.map(q=>[q.id,q])),occ=ctx.occ,moveIds=new Set(moves.map(x=>x.id)),before=aggregateDays30(cards),after=aggregateDays30(final);
 const touched=[];
 for(const x of moves){
  const q=by.get(x.id),next=fBy.get(x.id),o={...occ.get(x.id),date:next.date,start:next.start,end:next.end};
  for(const v of final){if(v.id===q.id||v.date!==next.date)continue;
   const e={...occ.get(v.id),date:v.date,start:v.start,end:v.end};
   if(possibleConflict31(e,o).length)throw Error("Явный конфликт ресурса в итоговом расписании");
   if(v.group===q.group&&(!v.time||overlap29(v,next)))throw Error("Конфликт группы в итоговом расписании");
  }
  const dates=[...new Set([q.date,next.date])];
  for(const kind of ["group","teacher"]){
   const get=(arr,date)=>{const list=arr.filter(v=>v.date===date&&(kind==="group"?v.group===q.group:occ.get(v.id).knownTeachers.includes(q.teacher)));return kind==="teacher"?unique29(list):list};
   const old=dates.map(dt=>get(cards,dt)),now=dates.map(dt=>get(final,dt));
   if([...old,...now].some(a=>a.some(v=>!v.time||kind==="teacher"&&v.teacher!==q.teacher)||collision29(a))||!adjacency33(old,now))throw Error("Нарушение дня или перехода");
   if(x.kind==="same"&&!routeSafe29(old[0],now[0]))throw Error("Нарушение порядка");
   const a=scoreDays33(old),b=scoreDays33(now);
   if(!a||!b||b.activeDays>a.activeDays||b.windows>a.windows||b.span>a.span||b.maxSpan>a.maxSpan||b.maxBlocks>a.maxBlocks||a.lessonMinutes!==b.lessonMinutes)throw Error("Ухудшение показателя затронутых дней");
   touched.push({kind,resource:kind==="group"?q.group:q.teacher,dates,before:a,after:b});
  }
  // Verify the subject order against the actual final week, not only individual proposals.
  const list=arr=>arr.filter(v=>v.group===q.group&&monday32(v.date)===x.weekStart&&key26(v.subject)===key26(q.subject)).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start||a.id.localeCompare(b.id));
  if(list(cards).map(v=>v.id).join("|")!==list(final).map(v=>v.id).join("|"))throw Error("Изменён порядок дисциплины");
 }
 if(final.length!==cards.length||fBy.size!==cards.length||final.some(q=>!moveIds.has(q.id)&&q!==by.get(q.id)))throw Error("Изменён состав расписания");
 for(const k of ["group","teacher"])if(after[k].windows>before[k].windows||after[k].span>before[k].span||after[k].lessonMinutes!==before[k].lessonMinutes||after[k].days>before[k].days||before[k].days-before[k].usableDays!==after[k].days-after[k].usableDays)throw Error("Нарушение баланса итоговых показателей");
 return {moves,before,after,touched,uncertain:moves.filter(x=>x.uncertainty>0).length};
}
function solve37(ctx,pool,limit,priority){
 const delta=x=>{const g=x.groupBefore,h=x.groupAfter,t=x.teacherBefore,u=x.teacherAfter;return {windows:g.windows-h.windows,span:g.span-h.span,days:x.kind==="inter"?g.activeDays-h.activeDays:0,teacher:t.windows-u.windows}};
 const cmp=(a,b)=>{const x=delta(a),y=delta(b);return (priority==="days"?y.days-x.days:priority==="span"?y.span-x.span:y.windows-x.windows)||y.windows-x.windows||y.span-x.span||y.teacher-x.teacher||a.uncertainty-b.uncertainty||key37(a).localeCompare(key37(b))};
 let selected=[],rejected=0;
 for(const x of pool.slice().sort(cmp)){if(selected.length>=limit)break;if(selected.some(y=>conflict37(x,y,ctx.byId))){rejected++;continue}try{audit37(ctx,[...selected,x],pool);selected.push(x)}catch(e){rejected++}}
 return {...audit37(ctx,selected,pool),rejected,considered:pool.length};
}
const mixed37={source:null,inter:null,strict:true,week:"all",course:"all",limit:30,priority:"windows",runs:[],active:0,group:"",message:"",detail:""};
function sync37(){const s=mixed37;if(s.source!==opportunities29.data||s.inter!==inter33.data){s.source=opportunities29.data;s.inter=inter33.data;s.runs=[];s.active=0;s.message="";s.detail=""}return s}
function renderMixed37(){
 const s=sync37(),ctx=inter33.context;
 let h='<section class="panel" id="mixed37"><div class="eyebrow23">Расширенная модель · 0.37</div><h2>Комплексные сценарии: внутри дня и между днями</h2><p>Сравните пакеты изменений по всему институту. Чтобы сохранить проверяемость, допускается не более одного переноса на группу и преподавателя в пределах конкретной учебной недели. Никаких переносов между верхней и нижней неделями.</p>';
 if(!s.source||!ctx)return h+'<p class="muted">Сначала загрузите и проверьте исходное расписание.</p></section>';
 if(!s.inter)return h+'<p>Нужно выполнить поиск между днями.</p><button id="prepareMixed37" class="primary" '+(inter33.running?"disabled":"")+'>'+(inter33.running?"Расчёт…":"Найти кандидатов между днями")+'</button><p role="status">'+esc(inter33.error)+'</p></section>';
 const select=(id,rows,v)=>'<select id="'+id+'">'+rows.map(([k,n])=>'<option value="'+esc(k)+'" '+(v===k?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select>';
 h+='<p class="notice">Исследовательский результат. Внешняя занятость, фактические маршруты, подгруппы и вместимость не подтверждены. Это консервативный поиск, не глобальный оптимум.</p><div class="row"><label>Неделя'+select("mixWeek37",[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]],s.week)+'</label><label>Курс'+select("mixCourse37",[["all","Все"],...["1","2","3","4","5"].map(x=>[x,x])],s.course)+'</label><label>Лимит переносов<input id="mixLimit37" type="number" min="1" max="50" value="'+esc(s.limit)+'"></label></div><label style="display:block;margin:12px 0"><input id="mixStrict37" type="checkbox" '+(s.strict?"checked":"")+'> Только без остаточной неопределённости</label><button id="runMixed37" class="primary" '+(opportunities29.loading?"disabled":"")+'>Рассчитать три сценария</button><p role="status">'+esc(s.message)+'</p>';
 if(!s.runs.length)return h+'</section>';
 const r=s.runs[s.active],delta=(r,k,v)=>r.before[k][v]-r.after[k][v];
 h+='<div class="scroll"><table><tr><th>Сценарий</th><th>Переносы внутри / между днями</th><th>Убрано окон групп</th><th>Группо-мин</th><th>Сокращено группо-дней</th><th>С неопределённостью</th></tr>'+s.runs.map((x,i)=>'<tr><td><button data-mix37="'+i+'" aria-pressed="'+(s.active===i)+'" '+(s.active===i?'class="primary"':"")+'>'+esc(x.name)+'</button></td><td>'+x.moves.filter(q=>q.kind==="same").length+' / '+x.moves.filter(q=>q.kind==="inter").length+'</td><td>'+delta(x,"group","windows")+'</td><td>'+delta(x,"group","span")+'</td><td>'+delta(x,"group","days")+'</td><td>'+x.uncertain+'</td></tr>').join("")+'</table></div><h3>'+esc(r.name)+'</h3><p>Кандидатов: '+r.considered+' · исключено при подборе: '+r.rejected+'. '+(r.moves.length?"Итоговая повторная проверка пройдена.":"Нет выбранных переносов. Это не доказательство оптимальности.")+'</p><p class="muted">Параметры расчёта: '+esc(r.config.week+" · "+r.config.course+" · лимит "+r.config.limit+" · "+(r.config.strict?"строгий":"предварительный"))+'</p><div class="grid">'+[["Окна групп",r.before.group.windows+" → "+r.after.group.windows],["Дни групп",r.before.group.days+" → "+r.after.group.days],["Окна преподавателей",r.before.teacher.windows+" → "+r.after.teacher.windows],["Дни преподавателей",r.before.teacher.days+" → "+r.after.teacher.days]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="scroll"><table><tr><th>Группа</th><th>Дисциплина</th><th>Было</th><th>Стало</th><th>Неделя</th></tr>'+r.moves.map(x=>'<tr><td><button data-mix-detail37="'+esc(key37(x))+'">'+esc(x.group)+'</button></td><td>'+esc(x.subject)+'</td><td>'+esc(x.oldDate+" "+clock26(x.oldStart))+'</td><td>'+esc(x.newDate+" "+clock26(x.newStart))+'</td><td>'+esc(weekName32(x.weekType))+'</td></tr>').join("")+'</table></div><button id="mixExport37">Скачать протокол всех сценариев</button>';
 const x=r.moves.find(q=>key37(q)===s.detail);
 if(x){const final=apply37(ctx.ready.cards,r.moves),list=(arr,dt)=>sorted29(arr.filter(q=>q.group===x.group&&q.date===dt)),dates=[...new Set([x.oldDate,x.newDate])];const view=(arr)=>dates.map(dt=>'<h4>'+esc(dt)+'</h4>'+list(arr,dt).map(q=>'<div class="compare-lesson24 '+(q.id===x.id?"changed24":"")+'"><strong>'+esc(q.time?clock26(q.start):"Неизвестно")+'</strong><div><b>'+esc(q.subject)+'</b><small>'+esc(q.roomLabel)+'</small></div></div>').join("")).join("");h+='<div id="mixDetail37"><h3>'+esc(x.group+" · "+x.subject)+'</h3><div class="compare-grid24"><div><h4>До</h4>'+view(ctx.ready.cards)+'</div><div><h4>После</h4>'+view(final)+'</div></div></div>'}
 return h+'</section>';
}
function bindMixed37(){
 const s=sync37();
 on("prepareMixed37","click",()=>{$("runInterday33")?.click()});
 for(const [id,k] of [["mixWeek37","week"],["mixCourse37","course"]])on(id,"change",e=>{s[k]=e.target.value;s.runs=[];s.detail="";render()});
 on("mixLimit37","change",e=>{s.limit=e.target.valueAsNumber;s.runs=[];s.detail="";render()});
 on("mixStrict37","change",e=>{s.strict=e.target.checked;s.runs=[];s.detail="";render()});
 on("runMixed37","click",()=>{try{if(!Number.isInteger(s.limit)||s.limit<1||s.limit>50)throw Error("Лимит 1–50");const ctx=inter33.context,pool=pool37(ctx,s.source,s.inter,s.strict,s.week,s.course),config={strict:s.strict,week:s.week,course:s.course,limit:s.limit};s.runs=[["windows","Меньше окон"],["span","Короче учебный день"],["days","Меньше учебных дней"]].map(([k,name])=>({...solve37(ctx,pool,s.limit,k),name,config}));s.active=0;s.detail="";s.message="Расчёт завершён."}catch(e){s.runs=[];s.message=e.message}render()});
 document.querySelectorAll("[data-mix37]").forEach(b=>b.onclick=()=>{s.active=+b.dataset.mix37;s.detail="";render()});
 document.querySelectorAll("[data-mix-detail37]").forEach(b=>b.onclick=()=>{s.detail=b.dataset.mixDetail37;render();$("mixDetail37")?.scrollIntoView?.({block:"start"})});
 on("mixExport37","click",()=>{if(s.runs.length)download("kantor-mixed-scenarios.json",JSON.stringify({version:"0.37",checked:s.source.checked,status:"observed-only",method:"conservative one group-week and teacher-week, full final audit",runs:s.runs},null,2),"application/json")});
}
