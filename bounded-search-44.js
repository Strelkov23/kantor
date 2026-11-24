/* 0.44: bounded maximum-weight compatible subset search. Upper bound is for the
 * current candidate universe, not for all possible timetables. */
function objective44(priority,x){
 const g=x.gains,w=priority==="space"?[2,1,2,1,2]:priority==="ped"?[3,1,2,1,10]:[5,2,4,2,3];
 let value=w[0]*g.windows+w[1]*g.span/95+w[2]*g.days+w[3]*g.teacher+w[4]*g.ped+(priority==="space"?2:priority==="ped"?.5:1)*g.route+(priority==="ped"?4:1)*g.fatigue-g.routeUnknown;
 if(priority==="fair")value+=2*(x.weekly.group.gain+x.weekly.teacher.gain)+(x.weekly.group.before.maxMinutes||0)/95+(x.weekly.teacher.before.maxMinutes||0)/190;
 return value;
}
const eps44=1e-7;
function search44(rows,by,limit,score,conflict,settings={}){
 const budget=Math.max(1,Math.min(20000,Math.trunc(settings.nodes||1500))),fair=!!settings.fair;
 const items=rows.map((x,i)=>{const q=by.get(x.id);if(!q||!Number.isFinite(score(x)))throw Error("Некорректная оценка кандидата");return {x,i,base:score(x),g:q.group,t:q.teacher,gk:JSON.stringify([q.group,x.weekStart]),tk:JSON.stringify([q.teacher,x.weekStart])}}).filter(a=>a.base+(fair?8:0)>eps44);
 const key=a=>JSON.stringify([a.x.id,a.x.newDate,a.x.newStart,a.x.newRoom,a.i]);
 const marginal=(a,G,T)=>a.base+(fair&&!G.has(a.g)?5:0)+(fair&&!T.has(a.t)?3:0);
 const total=arr=>{const G=new Set(),T=new Set();let n=0;for(const a of arr){n+=marginal(a,G,T);G.add(a.g);T.add(a.t)}return n};
 const cmp=(a,b)=>b.base-a.base||(a.x.uncertainty||0)-(b.x.uncertainty||0)||key(a).localeCompare(key(b));
 items.sort(cmp);
 // All compatible solutions are constrained to at most one action per group-week
 // and teacher-week. Each independent maximum is a relaxation, hence an upper bound.
 const sumTop=(values,k)=>values.sort((a,b)=>b-a).slice(0,k).reduce((n,v)=>n+v,0);
 function bound(rem,slots,G,T,value){
  if(slots<=0||!rem.length)return value;
  const gm=new Map(),tm=new Map(),all=[];
  for(const a of rem){const v=marginal(a,G,T);if(v<=0)continue;all.push(v);gm.set(a.gk,Math.max(gm.get(a.gk)||0,v));tm.set(a.tk,Math.max(tm.get(a.tk)||0,v))}
  return value+Math.min(sumTop(all,slots),sumTop([...gm.values()],slots),sumTop([...tm.values()],slots));
 }
 function clashes(a,b){return a.gk===b.gk||a.tk===b.tk||conflict(a.x,b.x)}
 function greedy(rem,chosen=[],G=new Set(),T=new Set(),value=0,spread=false){
  const out=chosen.slice(),gs=new Set(G),ts=new Set(T);let v=value,pool=rem.slice();
  const gCounts=new Map(),tCounts=new Map();
  if(spread)for(const a of pool){gCounts.set(a.gk,(gCounts.get(a.gk)||0)+1);tCounts.set(a.tk,(tCounts.get(a.tk)||0)+1)}
  while(out.length<limit&&pool.length){
   let best=null,bestRank=-Infinity;
   for(const a of pool){const m=marginal(a,gs,ts);if(m<=eps44)continue;const rank=spread?m/(1+.05*((gCounts.get(a.gk)||1)+(tCounts.get(a.tk)||1))):m;if(rank>bestRank+eps44){best=a;bestRank=rank}}
   if(!best)break;v+=marginal(best,gs,ts);out.push(best);gs.add(best.g);ts.add(best.t);pool=pool.filter(a=>a!==best&&!clashes(a,best));
  }
  return {chosen:out,value:v};
 }
 let best=greedy(items),seed=best.value;
 const alternate=greedy(items,[],new Set(),new Set(),0,true);
 if(alternate.value>best.value+eps44)best=alternate;
 const root={rem:items,chosen:[],G:new Set(),T:new Set(),value:0};
 root.upper=bound(items,limit,root.G,root.T,0);
 const stack=[root];let nodes=0,pruned=0;
 while(stack.length&&nodes<budget){
  const n=stack.pop();nodes++;
  if(n.upper<=best.value+eps44){pruned++;continue}
  if(n.value>best.value+eps44)best={chosen:n.chosen,value:n.value};
  const slots=limit-n.chosen.length;if(!slots||!n.rem.length)continue;
  // Periodic completion gives a feasible incumbent while bounding the unexplored tree.
  if(nodes===1||nodes%32===0){const candidate=greedy(n.rem,n.chosen,n.G,n.T,n.value);if(candidate.value>best.value+eps44)best=candidate}
  let pivot=n.rem[0],pv=-Infinity;
  for(const a of n.rem){const v=marginal(a,n.G,n.T);if(v>pv+eps44){pv=v;pivot=a}}
  const tail=n.rem.filter(a=>a!==pivot);
  const exclude={...n,rem:tail};exclude.upper=bound(tail,slots,n.G,n.T,n.value);
  if(exclude.upper>best.value+eps44)stack.push(exclude);else pruned++;
  if(pv>eps44){
   const G=new Set(n.G),T=new Set(n.T);G.add(pivot.g);T.add(pivot.t);
   const include={rem:tail.filter(a=>!clashes(a,pivot)),chosen:[...n.chosen,pivot],G,T,value:n.value+pv};
   if(include.value>best.value+eps44)best={chosen:include.chosen,value:include.value};
   include.upper=bound(include.rem,slots-1,G,T,include.value);
   if(include.upper>best.value+eps44)stack.push(include);else pruned++;
  }
 }
 const upper=Math.max(best.value,...stack.map(n=>n.upper)),chosen=best.chosen.map(a=>a.x);
 const value=total(best.chosen);if(Math.abs(value-best.value)>1e-5)throw Error("Нарушен баланс оценки");
 return {chosen,score:value,upper,seed,nodes,budget,pruned,remaining:stack.length,eligible:items.length,exact:upper-value<=eps44};
}
function packageScore44(moves,by,priority){
 const groups=new Set(),teachers=new Set();let value=0;
 for(const x of moves){const q=by.get(x.id);value+=objective44(priority,x);if(priority==="fair"){if(!groups.has(q.group))value+=5;if(!teachers.has(q.teacher))value+=3}groups.add(q.group);teachers.add(q.teacher)}
 return value;
}
function optimize44(ctx,pool,profile,config,priority,audit){
 const result=search44(pool.candidates,ctx.byId,config.limit,x=>objective44(priority,x),(a,b)=>incompatible39(a,b,ctx.byId),{nodes:config.searchNodes||1500,fair:priority==="fair"});
 let checked,removed=0;
 try{checked=audit(result.chosen)}catch(e){const safe=[];for(const x of result.chosen){try{audit([...safe,x]);safe.push(x)}catch(err){removed++}}checked=audit(safe)}
 const score=packageScore44(checked.moves,ctx.byId,priority),upper=Math.max(score,result.upper),gap=Math.max(0,upper-score);
 return {...checked,rejected:pool.candidates.length-checked.moves.length,considered:pool.candidates.length,pedExcluded:pool.excluded,workloadExcluded:pool.workloadExcluded,weeklyExcluded:pool.weeklyExcluded,passportExcluded:pool.passportExcluded,search:{score,upper,gap,gapPct:upper>eps44?100*gap/upper:0,seed:result.seed,nodes:result.nodes,budget:result.budget,pruned:result.pruned,remaining:result.remaining,eligible:result.eligible,auditRemoved:removed,exact:gap<=eps44,scope:"current candidates; weighted objective; compatibility relaxation"}};
}
const searchState44={nodes:1500};
function render44(){
 const s=searchState44,ctx=inter33.context;if(!ctx)return "";
 const r=multi39.runs[multi39.active],a=r?.search,fmt=v=>Number(v).toFixed(2);
 let h='<section class="panel" id="search44"><div class="eyebrow23">Математический поиск · 0.47</div><h2>Поиск совместимых комбинаций</h2><p>Ветви и границы: сначала быстрый допустимый по парной совместимости набор, затем поиск альтернативных сочетаний. Верхняя граница строится без части конфликтов; она показывает, насколько ещё может улучшиться целевая функция среди известных кандидатов.</p><label>Бюджет узлов на каждую модель<select id="searchBudget44">'+[[250,"Быстрый · 250"],[1500,"Обычный · 1 500"],[6000,"Углублённый · 6 000"]].map(([n,l])=>'<option value="'+n+'" '+(n===s.nodes?"selected":"")+'>'+l+'</option>').join("")+'</select></label><p class="muted">Поиск детерминирован, работает в браузере. Число узлов — не время и не число исходных расписаний. Полный результат затем проходит прежнюю проверку ресурсов, педагогики и нагрузки.</p>';
 if(a){h+='<h3>'+esc(r.name)+'</h3><div class="grid">'+[["Оценка пакета после аудита",fmt(a.score)],["Верхняя граница",fmt(a.upper)],["Разрыв до границы",fmt(a.gapPct)+"%"],["Исследовано узлов",a.nodes+" / "+a.budget],["Положительные одиночные действия и обмены",a.eligible],["Исключено пакетов итоговым аудитом",a.auditRemoved]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><p>'+ (a.exact?"Достигнута верхняя граница для заданного набора кандидатов и весов (с числовым допуском).":"Оптимальность не доказана. Разрыв — верхняя оценка возможного улучшения, а не прогноз.")+'</p><div class="bar" style="height:14px"><i style="width:'+(a.upper>0?Math.min(100,100*a.score/a.upper):100)+'%"></i></div><p class="muted">Стартовая эвристика: '+fmt(a.seed)+'. Если итоговая проверка отклонила часть действий, её оценка может оказаться ниже стартовой. Оценки разных профилей не сравниваются напрямую.</p>'}
 h+='<details><summary>Как рассчитывается целевая функция</summary><p>Сумма взвешенных улучшений: окна групп, сокращение группо-минут (в единицах 95 минут), учебные дни, окна преподавателей, педагогические критерии, пространственный индекс и сценарный индекс нагрузки. Вычитается 1 балл за неполное пространственное сравнение. В профиле охвата добавляются 5 баллов за каждую новую группу и 3 за каждого нового преподавателя, а также приоритет длинных исходных дней и равномерности. Это условные веса, не единицы времени.</p><p>Ни один найденный пакет не означает доказанного глобального оптимума расписания академии. Рассматриваются только исходные кандидаты, не более одного изменения на группу и преподавателя за неделю, без подтверждения внешней занятости.</p></details></section>';
 return h;
}
function bind44(){on("searchBudget44","change",e=>{const n=+e.target.value;if([250,1500,6000].includes(n))searchState44.nodes=n;invalidate39();render()})}
