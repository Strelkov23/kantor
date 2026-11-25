/* 0.51 — responsive search and interactive result charts. */
const job51={worker:null,stage:0,label:"",error:"",metric:"groupCross"};
function stopJob51(reason="Расчёт отменён."){
 const s=multi39;if(job51.worker){job51.worker.terminate();job51.worker=null}
 if(s.running){s.token++;s.running=false;s.runs=[];s.active=0;s.msg=reason}
 job51.stage=0;job51.label="";
}
function startJob51(s){
 if(s.running||!s.source||opportunities29.loading)return;
 if(!Number.isInteger(s.limit)||s.limit<1||s.limit>50){s.msg="Лимит 1–50";render();return}
 if(typeof Worker!=="function"){s.msg="Этот браузер не поддерживает отдельный поток расчёта. Откройте сайт в современном браузере.";render();return}
 const ctx=s.source,token=++s.token,screen=opportunities29.data,config={strict:s.strict,week:s.week,course:s.course,limit:s.limit,pedProtect:s.pedProtect,register:JSON.parse(JSON.stringify(sync40().data)),requireRoom:sync40().requireRoom,workload:{...sync42().p},weekProtect:sync43().protect,searchNodes:searchState44.nodes,includeSwaps:atomic47.enabled,orderRules:JSON.parse(JSON.stringify(syncOrder49().data.rules))},profile=JSON.parse(JSON.stringify(s.profile));
 s.running=true;s.runs=[];s.active=0;s.msg="";job51.stage=0;job51.label="Подготовка вычислений";render();
 const finish=(message,runs)=>{if(token!==s.token||ctx!==inter33.context)return;stopJob51(message);if(runs){s.runs=runs;s.active=0;s.msg=message}render()};
 try{
  const w=new Worker("optimizer-worker-51.js");job51.worker=w;
  w.onmessage=e=>{const d=e.data;if(d.token!==token||token!==s.token||ctx!==inter33.context)return;
   if(d.type==="progress"){job51.stage=d.stage;job51.label=d.label;const p=$("progressBar51"),l=$("progressLabel51");if(p)p.value=d.stage;if(l)l.textContent=d.label+" · этап "+d.stage+" из 7"}
   else if(d.type==="done")finish("Расчёт завершён.",d.runs);else if(d.type==="error")finish("Ошибка расчёта: "+d.message);
  };
  w.onerror=e=>finish("Не удалось запустить вычислитель: "+(e.message||"ошибка загрузки скрипта"));
  w.onmessageerror=()=>finish("Не удалось прочитать результат вычислений.");
  const {key,...context}=ctx;w.postMessage({token,context,screen,config,profile});
 }catch(e){finish("Не удалось начать расчёт: "+e.message)}
}
function renderProgress51(){
 if(!multi39.running)return "";
 return '<div class="progressBox51"><label id="progressLabel51" for="progressBar51" role="status" aria-live="polite">'+esc(job51.label)+(job51.stage?" · этап "+job51.stage+" из 7":"")+'</label><progress id="progressBar51" max="7" value="'+job51.stage+'"></progress><p class="muted">Это этапы, а не проценты времени: длительность каждого различается. Можно отменить расчёт без изменения исходного расписания.</p><button id="cancelJob51">Отменить расчёт</button></div>';
}
const metrics51=[
 ["groupCross","Меньше переходов групп",r=>r.groupCross,"переходов"],
 ["teacherCross","Меньше переходов преподавателей",r=>r.teacherCross,"переходов"],
 ["windows","Меньше окон групп",r=>r.before.group.windows-r.after.group.windows,"окон"],
 ["span","Сокращение длительности дней групп",r=>r.before.group.span-r.after.group.span,"мин"],
 ["groups","Затронутые группы",r=>r.weekly?.summary.group.selectedResources||0,"групп"],
 ["uncertain","Изменения, требующие уточнения",r=>r.uncertain,"занятий"]
];

