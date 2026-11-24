/* 0.47: atomic action bundles with a budget measured in changed lessons. */
function enrichSwap47(ctx,pair,profile,config,index){
 const out=[];
 for(let i=0;i<pair.moves.length;i++){
  const x=pair.moves[i],q=ctx.byId.get(x.id),week=ctx.ready.cards.filter(v=>v.group===q.group&&monday32(v.date)===x.weekStart);
  if((config.week!=="all"&&x.weekType!==config.week)||(config.course!=="all"&&String(x.course)!==config.course))return null;
  const a=pedagogy39(week,profile),b=pedagogy39(apply39(week,[x]),profile),floor=pair.routes[i],workload=assess42(week,x,profile,config,floor);
  if(config.pedProtect&&!protectPed39(a,b)||reject42(workload,config))return null;
  const weekly=assessWeek43(ctx,x,index);
  out.push({...x,swapKey:pair.key,uncertainty:pair.unknown.length,floor,workload,weekly,gains:{windows:0,span:0,days:0,teacher:0,cross:floor.group.cross,teacherCross:floor.teacher.cross,vertical:floor.group.levels+floor.teacher.levels,route:workload.route.gain,routeUnknown:workload.route.known?0:1,fatigue:workload.fatigue.gain,ped:a.late-b.late+a.heavyPairs-b.heavyPairs+b.links-a.links},pedBefore:a,pedAfter:b});
 }
 return {key:"swap:"+pair.key,moves:out};
}
function bundlePool47(ctx,pool,profile,config){
 const singles=pool.candidates.map(x=>({key:"single:"+actionKey39(x),moves:[x]})),swaps=[],cycles=[];let cycleSearch=null;
 if(config.includeSwaps!==false&&config.register){
  const d=swaps46(ctx,config.register,config.requireRoom,config.strict);
  for(const p of d.results){const b=enrichSwap47(ctx,p,profile,config,pool.weeklyIndex);if(b)swaps.push(b)}
  cycleSearch=cycles48(ctx,config.register,config.requireRoom,config.strict);
  for(const p of cycleSearch.results){const b=enrichSwap47(ctx,p,profile,config,pool.weeklyIndex);if(b)cycles.push(b)}
 }
 return {bundles:[...singles,...swaps,...cycles],swapCount:swaps.length,cycleCount:cycles.length,cycleSearch:cycleSearch?{edges:cycleSearch.edges,cycles:cycleSearch.cycles,truncated:cycleSearch.truncated,limit:cycleSearch.limit}:null,singleCount:singles.length};
}
function bundleConflict47(a,b,by){
 return a.moves.some(x=>b.moves.some(y=>incompatible39(x,y,by)));
}
function bundleSearch47(bundles,by,limit,score,conflict,settings={}){
 const budget=Math.max(1,Math.min(20000,Math.trunc(settings.nodes||1500))),fair=!!settings.fair,eps=1e-7;
 const items=bundles.map(b=>{
  const groups=new Set(),teachers=new Set(),gk=new Set(),tk=new Set();let base=0;
  if(!Array.isArray(b.moves)||!b.moves.length)throw Error("Пустой пакет");
  for(const x of b.moves){const q=by.get(x.id);if(!q)throw Error("Неизвестное занятие");groups.add(q.group);teachers.add(q.teacher);gk.add(JSON.stringify([q.group,x.weekStart]));tk.add(JSON.stringify([q.teacher,x.weekStart]));base+=score(x)}
  if(!Number.isFinite(base)||gk.size!==b.moves.length||tk.size!==b.moves.length||new Set(b.moves.map(x=>x.id)).size!==b.moves.length)throw Error("Некорректный связанный пакет");
  return {b,base,groups,teachers,gk,tk,cost:b.moves.length};
 }).filter(a=>a.cost<=limit&&a.base+(fair?5*a.groups.size+3*a.teachers.size:0)>eps);
 const marginal=(a,G,T)=>a.base+(fair?5*[...a.groups].filter(g=>!G.has(g)).length+3*[...a.teachers].filter(t=>!T.has(t)).length:0);
 const include=(n,a)=>({chosen:[...n.chosen,a],G:new Set([...n.G,...a.groups]),T:new Set([...n.T,...a.teachers]),value:n.value+marginal(a,n.G,n.T),used:n.used+a.cost});
 const clash=(a,b)=>[...a.gk].some(k=>b.gk.has(k))||[...a.tk].some(k=>b.tk.has(k))||conflict(a.b,b.b);
 const tie=(a,b)=>a.b.key.localeCompare(b.b.key);
 items.sort((a,b)=>b.base/b.cost-a.base/a.cost||tie(a,b));
 function top(values,k){return values.sort((a,b)=>b-a).slice(0,k).reduce((s,v)=>s+v,0)}
 function bound(rem,n){
  const slots=limit-n.used;if(slots<=0)return n.value;
  const gm=new Map(),tm=new Map(),ratios=[];
  for(const a of rem){if(a.cost>slots)continue;const v=marginal(a,n.G,n.T);if(v<=eps)continue;const share=v/a.cost;ratios.push({share,cost:a.cost});for(const k of a.gk)gm.set(k,Math.max(gm.get(k)||0,share));for(const k of a.tk)tm.set(k,Math.max(tm.get(k)||0,share))}
  let left=slots,frac=0;for(const r of ratios.sort((a,b)=>b.share-a.share)){const take=Math.min(left,r.cost);frac+=take*r.share;left-=take;if(!left)break}
  return n.value+Math.min(frac,top([...gm.values()],slots),top([...tm.values()],slots));
 }
 function greedy(rem,n,mode){
  let s={...n},a=rem.slice();
  const counts=new Map();if(mode===2)for(const x of a)for(const k of [...x.gk,...x.tk])counts.set(k,(counts.get(k)||0)+1);
  while(s.used<limit){let best=null,v=-Infinity;
   for(const x of a){if(x.cost>limit-s.used)continue;const m=marginal(x,s.G,s.T);if(m<=eps)continue;let rank=mode===1?m:m/x.cost;if(mode===2)rank/=1+.025*[...x.gk,...x.tk].reduce((z,k)=>z+(counts.get(k)||0),0);if(rank>v+eps||Math.abs(rank-v)<=eps&&best&&tie(x,best)<0){best=x;v=rank}}
   if(!best)break;s=include(s,best);a=a.filter(x=>x!==best&&!clash(x,best));
  }return s;
 }
 const root={chosen:[],G:new Set(),T:new Set(),value:0,used:0,rem:items};let best=greedy(items,root,0),seed=best.value;
 for(const mode of [1,2]){const g=greedy(items,root,mode);if(g.value>best.value+eps)best=g}
 root.upper=bound(items,root);const stack=[root];let nodes=0,pruned=0;
 while(stack.length&&nodes<budget){
  const n=stack.pop();nodes++;if(n.upper<=best.value+eps){pruned++;continue}if(n.value>best.value+eps)best=n;
  const rem=n.rem.filter(a=>a.cost<=limit-n.used&&marginal(a,n.G,n.T)>eps);if(!rem.length)continue;
  if(nodes===1||nodes%32===0){const g=greedy(rem,n,0);if(g.value>best.value+eps)best=g}
  let pivot=rem[0],rank=-Infinity;for(const a of rem){const v=marginal(a,n.G,n.T)/a.cost;if(v>rank+eps){pivot=a;rank=v}}
  const tail=rem.filter(a=>a!==pivot),ex={...n,rem:tail};ex.upper=bound(tail,ex);if(ex.upper>best.value+eps)stack.push(ex);else pruned++;
  const inc={...include(n,pivot),rem:tail.filter(a=>!clash(a,pivot))};if(inc.value>best.value+eps)best=inc;inc.upper=bound(inc.rem,inc);if(inc.upper>best.value+eps)stack.push(inc);else pruned++;
 }
 const upper=stack.reduce((v,n)=>Math.max(v,n.upper),best.value);
 return {chosen:best.chosen.map(a=>a.b),score:best.value,upper,seed,nodes,budget,pruned,remaining:stack.length,eligible:items.length,exact:upper-best.value<=eps};
}
function auditBundles47(ctx,selected,pool,profile,config){
 const allowed=new Map(pool.atomic.bundles.map(b=>[b.key,b])),units=selected.map(b=>{const x=allowed.get(b.key);if(!x)throw Error("Неизвестный пакет");return x});
 if(new Set(units.map(b=>b.key)).size!==units.length||units.reduce((n,b)=>n+b.moves.length,0)>config.limit)throw Error("Нарушен лимит изменений");
 for(let i=0;i<units.length;i++)for(let j=0;j<i;j++)if(bundleConflict47(units[i],units[j],ctx.byId))throw Error("Несовместимые пакеты");
 const moves=units.flatMap(b=>b.moves),swaps=units.filter(b=>b.moves.length>1);
 for(const b of swaps)if(!validCycle48(b.moves))throw Error("Нарушена атомарность обмена");
 const r=audit39(ctx,moves,{...pool,candidates:[...pool.candidates,...swaps.flatMap(b=>b.moves)]},profile,config);
 return {...r,exchangeCount:swaps.length,cycleCount:swaps.filter(b=>b.moves.length===3).length,pairCount:swaps.filter(b=>b.moves.length===2).length,exchangeKeys:swaps.map(b=>b.key),actionCount:units.length};
}
function optimize47(ctx,pool,profile,config,priority){
 const a=pool.atomic,result=bundleSearch47(a.bundles,ctx.byId,config.limit,x=>objective44(priority,x),(x,y)=>bundleConflict47(x,y,ctx.byId),{nodes:config.searchNodes||1500,fair:priority==="fair"});
 let checked,removed=0;const audit=units=>auditBundles47(ctx,units,pool,profile,config);
 try{checked=audit(result.chosen)}catch(e){const safe=[];for(const x of result.chosen){try{audit([...safe,x]);safe.push(x)}catch(err){removed++}}checked=audit(safe)}
 const score=packageScore44(checked.moves,ctx.byId,priority),upper=Math.max(score,result.upper),gap=Math.max(0,upper-score);
 return {...checked,rejected:a.bundles.length-checked.actionCount,considered:a.bundles.length,pedExcluded:pool.excluded,workloadExcluded:pool.workloadExcluded,weeklyExcluded:pool.weeklyExcluded,passportExcluded:pool.passportExcluded,swapCandidates:a.swapCount,cycleCandidates:a.cycleCount||0,cycleSearch:a.cycleSearch,singleCandidates:a.singleCount,search:{score,upper,gap,gapPct:upper>eps44?100*gap/upper:0,seed:result.seed,nodes:result.nodes,budget:result.budget,pruned:result.pruned,remaining:result.remaining,eligible:result.eligible,auditRemoved:removed,exact:gap<=eps44,scope:"current single and atomic exchange candidates; changed-lesson budget; compatibility relaxation"}};
}
const atomic47={enabled:true};
function bindAtomic47(){on("includeSwaps47","change",e=>{atomic47.enabled=e.target.checked;invalidate39();render()})}
