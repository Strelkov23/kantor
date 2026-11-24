/* 0.27: latest public bundle or clearly labeled frozen research fallback. */
const currentCalendarUrl27="https://raw.githubusercontent.com/Strelkov23/kantor/main/data/current/calendar.json";
let currentCalendar27=null,currentPending27=null;
function validatePeriod54(period,checked){
 const datePattern=/^\d{4}-\d{2}-\d{2}$/;
 const day=v=>{if(typeof v!=="string"||!datePattern.test(v))throw Error("Неверная календарная дата");const n=Date.parse(v+"T00:00:00Z");if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==v)throw Error("Неверная календарная дата");return n};
 const start=day(period?.start),end=day(period?.end),ms=86400000;
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(checked));
 const val=k=>parts.find(x=>x.type===k)?.value;
 const today=day(val("year")+"-"+val("month")+"-"+val("day"));
 if(new Date(start).getUTCDay()!==1||end-start!==13*ms||today<start||today>=start+7*ms)throw Error("Период не соответствует дате сбора");
 return {start,end,day,ms};
}
function validateBundle27(b,catalog){
 const m=b?.manifest,fs=b?.files,expected=new Map(catalog.groups.map(g=>[g.id,g.course]));
 if(b?.version!=="0.27"||m?.version!=="0.11"||m.complete!==true||!Array.isArray(m.groups)||m.groups.length!==83||expected.size!==83||!Array.isArray(fs)||fs.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||!Number.isFinite(Date.parse(m.checked))||Date.parse(m.checked)>Date.now()+300000)throw Error("Неполный или неверный снимок");
 const p=validatePeriod54(b.period,m.checked);
 let total=0;const map=new Map();
 for(let i=0;i<83;i++){
   const g=m.groups[i],f=fs[i];
   if(expected.get(g.group)!==g.course||g.status!=="extracted"||!/^\d+\.json$/.test(g.file)||f.group!==g.group||f.course!==g.course||f.checked!==m.checked||f.url!==g.url||!Array.isArray(f.comparisons)||f.comparisons.length!==g.cards||!g.cards||map.has(g.file))throw Error("Несогласованный снимок группы");
   const sectionIds=["groupScheduleCurrentWeekAccordion","groupScheduleNextWeekAccordion"];
   if(!Array.isArray(f.sections)||f.sections.length!==2)throw Error("Нет двух календарных недель");
   const days=new Map();
   for(let j=0;j<2;j++){
    const section=f.sections[j],lo=p.start+j*7*p.ms;
    if(section.id!==sectionIds[j]||!Array.isArray(section.dates)||!section.dates.length||new Set(section.dates).size!==section.dates.length||section.dates.some(d=>{const n=p.day(d);return n<lo||n>=lo+7*p.ms}))throw Error("Даты раздела не соответствуют календарной неделе");
    days.set(section.id,new Set(section.dates));
   }
   for(const row of f.comparisons){const q=row?.calendar;if(!q||!days.get(q.section)?.has(q.date)||typeof q.subject!=="string"||!q.subject.trim()||typeof q.time!=="string"||!q.time.trim())throw Error("Карточка вне календарного раздела или без обязательных полей")}
   total+=g.cards;map.set(g.file,f);
 }
 if(total!==m.totals.cards||m.totals.groups!==83||m.totals.failed!==0)throw Error("Не совпадают итоги календаря");
 return {manifest:m,files:map,source:"current",period:b.period};
}

/* Last validated live bundle survives reload when browser storage is available. */
const snapshotCache51="kantor-calendar-validated-v051";
function cacheDb51(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(Error("Нет IndexedDB"));return}
  const req=indexedDB.open(snapshotCache51,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("snapshots"))req.result.createObjectStore("snapshots")};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error("Хранилище заблокировано"));
 });
}
async function readCache51(){
 let db;try{db=await cacheDb51();return await new Promise((resolve,reject)=>{const tx=db.transaction("snapshots","readonly"),r=tx.objectStore("snapshots").get("latest");r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error)})}catch(e){return null}finally{db?.close()}
}
async function writeCache51(bundle){
 let db;try{db=await cacheDb51();await new Promise((resolve,reject)=>{const tx=db.transaction("snapshots","readwrite"),store=tx.objectStore("snapshots"),r=store.get("latest");r.onsuccess=()=>{if(!r.result||Date.parse(r.result.manifest.checked)<=Date.parse(bundle.manifest.checked))store.put(bundle,"latest")};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error)});return true}catch(e){return false}finally{db?.close()}
}
function newestSnapshot51(...values){return values.filter(Boolean).sort((a,b)=>Date.parse(b.manifest.checked)-Date.parse(a.manifest.checked))[0]||null}

