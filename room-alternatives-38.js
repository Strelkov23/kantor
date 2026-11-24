/* 0.38 conservative spatial room alternatives */
function routeDelta38(list,id,building){
 const i=list.findIndex(q=>q.id===id);if(i<0)return null;
 const q=list[i],pairs=[];
 for(const j of [i-1,i+1]){
  if(j<0||j>=list.length)continue;
  const v=list[j];if(!q.building||!v.building)return null;
  const before=q.building!==v.building,after=building!==v.building;
  if(after&&building!==q.building)return null;
  const gap=j<i?q.start-v.end:v.start-q.end;
  if(gap<15&&building!==q.building)return null;
  pairs.push({neighbor:v.id,old:q.building,next:building,other:v.building,gap,before,after});
 }
 return {saved:pairs.filter(x=>x.before&&!x.after).length,pairs};
}
function roomBusy38(entries,id,room,start,end){
 const conflicts=[],unclear=[];
 for(const e of entries){
  if(e.id===id||e.valid&&!(e.start<end&&start<e.end))continue;
  if(e.knownRooms.includes(room)||e.unknownRooms.some(t=>String(t).toLocaleLowerCase("ru").split(/[^\p{L}\p{N}-]+/u).includes(room)))conflicts.push(e.id);
  else if(!e.valid||!e.roomComplete)unclear.push(e.id);
 }
 return {conflicts,unclear};
}

