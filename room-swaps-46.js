/* 0.46: atomic two-room exchange at an identical dated interval. */
function swapMove46(q,r,w){
 return {id:q.id,group:q.group,course:q.course,subject:q.subject,type:q.type,teacher:q.teacherName,kind:"room",date:q.date,weekStart:w.monday,weekType:w.status,oldDate:q.date,newDate:q.date,oldStart:q.start,oldEnd:q.end,newStart:q.start,newEnd:q.end,oldRoom:q.room,newRoom:r.room,oldBuilding:q.building,newBuilding:r.building};
}
function swapWeek46(ctx,q){
 const meta=ctx.metadata.get(q.id),w=ctx.weeks.byGroup.get(q.group)?.find(v=>v.monday===monday32(q.date));
 return q.eligible&&meta?.pdfStatus==="text-and-room-match"&&w&&["upper","lower"].includes(w.status)&&[w.status,"both"].includes(meta.weekLabel)?w:null;
}
function swapRoute46(ctx,q,x,register){
 const result={};
 for(const kind of ["group","teacher"]){
  const raw=(kind==="group"?ctx.groupDays:ctx.teacherDays).get(ctx.key(kind==="group"?q.group:q.teacher,q.date))||[],before=kind==="teacher"?unique29(raw):raw;
  if(!before.some(v=>v.id===q.id)||before.some(v=>!v.time||kind==="teacher"&&v.teacher!==q.teacher)||collision29(before))return null;
  const after=apply39(before,[x]);
  try{edges39([before],[after])}catch(e){return null}
  const a=floorDay41([before],register),b=floorDay41([after],register);
  // Only compare complete routes; reject additional cross-building changes,
  // and reject additional within-building vertical movement for each party.
  if(a.unknown||b.unknown||b.cross>a.cross||b.levels>a.levels)return null;
  result[kind]={before:a,after:b,cross:a.cross-b.cross,levels:a.levels-b.levels,dayBefore:sorted29(before).map(v=>({id:v.id,start:v.start,end:v.end,subject:v.subject,room:v.roomLabel||v.room})),dayAfter:sorted29(after).map(v=>({id:v.id,start:v.start,end:v.end,subject:v.subject,room:v.roomLabel||v.room}))};
 }
 return result;
}
function checkSwap46(ctx,a,b,register,requireRoom,options={}){
 if(!a||!b||a.id===b.id||a.group===b.group||a.teacher===b.teacher||a.roomKey===b.roomKey||a.date!==b.date||a.start!==b.start||a.end!==b.end||key26(a.type)!==key26(b.type))return {reason:"shape"};
 const wa=swapWeek46(ctx,a),wb=swapWeek46(ctx,b);if(!wa||!wb||wa.status!==wb.status||wa.monday!==wb.monday)return {reason:"week"};
 const x=swapMove46(a,b,wa),y=swapMove46(b,a,wb),moves=[x,y],oa=ctx.occ.get(a.id),ob=ctx.occ.get(b.id);
 if(!oa?.valid||!ob?.valid||!oa.roomComplete||!ob.roomComplete||!oa.teacherComplete||!ob.teacherComplete||oa.knownRooms.length!==1||ob.knownRooms.length!==1||oa.knownRooms[0]!==a.roomKey||ob.knownRooms[0]!==b.roomKey)return {reason:"source"};
 const day=options.day||[...ctx.occ.values()].filter(e=>e.date===a.date),others=day.filter(e=>e.id!==a.id&&e.id!==b.id);
 if(possibleConflict31(oa,ob).length||others.some(e=>possibleConflict31(e,oa).length||possibleConflict31(e,ob).length))return {reason:"original-conflict"};
 const ra=swapRoute46(ctx,a,x,register),rb=swapRoute46(ctx,b,y,register);if(!ra||!rb)return {reason:"route"};
 const gain={groupCross:ra.group.cross+rb.group.cross,teacherCross:ra.teacher.cross+rb.teacher.cross,groupLevels:ra.group.levels+rb.group.levels,teacherLevels:ra.teacher.levels+rb.teacher.levels};
 if(Object.values(gain).every(v=>v===0))return {reason:"no-gain"};
 const ax={...oa,knownRooms:[b.roomKey]},bx={...ob,knownRooms:[a.roomKey]};
 if(possibleConflict31(ax,bx).length||others.some(e=>possibleConflict31(e,ax).length||possibleConflict31(e,bx).length))return {reason:"final-conflict"};
 if(roomBusy38(others,a.id,b.roomKey,a.start,a.end).conflicts.length||roomBusy38(others,b.id,a.roomKey,b.start,b.end).conflicts.length)return {reason:"final-room"};
 const unknown=others.filter(e=>(!e.valid||e.start<a.end&&a.start<e.end)&&(!e.valid||!e.teacherComplete||!e.roomComplete)).map(e=>e.id);
 if(options.strict&&unknown.length)return {reason:"unclear"};
 // Rebuild all cards, preserve identity and check both room passports on final assignments.
 const final=apply39(ctx.ready.cards,moves);
 if(final.length!==ctx.ready.cards.length||final.some((q,i)=>{const old=ctx.ready.cards[i];return q.id!==old.id||q.date!==old.date||q.start!==old.start||q.end!==old.end||q.subject!==old.subject||q.teacher!==old.teacher||q.group!==old.group||q.type!==old.type}))throw Error("Нарушена неизменность учебных назначений");
 const passport=check40(ctx,final,moves,register,requireRoom);
 if(!passport.ok)return {reason:"passport",codes:passport.issues.map(e=>e.code)};
 return {pair:{key:JSON.stringify([a.id,b.id].sort()),date:a.date,weekStart:wa.monday,weekType:wa.status,start:a.start,end:a.end,moves,routes:[ra,rb],gain,unknown,passportUnknown:passport.unknown}};
}
function swaps46(ctx,register,requireRoom,strict){
 if(register.checked!==ctx.ready.checked)throw Error("Паспорт относится к другому снимку");
 const slots=new Map(),days=new Map(),results=[],reasons={};
 for(const e of ctx.occ.values()){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)}
 for(const q of ctx.ready.cards){if(!swapWeek46(ctx,q))continue;const k=JSON.stringify([q.date,q.start,q.end,key26(q.type)]);if(!slots.has(k))slots.set(k,[]);slots.get(k).push(q)}
 let attempts=0;
 for(const list of slots.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  attempts++;const a=list[i],b=list[j],r=checkSwap46(ctx,a,b,register,requireRoom,{strict,day:days.get(a.date)||[]});
  if(r.pair)results.push(r.pair);else reasons[r.reason]=(reasons[r.reason]||0)+1;
 }
 if(attempts!==results.length+Object.values(reasons).reduce((s,v)=>s+v,0))throw Error("Баланс обменов");
 results.sort((a,b)=>(b.gain.groupCross+b.gain.teacherCross)-(a.gain.groupCross+a.gain.teacherCross)||(b.gain.groupLevels+b.gain.teacherLevels)-(a.gain.groupLevels+a.gain.teacherLevels)||a.unknown.length-b.unknown.length||a.key.localeCompare(b.key));
 return {checked:ctx.ready.checked,attempts,results,reasons,strict,requireRoom};
}
const swap46={source:null,register:null,requireRoom:null,strict:true,result:null,selected:"",filter:"",page:0,running:false,error:"",token:0};
function sync46(){
 const s=swap46,ctx=inter33.context,p=sync40();
 if(s.source!==ctx||s.register!==p.data||s.requireRoom!==p.requireRoom){s.source=ctx;s.register=p.data;s.requireRoom=p.requireRoom;s.result=null;s.selected="";s.page=0;s.error="";s.running=false;s.token++}
 return s;
}
function swapRows46(){const s=sync46();return (s.result?.results||[]).filter(r=>!s.filter||r.moves.some(x=>key26(x.group+" "+x.subject+" "+x.oldRoom+" "+x.newRoom).includes(key26(s.filter))))}
function renderSwap46(){
 const s=sync46(),d=s.result;
 let h='<section class="panel" id="swap46"><div class="eyebrow23">Связанные изменения · 0.46</div><h2>Обмен аудиториями</h2><p>Если нужное помещение занято другой группой, обе группы могут поменяться аудиториями, сохранив время, дисциплину и преподавателя. Система проверяет две замены как одно неделимое действие.</p><p class="notice">Не утверждённое расписание. Не создаются новые межкорпусные переходы и не увеличивается суммарный перепад этажей ни у одной из двух групп или преподавателей. Вместимость, оборудование и доступность требуют паспортов; внешняя занятость неизвестна.</p><div class="row"><button id="runSwap46" class="primary" '+(!s.source||s.running||opportunities29.loading?"disabled":"")+'>'+(s.running?"Проверяем обмены…":"Найти обмены")+'</button><label><input id="strictSwap46" type="checkbox" '+(s.strict?"checked":"")+'> Исключить неясные карточки</label></div><p role="status">'+esc(s.error||(!s.source?"Сначала загрузите расписание на главном экране оптимизации.":""))+'</p>';
 if(!d)return h+'</section>';
 const rows=swapRows46(),pages=Math.max(1,Math.ceil(rows.length/20));s.page=Math.min(s.page,pages-1);
 h+='<div class="grid">'+[["Проверено пар",d.attempts],["Предварительные обмены",d.results.length],["Различных занятий",new Set(d.results.flatMap(r=>r.moves.map(x=>x.id))).size],["Без неясных карточек",d.results.filter(r=>!r.unknown.length).length]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><p class="muted">Это независимые альтернативы; одновременно применять несколько обменов без совместного аудита нельзя. В комплексном расчёте обмены включаются целиком и занимают два места в лимите изменений.</p><label>Поиск группы, предмета или аудитории<input id="filterSwap46" value="'+esc(s.filter)+'"></label><div class="scroll"><table><tr><th>Дата / время</th><th>Группы</th><th>Аудитории</th><th>Меньше смен корпусов</th><th>Меньше перепадов этажей</th><th>Неясные карточки</th></tr>'+rows.slice(s.page*20,s.page*20+20).map(r=>'<tr><td>'+esc(r.date+" "+clock26(r.start))+'</td><td><button data-swap46="'+esc(r.key)+'">'+esc(r.moves.map(x=>x.group).join(" ↔ "))+'</button></td><td>'+esc(r.moves.map(x=>x.oldRoom).join(" ↔ "))+'</td><td>'+r.gain.groupCross+' / '+r.gain.teacherCross+'</td><td>'+r.gain.groupLevels+' / '+r.gain.teacherLevels+'</td><td>'+r.unknown.length+'</td></tr>').join("")+'</table></div><p class="muted">Показатели в двух столбцах: группы / преподаватели.</p><div class="row"><button id="prevSwap46" '+(!s.page?"disabled":"")+'>Назад</button><span>'+(s.page+1)+' / '+pages+'</span><button id="nextSwap46" '+(s.page>=pages-1?"disabled":"")+'>Далее</button><button id="exportSwap46">Экспорт всех найденных обменов (JSON)</button></div>';
 const r=d.results.find(x=>x.key===s.selected);
 if(r){const day=(a,changed)=>a.map(q=>'<div class="compare-lesson24 '+(q.id===changed?"changed24":"")+'"><strong>'+clock26(q.start)+'</strong><div><b>'+esc(q.subject)+'</b><small>'+esc(q.room||"Не установлена")+'</small></div></div>').join("");
 h+='<section id="detailSwap46"><h3>Выбранный обмен: '+esc(r.date+" · "+clock26(r.start))+'</h3>'+r.moves.map((x,i)=>'<h4>'+esc(x.group+" · "+x.subject)+'</h4><p>'+esc(x.oldRoom+" → "+x.newRoom)+'</p><div class="compare-grid24"><div class="compare-day24"><h4>До</h4>'+day(r.routes[i].group.dayBefore,x.id)+'</div><div class="compare-day24"><h4>После</h4>'+day(r.routes[i].group.dayAfter,x.id)+'</div></div><p>Преподаватель: '+esc(x.teacher)+'. Меньше переходов: '+r.routes[i].teacher.cross+'; перепадов этажей: '+r.routes[i].teacher.levels+'.</p>').join("")+'<p>Неясных карточек: '+r.unknown.length+'. Недостающих сведений в паспортах: '+r.passportUnknown.length+'.</p><button id="exportOneSwap46">Скачать протокол обмена</button></section>'}
 h+='<details><summary>Почему другие обмены отклонены</summary><p>'+esc(Object.entries(d.reasons).map(([k,v])=>({shape:"Несовместимые назначения",week:"Неделя или источник",source:"Неоднозначный ресурс", "original-conflict":"Исходный конфликт",route:"Неопределённый или ухудшенный маршрут","no-gain":"Нет выигрыша","final-conflict":"Итоговый конфликт","final-room":"Явное совпадение аудитории",unclear:"Неясные карточки",passport:"Паспорт ограничения"}[k]||k)+": "+v).join("; "))+'</p></details></section>';return h;
}
function bindSwap46(){
 const s=sync46();
 on("runSwap46","click",()=>{if(!s.source||s.running||opportunities29.loading)return;const token=++s.token,ctx=s.source,reg=s.register,require=s.requireRoom,strict=s.strict;s.running=true;s.error="";s.result=null;render();setTimeout(()=>{if(token!==s.token||ctx!==inter33.context)return;try{s.result=swaps46(ctx,reg,require,strict);s.selected="";s.page=0}catch(e){s.error=e.message}finally{s.running=false;render()}},20)});
 on("strictSwap46","change",e=>{s.strict=e.target.checked;s.token++;s.running=false;s.result=null;s.page=0;s.selected="";render()});
 on("filterSwap46","change",e=>{s.filter=e.target.value;s.page=0;render()});
 on("prevSwap46","click",()=>{s.page=Math.max(0,s.page-1);render()});on("nextSwap46","click",()=>{s.page++;render()});
 document.querySelectorAll("[data-swap46]").forEach(el=>el.onclick=()=>{s.selected=el.dataset.swap46;render();$("detailSwap46")?.scrollIntoView?.({block:"start"})});
 const exp=r=>download("kantor-room-swaps.json",JSON.stringify({version:"0.46",checked:s.source.ready.checked,status:"atomic-preliminary-only",register:s.register,strict:s.result.strict,requireRoom:s.result.requireRoom,pairs:r},null,2),"application/json");
 on("exportSwap46","click",()=>{if(s.result)exp(s.result.results)});on("exportOneSwap46","click",()=>{const r=s.result?.results.find(x=>x.key===s.selected);if(r)exp([r])});
}
