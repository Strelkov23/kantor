/* 0.49 — explicit, group-specific observed-order rules; not curriculum inference. */
const orderTypes49=["required","preferred"];
const orderKey49=r=>JSON.stringify([r.group,r.from,r.to]);
function orderCatalog49(ctx){
 const out=new Map();for(const q of ctx.ready.cards){if(!q.subject)continue;if(!out.has(q.group))out.set(q.group,new Map());out.get(q.group).set(key26(q.subject),q.subject)}return out;
}
function orderLevels49(rules){
 const nodes=new Set(),out=new Map(),indegree=new Map(),depth=new Map();
 for(const r of rules){nodes.add(r.from);nodes.add(r.to);if(!out.has(r.from))out.set(r.from,[]);out.get(r.from).push(r.to);indegree.set(r.to,(indegree.get(r.to)||0)+1)}
 const queue=[...nodes].filter(n=>!indegree.get(n)).sort(),ordered=[];
 for(const n of nodes)depth.set(n,0);
 while(queue.length){const n=queue.shift();ordered.push(n);for(const t of out.get(n)||[]){depth.set(t,Math.max(depth.get(t)??0,depth.get(n)+1));indegree.set(t,indegree.get(t)-1);if(!indegree.get(t)){queue.push(t);queue.sort()}}}
 if(ordered.length!==nodes.size)throw Error("Связи образуют цикл: нельзя одновременно требовать A раньше B и B раньше A.");
 return ordered.reduce((a,n)=>{const i=depth.get(n);if(!a[i])a[i]=[];a[i].push(n);return a},[]);
}
function validateOrder49(raw,ctx){
 if(!raw||raw.version!=="0.49-order"||raw.checked!==ctx.ready.checked||!Array.isArray(raw.rules)||raw.rules.length>2000)throw Error("Правила относятся к другому снимку или имеют неверный формат.");
 const cat=orderCatalog49(ctx),seen=new Set(),groups=new Map(),rules=[];
 for(const x of raw.rules){
  if(!x||typeof x.group!=="string"||typeof x.from!=="string"||typeof x.to!=="string"||!cat.get(x.group)?.has(x.from)||!cat.get(x.group)?.has(x.to)||x.from===x.to||!orderTypes49.includes(x.kind)||typeof x.source!=="string"||x.source.length>300||!x.source.trim())throw Error("Укажите два разных наблюдаемых предмета, тип и основание правила.");
  const r={group:x.group,from:x.from,to:x.to,kind:x.kind,source:x.source.trim()},k=orderKey49(r);
  if(seen.has(k))throw Error("Такая связь уже существует.");seen.add(k);
  if(!groups.has(r.group))groups.set(r.group,[]);groups.get(r.group).push(r);rules.push(r);
 }
 for(const a of groups.values()){if(a.length>40)throw Error("Максимум 40 связей на группу.");orderLevels49(a)}
 return {version:"0.49-order",checked:raw.checked,rules};
}
function minute49(date,time){const n=Date.parse(date+"T00:00:00Z");return Number.isFinite(n)&&Number.isFinite(time)?n/60000+time:NaN}
function evaluateOrder49(cards,rules){
 const by=new Map();
 for(const q of cards){const k=JSON.stringify([q.group,key26(q.subject)]);if(!by.has(k))by.set(k,[]);by.get(k).push(q)}
 function first(group,subject){
  const a=by.get(JSON.stringify([group,subject]))||[];
  if(!a.length||a.some(q=>!q.time||!Number.isFinite(minute49(q.date,q.start))||!Number.isFinite(minute49(q.date,q.end))||q.end<=q.start))return null;
  const ordered=a.slice().sort((x,y)=>minute49(x.date,x.start)-minute49(y.date,y.start)||minute49(x.date,x.end)-minute49(y.date,y.end)||x.id.localeCompare(y.id));
  // Identical first starts with different endings do not prove which event comes first.
  if(ordered.some(q=>q.date===ordered[0].date&&q.start===ordered[0].start&&q.end!==ordered[0].end))return null;
  const q=ordered[0];return {id:q.id,date:q.date,start:q.start,end:q.end};
 }
 return rules.map(rule=>{
  const a=first(rule.group,rule.from),b=first(rule.group,rule.to),gap=a&&b?minute49(b.date,b.start)-minute49(a.date,a.end):null;
  return {rule,key:orderKey49(rule),from:a,to:b,gap,status:gap===null?"unknown":gap>=0?"ok":"reversed"};
 });
}
function compareOrder49(before,after,touched){
 const old=new Map(before.map(r=>[r.key,r])),rows=[],blocked=[];let gain=0;
 for(const b of after){
  const a=old.get(b.key);if(!a)throw Error("Изменился состав правил");
  const relevant=touched.has(JSON.stringify([b.rule.group,b.rule.from]))||touched.has(JSON.stringify([b.rule.group,b.rule.to]));
  if(!relevant)continue;
  const worse=b.status==="unknown"||a.status==="unknown"||b.status==="reversed"&&(a.status==="ok"||b.gap<a.gap);
  if(b.rule.kind==="required"&&worse)blocked.push(b.key);
  if(b.rule.kind==="preferred"&&a.status!=="unknown"&&b.status!=="unknown")gain+=Number(b.status==="ok")-Number(a.status==="ok");
  rows.push({key:b.key,rule:b.rule,before:a,after:b,worse});
 }
 return {ok:blocked.length===0,blocked,gain,rows};
}
function touchedOrder49(ctx,moves){
 const out=new Set();for(const x of moves){const q=ctx.byId.get(x.id);if(!q)throw Error("Нет исходного занятия");if(q.date!==x.newDate||q.start!==x.newStart||q.end!==x.newEnd)out.add(JSON.stringify([q.group,key26(q.subject)]))}return out;
}
function auditOrder49(ctx,moves,config,final=null){
 const rules=config.orderRules||[],touched=touchedOrder49(ctx,moves);
 if(!rules.length||!touched.size)return {ok:true,blocked:[],gain:0,rows:[]};
 const relevant=rules.filter(r=>touched.has(JSON.stringify([r.group,r.from]))||touched.has(JSON.stringify([r.group,r.to])));
 if(!relevant.length)return {ok:true,blocked:[],gain:0,rows:[]};
 const cards=ctx.ready.cards,after=final||apply39(cards,moves);
 return compareOrder49(evaluateOrder49(cards,relevant),evaluateOrder49(after,relevant),touched);
}
const order49={source:null,data:null,group:"",msg:"",open:false};
const orderStorage49="kantor-order-rules-v049";
function syncOrder49(){
 const s=order49,ctx=inter33.context;
 if(s.source!==ctx){s.source=ctx;s.group="";s.msg="";s.data=ctx?{version:"0.49-order",checked:ctx.ready.checked,rules:[]}:null;
  if(ctx)try{const raw=localStorage.getItem(orderStorage49);if(raw){const p=JSON.parse(raw);if(p.checked===s.data.checked)s.data=validateOrder49(p,ctx);else s.msg="Сохранённые правила относятся к другому снимку и не применяются автоматически."}}catch(e){s.msg="Не удалось восстановить правила: "+e.message}
 }return s;
}
function saveOrder49(raw){
 const s=syncOrder49();s.data=validateOrder49(raw,s.source);try{localStorage.setItem(orderStorage49,JSON.stringify(s.data));s.msg="Правила сохранены на устройстве."}catch(e){s.msg="Правила действуют в сеансе. Сохраните JSON."}invalidate39();
}
function graphOrder49(rules,subjects){
 if(!rules.length)return '<p class="muted">Связей ещё нет. Выберите два предмета и укажите основание.</p>';
 const levels=orderLevels49(rules);
 return '<div class="orderGraph49" aria-label="Уровни ориентированного графа дисциплин">'+levels.map((nodes,i)=>'<div class="orderLevel49"><small>Уровень '+(i+1)+'</small>'+nodes.map(n=>'<div class="orderNode49">'+esc(subjects.get(n)||n)+'</div>').join("")+'</div>').join('<div class="orderArrow49" aria-hidden="true">→</div>')+'</div><p class="muted">Уровни показывают топологическую последовательность. Конкретные направления и типы связей указаны в таблице ниже; расположение рядом не означает связь.</p>';
}
function renderOrder49(){
 const s=syncOrder49();if(!s.source)return "";
 const cat=orderCatalog49(s.source),groups=[...cat.keys()].sort((a,b)=>a.localeCompare(b,"ru",{numeric:true}));
 if(!cat.has(s.group))s.group=groups[0]||"";
 const sub=cat.get(s.group)||new Map(),subjects=[...sub].sort((a,b)=>a[1].localeCompare(b[1],"ru")),rules=s.data.rules.filter(r=>r.group===s.group),rows=evaluateOrder49(s.source.ready.cards,rules);
 const model=multi39.runs[multi39.active],after=model?new Map(evaluateOrder49(apply39(s.source.ready.cards,model.moves),rules).map(r=>[r.key,r])):null;
 const opts=(a,v)=>a.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===v?"selected":"")+'>'+esc(n)+'</option>').join("");
 const status=r=>r?({ok:"Порядок соблюдён",reversed:"Обратный порядок",unknown:"Не установлено"}[r.status]):"—";
 const point=q=>q?esc(q.date+" "+clock26(q.start)):"—";
 let h='<section class="panel" id="order49"><div class="eyebrow23">Учебная последовательность · 0.49</div><h2>Связи и порядок изучения дисциплин</h2><p>Настройте, какие предметы должны предшествовать другим. Сайт проверяет первое наблюдаемое занятие в текущем снимке, а не факт освоения курса или темы.</p><p class="notice">Обязательная связь — введённое пользователем ограничение сценария, не подтверждённое вузом автоматически. При переносе запрещается новое нарушение, ухудшение уже нарушенного порядка или изменение порядка при неизвестном времени. Желательная связь влияет на оценку кандидата, но не запрещает перенос.</p><label>Группа<select id="orderGroup49">'+opts(groups.map(g=>[g,g]),s.group)+'</select></label><div class="guideForm45"><label>Сначала<select id="orderFrom49">'+opts(subjects,"")+'</select></label><label>Затем<select id="orderTo49">'+opts(subjects,subjects[1]?.[0])+'</select></label><label>Тип связи<select id="orderKind49"><option value="required">Обязательная</option><option value="preferred">Желательная</option></select></label></div><label>Основание<input id="orderSource49" maxlength="300" placeholder="Рабочая программа, тема, мнение преподавателя"></label><div class="row"><button id="addOrder49" class="primary" '+(subjects.length<2?"disabled":"")+'>Добавить связь</button><button id="exportOrder49">Скачать правила (JSON)</button><label>Импорт<input type="file" id="importOrder49" accept=".json,application/json"></label></div><p role="status">'+esc(s.msg)+'</p>';
 h+=graphOrder49(rules,sub);
 h+='<div class="grid">'+[["Связей группы",rules.length],["Обязательных",rules.filter(r=>r.kind==="required").length],["Обратный порядок в снимке",rows.filter(r=>r.status==="reversed").length],["Не установлено",rows.filter(r=>r.status==="unknown").length]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div>';
 if(rows.length)h+='<div class="scroll"><table><tr><th>Связь / основание</th><th>Первое занятие A</th><th>Первое занятие B</th><th>Исходный порядок</th><th>После модели</th><th></th></tr>'+rows.map(r=>'<tr><td><b>'+esc((sub.get(r.rule.from)||r.rule.from)+" → "+(sub.get(r.rule.to)||r.rule.to))+'</b><small>'+esc((r.rule.kind==="required"?"Обязательная":"Желательная")+" · "+r.rule.source)+'</small></td><td>'+point(r.from)+'</td><td>'+point(r.to)+'</td><td>'+status(r)+'</td><td>'+status(after?.get(r.key))+'</td><td><button data-remove-order49="'+esc(r.key)+'">Удалить</button></td></tr>').join("")+'</table></div>';
 h+='<p class="muted">Правило: конец первого занятия A не позже начала первого B. Обратный порядок может быть нормальным, если материал уже пройден до начала снимка. Правила привязаны к снимку; после обновления их требуется перепроверить. Оценка желательной связи: +1 при переходе из обратного порядка к соблюдённому, −1 при обратном изменении; общий поиск оценивает отдельные кандидаты, финальная проверка показывает фактический результат.</p></section>';return h;
}
function bindOrder49(){
 const s=syncOrder49();if(!s.source)return;
 on("orderGroup49","change",e=>{s.group=e.target.value;render()});
 on("addOrder49","click",()=>{try{saveOrder49({...s.data,rules:[...s.data.rules,{group:s.group,from:$("orderFrom49")?.value,to:$("orderTo49")?.value,kind:$("orderKind49")?.value,source:$("orderSource49")?.value}]})}catch(e){s.msg=e.message}render()});
 document.querySelectorAll("[data-remove-order49]").forEach(el=>el.onclick=()=>{try{saveOrder49({...s.data,rules:s.data.rules.filter(r=>orderKey49(r)!==el.dataset.removeOrder49)})}catch(e){s.msg=e.message}render()});
 on("exportOrder49","click",()=>download("kantor-discipline-order.json",JSON.stringify(s.data,null,2),"application/json"));
 on("importOrder49","change",async e=>{const f=e.target.files?.[0],ctx=s.source;if(!f)return;try{if(f.size>1000000)throw Error("Файл слишком большой");const raw=JSON.parse(await f.text());if(ctx!==inter33.context)throw Error("Снимок изменился");saveOrder49(raw)}catch(err){s.msg=err.message}render()});
}
