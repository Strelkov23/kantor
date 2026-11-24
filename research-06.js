
/* KANTOR 0.6: measurement priorities and reproducible experiment archive. */
let routeEvidence06={}, routeEvidenceMessage06="", routeSubset06="all";
function routeNeeds06(){
 const rows=new Map();
 function add(a,b,kind,gap){
  if(a===b||!Object.hasOwn(instituteCatalog.buildings,a)||!Object.hasOwn(instituteCatalog.buildings,b))return;
  let key=a+"|"+b;if(!rows.has(key))rows.set(key,{key,from:a,to:b,pilot:0,raw:0,minGap:Infinity});
  let r=rows.get(key);r[kind]++;r.minGap=Math.min(r.minGap,gap);
 }
 const agendas=new Map();
 for(const l of fifthPilot.records)for(const p of pilotPeople(l)){
  let key=JSON.stringify([p,l.week,l.day]);if(!agendas.has(key))agendas.set(key,[]);
  agendas.get(key).push({period:l.period,building:l.room.slice(0,2)});
 }
 for(const a of agendas.values()){
  a.sort((x,y)=>x.period-y.period);for(let i=1;i<a.length;i++)add(a[i-1].building,a[i].building,"pilot",starts[a[i].period]-starts[a[i-1].period]-duration);
 }
 // Only adjacent entries with an unambiguous parsed room in the raw review.
 // Do not jump over unknown cells and do not treat candidate counts as verified journeys.
 const by=new Map();
 for(const x of reviewPack05().rows){let key=JSON.stringify([x.group,x.week,x.day]);if(!by.has(key))by.set(key,[]);by.get(key).push(x)}
 for(const a of by.values()){
  a.sort((x,y)=>x.period-y.period);
  for(let i=1;i<a.length;i++){
   let x=a[i-1],y=a[i];if(x.suggestion&&y.suggestion&&x.period<y.period)add(x.suggestion.building,y.suggestion.building,"raw",starts[y.period]-starts[x.period]-duration);
  }
 }
 return [...rows.values()].sort((a,b)=>b.pilot-a.pilot||b.raw-a.raw||a.minGap-b.minGap||a.key.localeCompare(b.key));
}
function routeValue06(k){return Object.hasOwn(routeBook04,k)?routeBook04[k]:null}
function renderPriority06(){
 let all=routeNeeds06(),list=all.filter(x=>routeSubset06==="all"||routeSubset06==="pilot"&&x.pilot||routeSubset06==="missing"&&routeValue06(x.key)===null);
 return '<section class="panel"><h2>Приоритет измерений маршрутов</h2><p>Расставлены по частоте наблюдения в пилоте пятого курса и первичной транскрипции первых двух страниц. Это не полная матрица института: для первого курса частоты предварительные, преподаватели там не подсчитываются. Неизвестные маршруты не получают фиктивной длительности.</p><div class="grid">'+[["Направлений в выборке",all.length],["В пилоте",all.filter(x=>x.pilot).length],["Нет введённого значения",all.filter(x=>routeValue06(x.key)===null).length]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="row"><label>Фильтр<select id="routeSubset06"><option value="all" '+(routeSubset06==="all"?"selected":"")+'>Все</option><option value="pilot" '+(routeSubset06==="pilot"?"selected":"")+'>Пилот</option><option value="missing" '+(routeSubset06==="missing"?"selected":"")+'>Не измерены</option></select></label><button id="routeEvidenceExport06">Экспорт журнала измерений</button><button id="routeToModel06">Перенести значения в шаблон единого ядра</button></div><p id="routeEvidenceMessage06" role="status">'+esc(routeEvidenceMessage06)+'</p><div class="scroll"><table><tr><th>Направление</th><th>Пилот</th><th>Первичные записи</th><th>Мин. доступный интервал</th><th>Измерение, мин</th><th>Источник и дата измерения</th><th></th></tr>'+list.map((r,i)=>'<tr><td><b>'+esc(r.from+" → "+r.to)+'</b><small>'+esc(instituteCatalog.buildings[r.from])+' → '+esc(instituteCatalog.buildings[r.to])+'</small><a target="_blank" rel="noopener" href="https://yandex.ru/maps/?text='+encodeURIComponent("Москва, "+instituteCatalog.buildings[r.from])+'">Начало на карте</a> · <a target="_blank" rel="noopener" href="https://yandex.ru/maps/?text='+encodeURIComponent("Москва, "+instituteCatalog.buildings[r.to])+'">Конец</a></td><td>'+r.pilot+'</td><td>'+r.raw+'</td><td>'+r.minGap+' мин</td><td><input id="routeValue06-'+i+'" type="number" min="0" max="180" step="0.1" value="'+(routeValue06(r.key)??"")+'" aria-label="Минуты '+esc(r.key)+'"></td><td><input id="routeNote06-'+i+'" value="'+esc(routeEvidence06[r.key]?.source||"")+'" placeholder="Источник / метод, дата" aria-label="Источник '+esc(r.key)+'"></td><td><button data-measure06="'+i+'">Сохранить</button></td></tr>').join("")+'</table></div><p class="muted">Число переходов в пилоте включает группы и преподавателей. Доступный интервал — разность между концом предыдущей и началом следующей пары. Сравнивать с маршрутом нужно после добавления запаса внутри зданий. Журнал хранится в текущем сеансе; скачайте JSON, чтобы не потерять данные.</p></section>'
}
function renderExperiment06(){
 return '<section class="panel"><h2>Протокол эксперимента CP-SAT</h2><p>Пилот пятого курса, 41 назначение, условное время перехода 5 минут в обе стороны между 02 и 03, запас 5 минут, seed 2026, предел 15 секунд. Фиксированные помещения и преподаватели, внешние блокировки отсутствуют. Не оценка реальной доступности.</p><div class="grid"><div class="metric"><small>Статус</small><strong>FEASIBLE</strong></div><div class="metric"><small>Целевая функция</small><strong>577 → 480</strong></div><div class="metric"><small>Снижение оценки</small><strong>16,8%</strong></div><div class="metric"><small>Нижняя граница</small><strong>0</strong></div></div><p>Относительный разрыв — 100%. Глобальный оптимум не доказан. Время поиска ограничено, отдельные показатели ухудшились.</p><div class="scroll"><table><tr><th>Показатель</th><th>До</th><th>После</th></tr>'+[["Окна групп",2,4],["Окна преподавателей",6,5],["Путь групп",195,125],["Путь преподавателей",90,60],["Концентрация нагрузки",82,64],["Переносы",0,23],["Рискованные переходы",0,0],["Изменения дня",0,23]].map(x=>'<tr><td>'+x[0]+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>').join("")+'</table></div><p><a href="https://github.com/Strelkov23/kantor/actions/runs/45399779994" target="_blank" rel="noopener">Результаты шести автоматических тестов и журнал эксперимента</a>.</p><p>Версия 0.6 добавляет исходное расписание как подсказку CP-SAT и ограничивает целевую функцию сверху исходным значением, когда исходное решение допустимо по той же модели. Это не гарантия улучшения каждого критерия.</p></section><section class="panel"><h2>Получение официальных данных</h2><p>Обработчик извлекает слова из текстового слоя PDF с номером страницы и координатами, записывает SHA-256 и фиксирует отсутствие данных. Не объединяет строки в занятия и не делает автоматическую сверку. Только очные 1–5 курсы ИЭУ АПК.</p><p><a href="https://github.com/Strelkov23/kantor/actions/workflows/source-extraction.yml" target="_blank" rel="noopener">Проверить результаты загрузки PDF</a> · <a href="https://github.com/Strelkov23/kantor/tree/main/ingest" target="_blank" rel="noopener">Код извлечения</a> · <a href="https://rgau-msha.ru/students/raspisanie" target="_blank" rel="noopener">Официальное расписание</a>.</p><details><summary>Локальное извлечение при недоступности сервера</summary><p>Сохранить пять исходных PDF с именами 1.pdf–5.pdf в папку originals. Затем из репозитория выполнить:</p><pre style="white-space:pre-wrap">pip install -r ingest/requirements.txt\npython ingest/extract_sources.py --local-dir originals --output source-review</pre><p>Результат — исходные слова и координаты, а не нормализованные занятия. PDF со сканами без текстового слоя помечаются как пустые.</p></details></section>'
}
function bind06(){
 on("routeSubset06","change",e=>{routeSubset06=e.target.value;render()});
 let list=routeNeeds06().filter(x=>routeSubset06==="all"||routeSubset06==="pilot"&&x.pilot||routeSubset06==="missing"&&routeValue06(x.key)===null);
 document.querySelectorAll("[data-measure06]").forEach(b=>b.onclick=()=>{
  let i=+b.dataset.measure06,r=list[i];if(!r)return;
  let v=$("routeValue06-"+i).value,n=$("routeNote06-"+i).value.trim();
  if(v.trim()===""||!Number.isFinite(+v)||+v<0||+v>180||!n){$("routeEvidenceMessage06").textContent="Введите время 0–180 минут и источник/дату.";return}
  routeBook04[r.key]=+v;routeEvidence06[r.key]={minutes:+v,source:n,recordedAt:new Date().toISOString()};routeEvidenceMessage06="Сохранено: "+r.key+"; пользовательское измерение.";render();
 });
 on("routeEvidenceExport06","click",()=>download("kantor-route-evidence.json",JSON.stringify({routes:routeBook04,evidence:routeEvidence06},null,2),"application/json"));
 on("routeToModel06","click",()=>{
  try{
   let d=unifiedText04?JSON.parse(unifiedText04):template04();d.routes={...d.routes,...routeBook04};unifiedText04=JSON.stringify(d,null,2);unifiedResult04=null;unifiedMessage04="Маршруты добавлены из пользовательского журнала. Проверка обязательна.";routeEvidenceMessage06="Маршруты добавлены в текущую модель.";render();
  }catch(e){$("routeEvidenceMessage06").textContent="Невозможно обновить модель: "+e.message}
 });
}