function roomAlternatives38(ctx){
 const cards=ctx.ready.cards,rooms=new Map(),days=new Map(),reasons={},results=[];
 const count=k=>reasons[k]=(reasons[k]||0)+1;
 for(const q of cards)if(q.room&&q.building&&q.type&&q.time){
  if(!rooms.has(q.roomKey))rooms.set(q.roomKey,{key:q.roomKey,room:q.room,building:q.building,types:new Set(),subjects:new Set(),cards:0});
  const r=rooms.get(q.roomKey);r.types.add(key26(q.type));r.subjects.add(key26(q.subject));r.cards++;
 }
 for(const e of ctx.occ.values()){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)}
 let attempts=0,eligible=0;
 for(const q of cards){
  if(!q.eligible||ctx.metadata.get(q.id)?.pdfStatus!=="text-and-room-match"){count("source");continue}
  const w=ctx.weeks.byGroup.get(q.group)?.find(v=>v.monday===monday32(q.date)),meta=ctx.metadata.get(q.id);
  if(!w||!["upper","lower"].includes(w.status)||![w.status,"both"].includes(meta.weekLabel)){count("week");continue}
  const g=sorted29(ctx.groupDays.get(ctx.key(q.group,q.date))||[]),t=sorted29(unique29(ctx.teacherDays.get(ctx.key(q.teacher,q.date))||[]));
  if(!g.some(x=>x.id===q.id)||!t.some(x=>x.id===q.id)||[g,t].some(a=>a.some(x=>!x.time)||collision29(a))||t.some(x=>x.teacher!==q.teacher)){count("day");continue}
  const neighbors=list=>{const i=list.findIndex(x=>x.id===q.id);return [list[i-1],list[i+1]].filter(Boolean).map(x=>x.building)};
  const targets=[...new Set([...neighbors(g),...neighbors(t)].filter(x=>x&&x!==q.building))];
  if(!targets.length){count("noTarget");continue}
  const original=ctx.occ.get(q.id),day=days.get(q.date)||[];
  if(day.some(e=>e.id!==q.id&&possibleConflict31(e,original).length)){count("originalConflict");continue}
  eligible++;
  for(const building of targets){
   const gd=routeDelta38(g,q.id,building),td=routeDelta38(t,q.id,building);
   if(!gd||!td||gd.saved+td.saved===0){count("route");continue}
   for(const r of rooms.values()){
    if(r.building!==building||!r.types.has(key26(q.type)))continue;
    attempts++;
    const busy=roomBusy38(day,q.id,r.key,q.start,q.end);
    if(busy.conflicts.length){count("occupied");continue}
    const other=day.filter(e=>e.id!==q.id&&(!e.valid||e.start<q.end&&q.start<e.end)&&(!e.valid||!e.teacherComplete||!e.roomComplete));
    results.push({id:q.id,group:q.group,course:q.course,date:q.date,weekStart:w.monday,weekType:w.status,subject:q.subject,type:q.type,teacher:q.teacherName,start:q.start,end:q.end,oldRoom:q.room,newRoom:r.room,oldBuilding:q.building,newBuilding:building,groupSaved:gd.saved,teacherSaved:td.saved,groupEdges:gd.pairs,teacherEdges:td.pairs,unclear:busy.unclear.length,unclearCards:other.length,observedSameSubject:r.subjects.has(key26(q.subject)),roomCards:r.cards});
   }
  }
 }
 results.sort((a,b)=>b.groupSaved-a.groupSaved||b.teacherSaved-a.teacherSaved||a.unclearCards-b.unclearCards||Number(b.observedSameSubject)-Number(a.observedSameSubject)||b.roomCards-a.roomCards||a.id.localeCompare(b.id)||a.newRoom.localeCompare(b.newRoom));
 if(attempts!==results.length+(reasons.occupied||0))throw Error("Баланс попыток выбора помещений");
 return {checked:ctx.ready.checked,rooms:rooms.size,eligible,attempts,reasons,results};
}
const room38={source:null,result:null,error:"",strict:true,week:"all",course:"all",group:"",selected:"",page:0,running:false,token:0};
const keyRoom38=x=>JSON.stringify([x.id,x.newRoom]);
function syncRoom38(){const s=room38;if(s.source!==inter33.context){s.source=inter33.context;s.result=null;s.error="";s.selected="";s.page=0;s.running=false;s.token++}return s}
function rowsRoom38(){const s=syncRoom38();return (s.result?.results||[]).filter(x=>(!s.strict||!x.unclearCards)&&(s.week==="all"||s.week===x.weekType)&&(s.course==="all"||s.course===String(x.course))&&key26(x.group).includes(key26(s.group)))}
function renderRoom38(){
 const s=syncRoom38(),d=s.result;
 let h='<section class="panel" id="room38"><div class="eyebrow23">Пространственная модель · 0.38</div><h2>Подбор аудитории без изменения времени пары</h2><p>Ищем варианты, уменьшающие число наблюдаемых смен корпусов у группы или преподавателя без создания новых межкорпусных переходов. Дата, неделя, время и дисциплина сохраняются.</p><p class="notice">Независимые предложения, не готовые назначения. Совпадение вида занятия не подтверждает вместимость, оснащение или доступность. Время ходьбы в минутах не оценивается.</p><div class="row"><button id="runRoom38" class="primary" '+(!s.source||s.running||opportunities29.loading?"disabled":"")+'>'+(s.running?"Расчёт…":d?"Пересчитать варианты":"Найти варианты аудиторий")+'</button><button data-tab="campus13">Реестр и паспорта аудиторий</button><button data-tab="survey15">Измерение маршрутов</button></div><p role="status">'+esc(s.error||(!s.source?"Сначала загрузите исходный снимок.":""))+'</p>';
 if(!d)return h+'</section>';
 const rows=rowsRoom38(),distinct=new Set(d.results.map(x=>x.id)).size,strict=d.results.filter(x=>!x.unclearCards).length,select=(id,items,value)=>'<select id="'+id+'">'+items.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===value?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select>';
 h+='<p class="source23">'+esc(calendarStatus27(opportunities29.snapshot))+'</p><div class="grid">'+[["Наблюдаемые помещения с видом занятия",d.rooms],["Проверено сочетаний",d.attempts],["Предварительные альтернативы",d.results.length],["Разных исходных занятий",distinct],["Без неясных карточек в интервале",strict]].map(([n,v])=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="row"><label>Неделя'+select("roomWeek38",[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]],s.week)+'</label><label>Курс'+select("roomCourse38",[["all","Все"],...["1","2","3","4","5"].map(x=>[x,x])],s.course)+'</label><label>Группа<input id="roomGroup38" value="'+esc(s.group)+'"></label></div><label style="display:block;margin:12px 0"><input type="checkbox" id="roomStrict38" '+(s.strict?"checked":"")+'> Исключить варианты с остаточной неопределённостью в интервале</label><p>По фильтру: '+rows.length+'. Варианты одного занятия взаимоисключающие; эффекты строк нельзя складывать.</p>';
 const pages=Math.max(1,Math.ceil(rows.length/30));s.page=Math.min(s.page,pages-1);
 if(rows.length)h+='<div class="scroll"><table><tr><th>Группа / дата</th><th>Дисциплина</th><th>Аудитория: было → может быть</th><th>Устранено смен корпусов: группа / преподаватель</th><th>Неясных карточек</th></tr>'+rows.slice(s.page*30,s.page*30+30).map(x=>'<tr><td><button data-room38="'+esc(keyRoom38(x))+'">'+esc(x.group)+'</button><small>'+esc(x.date+" · "+clock26(x.start)+" · "+weekName32(x.weekType))+'</small></td><td>'+esc(x.subject)+'</td><td>'+esc(x.oldRoom+" → "+x.newRoom)+'</td><td>'+x.groupSaved+' / '+x.teacherSaved+'</td><td>'+x.unclearCards+'</td></tr>').join("")+'</table></div><div class="row"><button id="prevRoom38" '+(!s.page?"disabled":"")+'>Назад</button><span>Страница '+(s.page+1)+' / '+pages+'</span><button id="nextRoom38" '+(s.page>=pages-1?"disabled":"")+'>Далее</button><button id="csvRoom38">CSV вариантов</button></div>';
 else h+='<p class="muted">Нет вариантов в выбранном режиме. Это не доказательство невозможности улучшений.</p>';
 const x=rows.find(v=>keyRoom38(v)===s.selected);
 if(x){
  const visual=(edges,title)=>'<div><h4>'+title+'</h4>'+(edges.length?edges.map(e=>'<div class="metric"><p>Соседний корпус <b>'+esc(e.other)+'</b></p><p>'+esc(e.old)+' ↔ '+esc(e.other)+' → <b class="good">'+esc(e.next)+' ↔ '+esc(e.other)+'</b></p><small>Перерыв '+e.gap+' мин · '+(e.before&&!e.after?"смена корпуса устраняется":"смены корпуса не было")+'</small></div>').join(""):'<p class="muted">Нет соседней пары.</p>')+'</div>';
  const passport=room18.data?.checked===d.checked?room18.details[x.newRoom]:null;
  h+='<section id="roomDetail38" style="margin-top:18px"><h3>'+esc(x.group+" · "+x.subject)+'</h3><p>'+esc(x.date+" · "+clock26(x.start)+"–"+clock26(x.end)+" · "+x.teacher)+'</p><div class="row"><div class="metric"><small>Исходная аудитория</small><strong>'+esc(x.oldRoom)+'</strong><small>'+esc(instituteCatalog.buildings[x.oldBuilding])+'</small></div><div aria-hidden="true">→</div><div class="metric"><small>Предлагаемая аудитория</small><strong>'+esc(x.newRoom)+'</strong><small>'+esc(instituteCatalog.buildings[x.newBuilding])+'</small></div></div><div class="compare-grid24">'+visual(x.groupEdges,"Переходы группы")+visual(x.teacherEdges,"Переходы преподавателя")+'</div><h4>Что необходимо подтвердить?</h4><p>Такой же вид занятия наблюдался. Та же дисциплина: '+(x.observedSameSubject?"наблюдалась":"не наблюдалась")+'.</p><p>Паспорт помещения: '+(passport?esc("вместимость "+(passport.capacity??"не указана")+", оснащение "+(passport.equipment||"не указано")+", источник "+passport.source):"не введён для этого снимка")+'. Численность группы, оснащение и доступность в общеакадемическом расписании требуют отдельной проверки.</p></section>';
 }
 const labels={source:"Неоднозначная карточка или нет совпадения с PDF",week:"Не подтверждена неделя",day:"Неоднозначный день",noTarget:"Нет соседнего другого корпуса",originalConflict:"Явное совпадение ресурсов исходной пары",route:"Новый переход, неизвестный маршрут или малый интервал",occupied:"Явное совпадение целевой аудитории"};
 return h+'<details><summary>Причины исключения</summary><p>Счётчики относятся к разным этапам; не суммируются как число попыток.</p>'+Object.entries(d.reasons).map(([k,v])=>'<p>'+esc(labels[k]||k)+': <b>'+v+'</b></p>').join("")+'</details></section>';
}
function bindRoom38(){
 const s=syncRoom38();
 on("runRoom38","click",()=>{if(!s.source||s.running||opportunities29.loading)return;const ctx=s.source,token=++s.token;s.running=true;s.error="";render();setTimeout(()=>{if(token!==s.token||ctx!==inter33.context)return;try{s.result=roomAlternatives38(ctx);s.selected="";s.page=0}catch(e){s.error=e.message;s.result=null}finally{s.running=false;render()}},20)});
 for(const [id,k] of [["roomWeek38","week"],["roomCourse38","course"],["roomGroup38","group"]])on(id,"change",e=>{s[k]=e.target.value;s.page=0;s.selected="";render()});
 on("roomStrict38","change",e=>{s.strict=e.target.checked;s.page=0;s.selected="";render()});
 on("prevRoom38","click",()=>{s.page=Math.max(0,s.page-1);render()});on("nextRoom38","click",()=>{s.page++;render()});
 document.querySelectorAll("[data-room38]").forEach(b=>b.onclick=()=>{s.selected=b.dataset.room38;render();$("roomDetail38")?.scrollIntoView?.({block:"start"})});
 on("csvRoom38","click",()=>{if(!s.result)return;const cols=["group","date","weekType","subject","type","teacher","start","oldRoom","newRoom","groupSaved","teacherSaved","unclearCards","observedSameSubject"],rows=[cols.concat("checked","status"),...rowsRoom38().map(x=>cols.map(k=>x[k]).concat(s.result.checked,"independent-review-only"))];download("kantor-room-alternatives.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
