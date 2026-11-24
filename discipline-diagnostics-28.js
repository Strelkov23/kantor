/* 0.28: discipline distribution by observed group calendar, no assumed curriculum prerequisites. */
const subjectKey28=v=>String(v??"").trim().replace(/\s+/gu," ").toLocaleLowerCase("ru");
function disciplineGroup28(file){
 const subjects=new Map(),totals={cards:0,unclassified:0,lecture:0,practice:0,other:0,overlapCandidates:0,sequenceEligible:0,practiceFirst:0,sameStart:0};
 for(const x of file.comparisons){
  const c=x.calendar,t=x.timing,k=subjectKey28(c.subject);totals.cards++;
  if(!k||!validTime25(t)){totals.unclassified++;continue}
  const type=subjectKey28(c.type),kind=type==="лекция"?"lecture":type==="практика"?"practice":"other";
  if(!subjects.has(k))subjects.set(k,{subject:String(c.subject).trim(),cards:0,lecture:0,practice:0,other:0,events:new Map()});
  const s=subjects.get(k);s.cards++;s[kind]++;totals[kind]++;
  const key=JSON.stringify([c.date,t.start,t.end,kind]);
  if(!s.events.has(key))s.events.set(key,{date:c.date,start:t.start,end:t.end,kind,cards:0});
  s.events.get(key).cards++;
 }
 const rows=[];
 for(const s of subjects.values()){
  const events=[...s.events.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start||a.end-b.end);
  const lectures=events.filter(e=>e.kind==="lecture"),practices=events.filter(e=>e.kind==="practice"),days=new Set(events.map(e=>e.date)),byDay=new Map();
  for(const e of events){if(!byDay.has(e.date))byDay.set(e.date,[]);byDay.get(e.date).push(e)}
  let sameDay=0,overlap=0,consecutive=0,maxDay=0;
  for(const a of byDay.values()){
   if(a.length>1)sameDay++;maxDay=Math.max(maxDay,a.length);
   let end=-1;
   for(const e of a){if(e.start<end)overlap++;end=Math.max(end,e.end)}
  }
  const ordered=[...days].sort();
  for(let i=1;i<ordered.length;i++)if(Date.parse(ordered[i])-Date.parse(ordered[i-1])===86400000)consecutive++;
  let sequence="not-evaluable";
  if(lectures.length&&practices.length){
   totals.sequenceEligible++;
   const a=lectures[0],b=practices[0],cmp=b.date.localeCompare(a.date)||b.start-a.start;
   sequence=cmp<0?"practice-first":cmp===0?"same-start":"lecture-first";
   if(cmp<0)totals.practiceFirst++;if(cmp===0)totals.sameStart++;
  }
  totals.overlapCandidates+=overlap;
  rows.push({subject:s.subject,cards:s.cards,lecture:s.lecture,practice:s.practice,other:s.other,intervals:events.length,days:days.size,sameDay,consecutive,maxDay,overlap,sequence,firstLecture:lectures[0]||null,firstPractice:practices[0]||null,events});
 }
 if(totals.cards!==totals.unclassified+totals.lecture+totals.practice+totals.other)throw Error("Баланс видов занятий");
 return {group:file.group,course:file.course,totals,subjects:rows.sort((a,b)=>b.cards-a.cards||a.subject.localeCompare(b.subject,"ru"))};
}
function disciplineAggregate28(m,files,catalog){
 if(m.complete!==true||m.groups.length!==83||files.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||m.groups.some(g=>!catalog.groups.some(c=>c.id===g.group)))throw Error("Нужны 83 группы");
 const groups=files.map((f,i)=>{const g=m.groups[i];if(f.checked!==m.checked||f.group!==g.group||f.course!==g.course||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок");return disciplineGroup28(f)});
 const sum=gs=>{const t={};for(const g of gs)for(const [k,n] of Object.entries(g.totals))t[k]=(t[k]||0)+n;return t};
 const totals=sum(groups);
 if(totals.cards!==m.totals.cards)throw Error("Не совпадает число карточек");
 return {checked:m.checked,groups,totals,courses:[1,2,3,4,5].map(course=>({course,...sum(groups.filter(g=>g.course===course))}))};
}
let disciplines28={data:null,group:"",filter:"",mode:"all",sort:"cards"};
function renderDisciplines28(){
 const s=disciplines28,d=s.data;
 let html='<section class="panel"><h2>Распределение дисциплин</h2><p>Проверяем, как занятия по одному предмету распределены во времени: лекции и практики, повторения в один день, соседние дни и пересекающиеся интервалы. Это диагностика, а не оценка соблюдения учебной программы.</p>';
 if(!d)return html+'<p class="muted">Загрузите календарный снимок.</p><button class="primary" id="loadDiscipline28" '+(diag25.loading?"disabled":"")+'>Загрузить данные</button></section>';
 let g=d.groups.find(g=>g.group===s.group)||d.groups[0];const t=d.totals;
 const metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 let rows=g.subjects.filter(r=>subjectKey28(r.subject).includes(subjectKey28(s.filter))&&(s.mode==="all"||s.mode==="practice-first"&&r.sequence==="practice-first"||s.mode==="concentration"&&r.sameDay>0||s.mode==="overlap"&&r.overlap>0)).slice().sort((a,b)=>b[s.sort]-a[s.sort]||a.subject.localeCompare(b.subject,"ru"));
 let seqLabel={ "not-evaluable":"Нет обоих видов","practice-first":"Практика раньше","lecture-first":"Лекция раньше","same-start":"Одновременно"};
 const fmtEvent=e=>e?e.date+" "+clock26(e.start):"—";
 return html+'<div class="source23">'+esc(calendarStatus27(diag25.snapshot))+'</div><div class="grid">'+metric("Карточки лекций",t.lecture)+metric("Карточки практик",t.practice)+metric("Другие виды",t.other)+metric("Группа × предмет: оба вида",t.sequenceEligible)+metric("Практика раньше первой видимой лекции",t.practiceFirst)+metric("Не классифицировано",t.unclassified)+'</div><p class="notice">Практика раньше первой лекции в двухнедельном снимке не доказывает нарушения: лекция могла пройти ранее, а темы и требования учебной программы не установлены. Одинаковые интервалы одного вида в одной группе объединены для временных показателей, но число карточек сохраняется.</p><h3>Виды занятий по курсам</h3><div class="scroll"><table><tr><th>Курс</th><th>Лекции</th><th>Практики</th><th>Другие</th><th>Оба вида: группа × предмет</th><th>Практика раньше</th></tr>'+d.courses.map(c=>'<tr><td>'+c.course+'</td><td>'+c.lecture+'</td><td>'+c.practice+'</td><td>'+c.other+'</td><td>'+c.sequenceEligible+'</td><td>'+c.practiceFirst+'</td></tr>').join("")+'</table></div><h3>Распределение предметов выбранной группы</h3><div class="row"><label>Группа<select id="disciplineGroup28">'+d.groups.slice().sort((a,b)=>a.course-b.course||a.group.localeCompare(b.group,"ru",{numeric:true})).map(x=>'<option value="'+esc(x.group)+'" '+(x.group===g.group?"selected":"")+'>'+esc(x.group)+'</option>').join("")+'</select></label><label>Поиск<input id="disciplineFilter28" value="'+esc(s.filter)+'"></label><label>Показать<select id="disciplineMode28">'+[["all","Все"],["practice-first","Практика раньше лекции"],["concentration","Несколько интервалов в день"],["overlap","Пересечения"]].map(([v,n])=>'<option value="'+v+'" '+(v===s.mode?"selected":"")+'>'+n+'</option>').join("")+'</select></label><label>Сортировка<select id="disciplineSort28">'+[["cards","Карточки"],["sameDay","Повторения в день"],["consecutive","Соседние дни"],["overlap","Пересечения"]].map(([v,n])=>'<option value="'+v+'" '+(v===s.sort?"selected":"")+'>'+n+'</option>').join("")+'</select></label><button id="disciplineExport28">CSV по всем группам</button><button id="disciplineOpen28">Открыть расписание группы</button></div><div class="scroll"><table><tr><th>Дисциплина</th><th>Лекции / практики / другие (карточки)</th><th>Интервалы</th><th>Дни</th><th>Дни с несколькими интервалами</th><th>Соседние даты</th><th>Последовательность в снимке</th></tr>'+rows.map(r=>'<tr><td><details><summary>'+esc(r.subject)+'</summary>'+r.events.map(e=>'<p>'+esc(e.date+" "+clock26(e.start)+"–"+clock26(e.end)+" · "+({lecture:"лекция",practice:"практика",other:"другое"}[e.kind])+" · карточек "+e.cards)+'</p>').join("")+'</details></td><td>'+r.lecture+' / '+r.practice+' / '+r.other+'</td><td>'+r.intervals+'</td><td>'+r.days+'</td><td>'+r.sameDay+'</td><td>'+r.consecutive+'</td><td>'+esc(seqLabel[r.sequence])+'<small>Л: '+esc(fmtEvent(r.firstLecture))+'<br>П: '+esc(fmtEvent(r.firstPractice))+'</small></td></tr>').join("")+'</table></div><p class="muted">Сопоставление только по нормализованному написанию дисциплины внутри группы; разные названия не объединяются. Количество карточек не равно часам или уникальным занятиям преподавателя.</p></section>';
}
function bindDisciplines28(){
 on("loadDiscipline28","click",loadDiag25);
 for(const [id,k] of [["disciplineGroup28","group"],["disciplineFilter28","filter"],["disciplineMode28","mode"],["disciplineSort28","sort"]])on(id,"change",e=>{disciplines28[k]=e.target.value;render()});
 on("disciplineOpen28","click",()=>{let g=disciplines28.group||disciplines28.data?.groups[0]?.group;if(g){tab="group07";loadPersonal23(g)}});
 on("disciplineExport28","click",()=>{let d=disciplines28.data;if(!d)return;let cols=["subject","cards","lecture","practice","other","intervals","days","sameDay","consecutive","maxDay","overlap","sequence"],rows=[["group","course",...cols,"firstLecture","firstPractice","snapshot"],...d.groups.flatMap(g=>g.subjects.map(r=>[g.group,g.course,...cols.map(k=>r[k]),r.firstLecture?JSON.stringify(r.firstLecture):"",r.firstPractice?JSON.stringify(r.firstPractice):"",d.checked]))];download("kantor-disciplines.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
