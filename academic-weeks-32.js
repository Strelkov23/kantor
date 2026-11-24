/* 0.32: explicit academic week evidence. Never use ISO parity to infer teaching cycle. */
function monday32(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Некорректная дата");
 const d=new Date(value+"T12:00:00Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error("Некорректная дата");
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
}
function plusDate32(value,n){const d=new Date(value+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
const weekName32=k=>({upper:"Верхняя",lower:"Нижняя",unknown:"Не установлена",conflict:"Противоречивые отметки"})[k]||"Не установлена";
function labelType32(raw){
 const s=String(raw??"").trim().toLocaleLowerCase("ru").replace(/\s+/g," ");
 if(/^неделя:\s*верхняя$/.test(s))return "upper";
 if(/^неделя:\s*нижняя$/.test(s))return "lower";
 if(/^неделя:\s*обе$/.test(s))return "both";
 return "unmarked";
}
function weekEvidence32(f){
 const by=new Map();
 const get=mon=>{if(!by.has(mon))by.set(mon,{monday:mon,upper:0,lower:0,both:0,unmarked:0,cards:0,dates:new Set()});return by.get(mon)};
 for(const s of f.sections||[])for(const dt of s.dates||[])get(monday32(dt)).dates.add(dt);
 for(const x of f.comparisons){
  const c=x.calendar,row=get(monday32(c.date));row.dates.add(c.date);row.cards++;row[labelType32(c.weekLabel)]++;
 }
 return [...by.values()].sort((a,b)=>a.monday.localeCompare(b.monday)).map(r=>{
  const own=r.upper&&r.lower?"conflict":r.upper?"upper":r.lower?"lower":"unknown";
  const expected=f.weekEvidence?.[r.monday];
  const declared=Array.isArray(expected)?expected.length===1&&expected[0]===0?"upper":expected.length===1&&expected[0]===1?"lower":expected.length>1?"conflict":"unknown":"unknown";
  const status=own==="conflict"||declared==="conflict"||(declared!=="unknown"&&declared!==own)?"conflict":own;
  return {...r,dates:[...r.dates].sort(),status,declared};
 });
}
function weekAggregate32(m,files,catalog){
 if(m.complete!==true||m.groups.length!==83||files.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||m.groups.some(g=>!catalog.groups.some(c=>c.id===g.group&&c.course===g.course)))throw Error("Нужны 83 группы");
 const map=new Map(),byGroup=new Map();let total=0;
 for(let i=0;i<83;i++){
  const g=m.groups[i],f=files[i];
  if(f.group!==g.group||f.checked!==m.checked||f.course!==g.course||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок");
  const evidence=weekEvidence32(f);byGroup.set(g.group,evidence);
  for(const e of evidence){
   const rows=f.comparisons.filter(x=>monday32(x.calendar.date)===e.monday),days=new Map();
   for(const x of rows){const dt=x.calendar.date;if(!days.has(dt))days.set(dt,[]);days.get(dt).push(x)}
   const metrics=[...days].map(([date,arr])=>dayMetrics25(arr,date));
   const t=sumDiag25(metrics);
   if(t.cards!==e.cards)throw Error("Баланс карточек недели");
   const row={group:g.group,course:g.course,...e,...t,activeDays:metrics.length,usableDays:metrics.filter(x=>x.usable).length};
   if(!map.has(e.monday))map.set(e.monday,[]);
   map.get(e.monday).push(row);total+=rows.length;
  }
 }
 if(total!==m.totals.cards)throw Error("Баланс календарного цикла");
 const periods=[...map].sort((a,b)=>a[0].localeCompare(b[0])).map(([monday,groups])=>{
  const evidence={upper:0,lower:0,unknown:0,conflict:0};
  for(const g of groups)evidence[g.status]++;
  const status=evidence.conflict||evidence.upper&&evidence.lower?"conflict":evidence.upper?"upper":evidence.lower?"lower":"unknown";
  const sum=gs=>({...sumDiag25(gs),groups:gs.length,activeDays:gs.reduce((n,g)=>n+g.activeDays,0),usableDays:gs.reduce((n,g)=>n+g.usableDays,0)});
  const t=sum(groups),courses=[1,2,3,4,5].map(course=>({course,...sum(groups.filter(g=>g.course===course))}));
  return {monday,end:plusDate32(monday,6),status,evidence,missingGroups:83-groups.length,totals:t,courses,groups};
 });
 const cycle=periods.length===2&&periods.every(p=>p.missingGroups===0&&p.evidence[p.status]===83&&["upper","lower"].includes(p.status))&&periods[0].status!==periods[1].status&&plusDate32(periods[0].monday,7)===periods[1].monday?"verified-alternation":"not-fully-verified";
 return {checked:m.checked,total,periods,cycle,byGroup};
}
let week32={data:null,snapshot:null,error:"",course:"all",period:"all"};
function prepareWeeks32(snap,files){
 try{week32.data=weekAggregate32(snap.manifest,files,instituteCatalog);week32.snapshot=snap;week32.error="";if(!week32.data.periods.some(x=>x.monday===week32.period))week32.period="all"}catch(e){week32.data=null;week32.error=e.message}
}
function weekRows32(){const s=week32;return (s.data?.periods||[]).filter(p=>s.period==="all"||s.period===p.monday).flatMap(p=>p.groups.filter(g=>s.course==="all"||g.course===+s.course))}
function renderWeeks32(){
 const s=week32,d=s.data;
 let html='<section class="panel"><h2>Верхняя и нижняя недели</h2><p>Сравниваем фактические даты и отметки «Неделя: Верхняя» / «Неделя: Нижняя» из журнала. Отметка «Обе» сама по себе не определяет тип недели. Номер календарной недели не используется для определения учебной чётности.</p>';
 if(!d)return html+'<p role="status">'+esc(s.error||"Загрузите календарный снимок.")+'</p><button id="loadWeeks32" class="primary" '+(diag25.loading?"disabled":"")+'>Загрузить</button></section>';
 const pct=(n,k)=>k?(100*n/k).toFixed(1):"—";
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 html+='<div class="source23">'+esc(calendarStatus27(s.snapshot))+'</div><p class="notice">'+(d.cycle==="verified-alternation"?"Чередование подтверждено явными отметками всех 83 групп в обеих соседних неделях.":"Чередование не подтверждено полностью. Неизвестные и противоречивые отметки не заменяются предположениями.")+'</p><div class="split12">'+d.periods.map(p=>'<section><h3>'+esc(weekName32(p.status))+' · '+esc(p.monday)+' — '+esc(p.end)+'</h3><div class="grid">'+metric("Карточки",p.totals.cards)+metric("Активные дни",p.totals.activeDays)+metric("Полные окна",p.totals.windows)+metric("Дни ≥6 ч",p.totals.longDays)+'</div><p>Отметки групп: верхняя '+p.evidence.upper+', нижняя '+p.evidence.lower+', неизвестно '+p.evidence.unknown+', противоречие '+p.evidence.conflict+', нет данных '+p.missingGroups+'.</p></section>').join("")+'</div><h3>Сравнение по курсам</h3><div class="scroll"><table><tr><th>Неделя</th><th>Курс</th><th>Карточки</th><th>Дни</th><th>Окна</th><th>Окон на 100 проверяемых дней</th><th>Длительность ≥6 ч</th></tr>'+d.periods.flatMap(p=>p.courses.map(c=>'<tr><td>'+esc(p.monday+" · "+weekName32(p.status))+'</td><td>'+c.course+'</td><td>'+c.cards+'</td><td>'+c.activeDays+'</td><td>'+c.windows+'</td><td>'+pct(c.windows,c.usableDays)+'</td><td>'+c.longDays+'</td></tr>')).join("")+'</table></div><h3>Учебные группы</h3><div class="row"><label>Неделя<select id="period32"><option value="all">Обе недели</option>'+d.periods.map(p=>'<option value="'+p.monday+'" '+(s.period===p.monday?"selected":"")+'>'+esc(p.monday+" · "+weekName32(p.status))+'</option>').join("")+'</select></label><label>Курс<select id="course32">'+["all",1,2,3,4,5].map(c=>'<option value="'+c+'" '+(String(c)===s.course?"selected":"")+'>'+(c==="all"?"Все":c)+'</option>').join("")+'</select></label><button id="exportWeeks32">CSV по неделям</button></div><div class="scroll"><table><tr><th>Группа</th><th>Дата начала</th><th>Тип недели</th><th>Карточки</th><th>Окна</th><th>Дни ≥6 ч</th><th>Без явной отметки</th></tr>'+weekRows32().map(g=>'<tr><td><button data-week-group32="'+esc(g.group)+'" data-week-date32="'+esc(g.dates[0]||g.monday)+'">'+esc(g.group)+'</button></td><td>'+esc(g.monday)+'</td><td>'+esc(weekName32(g.status))+'</td><td>'+g.cards+'</td><td>'+g.windows+'</td><td>'+g.longDays+'</td><td>'+g.unmarked+'</td></tr>').join("")+'</table></div><p class="muted">Карточка с отметкой «Обе» учитывается отдельно в каждой фактически опубликованной дате. Никаких переносов между неделями и автоматического размножения занятий в будущие недели. Групповые показатели не равны индивидуальной нагрузке.</p></section>';
 return html;
}
function bindWeeks32(){
 on("loadWeeks32","click",loadDiag25);
 for(const [id,k] of [["period32","period"],["course32","course"]])on(id,"change",e=>{week32[k]=e.target.value;render()});
 document.querySelectorAll("[data-week-group32]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.weekGroup32,b.dataset.weekDate32)});
 on("exportWeeks32","click",()=>{const d=week32.data;if(!d)return;const cols=["group","course","monday","status","upper","lower","both","unmarked","cards","activeDays","usableDays","windows","longDays","span","lessonMinutes"];const rows=[cols.concat("snapshot"),...weekRows32().map(g=>cols.map(k=>g[k]).concat(d.checked))];download("kantor-academic-weeks.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