/* Signed differences share a zero axis; missing measurements are not zero. */
function signedBars55(values){
 const max=Math.max(1,...values.filter(Number.isFinite).map(Math.abs));
 const signed=values.some(v=>Number.isFinite(v)&&v<0);
 return values.map(v=>!Number.isFinite(v)?null:{left:signed?(v<0?50-50*Math.abs(v)/max:50):0,width:(signed?50:100)*Math.abs(v)/max,negative:v<0,signed});
}
const comparisonMetrics55=[
 ["Окна групп, ед.",r=>r.before.group.windows-r.after.group.windows,1],
 ["Окна преподавателей, ед.",r=>r.before.teacher.windows-r.after.teacher.windows,1],
 ["Длительность дней групп, мин",r=>r.before.group.span-r.after.group.span,1],
 ["Переходы групп, ед.",r=>r.groupCross,1],
 ["Переходы преподавателей, ед.",r=>r.teacherCross,1],
 ["Изменено назначений",r=>r.moves.length,-1],
 ["Неопределённые карточки",r=>r.uncertain,-1]
];
function compareModels55(runs){
 const values=runs.map(r=>comparisonMetrics55.map(([,get])=>get(r)));
 const dominates=(a,b)=>a.every(Number.isFinite)&&b.every(Number.isFinite)&&a.every((v,i)=>(v-b[i])*comparisonMetrics55[i][2]>=0)&&a.some((v,i)=>(v-b[i])*comparisonMetrics55[i][2]>0);
 return {values,dominatedBy:values.map((v,i)=>values.flatMap((a,j)=>j!==i&&dominates(a,v)?[j]:[]))};
}
function renderComparison55(runs,active){
 if(!runs.length)return "";
 const {values,dominatedBy}=compareModels55(runs);
 const cell=(n,delta)=>!Number.isFinite(n)?"Нет данных":delta&&n>0?"+"+n:n<0?"−"+Math.abs(n):String(n);
 return '<section class="chartPanel51"><h3>Сводная таблица: эффект и цена изменений</h3><p>В первых пяти строках плюс означает сокращение, минус — ухудшение. В последних двух строках показано количество, меньше — лучше.</p><div class="scroll" tabindex="0" role="region" aria-label="Сравнение моделей"><table><thead><tr><th scope="col">Показатель</th>'+runs.map((r,i)=>'<th scope="col"><button data-chart-pick51="'+i+'" aria-pressed="'+(i===active)+'">'+esc(r.name)+'</button></th>').join("")+'</tr></thead><tbody>'+comparisonMetrics55.map(([label],j)=>'<tr><th scope="row">'+esc(label)+'</th>'+values.map(v=>'<td>'+cell(v[j],j<5)+'</td>').join("")+'</tr>').join("")+'<tr><th scope="row">Сравнение по 7 критериям</th>'+runs.map((r,i)=>'<td>'+(!values[i].every(Number.isFinite)?"Недостаточно данных":dominatedBy[i].length?"Уступает: "+dominatedBy[i].map(j=>esc(runs[j].name)).join(", "):"Не уступает по всем критериям одновременно")+'</td>').join("")+'</tr></tbody></table></div><p class="muted">Сравнение Парето: вариант уступает другому, если тот не хуже по всем семи показателям и лучше хотя бы по одному. Это не рейтинг готовности к внедрению. Не учитываются все педагогические критерии, полнота паспортов и ресурсы за пределами института. При равных значениях оба варианта сохраняются.</p></section>';
}