async function calendarSnapshot27(force=false){
 if(currentPending27)return currentPending27;
 if(currentCalendar27&&!force)return currentCalendar27;
 currentPending27=(async()=>{
   let reason="",cached=null;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   // A storage failure must not prevent online retrieval. Bound waiting for the cache.
   const cachePromise=Promise.race([readCache51(),new Promise(resolve=>setTimeout(()=>resolve(null),1200))]).then(raw=>{try{if(raw)cached={...validateBundle27(raw,instituteCatalog),cached:true};return cached}catch(e){return null}});
   try{
      const res=await fetch(currentCalendarUrl27,{cache:"no-store",signal:controller.signal});
      if(!res.ok)throw Error("HTTP "+res.status);
      const raw=await res.json(),snap=validateBundle27(raw,instituteCatalog);await cachePromise;
      const best=newestSnapshot51(snap,currentCalendar27,cached);
      if(best!==snap){currentCalendar27={...best,warning:"Сервер вернул более старый снимок; сохранена более новая проверенная версия."};return currentCalendar27}
      currentCalendar27=snap;void writeCache51(raw);return snap;
   }catch(e){reason="Последнее обновление недоступно."}finally{clearTimeout(timer)}
   await cachePromise;
   const best=newestSnapshot51(currentCalendar27,cached);
   if(best){currentCalendar27={...best,warning:reason};return currentCalendar27}
   const m=await getJson08("data/calendar-11/manifest.json");
   if(m.complete!==true||m.groups.length!==83)throw Error("Резервный снимок неполон");
   currentCalendar27={manifest:m,files:null,source:"frozen",warning:reason};return currentCalendar27;
 })();
 try{return await currentPending27}finally{currentPending27=null}
}
async function calendarFile27(snap,g){
 if(!g||!/^\d+\.json$/.test(g.file))throw Error("Неверный файл группы");
 const d=snap.files?snap.files.get(g.file):await getJson08("data/calendar-11/"+g.file);
 if(!d||d.checked!==snap.manifest.checked||d.group!==g.group||d.comparisons.length!==g.cards)throw Error("Версии данных не совпадают");
 return d;
}
/* Immutable six-part fallback. Original per-group files remain authoritative. */
let frozenPacked30=null,frozenPackedPending30=null;
function validatePacked30(manifest,parts){
 if(!Array.isArray(parts)||parts.length!==6||manifest.complete!==true||manifest.groups.length!==83)throw Error("Неполный архив");
 const expected=new Map(manifest.groups.map(g=>[g.file,g])),map=new Map();
 for(const p of parts){
  if(p.version!=="0.30-frozen"||p.checked!==manifest.checked||!Array.isArray(p.entries))throw Error("Неверная версия архивного пакета");
  for(const {file,data} of p.entries){
   const g=expected.get(file);
   if(!g||map.has(file)||data.checked!==manifest.checked||data.group!==g.group||data.course!==g.course||data.url!==g.url||!Array.isArray(data.comparisons)||data.comparisons.length!==g.cards)throw Error("Несогласованный архив: "+file);
   map.set(file,data);
  }
 }
 if(map.size!==83||[...map.values()].reduce((n,f)=>n+f.comparisons.length,0)!==manifest.totals.cards)throw Error("Не совпадает баланс архива");
 return map;
}
async function packedFrozen30(manifest){
 if(frozenPacked30?.checked===manifest.checked)return frozenPacked30.files;
 if(frozenPackedPending30)return frozenPackedPending30;
 frozenPackedPending30=(async()=>{
  const parts=await Promise.all(Array.from({length:6},(_,i)=>getJson08("data/calendar-packed-30/part-0"+(i+1)+".json")));
  const files=validatePacked30(manifest,parts);
  frozenPacked30={checked:manifest.checked,files};return files;
 })();
 try{return await frozenPackedPending30}finally{frozenPackedPending30=null}
}
async function calendarFiles27(snap){
 if(snap.source==="frozen"&&!snap.files){
  try{snap.files=await packedFrozen30(snap.manifest)}catch(e){/* Keep per-group fallback if the optional pack is unavailable. */}
 }
 let a=[];for(let i=0;i<snap.manifest.groups.length;i+=6)a.push(...await Promise.all(snap.manifest.groups.slice(i,i+6).map(g=>calendarFile27(snap,g))));return a;
}
function calendarStatus27(snap,now=Date.now()){
 if(!snap)return "Снимок ещё не загружен.";
 const checked=Date.parse(snap.manifest.checked),age=(now-checked)/3600000,old=age>36;
 const fmt=new Intl.DateTimeFormat("ru-RU",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
 // Historical snapshots also have a real period, even without a bundle envelope.
 let period=snap.period;
 if(!period&&Number.isFinite(checked)){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(checked)),v=k=>parts.find(x=>x.type===k).value;
  const d=new Date(v("year")+"-"+v("month")+"-"+v("day")+"T00:00:00Z");d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+13);period={start,end:d.toISOString().slice(0,10)};
 }
 const isoToday=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now));
 const expired=period&&isoToday>period.end;
 const dateText=s=>s.split("-").reverse().join(".");
 return (snap.source==="current"?(snap.cached?"Последний проверенный снимок из памяти устройства":"Последний полученный автоматический снимок"):"Резервный исторический снимок")+" · "+fmt.format(new Date(checked))+" (МСК). "+(period?"Период: "+dateText(period.start)+" – "+dateText(period.end)+". ":"")+(expired?"Период расписания истёк; это архив, не текущие занятия. ":old?"Снимок старше 36 часов. ":"")+(snap.warning||"")+" Оперативные изменения проверяйте в журнале вуза.";
}
