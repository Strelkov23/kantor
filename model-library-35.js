/* 0.35 — Persistent configuration library and whole-week comparison. */
function validateConfig35(p){
 if(!p||typeof p!=="object"||typeof p.name!=="string"||!p.name.trim()||p.name.length>60||!["all","upper","lower"].includes(p.week)||!["all","1","2","3","4","5"].includes(p.course)||typeof p.strict!=="boolean"||!Number.isInteger(p.limit)||p.limit<1||p.limit>200||!Array.isArray(p.w)||p.w.length!==4||p.w.some(v=>!Number.isInteger(v)||v<0||v>10)||!p.w.some(Boolean))throw Error("Некорректная конфигурация модели");
 return {name:p.name.trim(),week:p.week,course:p.course,strict:p.strict,limit:p.limit,w:p.w.slice()};
}
function readLibrary35(raw){
 if(!raw||!["0.35-library","0.34"].includes(raw.version))throw Error("Неизвестный формат файла моделей");
 const list=raw.version==="0.35-library"?raw.entries:raw.models;
 if(!Array.isArray(list)||list.length>40)throw Error("Ожидается не более 40 моделей");
 return list.map(x=>({config:validateConfig35(x?.config),checked:typeof x.checked==="string"&&Number.isFinite(Date.parse(x.checked))?x.checked:null}));
}
function groupCalendar35(cards,moves,group,monday){
 const original=cards.filter(q=>q.group===group&&monday32(q.date)===monday);
 const map=new Map(moves.map(x=>[x.id,x]));
 return {before:original,after:original.map(q=>{const x=map.get(q.id);return x?{...q,start:x.newStart,end:x.newEnd,moved:true}:q})};
}

