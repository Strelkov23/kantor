/* 0.41: inferred floors and same-building optimization. Floor difference is not travel time. */
function inferFloor41(room){
 const m=String(room??"").trim().match(/^\d{2}[А-ЯA-Z]?-(\d)(\d{2})[А-Яа-яЁёA-Za-z]?$/u);
 return m&&Number(m[1])>=1?Number(m[1]):null;
}
function floor41(room,register){
 const explicit=register?.rooms?.find(r=>r.id===key26(room))?.floor;
 if(Number.isInteger(explicit))return {floor:explicit,source:"passport"};
 const n=inferFloor41(room);return {floor:n,source:n===null?"unknown":"number"};
}
function floorDay41(days,register){
 const o={levels:0,known:0,unknown:0,cross:0,sameRoom:0};
 for(const list of days){const a=sorted29(list);for(let i=1;i<a.length;i++){
  const p=a[i-1],q=a[i];if(!p.building||!q.building){o.unknown++;continue}
  if(p.building!==q.building){o.cross++;continue}
  if(p.room&&p.room===q.room){o.sameRoom++;o.known++;continue}
  const x=floor41(p.room,register).floor,y=floor41(q.room,register).floor;
  if(x===null||y===null){o.unknown++;continue}o.known++;o.levels+=Math.abs(x-y);
 }}return o;
}
function floorAction41(ctx,x,register){
 const q=ctx.byId.get(x.id),next={...q,date:x.newDate,start:x.newStart,end:x.newEnd,room:x.newRoom,roomKey:key26(x.newRoom),roomLabel:x.newRoom,building:x.newBuilding};
 const result={};
 for(const kind of ["group","teacher"]){
  const dates=[...new Set([q.date,next.date])],get=date=>kind==="group"?ctx.groupDays.get(ctx.key(q.group,date))||[]:unique29(ctx.teacherDays.get(ctx.key(q.teacher,date))||[]);
  const old=dates.map(get),now=old.map((list,i)=>[...list.filter(v=>v.id!==q.id),...(dates[i]===next.date?[next]:[])]);
  if([...old,...now].some(list=>list.some(v=>!v.time)||collision29(list)))return null;
  const a=floorDay41(old,register),b=floorDay41(now,register);result[kind]={before:a,after:b,saved:a.levels-b.levels};
 }return result;
}
function floorAlternatives41(ctx,register){
 const cards=ctx.ready.cards,rooms=new Map(),byDate=new Map(),results=[];
 for(const q of cards)if(q.room&&q.building&&q.type&&q.time){
  if(!rooms.has(q.roomKey))rooms.set(q.roomKey,{room:q.room,building:q.building,types:new Set(),subjects:new Set(),cards:0});
  const r=rooms.get(q.roomKey);r.types.add(key26(q.type));r.subjects.add(key26(q.subject));r.cards++;
 }
 for(const e of ctx.occ.values()){if(!byDate.has(e.date))byDate.set(e.date,[]);byDate.get(e.date).push(e)}
 let attempted=0,occupied=0,uncertainFloor=0,noGain=0;
 for(const q of cards){
  if(!q.eligible||ctx.metadata.get(q.id)?.pdfStatus!=="text-and-room-match"||floor41(q.room,register).floor===null)continue;
  const w=ctx.weeks.byGroup.get(q.group)?.find(v=>v.monday===monday32(q.date)),meta=ctx.metadata.get(q.id);
  if(!w||!["upper","lower"].includes(w.status)||![w.status,"both"].includes(meta.weekLabel))continue;
  const g=sorted29(ctx.groupDays.get(ctx.key(q.group,q.date))||[]),t=sorted29(unique29(ctx.teacherDays.get(ctx.key(q.teacher,q.date))||[]));
  if(!g.some(v=>v.id===q.id)||!t.some(v=>v.id===q.id)||[g,t].some(a=>a.some(v=>!v.time)||collision29(a))||t.some(v=>v.teacher!==q.teacher))continue;
  const original=ctx.occ.get(q.id),day=byDate.get(q.date)||[];
  if(day.some(e=>e.id!==q.id&&possibleConflict31(e,original).length))continue;
  for(const r of rooms.values()){
   if(r.room===q.room||r.building!==q.building||!r.types.has(key26(q.type))||floor41(r.room,register).floor===null||floor41(r.room,register).floor===floor41(q.room,register).floor)continue;
   attempted++;
   const x={id:q.id,group:q.group,course:q.course,date:q.date,weekStart:w.monday,weekType:w.status,subject:q.subject,type:q.type,teacher:q.teacherName,start:q.start,end:q.end,oldRoom:q.room,newRoom:r.room,oldBuilding:q.building,newBuilding:r.building,oldDate:q.date,newDate:q.date,oldStart:q.start,oldEnd:q.end,newStart:q.start,newEnd:q.end,kind:"room"};
   const f=floorAction41(ctx,x,register);
   if(!f||f.group.before.unknown||f.teacher.before.unknown||f.group.after.unknown||f.teacher.after.unknown){uncertainFloor++;continue}
   if(f.group.saved<0||f.teacher.saved<0||f.group.saved+f.teacher.saved===0){noGain++;continue}
   const busy=roomBusy38(day,q.id,key26(r.room),q.start,q.end);
   if(busy.conflicts.length){occupied++;continue}
   const unclearCards=day.filter(e=>e.id!==q.id&&(!e.valid||e.start<q.end&&q.start<e.end)&&(!e.valid||!e.teacherComplete||!e.roomComplete)).length;
   results.push({...x,groupSaved:0,teacherSaved:0,unclearCards,unclear:busy.unclear.length,observedSameSubject:r.subjects.has(key26(q.subject)),roomCards:r.cards,floor:f});
  }
 }
 if(attempted!==results.length+occupied+uncertainFloor+noGain)throw Error("Баланс этажных альтернатив");
 results.sort((a,b)=>b.floor.group.saved-a.floor.group.saved||b.floor.teacher.saved-a.floor.teacher.saved||a.unclearCards-b.unclearCards||a.id.localeCompare(b.id)||a.newRoom.localeCompare(b.newRoom));
 return {checked:ctx.ready.checked,attempted,occupied,uncertainFloor,noGain,results};
}
function floorCoverage41(ctx,register){
 const rooms=catalog40(ctx).rooms,counts={number:0,passport:0,unknown:0},rows=[];
 for(const [id,room] of rooms){const f=floor41(room,register);counts[f.source]++;rows.push({room,...f})}
 return {counts,rows:rows.sort((a,b)=>a.room.localeCompare(b.room,"ru",{numeric:true}))};
}
const floorState41={source:null,result:null,register:null,show:false,building:"all",strict:true,page:0,msg:""};
function syncFloor41(){
 const s=floorState41,ctx=inter33.context,p=sync40().data;
 if(s.source!==ctx||s.register!==p){s.source=ctx;s.register=p;s.result=null;s.page=0;s.msg=""}return s;
}
function renderFloor41(){
 const s=syncFloor41();if(!s.source)return "";
 const cov=floorCoverage41(s.source,s.register),d=s.result;
 const buildings=[...new Set(cov.rows.map(r=>r.room.split("-")[0]))].sort();
 const rows=(d?.results||[]).filter(x=>(!s.strict||!x.unclearCards)&&(s.building==="all"||s.building===x.newBuilding));
 const pages=Math.max(1,Math.ceil(rows.length/30));s.page=Math.min(s.page,pages-1);
 let h='<section class="panel" id="floor41"><div class="eyebrow23">Внутри корпуса · 0.41</div><h2>Этажи и вертикальные перемещения</h2><p>По правилу нумерации 210 — второй этаж, 310 — третий. Префикс корпуса не участвует в расчёте. Для трёхзначных номеров используется первая цифра (1–9), для нестандартных обозначений этаж остаётся неизвестным. Паспорт помещения имеет приоритет.</p><div class="grid">'+[["По номеру",cov.counts.number],["По паспорту",cov.counts.passport],["Не установлен",cov.counts.unknown]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="row"><button id="runFloor41" class="primary">Найти замены внутри корпуса</button><label>Корпус<select id="building41"><option value="all">Все</option>'+buildings.map(b=>'<option value="'+esc(b)+'" '+(b===s.building?"selected":"")+'>'+esc(b)+'</option>').join("")+'</select></label></div><label><input id="strictFloor41" type="checkbox" '+(s.strict?"checked":"")+'> Исключить неясные карточки интервала</label><p role="status">'+esc(s.msg)+'</p>';
 if(d){
  h+='<p>Проверено '+d.attempted+' сочетаний; найдено '+d.results.length+' предварительных альтернатив. По фильтру: '+rows.length+'. Варианты независимы.</p><div class="scroll"><table><tr><th>Группа / дата</th><th>Предмет</th><th>Аудитория</th><th>Этажи</th><th>Уменьшение перепада этажей: группа / преподаватель</th><th>Неясные карточки</th></tr>'+rows.slice(s.page*30,s.page*30+30).map(x=>'<tr><td>'+esc(x.group+" · "+x.date)+'</td><td>'+esc(x.subject)+'</td><td>'+esc(x.oldRoom+" → "+x.newRoom)+'</td><td>'+floor41(x.oldRoom,s.register).floor+' → '+floor41(x.newRoom,s.register).floor+'</td><td>'+x.floor.group.saved+' / '+x.floor.teacher.saved+'</td><td>'+x.unclearCards+'</td></tr>').join("")+'</table></div><div class="row"><button id="prevFloor41" '+(!s.page?"disabled":"")+'>Назад</button><span>'+ (s.page+1)+' / '+pages+'</span><button id="nextFloor41" '+(s.page>=pages-1?"disabled":"")+'>Далее</button><button id="csvFloor41">CSV альтернатив</button></div>';
 }
 h+='<details><summary>Реестр этажей ('+cov.rows.length+')</summary><div class="scroll"><table><tr><th>Аудитория</th><th>Этаж</th><th>Основание</th></tr>'+cov.rows.filter(r=>s.building==="all"||r.room.split("-")[0]===s.building).map(r=>'<tr><td>'+esc(r.room)+'</td><td>'+esc(r.floor??"—")+'</td><td>'+({number:"Правило номера",passport:"Паспорт",unknown:"Не установлено"}[r.source])+'</td></tr>').join("")+'</table></div></details><p class="notice">Перепад этажей — сумма абсолютных разностей между соседними занятиями одного корпуса. Он не измеряет расстояние до лестницы, время ходьбы, наличие лифта или доступность. Замена аудитории остаётся предварительной.</p></section>';
 return h;
}
function bindFloor41(){
 const s=syncFloor41();if(!s.source)return;
 on("runFloor41","click",()=>{try{s.result=floorAlternatives41(s.source,s.register);s.page=0;s.msg="Расчёт завершён."}catch(e){s.msg=e.message;s.result=null}render()});
 on("building41","change",e=>{s.building=e.target.value;s.page=0;render()});
 on("strictFloor41","change",e=>{s.strict=e.target.checked;s.page=0;render()});
 on("prevFloor41","click",()=>{s.page=Math.max(0,s.page-1);render()});on("nextFloor41","click",()=>{s.page++;render()});
 on("csvFloor41","click",()=>{if(!s.result)return;const rows=[["Группа","Дата","Дисциплина","Было","Стало","Этажей группа","Этажей преподаватель","Неясные карточки","Статус"],...s.result.results.filter(x=>(!s.strict||!x.unclearCards)&&(s.building==="all"||s.building===x.newBuilding)).map(x=>[x.group,x.date,x.subject,x.oldRoom,x.newRoom,x.floor.group.saved,x.floor.teacher.saved,x.unclearCards,"preliminary"])];download("kantor-floor-alternatives.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
