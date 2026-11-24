/* 0.28: recompute spatial reports from the selected calendar snapshot. */
function classifyLocation28(raw,known,aliases,mode){
 // Baseline 0.13 accepts a single conventional code in the original field.
 // Do not discard separators before checking the baseline: "01-213;" is a list.
 if(mode==="numbered"){
  const value=String(raw??"").trim(),m=value.match(/^(\d{2}[А-ЯA-Z]?)-\d{1,4}[А-Яа-яЁёA-Za-z]?$/u);
  return m&&Object.hasOwn(known,m[1])&&m[1]!=="29"?{building:m[1],reason:"numbered"}:{building:null,reason:value?"unresolved":"missing"};
 }
 const parts=String(raw??"").split(/;| \/ /).map(s=>s.trim().replace(/\s+/gu," ")).filter(Boolean);
 if(!parts.length)return {building:null,reason:"missing"};
 const ids=[],reasons=[];
 for(const p of parts){
  const a=mode!=="numbered"&&aliases.find(x=>x.label.toLocaleLowerCase("ru")===p.toLocaleLowerCase("ru"));
  if(a){if(a.label==="17-ФОС"&&mode!=="expanded")return {building:null,reason:"alias-unconfirmed"};if(!Object.hasOwn(known,a.building))return {building:null,reason:"unresolved"};ids.push(a.building);reasons.push("named");continue}
  const m=p.match(/^(\d{2}[А-ЯA-Z]?)-\d{1,4}[А-Яа-яЁёA-Za-z]?$/u);
  if(!m||!Object.hasOwn(known,m[1])||m[1]==="29"||(mode==="numbered"&&parts.length!==1))return {building:null,reason:"unresolved"};
  ids.push(m[1]);reasons.push("numbered");
 }
 if(new Set(ids).size!==1)return {building:null,reason:"multiple-buildings"};
 return {building:ids[0],reason:parts.length>1?"same-building-list":reasons[0]};
}
function spatialGroup28(file,known,aliases,mode){
 const totals={cards:0,days:0,blocks:0,multiCardBlocks:0,transitions:0,same:0,cross:0,unknown:0,unusableDays:0};
 const dates=new Map(),routes=new Map(),heat=new Map(),unknown=new Map(),classification=new Map();
 const inc=(m,k,n=1)=>m.set(k,(m.get(k)||0)+n);
 for(const x of file.comparisons){
  const c=x.calendar,t=x.timing,k=classifyLocation28(c.rooms,known,aliases,mode);
  totals.cards++;inc(classification,k.reason);
  if(k.building)inc(heat,k.building);else inc(unknown,c.rooms||"(не указано)");
  if(!dates.has(c.date))dates.set(c.date,[]);dates.get(c.date).push({t,building:k.building});
 }
 for(const events of dates.values()){
  totals.days++;
  if(events.some(x=>!validTime25(x.t))){totals.unusableDays++;continue}
  const blocks=[];
  for(const x of events.slice().sort((a,b)=>a.t.start-b.t.start||a.t.end-b.t.end)){
   let b=blocks.at(-1);
   if(b&&x.t.start<b.end){b.end=Math.max(b.end,x.t.end);b.ids.add(x.building);b.cards++}
   else blocks.push({start:x.t.start,end:x.t.end,ids:new Set([x.building]),cards:1});
  }
  totals.blocks+=blocks.length;totals.multiCardBlocks+=blocks.filter(b=>b.cards>1).length;
  for(let i=1;i<blocks.length;i++){
   const a=blocks[i-1],b=blocks[i];totals.transitions++;
   if(a.ids.size!==1||b.ids.size!==1||a.ids.has(null)||b.ids.has(null)){totals.unknown++;continue}
   const f=[...a.ids][0],t=[...b.ids][0];if(f===t){totals.same++;continue}
   totals.cross++;const key=f+"|"+t;if(!routes.has(key))routes.set(key,[]);routes.get(key).push(b.start-a.end);
  }
 }
 return {group:file.group,course:file.course,totals,routes,heat,unknown,classification};
}
function combineSpatial28(parts){
 const totals={},routes=new Map(),heat=new Map(),unknown=new Map(),classification=new Map();
 const merge=(a,b)=>{for(const [k,n] of b)a.set(k,(a.get(k)||0)+n)};
 for(const p of parts){for(const [k,n] of Object.entries(p.totals))totals[k]=(totals[k]||0)+n;merge(heat,p.heat);merge(unknown,p.unknown);merge(classification,p.classification);for(const [k,a] of p.routes){if(!routes.has(k))routes.set(k,[]);routes.get(k).push(...a)}}
 const rs=[...routes].map(([key,a])=>{const [from,to]=key.split("|"),gaps={};for(const g of a)gaps[g]=(gaps[g]||0)+1;return {from,to,count:a.length,minimum:Math.min(...a),gaps}}).sort((a,b)=>b.count-a.count||a.minimum-b.minimum||(a.from+"|"+a.to).localeCompare(b.from+"|"+b.to));
 if(totals.transitions!==totals.same+totals.cross+totals.unknown||totals.cross!==rs.reduce((s,r)=>s+r.count,0)||totals.cards!==[...heat.values(),...unknown.values()].reduce((s,n)=>s+n,0))throw Error("Нарушен баланс переходов");
 return {totals,classification:Object.fromEntries(classification),groups:parts.map(p=>({group:p.group,course:p.course,...p.totals})),buildingCards:[...heat].map(([building,cards])=>({building,cards})).sort((a,b)=>b.cards-a.cards),unknownLocations:[...unknown].map(([room,cards])=>({room,cards})).sort((a,b)=>b.cards-a.cards),routes:rs};
}
function spatialReport28(manifest,files,catalog,aliases){
 if(manifest.complete!==true||manifest.groups.length!==83||files.length!==83||new Set(manifest.groups.map(g=>g.group)).size!==83||manifest.groups.some(g=>!catalog.groups.some(c=>c.id===g.group)))throw Error("Нужны 83 группы");
 files.forEach((f,i)=>{let g=manifest.groups[i];if(f.group!==g.group||f.checked!==manifest.checked||f.comparisons.length!==g.cards)throw Error("Несовпадение снимка")});
 const calc=mode=>combineSpatial28(files.map(f=>spatialGroup28(f,catalog.buildings,aliases.aliases,mode)));
 const numbered=calc("numbered"),previous=numbered.totals,strict=calc("strict"),expanded=calc("expanded");
 if(strict.totals.cards!==manifest.totals.cards||strict.totals.transitions!==previous.transitions||expanded.totals.transitions!==previous.transitions||strict.totals.unknown>previous.unknown||expanded.totals.unknown>strict.totals.unknown)throw Error("Некорректное уточнение");
 return {version:"0.14",checked:manifest.checked,previous,numbered,strict,expanded,notes:"Пересчитано по выбранному календарному снимку. Строгий режим учитывает только однозначные корпуса; ФОС — отдельная гипотеза. Не индивидуальные маршруты и не замеры ходьбы."};
}
let spatialCache28=null,spatialPending28=null;
async function loadSpatial28(force=false){
 if(spatialPending28)return spatialPending28;
 spatialPending28=(async()=>{const snap=await calendarSnapshot27(force);if(spatialCache28?.snapshot.manifest.checked===snap.manifest.checked)return {...spatialCache28,snapshot:snap};const [files,aliases]=await Promise.all([calendarFiles27(snap),getJson08("data/location-aliases-14.json")]);const report=spatialReport28(snap.manifest,files,instituteCatalog,aliases);spatialCache28={report,aliases,snapshot:snap};return spatialCache28})();
 try{return await spatialPending28}finally{spatialPending28=null}
}

