/* 0.42 — transparent workload sensitivity and spatial trade-offs. */
const default42=()=>({recovery:45,crossCost:6,floorCost:1,protect:false});
function fatigueDay42(list,profile,settings){
 if(list.some(q=>!q.time)||collision29(list))return null;
 const a=sorted29(list);let low=0,high=0,peakLow=0,peakHigh=0,rated=0,minutes=0;
 const rows=[];
 for(let i=0;i<a.length;i++){
  const q=a[i],r=profile.ratings[pedagogyKey39(q.group,q.subject)],known=Number.isInteger(r)&&r>=1&&r<=5;
  if(known)rated++;
  const gap=i?q.start-a[i-1].end:0,decay=Math.pow(0.5,gap/settings.recovery),duration=(q.end-q.start)/95;
  low=low*decay+duration*(known?r:1);high=high*decay+duration*(known?r:5);
  peakLow=Math.max(peakLow,low);peakHigh=Math.max(peakHigh,high);minutes+=q.end-q.start;
  rows.push({id:q.id,start:q.start,end:q.end,subject:q.subject,rating:known?r:null,gap,low,high});
 }
 return {cards:a.length,rated,minutes,peakLow,peakHigh,endLow:low,endHigh:high,rows};
}
function fatigueWeek42(cards,profile,settings){
 const by=new Map();for(const q of cards){if(!by.has(q.date))by.set(q.date,[]);by.get(q.date).push(q)}
 const out={cards:cards.length,rated:0,days:0,excluded:0,peakLow:0,peakHigh:0,sumEndLow:0,sumEndHigh:0,details:[]};
 for(const [date,list] of [...by].sort((a,b)=>a[0].localeCompare(b[0]))){const d=fatigueDay42(list,profile,settings);if(!d){out.excluded++;continue}out.days++;out.rated+=d.rated;out.peakLow=Math.max(out.peakLow,d.peakLow);out.peakHigh=Math.max(out.peakHigh,d.peakHigh);out.sumEndLow+=d.endLow;out.sumEndHigh+=d.endHigh;out.details.push({date,...d})}
 return out;
}
function compareFatigue42(a,b){
 const comparable=a.cards===b.cards&&a.rated===b.rated&&a.excluded===b.excluded&&a.excluded===0;
 const differences=["peakLow","peakHigh","sumEndLow","sumEndHigh"].map(k=>a[k]-b[k]);
 return {comparable,nonWorse:comparable&&differences.every(v=>v>=-1e-8),gain:comparable?(differences[0]+differences[1])/2:0,fullyRated:comparable&&a.cards===a.rated};
}
function routeCost42(f,settings){
 if(!f)return {known:false,gain:0,unknownDelta:0};
 let gain=0,unknownDelta=0;const breakdown={};
 for(const k of ["group","teacher"]){
  const a=f[k].before,b=f[k].after;
  const cross=a.cross-b.cross,levels=a.levels-b.levels,unknown=b.unknown-a.unknown;
  breakdown[k]={cross,levels,unknown};unknownDelta+=Math.max(0,unknown);
  gain+=settings.crossCost*cross+settings.floorCost*levels;
 }
 return {known:f.group.before.unknown+f.teacher.before.unknown+f.group.after.unknown+f.teacher.after.unknown===0,gain,unknownDelta,breakdown};
}
function scenario42(config){return config.workload||default42()}
function assess42(week,x,profile,config,floor){
 const p=scenario42(config),before=fatigueWeek42(week,profile,p),after=fatigueWeek42(apply39(week,[x]),profile,p),fatigue=compareFatigue42(before,after),route=routeCost42(floor,p);
 return {before,after,fatigue,route};
}
function reject42(a,config){
 const p=scenario42(config);
 if(p.protect&&(!a.fatigue.nonWorse||!a.route.known||a.route.gain<0||a.route.unknownDelta>0))return true;
 return false;
}
const workload42={p:default42(),source:null,group:"",date:"",open:false};
function sync42(){const s=workload42;if(s.source!==inter33.context){s.source=inter33.context;s.group="";s.date="";s.open=false}return s}
function render42(){
 const s=sync42(),ctx=s.source;if(!ctx)return "";
 const p=s.p,groups=ctx.ready.groups.map(g=>g.group);
 if(!groups.includes(s.group))s.group=groups[0]||"";
 const original=ctx.ready.cards.filter(q=>q.group===s.group),dates=[...new Set(original.map(q=>q.date))].sort();
 if(!dates.includes(s.date))s.date=dates[0]||"";
 const model=multi39.runs[multi39.active],final=model?apply39(ctx.ready.cards,model.moves).filter(q=>q.group===s.group):original;
 const a=fatigueDay42(original.filter(q=>q.date===s.date),multi39.profile,p),b=fatigueDay42(final.filter(q=>q.date===s.date),multi39.profile,p);
 const opts=(rows,v)=>rows.map(x=>'<option '+(x===v?"selected":"")+'>'+esc(x)+'</option>').join("");
 const format=v=>v.toFixed(2);
 const max=Math.max(1,...[a,b].filter(Boolean).flatMap(d=>d.rows.map(q=>q.high)));
 const graph=(d,name)=>'<div><h4>'+name+'</h4>'+(!d?'<p>День с неизвестным временем или пересечениями — не оценён.</p>':!d.cards?'<p>Нет наблюдаемых занятий.</p>':d.rows.map(q=>'<div style="margin:10px 0"><div class="row between"><small>'+esc(clock26(q.start)+" · "+q.subject)+'</small><b>'+format(q.low)+'–'+format(q.high)+'</b></div><div class="bar" style="position:relative;height:12px"><i style="width:'+100*q.high/max+'%;background:#b68d52;opacity:.65"></i><span style="position:absolute;left:0;top:0;height:100%;width:'+100*q.low/max+'%;background:#087e78"></span></div><small>'+esc(q.rating===null?"Сложность не оценена":("Сложность "+q.rating))+'</small></div>').join("")+'<p>Пик: '+format(d.peakLow)+'–'+format(d.peakHigh)+'</p>')+'</div>';
 let h='<section class="panel" id="workload42"><div class="eyebrow23">Нагрузка и компромиссы · 0.42</div><h2>Модель накопления учебной нагрузки</h2><p>Условный индекс, не медицинский прогноз. Сложность 1–5 берётся из педагогического профиля; для неизвестной оценки показывается диапазон 1–5. Каждая пара добавляет баллы пропорционально длительности; в перерыве остаток условно уменьшается вдвое за выбранное время. Реальное восстановление не измерялось.</p><div class="row"><label>Период полувосстановления, мин<input id="rec42" type="number" min="10" max="180" value="'+p.recovery+'"></label><label>Вес смены корпуса<input id="cross42" type="number" min="1" max="30" value="'+p.crossCost+'"></label><label>Вес одного перепада этажа<input id="floor42weight" type="number" min="1" max="10" value="'+p.floorCost+'"></label></div><p class="muted">Веса — сценарные баллы, не минуты: по умолчанию 6 за смену корпуса и 1 за этаж. Межкорпусный путь не содержит отдельных этажных измерений; неизвестные переходы не считаются нулевой стоимостью. Условное восстановление использует весь перерыв, без вычета ходьбы.</p><label style="display:block"><input id="protect42" type="checkbox" '+(p.protect?"checked":"")+'> Не принимать варианты с ухудшением границ индекса или неполностью определённым пространственным сравнением</label><p class="muted">Проверка обеих границ не доказывает улучшение при любой комбинации неизвестных оценок. Для точной оценки нужны реальные оценки всех предметов.</p><div class="row"><label>Группа<select id="group42">'+opts(groups,s.group)+'</select></label><label>Дата<select id="date42">'+opts(dates,s.date)+'</select></label></div><div class="compare-grid24">'+graph(a,"Исходный день")+graph(b,model?"Выбранная модель":"Модель ещё не рассчитана")+'</div>';
 if(model){const f=model.workload;h+='<h3>Сравнение затронутых группо-недель</h3><p>Сравнимы: '+(f?.comparable||0)+' из '+model.moves.length+'; полностью оценены: '+(f?.fullyRated||0)+'. Пространственный индекс: '+(f?.routeGain??0).toFixed(1)+' балла экономии по известным компонентам. Вариантов с неполным пространственным сравнением: '+(f?.routeUnknown||0)+'.</p><p>Индекс нагрузки: '+(f?.fatigueGain??0).toFixed(2)+' балла снижения среднего пика по сравнимым группо-неделям. Отрицательные значения означают рост. Параметры влияют на следующий комплексный расчёт.</p>'}
 return h+'</section>';
}
function bind42(){
 const s=sync42();if(!s.source)return;
 for(const [id,k,min,max] of [["rec42","recovery",10,180],["cross42","crossCost",1,30],["floor42weight","floorCost",1,10]])on(id,"change",e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&n>=min&&n<=max)s.p[k]=n;invalidate39();render()});
 on("protect42","change",e=>{s.p.protect=e.target.checked;invalidate39();render()});
 on("group42","change",e=>{s.group=e.target.value;s.date="";render()});on("date42","change",e=>{s.date=e.target.value;render()});
}
