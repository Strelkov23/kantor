/* 0.22: coverage-aware route planning and sensitivity analysis, review only. */
let route22={buffer:5,factor:1.25,tight:5,filter:"all"};
function routeAnalysis22(report,points,walk,journal,settings){
 const d=report.strict, keys=new Set(), pointSet=new Set((points?.candidates||[]).map(p=>p.buildingCode));
 const estimates=new Map((walk?.routes||[]).filter(r=>r.status==="estimated"&&Number.isFinite(r.seconds)&&r.seconds>0).map(r=>[r.from+"|"+r.to,r]));
 const rows=d.routes.map(r=>{
   const key=r.from+"|"+r.to;
   if(keys.has(key)||r.from===r.to||!Number.isInteger(r.count)||r.count<=0)throw Error("Некорректный маршрут "+key);
   keys.add(key);
   const gaps=Object.entries(r.gaps).map(([t,n])=>[Number(t),n]);
   if(gaps.some(([t,n])=>!Number.isFinite(t)||t<0||!Number.isInteger(n)||n<=0)||gaps.reduce((s,[t,n])=>s+n,0)!==r.count||Math.min(...gaps.map(x=>x[0]))!==r.minimum)throw Error("Неверное распределение "+key);
   const obs=(journal[key]||[]).filter(x=>x.condition==="normal"&&validSample15(x));
   const z=surveyStats15(obs),field=z&&z.n>=3&&z.consistent?z.max:null;
   const external=estimates.get(key),estimate=external?external.seconds/60:null;
   const kind=field!==null?"field":estimate!==null?"model":"unknown";
   const minutes=field!==null?field:estimate!==null?estimate*settings.factor:null;
   const need=minutes===null?null:Math.ceil(minutes+settings.buffer);
   let late=null,tight=null;
   if(need!==null){late=0;tight=0;for(const [g,n] of gaps){if(g<need)late+=n;else if(g-need<settings.tight)tight+=n}}
   return {...r,key,short:gaps.reduce((s,[g,n])=>s+(g<=20?n:0),0),kind,field,estimate,need,late,tight,samples:obs.length,pointPair:pointSet.has(r.from)&&pointSet.has(r.to)};
 }).sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
 if(rows.reduce((s,r)=>s+r.count,0)!==d.totals.cross)throw Error("Не совпадает число межкорпусных переходов");
 let cumulative=0;const curve=rows.map((r,i)=>({n:i+1,count:cumulative+=r.count}));
 const totals={field:0,model:0,unknown:0,lateField:0,lateModel:0,tightField:0,tightModel:0,short:0};
 let pointPriority=new Map();
 for(const r of rows){
   totals[r.kind]+=r.count;totals.short+=r.short;
   if(r.kind==="field"){totals.lateField+=r.late;totals.tightField+=r.tight}
   if(r.kind==="model"){totals.lateModel+=r.late;totals.tightModel+=r.tight}
   for(const id of [r.from,r.to])if(!pointSet.has(id))pointPriority.set(id,(pointPriority.get(id)||0)+r.count);
 }
 return {rows,curve,totals,pointPriority:[...pointPriority.entries()].sort((a,b)=>b[1]-a[1]),missingKnown:rows.filter(r=>r.kind==="unknown"&&r.pointPair),total:d.totals.cross,unresolvedLocation:d.totals.unknown};
}
function renderRoute22(){
 const d=survey15.baseline;if(!d)return '<section class="panel"><h2>Охват и чувствительность маршрутов</h2><p>Загрузите приоритеты в верхней части страницы.</p></section>';
 let a;try{a=routeAnalysis22(d,survey15.points,survey15.walk,survey15.routes,route22)}catch(e){return '<section class="panel"><p class="bad">'+esc(e.message)+'</p></section>'}
 const s=route22,t=a.totals,metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 const pct=n=>a.total?(100*n/a.total).toFixed(1)+"%":"0%";
 const labels={field:"Полевой журнал",model:"Внешняя оценка",unknown:"Нет времени"};
 const rows=a.rows.filter(r=>s.filter==="all"||r.kind===s.filter);
 return '<section class="panel"><h2>Охват и чувствительность маршрутов</h2><p>Все '+a.rows.length+' направлений строгого календарного снимка от '+esc(d.checked)+'. Три раздельных класса доказательности: сопоставимые полевые наблюдения (обычные условия, ≥3), внешний расчёт от адресных центров, неизвестное время. Диагностика не передаёт оценки в решатель.</p><div class="grid">'+metric("Полевые наблюдения",t.field+" / "+a.total)+metric("Внешние оценки без полевых",t.model+" / "+a.total)+metric("Без времени",t.unknown+" / "+a.total)+metric("Не определена локация",a.unresolvedLocation)+'</div><div class="bar" style="height:18px;display:flex"><i title="Полевой журнал" style="width:'+pct(t.field)+';background:#087a71"></i><i title="Внешняя оценка" style="width:'+pct(t.model)+';background:#b98a39"></i><i title="Неизвестно" style="width:'+pct(t.unknown)+';background:#cbd7df"></i></div><p class="muted">Охват только распознанных межкорпусных переходов. Зелёный — полевые, охристый — оценки, серый — неизвестно.</p><h3>Концентрация переходов</h3>'+chartRows12([5,10,15,20,30,40,a.rows.length].filter((n,i,ar)=>n>0&&n<=a.rows.length&&ar.indexOf(n)===i).map(n=>[n+" направлений",a.curve[n-1].count]))+'<p>Частота — критерий приоритета сбора, не обещание сократить путь на такой же процент.</p><h3>Сценарная проверка запаса</h3><div class="row"><label>Запас внутри зданий, мин<input id="buffer22" type="number" min="0" max="30" value="'+s.buffer+'"></label><label>Множитель внешней оценки<input id="factor22" type="number" min="1" max="3" step=".05" value="'+s.factor+'"></label><label>Малый остаток, мин<input id="tight22" type="number" min="0" max="30" value="'+s.tight+'"></label><label>Фильтр<select id="filter22">'+[["all","Все"],["field","Полевые"],["model","Оценки"],["unknown","Неизвестно"]].map(([k,n])=>'<option value="'+k+'" '+(s.filter===k?"selected":"")+'>'+n+'</option>').join("")+'</select></label><button id="export22">CSV сценария</button></div><div class="grid">'+metric("Недостаточно · полевые",t.field?t.lateField:"—")+metric("Недостаточно · модель",t.model?t.lateModel:"—")+metric("Малый остаток · полевые",t.field?t.tightField:"—")+metric("Малый остаток · модель",t.model?t.tightModel:"—")+'</div><p class="notice">Множитель внешней оценки — сценарное предположение, не поправка, подтверждённая измерениями. Полевой максимум не гарантирует верхнюю границу. Неизвестные маршруты не считаются безопасными.</p><div class="scroll"><table><tr><th>Маршрут</th><th>Частота</th><th>≤20 мин</th><th>Основание</th><th>Время с запасом</th><th>Недостаточно</th><th>Малый остаток</th></tr>'+rows.map(r=>'<tr><td><a href="'+esc(surveyLink15(r.from,r.to))+'" target="_blank" rel="noopener">'+esc(r.from+" → "+r.to)+'</a></td><td>'+r.count+'</td><td>'+r.short+'</td><td>'+labels[r.kind]+'</td><td>'+(r.need===null?"—":r.need+" мин")+'</td><td>'+esc(r.late??"—")+'</td><td>'+esc(r.tight??"—")+'</td></tr>').join("")+'</table></div><h3>Следующие адресные точки для проверки</h3><p>Частота инцидентных переходов: один переход может учитываться у двух корпусов. Не суммировать.</p><div class="scroll"><table><tr><th>Корпус</th><th>Официальный адрес</th><th>Наблюдения</th></tr>'+a.pointPriority.map(([id,n])=>'<tr><td>'+esc(id)+'</td><td>'+esc(instituteCatalog.buildings[id])+'</td><td>'+n+'</td></tr>').join("")+'</table></div><p>Направлений с обеими адресными точками, но без времени: '+a.missingKnown.length+' ('+a.missingKnown.reduce((n,r)=>n+r.count,0)+' наблюдений). В обратную сторону время не копируется.</p></section>';
}
function bindRoute22(){
 for(const [id,key,min,max] of [["buffer22","buffer",0,30],["factor22","factor",1,3],["tight22","tight",0,30]])on(id,"change",e=>{let v=Number(e.target.value);if(e.target.value.trim()&&Number.isFinite(v)&&v>=min&&v<=max)route22[key]=v;render()});
 on("filter22","change",e=>{route22.filter=e.target.value;render()});
 on("export22","click",()=>{let a=routeAnalysis22(survey15.baseline,survey15.points,survey15.walk,survey15.routes,route22),s=route22;let rows=[["from","to","calendar_count","short_gaps","evidence_class","field_minutes","external_minutes","required_minutes","late","tight","buffer","external_multiplier","tight_threshold","snapshot"],...a.rows.map(r=>[r.from,r.to,r.count,r.short,r.kind,r.field,r.estimate,r.need,r.late,r.tight,s.buffer,s.factor,s.tight,survey15.baseline.checked])];download("kantor-route-sensitivity.csv","\ufeff"+rows.map(r=>r.map(v=>csv(v??"")).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