const lib35={entries:[],loaded:false,msg:"",group:"",week:"",model:null,mode:"both"};
const libraryKey35="kantor-model-library-v035";
function loadLibrary35(){
 if(lib35.loaded)return;
 lib35.loaded=true;
 try{const raw=localStorage.getItem(libraryKey35);if(raw)lib35.entries=readLibrary35(JSON.parse(raw))}catch(e){lib35.msg="Не удалось прочитать библиотеку: "+e.message}
}
function saveLibrary35(){
 try{localStorage.setItem(libraryKey35,JSON.stringify({version:"0.35-library",entries:lib35.entries}));return true}catch(e){lib35.msg="Хранилище браузера недоступно. Скачайте JSON, чтобы не потерять модели.";return false}
}
function addLibrary35(entries){
 if(lib35.entries.length+entries.length>40)throw Error("Лимит библиотеки — 40 настроек. Удалите ненужные записи.");
 lib35.entries=lib35.entries.concat(entries);
 lib35.msg="Добавлено настроек: "+entries.length+". Результаты будут рассчитаны заново.";
 saveLibrary35();
}
function renderLibrary35(){
 loadLibrary35();const s=sync34(),ready=!!(s.source&&inter33.context?.ready===opportunities29.readiness&&Array.isArray(inter33.resourceReview)&&!opportunities29.loading);
 const checked=s.source?.checked;
 return '<section class="panel"><div class="eyebrow23">Личное рабочее пространство</div><h2>Библиотека моделей</h2><p>Сохраняются настройки, а не неподтверждённые назначения. Можно вернуться после закрытия браузера. Для каждого открытия результата требуется расчёт на текущем снимке.</p><div class="row"><button id="archive35" '+(!s.models.length?"disabled":"")+'>В библиотеку: выбранную модель</button><button id="exportLibrary35" '+(!lib35.entries.length?"disabled":"")+'>Скачать библиотеку JSON</button><label>Импорт настроек<input type="file" id="importLibrary35" accept=".json,application/json" style="max-width:100%"></label></div><p role="status">'+esc(lib35.msg)+'</p><p class="muted">'+lib35.entries.length+' / 40 · хранение на этом устройстве, без синхронизации между устройствами. Поддерживается экспорт 0.34. Импортированные результаты не принимаются за достоверные.</p>'+(lib35.entries.length?'<div class="grid">'+lib35.entries.map((x,i)=>'<article class="metric"><h3 style="overflow-wrap:anywhere">'+esc(x.config.name)+'</h3><p>'+esc(x.config.week==="all"?"Обе недели":weekName32(x.config.week))+' · '+esc(x.config.course==="all"?"Все курсы":x.config.course+" курс")+' · '+(x.config.strict?"Строгий":"Предварительный")+'</p><p>Лимит: '+x.config.limit+' · веса: '+x.config.w.join(" / ")+'</p><p class="muted">'+esc(x.checked?(x.checked===checked?"Настройки рассчитаны на этом снимке ранее":"Прошлый снимок: "+x.checked.slice(0,10)):"Настройки без исходного снимка")+'</p><div class="row"><button data-edit35="'+i+'">Настроить</button><button data-recalc35="'+i+'" '+(!ready||s.models.length>=6?"disabled":"")+'>Пересчитать</button><button data-remove35="'+i+'" aria-label="Удалить '+esc(x.config.name)+'">Удалить</button></div></article>').join("")+'</div>':'<p class="muted">Сохраните первую модель после расчёта или импортируйте JSON.</p>')+'</section>';
}
function renderCalendar35(){
 const s=sync34(),m=s.models[s.active],ready=opportunities29.readiness;
 if(!m||!ready||s.source?.checked!==m.checked)return "";
 if(lib35.model!==m){lib35.model=m;lib35.group=m.moves[0]?.group||ready.groups[0]?.group||"";lib35.week=m.moves[0]?.weekStart||""}
 const groups=ready.groups.filter(g=>m.config.course==="all"||String(g.course)===m.config.course).map(g=>g.group);
 if(!groups.includes(lib35.group))lib35.group=groups[0]||"";
 const evidence=(week32.data?.byGroup.get(lib35.group)||[]).filter(w=>m.config.week==="all"||w.status===m.config.week);
 if(!evidence.some(w=>w.monday===lib35.week))lib35.week=evidence[0]?.monday||"";
 const group=lib35.group,mon=lib35.week;
 const opts=(rows,value)=>rows.map(([v,n])=>'<option value="'+esc(v)+'" '+(v===value?"selected":"")+'>'+esc(n)+'</option>').join("");
 let h='<section class="panel" id="calendarCompare35"><div class="eyebrow23">Визуальная модель · 0.35</div><h2>Неделя целиком: было и стало</h2><p>Модель: <b>'+esc(m.name)+'</b>. Показываются все календарные карточки выбранной группы, включая неперенесённые. Неизвестное время не превращается в свободный интервал.</p><div class="row"><label>Группа<select id="calGroup35">'+opts(groups.map(g=>[g,g+(m.moves.some(x=>x.group===g)?" · есть переносы":"")]),group)+'</select></label><label>Учебная неделя<select id="calWeek35">'+opts(evidence.map(w=>[w.monday,w.monday+" · "+weekName32(w.status)]),mon)+'</select></label><label>Показать<select id="calMode35">'+opts([["both","До и после"],["before","Исходное"],["after","Модель"]],lib35.mode)+'</select></label></div>';
 if(!group||!mon)return h+'<p>Нет подходящей недели в выбранной группе.</p></section>';
 const pair=groupCalendar35(ready.cards,m.moves,group,mon);
 const days=Array.from({length:7},(_,i)=>plusDate32(mon,i));
 const valid=q=>q.time&&Number.isFinite(q.start)&&Number.isFinite(q.end);
 const moved=new Set(m.moves.map(x=>x.id));
 const known=pair.before.filter(valid).length;
 const change=pair.after.filter(q=>q.moved).length;
 const summary=list=>{const totals={windows:0,span:0,usable:0};for(const dt of days){const a=list.filter(q=>q.date===dt);if(!a.length||a.some(q=>!valid(q)))continue;const r=dayMetrics25(a.map(q=>({timing:{start:q.start,end:q.end}})),dt);if(r.usable){totals.usable++;totals.windows+=r.windows;totals.span+=r.span}}return totals};
 const a=summary(pair.before),b=summary(pair.after);
 h+='<div class="grid">'+[["Карточки",pair.before.length],["С известным временем",known],["Перенесено в этой неделе",change],["Окна в пригодных днях",a.windows+" → "+b.windows],["Длительность пригодных дней, мин",a.span+" → "+b.span]].map(([n,v])=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div><p class="muted">Временные показатели: '+a.usable+' → '+b.usable+' пригодных дней; дни с неизвестными или пересекающимися интервалами не учитываются.</p>';
 const labels=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],dayView=(list,dt,i)=>{
  const q=list.filter(x=>x.date===dt).sort((a,b)=>(valid(a)?a.start:99999)-(valid(b)?b.start:99999));
  return '<section class="weekCard35"><h4>'+labels[i]+' · '+dt.slice(8)+'.'+dt.slice(5,7)+'</h4>'+(q.length?q.map(x=>'<div class="lesson35 '+(moved.has(x.id)?"changed35":"")+'"><strong>'+esc(valid(x)?clock26(x.start)+"–"+clock26(x.end):"Время не распознано")+'</strong><b>'+esc(x.subject)+'</b><small>'+esc(x.roomLabel||"Аудитория не указана")+'</small>'+(moved.has(x.id)?'<small>'+esc(x.moved?"Перенесено в модели":"Исходное время переносимой пары")+'</small>':"")+'</div>').join(""):'<p class="muted">В снимке нет карточек</p>')+'</section>';
 };
 const weekView=(list,title)=>'<div><h3>'+title+'</h3><div class="weekGrid35">'+days.map((dt,i)=>dayView(list,dt,i)).join("")+'</div></div>';
 h+='<style>.weekGrid35{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px}.weekCard35{border:1px solid #dce5e9;border-radius:9px;padding:8px;background:#f7f9fa;min-width:0}.weekCard35 h4{margin:0 0 8px}.lesson35{display:grid;gap:3px;padding:8px;margin:6px 0;background:white;border-left:3px solid #91a8b5;border-radius:5px;overflow-wrap:anywhere}.lesson35 strong,.lesson35 small{font-size:11px}.lesson35 b{font-size:12px}.lesson35.changed35{border-color:#087e78;background:#e2f2ed}.weekCompare35{display:grid;gap:18px}@media(max-width:480px){.weekGrid35{grid-template-columns:repeat(2,minmax(0,1fr))}}</style><p><span style="color:#087e78;font-weight:700">Бирюзовая карточка</span> — занятие, включённое в перенос. Дни без карточек не считаются доказанно свободными.</p><div class="weekCompare35">'+(lib35.mode!=="after"?weekView(pair.before,"Исходное расписание"):"")+(lib35.mode!=="before"?weekView(pair.after,"Экспериментальная модель"):"")+'</div><button id="csvWeek35">Скачать сравнение недели CSV</button></section>';
 return h;
}
function bindLibrary35(){
 loadLibrary35();const s=sync34();
 on("archive35","click",()=>{try{const m=s.models[s.active];if(!m)throw Error("Нет выбранной модели");addLibrary35([{config:validateConfig35(m.config),checked:m.checked}])}catch(e){lib35.msg=e.message}render()});
 on("exportLibrary35","click",()=>download("kantor-model-library.json",JSON.stringify({version:"0.35-library",entries:lib35.entries},null,2),"application/json"));
 on("importLibrary35","change",async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>5*1024*1024)throw Error("Файл больше 5 МБ");addLibrary35(readLibrary35(JSON.parse(await f.text())))}catch(err){lib35.msg=err.message}render()});
 document.querySelectorAll("[data-edit35]").forEach(b=>b.onclick=()=>{const x=lib35.entries[+b.dataset.edit35];if(!x)return;s.p=validateConfig35(x.config);lib35.msg="Настройки скопированы в лабораторию.";render();$("studio34")?.scrollIntoView?.({block:"start"})});
 document.querySelectorAll("[data-recalc35]").forEach(b=>b.onclick=()=>{try{if(s.models.length>=6||opportunities29.loading)throw Error("Освободите место в сравнении или дождитесь загрузки");const x=lib35.entries[+b.dataset.recalc35];const m=build34(validateConfig35(x.config));s.models.push(m);s.active=s.models.length-1;s.detail="";lib35.msg="Модель пересчитана на текущем снимке.";x.checked=m.checked;saveLibrary35()}catch(e){lib35.msg=e.message}render();$("calendarCompare35")?.scrollIntoView?.({block:"start"})});
 document.querySelectorAll("[data-remove35]").forEach(b=>b.onclick=()=>{const i=+b.dataset.remove35;if(!lib35.entries[i])return;if(!confirm("Удалить настройки из библиотеки?"))return;lib35.entries.splice(i,1);lib35.msg="Настройки удалены.";saveLibrary35();render()});
 for(const [id,k] of [["calGroup35","group"],["calWeek35","week"],["calMode35","mode"]])on(id,"change",e=>{lib35[k]=e.target.value;render()});
 on("csvWeek35","click",()=>{const m=s.models[s.active];if(!m)return;const p=groupCalendar35(opportunities29.readiness.cards,m.moves,lib35.group,lib35.week),old=new Map(p.before.map(q=>[q.id,q]));const rows=[["Группа","Дата","Предмет","Было начало","Было конец","Стало начало","Стало конец","Аудитория","Перенос","Снимок","Статус"],...p.after.map(q=>{const a=old.get(q.id),clock=(x,k)=>x.time?clock26(x[k]):"Неизвестно";return [q.group,q.date,q.subject,clock(a,"start"),clock(a,"end"),clock(q,"start"),clock(q,"end"),q.roomLabel,q.moved?"Да":"Нет",m.checked,"observed-only"]})];download("kantor-week-comparison.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
