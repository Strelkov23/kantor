/* 0.18: observed room inventory from the complete public calendar snapshot. */
let room18={data:null,loading:false,error:"",filter:"",building:"all",details:{}};
function roomClass18(raw,known){
 let parts=[...new Set(String(raw??"").split(/;| \/ /).map(x=>x.trim().replace(/\s+/g," ")).filter(Boolean))];
 if(parts.length!==1)return {reason:parts.length?"multiple":"missing"};
 let m=parts[0].match(/^(\d{2}[А-ЯA-Z]?)-(\d{1,4}[А-Яа-яЁёA-Za-z]?)$/u);
 if(!m||!Object.hasOwn(known,m[1])||m[1]==="29")return {reason:"unresolved"};
 return {room:m[1]+"-"+m[2],building:m[1]};
}
function aggregateRooms18(manifest,files,known){
 if(manifest.complete!==true||manifest.groups.length!==83||files.length!==83||new Set(manifest.groups.map(g=>g.group)).size!==83)throw Error("Неполный снимок института");
 let rooms=new Map(),unknown=new Map(),total=0,recognized=0;
 for(let i=0;i<files.length;i++){
  let g=manifest.groups[i],f=files[i];
  if(f.checked!==manifest.checked||f.group!==g.group||f.comparisons.length!==g.cards)throw Error("Снимки не совпадают: "+g.group);
  for(let x of f.comparisons){
   let c=x.calendar,t=x.timing,k=roomClass18(c.rooms,known);total++;
   if(!k.room){let label=String(c.rooms||"(не указано)"),key=k.reason+"|"+label,u=unknown.get(key)||{label,reason:k.reason,cards:0};u.cards++;unknown.set(key,u);continue}
   recognized++;
   let r=rooms.get(k.room)||{id:k.room,building:k.building,cards:0,groups:new Set(),intervals:new Set(),types:new Map(),invalidTime:0};
   r.cards++;r.groups.add(g.group);r.types.set(c.type||"Не указан",(r.types.get(c.type||"Не указан")||0)+1);
   if(Number.isInteger(t.start)&&Number.isInteger(t.end)&&t.start>=0&&t.end<=1440&&t.end>t.start)r.intervals.add(c.date+"|"+t.start+"|"+t.end);else r.invalidTime++;
   rooms.set(k.room,r);
  }
 }
 if(total!==manifest.totals.cards||recognized+[...unknown.values()].reduce((s,u)=>s+u.cards,0)!==total)throw Error("Нарушен баланс карточек");
 return {checked:manifest.checked,total,recognized,rooms:[...rooms.values()].map(r=>({id:r.id,building:r.building,cards:r.cards,groups:r.groups.size,intervals:r.intervals.size,types:Object.fromEntries(r.types),invalidTime:r.invalidTime})).sort((a,b)=>b.cards-a.cards||a.id.localeCompare(b.id)),unknown:[...unknown.values()].sort((a,b)=>b.cards-a.cards)};
}
async function loadRooms18(){
 if(room18.loading)return;room18.loading=true;room18.error="";render();
 try{
  let m=await getJson08("data/calendar-11/manifest.json");
  if(m.complete!==true||m.groups.length!==83||m.groups.some(g=>!/^\d+\.json$/.test(g.file)))throw Error("Нет полного опубликованного снимка");
  let files=[];
  for(let i=0;i<m.groups.length;i+=6)files.push(...await Promise.all(m.groups.slice(i,i+6).map(g=>getJson08("data/calendar-11/"+g.file))));
  room18.data=aggregateRooms18(m,files,instituteCatalog.buildings);
  room18.details={};
 }catch(e){room18.error=e.message}
 room18.loading=false;if(visible16("campus13"))render();
}
function roomEvidence18(input,data){
 if(input.version!=="0.18"||input.checked!==data.checked||!Array.isArray(input.rooms))throw Error("Нужен шаблон этого снимка");
 let valid=new Set(data.rooms.map(r=>r.id)),out=Object.create(null),seen=new Set();
 for(let r of input.rooms){
  if(!valid.has(r.id)||seen.has(r.id))throw Error("Неизвестный или повторный номер аудитории: "+r.id);
  seen.add(r.id);
  if(r.capacity===null&&r.equipment===""&&r.source===""&&r.verifiedDate==="")continue;
  if(r.capacity!==null&&(!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>10000))throw Error("Неверная вместимость: "+r.id);
  if(typeof r.equipment!=="string"||typeof r.source!=="string"||!r.source.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(r.verifiedDate)||!Number.isFinite(Date.parse(r.verifiedDate))||new Date(r.verifiedDate).toISOString().slice(0,10)!==r.verifiedDate)throw Error("Требуется основание и дата: "+r.id);
  out[r.id]={capacity:r.capacity,equipment:r.equipment,source:r.source,verifiedDate:r.verifiedDate};
 }
 return out;
}
function renderRooms18(){
 let s=room18,d=s.data,rows=d?.rooms.filter(r=>(s.building==="all"||r.building===s.building)&&r.id.toLowerCase().includes(s.filter.toLowerCase()))||[];
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>';
 return '<section class="panel"><h2>Аудиторный фонд · наблюдаемые помещения</h2><p>Реестр строится из календарных карточек всех 83 очных групп. Это не полный инвентарный реестр академии и не доказательство свободной аудитории. Списки помещений, неясные номера и корпус 29 остаются отдельно.</p><p><a href="https://www.timacad.ru/sveden/objects/" target="_blank" rel="noopener">Официальные сведения об оснащении и доступной среде</a></p><button id="loadRooms18" '+(s.loading?'disabled':'')+'>'+(s.loading?'Загрузка снимка…':'Построить реестр помещений')+'</button><p role="status">'+esc(s.error)+'</p>'+(d?'<p>Снимок: '+esc(d.checked)+'</p><div class="grid">'+metric("Карточки всего",d.total)+metric("Однозначное обозначение",d.recognized)+metric("Наблюдаемые аудитории",d.rooms.length)+metric("Сведения о вместимости введены",Object.values(s.details).filter(r=>r.capacity!==null).length)+'</div><div class="row"><label>Корпус<select id="roomBuilding18"><option value="all">Все</option>'+[...new Set(d.rooms.map(r=>r.building))].sort().map(b=>'<option '+(s.building===b?'selected':'')+'>'+esc(b)+'</option>').join("")+'</select></label><label>Номер<input id="roomFilter18" value="'+esc(s.filter)+'" placeholder="02-108"></label><button id="roomExport18">CSV реестра</button><button id="roomTemplate18">JSON для паспортизации</button><label>Импорт паспортов JSON<input id="roomImport18" type="file" accept=".json,application/json"></label></div><p>Показано '+rows.length+' помещений. Интервалы — уникальные сочетания даты и времени по карточкам, не занятость всей академии. Введённые паспорта не проверяются автоматически и не передаются в решатель.</p><div class="scroll"><table><tr><th>Аудитория</th><th>Карточки</th><th>Группы</th><th>Интервалы</th><th>Виды по журналу</th><th>Вместимость</th><th>Оснащение и основание</th></tr>'+rows.map(r=>{let e=s.details[r.id];return '<tr><td>'+esc(r.id)+'</td><td>'+r.cards+'</td><td>'+r.groups+'</td><td>'+r.intervals+'</td><td>'+esc(Object.entries(r.types).map(([k,v])=>k+": "+v).join("; "))+'</td><td>'+esc(e?.capacity??"Не установлена")+'</td><td>'+esc(e?[e.equipment,e.source,e.verifiedDate].filter(Boolean).join(" · "):"Не установлено")+'</td></tr>'}).join("")+'</table></div><details><summary>Неоднозначные обозначения: '+(d.total-d.recognized)+' карточек</summary><div class="scroll"><table><tr><th>Исходный текст</th><th>Причина</th><th>Карточки</th></tr>'+d.unknown.map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+esc(({multiple:"Несколько обозначений",missing:"Отсутствует",unresolved:"Требует сверки"})[r.reason])+'</td><td>'+r.cards+'</td></tr>').join("")+'</table></div></details>':'')+'</section>';
}
function bindRooms18(){
 on("loadRooms18","click",loadRooms18);
 on("roomBuilding18","change",e=>{room18.building=e.target.value;render()});
 on("roomFilter18","change",e=>{room18.filter=e.target.value;render()});
 on("roomTemplate18","click",()=>download("room-passports.json",JSON.stringify({version:"0.18",checked:room18.data.checked,rooms:room18.data.rooms.map(r=>({id:r.id,...(room18.details[r.id]||{capacity:null,equipment:"",source:"",verifiedDate:""})}))},null,2),"application/json"));
 on("roomImport18","change",async e=>{try{let f=e.target.files[0];if(!f)return;if(f.size>2000000)throw Error("Файл слишком большой");room18.details=roomEvidence18(JSON.parse(await f.text()),room18.data);room18.error="Паспорта приняты для текущего сеанса; сведения требуют независимой проверки."}catch(e){room18.error=e.message}render()});
 on("roomExport18","click",()=>{let q=v=>'"'+String(v??"").replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'$&")+'"',d=room18.data;download("observed-rooms.csv","\ufeff"+[["room","building","cards","groups","intervals","capacity","equipment","source","verifiedDate","snapshot"],...d.rooms.map(r=>{let e=room18.details[r.id]||{};return [r.id,r.building,r.cards,r.groups,r.intervals,e.capacity,e.equipment,e.source,e.verifiedDate,d.checked]})].map(r=>r.map(q).join(";")).join("\n"),"text/csv;charset=utf-8")});
}
