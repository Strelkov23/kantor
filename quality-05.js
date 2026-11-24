
/* Version 0.5: source audit and locally executed exact-solver interchange. */
let reviewFilter05="all",reviewGroup05="all",exactInput05=null,exactOutput05=null,exactReport05=null,exactMessage05="";
function sourceRows05(){
  return courseSources04.flatMap(s=>s.cells.map((x,i)=>({...x,source:s.source,page:s.page,rowId:"p"+s.page+"-"+(i+1)})));
}
function parseCell05(x){
  // Never promote a machine suggestion to a verified event. Semicolon and special slots remain unresolved.
  let t=x.text, m=t.match(/^(лек|пр)\.(.+?)\s+—\s+(.+?)\s+(\d{2}[А-ЯA-Z]?-[^\s;]+)$/u);
  if(!m||/[;]|(?:\dпг|КпоВ|РКИ)/u.test(t)||!Object.hasOwn(instituteCatalog.buildings,m?.[4]?.split("-")[0]||""))
    return {...x,kind:"manual",suggestion:null};
  return {...x,kind:"single",suggestion:{title:m[1]+"."+m[2],teachers:[m[3]],room:m[4],building:m[4].split("-")[0],slot:slot04(x.week,x.day,x.period),groups:[x.group]}};
}
function reviewPack05(){
  let rows=sourceRows05().map(parseCell05), by=new Map();
  for(const a of rows){if(!a.suggestion)continue;let s=a.suggestion,k=JSON.stringify([s.slot,s.title,s.teachers,s.room]);if(!by.has(k))by.set(k,[]);by.get(k).push(a)}
  for(const a of by.values())if(a.length>1)for(const x of a)x.kind="flow";
  let candidates=[...by.values()].map((a,i)=>({candidateId:"candidate-"+(i+1),sourceRows:a.map(x=>x.rowId),status:a.length>1?"possible-shared-session":"unverified",...a[0].suggestion,groups:[...new Set(a.map(x=>x.group))]}));
  return {version:"0.5",sourceStatus:"Primary transcription; all suggestions require human verification against the PDF and current electronic timetable.",rows,candidates};
}
function renderReview05(){
  let p=reviewPack05(), groups=[...new Set(p.rows.map(x=>x.group))], rows=p.rows.filter(x=>(reviewGroup05==="all"||x.group===reviewGroup05)&&(reviewFilter05==="all"||x.kind===reviewFilter05));
  let count=k=>p.rows.filter(x=>x.kind===k).length, labels={single:"Однозначная структура, не сверено",flow:"Возможный общий поток",manual:"Неоднозначная запись"};
  return '<section class="panel"><h2>Контроль исходных записей</h2><p>Первичная транскрипция двух страниц первого курса. Проверяем полноту и структуру, не утверждаем точность без повторного сравнения с оригиналом. Потоки автоматически не объединяются в рабочее расписание.</p><div class="grid">'+[["Непустые ячейки",p.rows.length],["Простая структура",count("single")],["Возможные потоки",count("flow")],["Ручное разрешение",count("manual")]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="row"><label>Группа<select id="reviewGroup05">'+["all",...groups].map(g=>'<option value="'+esc(g)+'" '+(g===reviewGroup05?"selected":"")+'>'+(g==="all"?"Все":esc(g))+'</option>').join("")+'</select></label><label>Категория<select id="reviewFilter05">'+["all","single","flow","manual"].map(k=>'<option value="'+k+'" '+(reviewFilter05===k?"selected":"")+'>'+(k==="all"?"Все":labels[k])+'</option>').join("")+'</select></label><button id="reviewJson05">Пакет сверки JSON</button><button id="reviewCsv05">Таблица для сверки CSV</button></div><p class="muted">Показано '+rows.length+' записей. Для многопоточных и подгрупповых занятий необходимо установить фактический состав участников; спорт и неопределённые аудитории требуют отдельного подтверждения.</p><div class="scroll"><table><tr><th>ID / источник</th><th>Группа</th><th>День, время, половина</th><th>Исходный текст</th><th>Статус структуры</th></tr>'+rows.map(x=>'<tr><td><a target="_blank" rel="noopener" href="'+x.source+'#page='+x.page+'">'+x.rowId+'</a></td><td>'+esc(x.group)+'</td><td>'+days[x.day]+' '+times[x.period]+' / '+(x.week+1)+'</td><td>'+esc(x.text)+'</td><td>'+labels[x.kind]+'</td></tr>').join("")+'</table></div></section><section class="panel"><h3>Порядок допуска к расчёту</h3><p>1. Сверить каждую запись с оригиналом. 2. Разделить подгруппы на непересекающиеся атомы. 3. Подтвердить общие занятия и единые ID. 4. Заполнить разрешённые интервалы и маршруты. 5. Импортировать проверенную модель во вкладку «Единое ядро». Пакет сверки не является готовым входным JSON для решателя.</p></section>'
}
function readExact05(data,out){
  let v=validate04(data);if(v.err.length)return {errors:v.err,warnings:v.warn};
  if(!out||!["OPTIMAL","FEASIBLE"].includes(out.status)||!Array.isArray(out.lessons))return {errors:["Нет допустимого решения CP-SAT для проверки."],warnings:v.warn};
  let errors=[],ids=new Map(),m=Array(8).fill(0),ag=new Map(),old=new Map(data.lessons.map(l=>[l.id,l]));
  function add(r,s,l,external){let k=JSON.stringify([r,Math.floor(s/5)]);if(!ag.has(k))ag.set(k,[]);ag.get(k).push({s,l,external})}
  for(const l of out.lessons){
    let o=old.get(l?.id);if(!o||ids.has(l.id)){errors.push("Неизвестное или повторное занятие: "+String(l?.id));continue}
    ids.set(l.id,l);if(!o.allowedSlots.includes(l.slot)){errors.push("Недопустимый интервал: "+l.id);continue}
    for(const k of ["title","room","building","groups","units","teachers","allowedSlots","durationMinutes"])if(JSON.stringify(o[k])!==JSON.stringify(l[k]))errors.push("Изменён ресурс или ограничение: "+l.id+" / "+k);
    m[5]+=Number(l.slot!==o.slot);m[7]+=Number(Math.floor(l.slot/5)!==Math.floor(o.slot/5));
    for(const r of resources04(o))add(r,l.slot,o,false);
  }
  for(const id of old.keys())if(!ids.has(id))errors.push("Потеряно занятие: "+id);
  for(const b of data.blocked)for(const r of b.resources)add(r,b.slot,b,true);
  for(const [k,a] of ag){
    if(!a.some(x=>!x.external))continue;a.sort((x,y)=>x.s-y.s);
    let [r,d]=JSON.parse(k);if(new Set(a.map(x=>x.s)).size!==a.length)errors.push("Пересечение "+r+" / "+d);
    for(let i=1;i<a.length;i++){let x=a[i-1],y=a[i];if(starts[period04(y.s)]-starts[period04(x.s)]-duration04(x.l)<0)errors.push("Пересечение фактических интервалов "+r+" / "+d)}
    if(r.startsWith("r:"))continue;let g=r.startsWith("g:");
    if(a.length>(g?data.maxGroupDay:data.maxTeacherDay))errors.push("Дневной лимит "+r+" / "+d);
    if(g)m[4]+=a.length*(a.length-1)/2;
    for(let i=1;i<a.length;i++){let x=a[i-1],y=a[i],tr=Math.ceil(travel04(x.l,y.l,data)),gap=starts[period04(y.s)]-starts[period04(x.s)]-duration04(x.l);
      if(!Number.isFinite(tr)||tr>gap)errors.push("Невозможный или неизвестный переход "+r+" / "+d);
      if(Number.isFinite(tr)){m[g?2:3]+=tr;m[6]+=Number(gap-tr<10)}
      m[g?0:1]+=Math.max(0,period04(y.s)-period04(x.s)-1);
    }
  }
  const names=["student_gaps","teacher_gaps","student_travel","teacher_travel","student_concentration","moves","tight_transitions","day_changes"],w=names.map(k=>out.weights?.[k]);
  if(w.some(x=>!Number.isInteger(x)||x<0))errors.push("Неверные веса протокола.");
  let score=m.reduce((s,x,i)=>s+x*w[i],0);
  if(!Number.isFinite(score)||Math.abs(score-out.objective)>1e-6)errors.push("Целевая функция не совпадает с независимым пересчётом.");
  if(names.some((k,i)=>out.audit?.metrics?.[k]!==m[i]))errors.push("Метрики протокола не совпадают.");
  if(!Number.isFinite(out.best_bound)||out.best_bound>score+1e-6||(out.status==="OPTIMAL"&&Math.abs(out.best_bound-score)>1e-6))errors.push("Некорректная граница в протоколе.");
  return {errors,warnings:[...v.warn,"Проверка подтверждает допустимость и оценку импортированного расписания, но не доказывает самостоятельно корректность заявленной решателем нижней границы."],metrics:Object.fromEntries(names.map((k,i)=>[k,m[i]])),score,status:out.status,bound:out.best_bound,relativeGap:Math.max(0,score-out.best_bound)/Math.max(1,Math.abs(score))}
}
function renderExact05(){return '<section class="panel"><h2>Точный решатель CP-SAT</h2><p>Python-модуль Google OR-Tools находится в репозитории. GitHub Pages выполняет только браузерный поиск. Для точного расчёта экспортируйте входной JSON, запустите решатель локально и импортируйте результат. Программа не отправляет учебные данные на сервер.</p><p><a href="https://github.com/Strelkov23/kantor/tree/main/solver" target="_blank" rel="noopener">Код решателя</a> · <a href="https://github.com/Strelkov23/kantor/actions/workflows/solver-tests.yml" target="_blank" rel="noopener">Автоматические тесты</a> · <a href="https://developers.google.com/optimization/cp/cp_solver" target="_blank" rel="noopener">Документация CP-SAT</a></p><details><summary>Команды для локального запуска</summary><pre style="white-space:pre-wrap">git clone https://github.com/Strelkov23/kantor.git\ncd kantor\npip install -r solver/requirements.txt\npython solver/cp_sat.py input.json output.json --seconds 120</pre><p>OPTIMAL — оптимум доказан для заданной модели; FEASIBLE — допустимое решение без доказанного оптимума; INFEASIBLE — несовместимость ограничений модели; UNKNOWN — решатель не установил результат. Все маршруты и ограничения должны быть достоверными.</p><p>Можно задать durationMinutes (целое число 1–240) для каждого занятия и внешней блокировки. Без поля используется 95 минут. Начала пар остаются стандартными, а длительность сохраняется при переносе. Точный решатель минимизирует собственную целочисленную функцию: окна, время пути, концентрация, изменения, рискованные переходы. Известные внешние занятия учитываются на активных днях; минуты округляются вверх. Значения не следует напрямую сравнивать с оценкой браузерного эвристического алгоритма.</p></details><div class="row"><button id="fromUnified05">Вход из единого ядра</button><label>Исходная модель<input id="inputExact05" type="file" accept=".json"></label><label>Результат CP-SAT<input id="outputExact05" type="file" accept=".json"></label><button class="primary" id="checkExact05">Независимая проверка</button><button id="exportExact05">Экспорт проверки</button></div><p class="muted">Модель: '+(exactInput05?"загружена":"не загружена")+' · Результат: '+(exactOutput05?"загружен":"не загружен")+'</p><p id="exactMessage05">'+esc(exactMessage05)+'</p>'+exactDetails05()+'</section>'}
function exactDetails05(){let r=exactReport05;if(!r)return "";return '<div class="panel"><h3 class="'+(r.errors.length?"bad":"good")+'">'+(r.errors.length?"Проверка не пройдена":"Внутренняя проверка пройдена")+'</h3>'+(r.errors.length?'<ul>'+r.errors.slice(0,100).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':'<p>Статус по протоколу: '+esc(r.status)+'; целевая функция: '+fmt(r.score)+'; нижняя граница по протоколу: '+fmt(r.bound)+'; относительный разрыв: '+fmt(r.relativeGap*100)+'%.</p><div class="scroll"><table><tr><th>Критерий</th><th>Значение</th></tr>'+Object.entries(r.metrics).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+fmt(v)+'</td></tr>').join("")+'</table></div>')+'<p class="muted">'+(r.warnings||[]).map(esc).join(" · ")+'</p></div>'}
function bind05(){
  on("reviewGroup05","change",e=>{reviewGroup05=e.target.value;render()});on("reviewFilter05","change",e=>{reviewFilter05=e.target.value;render()});
  on("reviewJson05","click",()=>download("kantor-source-review.json",JSON.stringify(reviewPack05(),null,2),"application/json"));
  on("reviewCsv05","click",()=>{let rows=reviewPack05().rows;let data=[["ID","Группа","Неделя","День","Пара","Исходный текст","Категория","Ссылка","Результат сверки"],...rows.map(x=>[x.rowId,x.group,x.week+1,days[x.day],times[x.period],x.text,x.kind,x.source+"#page="+x.page,""])];download("kantor-source-review.csv","\ufeff"+data.map(r=>r.map(csv).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
  on("fromUnified05","click",()=>{try{exactInput05=JSON.parse(unifiedText04||JSON.stringify(template04()));exactReport05=null;exactMessage05="Модель перенесена из единого ядра."}catch(e){exactMessage05=e.message}render()});
  for(const [id,set] of [["inputExact05",v=>exactInput05=v],["outputExact05",v=>exactOutput05=v]])on(id,"change",async e=>{try{set(JSON.parse(await e.target.files[0].text()));exactReport05=null;exactMessage05="Файл загружен."}catch(e){exactMessage05=e.message}render()});
  on("checkExact05","click",()=>{try{if(!exactInput05||!exactOutput05)throw Error("Загрузите оба файла.");exactReport05=readExact05(exactInput05,exactOutput05);exactMessage05="Проверка завершена."}catch(e){exactReport05=null;exactMessage05=e.message}render()});
  on("exportExact05","click",()=>{if(exactReport05)download("kantor-exact-audit.json",JSON.stringify(exactReport05,null,2),"application/json")});
}
