/* 0.28: recompute spatial reports from the selected calendar snapshot. */
function classifyLocation28(raw,known,aliases,mode){
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
function renderCampusSummary28(){
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
function bindCampusSummary28(){on("campusRefresh28","click",()=>refreshCampus28(true))}
