/* 0.27: latest public bundle or clearly labeled frozen research fallback. */
const currentCalendarUrl27="https://raw.githubusercontent.com/Strelkov23/kantor/main/data/current/calendar.json";
let currentCalendar27=null,currentPending27=null;
function validateBundle27(b,catalog){
 const m=b?.manifest,fs=b?.files,expected=new Map(catalog.groups.map(g=>[g.id,g.course]));
 if(b?.version!=="0.27"||m?.version!=="0.11"||m.complete!==true||!Array.isArray(m.groups)||m.groups.length!==83||expected.size!==83||!Array.isArray(fs)||fs.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||!Number.isFinite(Date.parse(m.checked))||Date.parse(m.checked)>Date.now()+300000)throw Error("Неполный или неверный снимок");
 let total=0;const map=new Map();
 for(let i=0;i<83;i++){
   const g=m.groups[i],f=fs[i];
   if(expected.get(g.group)!==g.course||g.status!=="extracted"||!/^\d+\.json$/.test(g.file)||f.group!==g.group||f.course!==g.course||f.checked!==m.checked||f.url!==g.url||!Array.isArray(f.comparisons)||f.comparisons.length!==g.cards||!g.cards||map.has(g.file))throw Error("Несогласованный снимок группы");
   total+=g.cards;map.set(g.file,f);
 }
 if(total!==m.totals.cards||m.totals.groups!==83||m.totals.failed!==0)throw Error("Не совпадают итоги календаря");
 return {manifest:m,files:map,source:"current",period:b.period};
}
async function calendarSnapshot27(force=false){
 if(currentPending27)return currentPending27;
 if(currentCalendar27&&!force)return currentCalendar27;
 currentPending27=(async()=>{
   let reason="";const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
   try{
      const res=await fetch(currentCalendarUrl27,{cache:"no-store",signal:controller.signal});
      if(!res.ok)throw Error("HTTP "+res.status);
      const snap=validateBundle27(await res.json(),instituteCatalog);
      if(currentCalendar27?.source==="current"&&Date.parse(snap.manifest.checked)<Date.parse(currentCalendar27.manifest.checked))throw Error("Получена более старая версия");
      currentCalendar27=snap;return snap;
   }catch(e){reason="Последнее обновление недоступно."}finally{clearTimeout(timer)}
   if(currentCalendar27){currentCalendar27={...currentCalendar27,warning:reason};return currentCalendar27}
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
function calendarStatus27(snap){
 if(!snap)return "Снимок ещё не загружен.";
 const age=(Date.now()-Date.parse(snap.manifest.checked))/3600000,old=age>36;
 return (snap.source==="current"?"Последний полученный автоматический снимок":"Резервный исторический снимок")+" · "+snap.manifest.checked.slice(0,10)+" (UTC). "+(old?"Снимок старше 36 часов. ":"")+(snap.warning||"")+" Оперативные изменения проверяйте в журнале вуза.";
}
