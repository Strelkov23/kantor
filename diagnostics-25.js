/* 0.25: dated calendar diagnostics, group-level blocks, not individual attendance. */
let diag25={data:null,loading:false,error:"",course:"all",sort:"windows",filter:""};
const dayStarts25=[540,655,780,895,1010];
const validTime25=t=>t&&Number.isInteger(t.start)&&Number.isInteger(t.end)&&t.start>=0&&t.end<=1440&&t.end>t.start;
function dayMetrics25(cards,date){
 const result={date,cards:cards.length,validCards:0,invalidCards:0,blocks:0,multiBlocks:0,windows:0,windowDays:0,breakMinutes:0,lessonMinutes:0,span:0,longDays:0,oneBlockDays:0,earlyDays:0,lateDays:0,usable:false};
 const valid=cards.filter(x=>validTime25(x.timing));result.validCards=valid.length;result.invalidCards=cards.length-valid.length;
 // An unknown interval makes all daily time indicators incomplete. Do not treat it as free time.
 if(!cards.length||result.invalidCards)return result;
 const blocks=[];
 for(const x of valid.slice().sort((a,b)=>a.timing.start-b.timing.start||a.timing.end-b.timing.end)){
  const {start,end}=x.timing,last=blocks.at(-1);
  if(last&&start<last.end){last.end=Math.max(last.end,end);last.cards++}
  else blocks.push({start,end,cards:1});
 }
 result.usable=true;result.blocks=blocks.length;result.multiBlocks=blocks.filter(b=>b.cards>1).length;
 result.span=blocks.at(-1).end-blocks[0].start;
 result.lessonMinutes=blocks.reduce((n,b)=>n+b.end-b.start,0);
 result.longDays=Number(result.span>=360);result.oneBlockDays=Number(blocks.length===1);
 result.earlyDays=Number(blocks[0].start<=540);result.lateDays=Number(blocks.at(-1).end>=1105);
 for(let i=1;i<blocks.length;i++){
   let a=blocks[i-1],b=blocks[i];result.breakMinutes+=b.start-a.end;
   result.windows+=dayStarts25.filter(s=>s>=a.end&&s+95<=b.start).length;
 }
 result.windowDays=Number(result.windows>0);
 if(result.span!==result.lessonMinutes+result.breakMinutes)throw Error("Баланс времени нарушен");
 return result;
}
const diagFields25=["cards","validCards","invalidCards","blocks","multiBlocks","windows","windowDays","breakMinutes","lessonMinutes","span","longDays","oneBlockDays","earlyDays","lateDays"];
function sumDiag25(rows){
 let t=Object.fromEntries(diagFields25.map(k=>[k,0]));
 for(const r of rows)for(const k of diagFields25)t[k]+=r[k];
 return t;
}
function groupDiag25(g,f,checked){
 if(f.checked!==checked||f.group!==g.group||f.course!==g.course||!Array.isArray(f.comparisons)||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок: "+g.group);
 const dates=new Map();
 for(const x of f.comparisons){
  const d=x.calendar?.date;
  if(typeof d!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d))throw Error("Неверная дата: "+g.group);
  if(!dates.has(d))dates.set(d,[]);dates.get(d).push(x);
 }
 const days=[...dates].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,rows])=>dayMetrics25(rows,date));
 return {group:g.group,course:g.course,url:g.url,activeDays:days.length,usableDays:days.filter(x=>x.usable).length,unusableDays:days.filter(x=>!x.usable).length,...sumDiag25(days),days};
}
function aggregateDiag25(manifest,files,catalog){
 const expected=new Set(catalog.groups.map(g=>g.id));
 if(manifest.complete!==true||expected.size!==83||manifest.groups.length!==83||files.length!==83||new Set(manifest.groups.map(g=>g.group)).size!==83||manifest.groups.some(g=>!expected.has(g.group)))throw Error("Нужен полный снимок 83 очных групп");
 const groups=manifest.groups.map((g,i)=>groupDiag25(g,files[i],manifest.checked));
 const days=groups.flatMap(g=>g.days),totals=sumDiag25(days);
 if(totals.cards!==manifest.totals.cards||totals.validCards+totals.invalidCards!==totals.cards)throw Error("Не совпадает баланс карточек");
 const courseRows=[1,2,3,4,5].map(course=>{
   let a=groups.filter(g=>g.course===course),ds=a.flatMap(g=>g.days);
   return {course,groups:a.length,activeDays:ds.length,usableDays:ds.filter(x=>x.usable).length,...sumDiag25(ds)};
 });
 return {version:"0.25",checked:manifest.checked,scope:manifest.scope,groups,courses:courseRows,totals:{...totals,activeDays:days.length,usableDays:days.filter(d=>d.usable).length,unusableDays:days.filter(d=>!d.usable).length},firstDate:days.map(d=>d.date).sort()[0],lastDate:days.map(d=>d.date).sort().at(-1)};
}
async function loadDiag25(){
 const s=diag25;if(s.loading)return;s.loading=true;s.error="";render();
 try{
  const snap=await calendarSnapshot27(true),m=snap.manifest;
  if(m.complete!==true||m.groups.length!==83||m.groups.some(g=>!/^\d+\.json$/.test(g.file)))throw Error("Полный календарный снимок не опубликован");
  const files=await calendarFiles27(snap);
  s.data=aggregateDiag25(m,files,instituteCatalog);s.snapshot=snap;
  try{resourceDiag26.data=resourceAggregate26(m,files,instituteCatalog);resourceDiag26.error=""}catch(e){resourceDiag26.error=e.message;resourceDiag26.data=null}
 }catch(e){s.error=e.message}
 s.loading=false;if(visible16("baseline09"))render();
}
function renderDiag25(){
 const s=diag25,d=s.data;
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 const avg=(n,k)=>k?(n/k).toFixed(1):"—";
 let html='<section class="panel"><div class="eyebrow23">Диагностика до оптимизации</div><h2>Как устроено расписание сейчас</h2><p>Анализ опубликованного электронного журнала всех 83 очных групп. Система ищет окна, длинные учебные дни и дни с одним временным блоком. Это признаки для проверки, а не автоматически установленные нарушения.</p><div class="row"><button id="loadDiag25" class="primary" '+(s.loading?"disabled":"")+'>'+(s.loading?"Сбор данных 83 групп…":d?"Пересчитать снимок":"Проанализировать расписание")+'</button><button data-tab="calendar11">Сверка с официальными источниками</button><button data-tab="scenarios">Сравнить альтернативы</button></div><p role="status">'+esc(s.error)+'</p>';
 if(!d)return html+'<p class="muted">Расчёт выполняется в браузере по сохранённым данным, без обращения к личным данным студентов.</p></section>';
 const rows=d.groups.filter(g=>(s.course==="all"||g.course===+s.course)&&g.group.toLowerCase().includes(s.filter.toLowerCase())).slice().sort((a,b)=>b[s.sort]-a[s.sort]||a.group.localeCompare(b.group,"ru",{numeric:true}));
 const t=d.totals,ds=d.groups.flatMap(g=>g.days.map(x=>({...x,group:g.group,course:g.course}))).filter(x=>(s.course==="all"||x.course===+s.course)&&x.group.toLowerCase().includes(s.filter.toLowerCase())&&x.usable&&x.windows>0).sort((a,b)=>b.windows-a.windows||b.span-a.span);
 return html+'<div class="source23"><b>Календарный снимок: '+esc(d.firstDate)+' — '+esc(d.lastDate)+'</b><p>'+esc(calendarStatus27(s.snapshot))+' <a href="https://eg.timacad.ru/schedule/groups/" target="_blank" rel="noopener">проверяйте замены на сайте академии</a>.</p></div><div class="grid">'+metric("Охвачено групп",d.groups.length)+metric("Карточки занятий",t.cards)+metric("Дни групп с занятиями",t.activeDays)+metric("Полные пустые пары между занятиями",t.windows)+metric("Дни с окнами",t.windowDays)+metric("Дни с одним временным блоком",t.oneBlockDays)+metric("Дни длительностью ≥6 ч",t.longDays)+metric("Дни с окончанием в 18:25 или позже",t.lateDays)+'</div><p class="muted">Дней с неизвестным временем: '+t.unusableDays+'; блоков с пересекающимися карточками: '+t.multiBlocks+'. Совпадающие интервалы объединяются для оценки времени, но не считаются одним подтверждённым занятием. Показатели не взвешены по численности студентов.</p><h3>Нагрузка по курсам</h3><div class="split12"><div>'+chartRows12(d.courses.map(c=>[c.course+" курс: окна",c.windows]))+'</div><div>'+chartRows12(d.courses.map(c=>[c.course+" курс: дни ≥6 ч",c.longDays]))+'</div></div><div class="scroll"><table><tr><th>Курс</th><th>Группы</th><th>Активные дни</th><th>Окна</th><th>Дни с окнами</th><th>Окон на 100 проверяемых дней</th><th>Средняя длительность дня, ч</th></tr>'+d.courses.map(c=>'<tr><td>'+c.course+'</td><td>'+c.groups+'</td><td>'+c.activeDays+'</td><td>'+c.windows+'</td><td>'+c.windowDays+'</td><td>'+avg(c.windows*100,c.usableDays)+'</td><td>'+avg(c.span,c.usableDays*60)+'</td></tr>').join("")+'</table></div><h3>Какие группы требуют внимания?</h3><div class="row"><label>Курс<select id="courseDiag25">'+["all",1,2,3,4,5].map(v=>'<option value="'+v+'" '+(String(v)===s.course?"selected":"")+'>'+(v==="all"?"Все":v)+'</option>').join("")+'</select></label><label>Найти группу<input id="filterDiag25" value="'+esc(s.filter)+'" placeholder="ДЭ"></label><label>Сортировать по<select id="sortDiag25">'+[["windows","Окна"],["longDays","Длинные дни"],["oneBlockDays","Дни с одним блоком"],["lateDays","Поздние занятия"],["multiBlocks","Пересекающиеся карточки"]].map(([v,n])=>'<option value="'+v+'" '+(s.sort===v?"selected":"")+'>'+n+'</option>').join("")+'</select></label><button id="exportDiag25">CSV по группам</button><button id="exportDays25">CSV по дням</button></div><div class="scroll"><table><tr><th>Группа</th><th>Дни</th><th>Окна</th><th>Дни с окнами</th><th>Дни ≥6 ч</th><th>Один блок</th><th>Средний день, ч</th></tr>'+rows.map(g=>'<tr><td><button data-diag-group25="'+esc(g.group)+'">'+esc(g.group)+'</button></td><td>'+g.activeDays+'</td><td>'+g.windows+'</td><td>'+g.windowDays+'</td><td>'+g.longDays+'</td><td>'+g.oneBlockDays+'</td><td>'+avg(g.span,g.usableDays*60)+'</td></tr>').join("")+'</table></div><h3>Дни с наибольшим количеством окон</h3><div class="scroll"><table><tr><th>Группа</th><th>Дата</th><th>Окна</th><th>Время от первой до последней пары, мин</th><th>Все промежутки, мин</th></tr>'+ds.slice(0,20).map(x=>'<tr><td><button data-diag-group25="'+esc(x.group)+'" data-diag-date25="'+esc(x.date)+'">'+esc(x.group)+'</button></td><td>'+esc(x.date)+'</td><td>'+x.windows+'</td><td>'+x.span+'</td><td>'+x.breakMinutes+'</td></tr>').join("")+'</table></div><details><summary>Как считаются показатели?</summary><p>Полное окно — стандартная 95-минутная пара, целиком помещающаяся в свободный интервал между занятиями. Обычные перерывы не являются окнами. Временные блоки получены объединением пересекающихся интервалов. Длительность дня — разница между началом первого и окончанием последнего блока. Порог 6 часов и границы раннего/позднего дня — аналитические ориентиры, не правовые нормы. При неизвестном времени день исключается из временных показателей, но карточки и активный день остаются в учёте. Показатели по электронному журналу нельзя напрямую сравнивать с показателями семестрового PDF без сверки.</p></details></section>';
}
function bindDiag25(){
 on("loadDiag25","click",loadDiag25);
 for(const [id,k] of [["courseDiag25","course"],["sortDiag25","sort"],["filterDiag25","filter"]])on(id,"change",e=>{diag25[k]=e.target.value;render()});
 document.querySelectorAll("[data-diag-group25]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.diagGroup25,b.dataset.diagDate25||null)});
 function exportRows(daily){const d=diag25.data;if(!d)return;const gs=d.groups.filter(g=>(diag25.course==="all"||g.course===+diag25.course)&&g.group.toLowerCase().includes(diag25.filter.toLowerCase())),cols=daily?["group","course","date","usable",...diagFields25]:["group","course","activeDays","usableDays","unusableDays",...diagFields25],rows=daily?gs.flatMap(g=>g.days.map(x=>({...x,group:g.group,course:g.course}))):gs;
  download(daily?"kantor-calendar-days.csv":"kantor-calendar-groups.csv","\ufeff"+[[...cols,"snapshot"],...rows.map(r=>[...cols.map(k=>r[k]),d.checked])].map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8");
 }
 on("exportDiag25","click",()=>exportRows(false));on("exportDays25","click",()=>exportRows(true));
}