function chartModels51(runs,active){
 if(!runs.length)return "";
 const m=metrics51.find(x=>x[0]===job51.metric)||metrics51[0],values=runs.map(r=>m[2](r)),bars=signedBars55(values);
 return '<section class="chartPanel51"><h3>Сравните модели по нужному показателю</h3><label>Показатель<select id="chartMetric51">'+metrics51.map(x=>'<option value="'+x[0]+'" '+(m[0]===x[0]?"selected":"")+'>'+esc(x[1])+'</option>').join("")+'</select></label><div class="modelBars51">'+runs.map((r,i)=>'<button class="barRow51" data-chart-pick51="'+i+'" aria-pressed="'+(i===active)+'"><span>'+esc(r.name)+'</span><span class="track51" aria-hidden="true" style="position:relative">'+(bars[i]?.signed?'<span style="position:absolute;left:50%;height:100%;border-left:1px solid #617484"></span>':"")+(bars[i]?'<i style="position:absolute;left:'+bars[i].left+'%;width:'+bars[i].width+'%;background:'+(bars[i].negative?"#b42318":"#168b82")+'"></i>':"")+'</span><strong>'+(Number.isFinite(values[i])?values[i]:"—")+'</strong></button>').join("")+'</div><p class="muted">'+esc(m[3])+'; нажмите на строку, чтобы выбрать модель. '+(m[0]==="uncertain"?"Меньше — лучше, но ноль не означает подтверждённые паспорта.":m[0]==="groups"?"Показатель охвата, а не величина улучшения.":"Показаны разницы в наблюдаемом снимке. Отрицательное значение — ухудшение; при наличии отрицательных значений ноль находится в центре шкалы.")+'</p></section>';
}
function illustration51(){
 return '<div class="visualIntro51"><figure><svg viewBox="0 0 300 130" role="img" aria-label="Схема сокращения окна в расписании"><g font-size="12" fill="#274957"><text x="8" y="28">До</text><text x="8" y="88">После</text></g><rect x="55" y="10" width="65" height="32" rx="5" fill="#8caabd"/><rect x="126" y="10" width="65" height="32" rx="5" fill="none" stroke="#ad833d" stroke-dasharray="4 3"/><rect x="197" y="10" width="65" height="32" rx="5" fill="#8caabd"/><rect x="55" y="70" width="65" height="32" rx="5" fill="#8caabd"/><rect x="126" y="70" width="65" height="32" rx="5" fill="#168b82"/><path d="M230 45Q224 60 162 67" fill="none" stroke="#168b82" stroke-width="2"/><path d="M170 61L161 67L172 70" stroke="#168b82" fill="none" stroke-width="2"/></svg><figcaption>Меньше пустых промежутков между парами</figcaption></figure><figure><svg viewBox="0 0 300 130" role="img" aria-label="Схема сокращения перехода между корпусами"><g fill="#8caabd"><rect x="25" y="18" width="78" height="84" rx="5"/><rect x="197" y="18" width="78" height="84" rx="5"/></g><g fill="#fff" font-size="12" text-anchor="middle"><text x="64" y="41">Корпус А</text><text x="236" y="41">Корпус Б</text></g><rect x="40" y="52" width="48" height="16" rx="3" fill="#168b82"/><rect x="212" y="75" width="48" height="16" rx="3" fill="#e8f2f1"/><rect x="40" y="75" width="48" height="16" rx="3" fill="#168b82"/><path d="M211 83H95" stroke="#168b82" stroke-width="3" stroke-dasharray="5 4"/><path d="M104 76L94 83L104 90" fill="none" stroke="#168b82" stroke-width="3"/></svg><figcaption>Меньше перемещений между корпусами</figcaption></figure></div>';
}
function bindJob51(){
 on("cancelJob51","click",()=>{stopJob51();render()});
 on("chartMetric51","change",e=>{if(metrics51.some(x=>x[0]===e.target.value))job51.metric=e.target.value;render();$("chartMetric51")?.focus()});
 document.querySelectorAll("[data-chart-pick51]").forEach(b=>b.onclick=()=>{multi39.active=+b.dataset.chartPick51;render();document.querySelector('[data-chart-pick51="'+multi39.active+'"]')?.focus()});
}