let campusSummary28={data:null,snapshot:null,loading:false,error:""};
function renderCampusSummaryBase53(){
 const s=campusSummary28,d=s.data?.strict,t=d?.totals;
 let html='<section class="panel"><div class="eyebrow23">Календарная диагностика</div><h2>Насколько удобно перемещаться между корпусами?</h2><p>Последовательные временные блоки групп, фактические интервалы между занятиями и однозначно распознанные корпуса.</p><div class="row"><button class="primary" id="campusRefresh28" '+(s.loading?"disabled":"")+'>'+(s.loading?"Расчёт…":d?"Обновить расчёт":"Рассчитать по календарю")+'</button><button data-tab="survey15">Проверить время ходьбы</button><button data-tab="campus13">Карта и подробный отчёт</button></div><p role="status">'+esc(s.error)+'</p>';
 if(!d)return html+'<p class="muted">Данные появятся после загрузки проверенного календарного снимка.</p></section>';
 const short=d.routes.reduce((n,r)=>n+Object.entries(r.gaps).reduce((a,[g,v])=>a+(+g<=20?v:0),0),0);
 return html+'<div class="source23">'+esc(calendarStatus27(s.snapshot))+'</div><div class="grid">'+[["Внутри корпуса",t.same],["Между корпусами",t.cross],["До 20 минут между корпусами",short],["Неизвестная локация",t.unknown],["Дней с неизвестным временем",t.unusableDays]].map(([n,v])=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>').join("")+'</div><h3>Самые частые направления</h3>'+chartRows12(d.routes.slice(0,8).map(r=>[r.from+" → "+r.to,r.count]))+'<p class="muted">Число переходов групповых блоков, а не отдельных людей. Короткий перерыв сам по себе не означает риск опоздания: нужно знать время пути. Неизвестная локация не считается нулевым переходом.</p></section>';
}
async function refreshCampus28(force=false){
 const s=campusSummary28;if(s.loading)return;s.loading=true;s.error="";render();
 try{const r=await loadSpatial28(force);s.data=r.report;s.snapshot=r.snapshot}catch(e){s.error=e.message}
 s.loading=false;if(visible16("space12"))render();
}


/* Interactive campus pilot: local geometry, not verified entrances or navigation. */
let map53={points:null,walk:null,loading:false,error:"",from:"12",to:"01"};
function mapGeometry53(points,walk){
 const valid=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=90;
 const p=(points?.candidates||[]).filter(x=>valid(x.lon,x.lat)&&typeof x.buildingCode==="string");
 const ids=new Set(p.map(x=>x.buildingCode));
 if(p.length<2||ids.size!==p.length)throw Error("Некорректные точки карты");
 const routes=(walk?.routes||[]).filter(r=>r.status==="estimated"&&ids.has(r.from)&&ids.has(r.to)&&r.from!==r.to&&Number.isFinite(r.meters)&&r.meters>0&&Number.isFinite(r.seconds)&&r.seconds>0&&Array.isArray(r.geometry)&&r.geometry.length>=2&&r.geometry.every(c=>Array.isArray(c)&&valid(c[0],c[1])));
 const all=p.map(x=>[x.lon,x.lat]).concat(routes.flatMap(r=>r.geometry));
 const lat0=p.reduce((s,x)=>s+x.lat,0)/p.length, k=Math.cos(lat0*Math.PI/180);
 const xs=all.map(c=>c[0]*k),ys=all.map(c=>c[1]);
 const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
 const scale=Math.min(550/(xmax-xmin||1),290/(ymax-ymin||1));
 const project=(lon,lat)=>[320+(lon*k-(xmin+xmax)/2)*scale,185- (lat-(ymin+ymax)/2)*scale];
 return {points:p,routes,project};
}
function renderMap53(){
 const s=map53;
 let html='<section class="panel"><div class="eyebrow23">Интерактивная схема · пилот</div><h2>Выберите два корпуса</h2><p>Посмотрите расчётный путь по пешеходной сети и сопоставьте его с текущим календарным расписанием. Точки — центры объектов OpenStreetMap, не входы.</p>';
 if(!s.points||!s.walk)return html+'<button class="primary" id="mapLoad53" '+(s.loading?'disabled':'')+'>'+(s.loading?'Загрузка…':'Открыть интерактивную карту')+'</button><p role="status">'+esc(s.error)+'</p></section>';
 let a;try{a=mapGeometry53(s.points,s.walk)}catch(e){return html+'<p role="status">'+esc(e.message)+'</p></section>'}
 const options=selected=>a.points.map(p=>'<option value="'+esc(p.buildingCode)+'" '+(p.buildingCode===selected?'selected':'')+'>'+esc(p.buildingCode+' · '+p.name)+'</option>').join("");
 const r=a.routes.find(x=>x.from===s.from&&x.to===s.to);
 const current=campusSummary28.data?.strict;
 const observation=current?.routes.find(x=>x.from===s.from&&x.to===s.to);
 const coordinate=c=>a.project(c[0],c[1]).map(n=>n.toFixed(2)).join(",");
 const svg='<svg viewBox="0 0 640 370" role="img" aria-label="Схема взаимного расположения четырёх корпусов и выбранного расчётного пути" style="display:block;width:100%;height:auto;max-height:420px;border:1px solid #ced8df;border-radius:12px;background:#f5f8fa"><path d="M600 55 V23 M594 30 L600 23 L606 30" stroke="#334155" stroke-width="2" fill="none"/><text x="600" y="69" text-anchor="middle" fill="#334155" font-size="13">С</text>'+ (r?'<polyline points="'+r.geometry.map(coordinate).join(" ")+'" fill="none" stroke="#087a71" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>':'')+a.points.map(p=>{const [x,y]=a.project(p.lon,p.lat);const chosen=p.buildingCode===s.from||p.buildingCode===s.to;return '<g><circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="15" fill="'+(chosen?'#174f73':'#526579')+'" stroke="white" stroke-width="2"/><text x="'+x.toFixed(2)+'" y="'+(y+4).toFixed(2)+'" font-size="12" font-weight="bold" text-anchor="middle" fill="white">'+esc(p.buildingCode)+'</text></g>'}).join("")+'</svg>';
 html+='<div class="row"><label>Откуда<select id="mapFrom53">'+options(s.from)+'</select></label><label>Куда<select id="mapTo53">'+options(s.to)+'</select></label><button id="mapReverse53">Поменять местами</button></div>'+svg+'<p class="muted">Схема ориентирована на север. Зелёная линия — геометрия сохранённой внешней оценки; точки — центры объектов. Не схема тротуаров и не навигация внутри зданий.</p>';
 const metric=(label,v)=>'<div class="metric"><small>'+esc(label)+'</small><strong>'+esc(v)+'</strong></div>';
 html+='<div class="grid">'+metric("Расчётная длина",r?Math.round(r.meters)+" м":"Нет оценки")+metric("Время вне зданий",r?Math.ceil(r.seconds/60)+" мин":"Нет оценки")+metric("Переходы групповых блоков",s.from===s.to?"Не рассчитывается":current?(observation?.count||0):"Нет снимка")+metric("Минимальный перерыв",observation?observation.minimum+" мин":"Нет наблюдений")+'</div>';
 if(s.from===s.to)html+='<p class="notice">Выбран один корпус. Для переходов между этажами и аудиториями необходима отдельная модель; время не считается нулевым.</p>';
 else if(!r)html+='<p class="notice">Для этого направления нет сохранённой внешней оценки. Обратный путь не подставляется автоматически.</p>';
 else html+='<p>Время внутри зданий, ограничения доступа и погодные условия не включены. Это не подтверждение, что студент успеет на пару.</p><p><a href="'+esc(r.source)+'" target="_blank" rel="noopener">Источник расчёта маршрута (OSRM)</a></p>';
 return html+'<p class="muted">Пилот: '+a.points.length+' корпуса, '+a.routes.length+' направлений. Геометрия: '+esc(s.walk.checked||"дата не указана")+'. Частоты и интервалы: '+esc(current?calendarStatus27(campusSummary28.snapshot):"календарь ещё не загружен")+'.</p><p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors, ODbL</a> · <a href="https://www.timacad.ru/student-life/skhema-territorii" target="_blank" rel="noopener">Официальная схема академии</a></p></section>';
}
async function loadMap53(){
 const s=map53;if(s.loading)return;s.loading=true;s.error="";render();
 try{const [p,w]=await Promise.all([getJson08("data/osm-address-pilot-15.json"),getJson08("data/osm-walk-pilot-15.json")]);const a=mapGeometry53(p,w);if(!a.points.some(p=>p.buildingCode===s.from))s.from=a.points[0].buildingCode;if(!a.points.some(p=>p.buildingCode===s.to))s.to=a.points[1].buildingCode;s.points=p;s.walk=w}catch(e){s.error=e.message}
 s.loading=false;if(visible16("space12"))render();
}
function renderCampusSummary28(){return renderCampusSummaryBase53()+renderMap53()}
function bindCampusSummary28(){
 on("campusRefresh28","click",()=>refreshCampus28(true));
 on("mapLoad53","click",loadMap53);
 on("mapFrom53","change",e=>{map53.from=e.target.value;render()});
 on("mapTo53","change",e=>{map53.to=e.target.value;render()});
 on("mapReverse53","click",()=>{[map53.from,map53.to]=[map53.to,map53.from];render()});
}
