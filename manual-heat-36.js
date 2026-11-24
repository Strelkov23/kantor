/* 0.36 — Manual conservative package editor and observed resource heatmap. */
function chooseManual36(rows,keys,conflict){
 const by=new Map(rows.map(x=>[x.id+"|"+x.newStart,x]));
 if(new Set(keys).size!==keys.length)throw Error("Повторный перенос");
 const moves=keys.map(k=>{if(!by.has(k))throw Error("Кандидат недоступен при выбранных ограничениях");return by.get(k)});
 for(let i=0;i<moves.length;i++)for(let j=0;j<i;j++)if(conflict(moves[i],moves[j]))throw Error("Несовместимые переносы: "+moves[j].group+" / "+moves[i].group);
 return moves;
}
function heat36(entries,dates,slots,kind){
 const result=dates.map(date=>({date,cells:slots.map(start=>({start,end:start+95,resources:new Set(),cards:0,incomplete:0})),unknownTime:0}));
 const by=new Map(result.map(x=>[x.date,x]));
 for(const x of entries){const row=by.get(x.date);if(!row)continue;if(!x.valid){row.unknownTime++;continue}
  const resources=kind==="rooms"?x.knownRooms:x.knownTeachers,complete=kind==="rooms"?x.roomComplete:x.teacherComplete;
  for(const cell of row.cells)if(x.start<cell.end&&cell.start<x.end){cell.cards++;if(!complete)cell.incomplete++;for(const k of resources)cell.resources.add(k)}
 }
 return result.map(row=>({...row,cells:row.cells.map(c=>({...c,resources:[...c.resources].sort()}))}));
}

const manual36={source:null,keys:[],strict:true,week:"all",group:"",name:"Ручной вариант",detail:"",message:"",audit:null};
function syncManual36(){
 const s=manual36;if(s.source!==opportunities29.data){s.source=opportunities29.data;s.keys=[];s.audit=null;s.detail="";s.message=""}return s;
}
function manualPool36(){
 const s=syncManual36(),d=s.source;
 if(!d||inter33.context?.ready!==opportunities29.readiness||!Array.isArray(inter33.resourceReview))return [];
 const reviews=new Map(inter33.resourceReview.map(x=>[moveKey30(x),x]));
 return filter34(d.results,reviews,{week:"all",course:"all",strict:s.strict});
}
function checkManual36(keys){
 const s=syncManual36(),ready=opportunities29.readiness,d=s.source;
 if(!d||!ready||opportunities29.loading||inter33.context?.ready!==ready)throw Error("Сначала завершите загрузку и проверку снимка");
 if(keys.length>200)throw Error("Не более 200 переносов");
 const byId=new Map(ready.cards.map(q=>[q.id,q])),moves=chooseManual36(manualPool36(),keys,(a,b)=>conflict30(a,b,byId)),audit=auditJoint30(ready,moves,d.results);
 if(!audit.ok)throw Error(audit.errors[0]);
 const review=new Map(inter33.resourceReview.map(x=>[moveKey30(x),x]));
 return {moves,before:audit.before,after:audit.after,uncertain:moves.filter(x=>x.unresolved||review.get(moveKey30(x)).remainingUnclear).length};
}
function setManual36(keys){
 const s=syncManual36();try{const audit=checkManual36(keys);s.keys=keys.slice();s.audit=audit;s.message=keys.length?"Пакет прошёл внутреннюю повторную проверку.":"Пакет пуст.";if(!keys.includes(s.detail))s.detail=keys[0]||""}catch(e){s.message="Изменение не применено: "+e.message}render();
}
function renderManual36(){
 const s=syncManual36(),d=s.source,ready=!!(d&&inter33.context?.ready===opportunities29.readiness&&Array.isArray(inter33.resourceReview));
 let h='<section class="panel" id="manual36"><div class="eyebrow23">Ручной конструктор · 0.36</div><h2>Соберите свой пакет переносов</h2><p>Выберите подходящие занятия из проверенных кандидатов. Система не изменяет официальный журнал и не разрешает произвольно переносить пары в неизвестно свободные интервалы.</p>';
 if(!ready)return h+'<p class="muted">Загрузите исходный снимок в лаборатории выше.</p></section>';
 const pool=manualPool36(),rows=pool.filter(x=>(s.week==="all"||x.weekType===s.week)&&key26(x.group).includes(key26(s.group))),selected=new Set(s.keys),a=s.audit;
 h+='<div class="row"><label>Название пакета<input id="manualName36" maxlength="60" value="'+esc(s.name)+'"></label><label>Неделя<select id="manualWeek36">'+[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]].map(([k,n])=>'<option value="'+k+'" '+(s.week===k?"selected":"")+'>'+n+'</option>').join("")+'</select></label><label>Группа<input id="manualGroup36" value="'+esc(s.group)+'" placeholder="Поиск по группе"></label></div><label style="display:block;margin:10px 0"><input id="manualStrict36" type="checkbox" '+(s.strict?"checked":"")+'> Только без неясных карточек в проверяемых интервалах</label><p class="muted">Кандидатов по фильтру: '+rows.length+'. Выбрано: '+s.keys.length+'. При смене строгого режима пакет сбрасывается. Фильтр группы и недели только меняет список, не удаляет ранее выбранные занятия.</p><p class="notice">Проверка действует в рамках наблюдаемого института. Неизвестная внешняя занятость, подгруппы, вместимость и маршруты не считаются подтверждёнными.</p><p role="status">'+esc(s.message)+'</p>';
 if(!rows.length)h+='<p>Нет кандидатов в данном режиме. '+(s.strict?"Можно снять строгий флажок для исследования предварительных вариантов.":"Попробуйте другой фильтр.")+'</p>';
 else h+='<div class="grid">'+rows.slice(0,100).map(x=>{const k=moveKey30(x),chosen=selected.has(k);return '<article class="metric" style="overflow-wrap:anywhere"><small>'+esc(x.group+" · "+x.date+" · "+weekName32(x.weekType))+'</small><h3>'+esc(x.subject)+'</h3><p>'+esc(x.teacher+" · "+x.room)+'</p><div class="row"><b>'+clock26(x.oldStart)+'</b><span aria-hidden="true">→</span><b class="good">'+clock26(x.newStart)+'</b></div><p>Окна: '+x.groupBefore.windows+' → '+x.groupAfter.windows+' · '+(x.groupBefore.span-x.groupAfter.span)+' группо-мин</p><div class="row"><button data-preview36="'+esc(k)+'">Посмотреть</button><button data-pick36="'+esc(k)+'" '+(chosen?'aria-pressed="true" class="primary"':'aria-pressed="false"')+' '+(opportunities29.loading?"disabled":"")+'>'+(chosen?"Убрать":"Добавить")+'</button></div></article>'}).join("")+'</div>';
 if(rows.length>100)h+='<p>Первые 100 из '+rows.length+'. Уточните группу или неделю.</p>';
 h+='<h3 style="margin-top:18px">Выбранный пакет</h3>';
 if(a&&s.keys.length){
  const gain=(k,v)=>a.before[k][v]-a.after[k][v];
  h+='<div class="grid">'+[["Переносы",a.moves.length],["Убрано окон групп",gain("group","windows")],["Сэкономлено группо-мин",gain("group","span")],["Убрано окон преподавателей",gain("teacher","windows")],["С остаточной неопределённостью",a.uncertain]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><div class="scroll"><table><tr><th>Группа / дата</th><th>Предмет</th><th>Было → стало</th><th>Действие</th></tr>'+a.moves.map(x=>'<tr><td>'+esc(x.group+" · "+x.date)+'</td><td>'+esc(x.subject)+'</td><td>'+clock26(x.oldStart)+' → '+clock26(x.newStart)+'</td><td><button data-pick36="'+esc(moveKey30(x))+'">Убрать</button></td></tr>').join("")+'</table></div><div class="row"><button id="clearManual36">Очистить пакет</button><button id="exportManual36">Скачать протокол JSON</button></div>';
 }else h+='<p class="muted">Выберите хотя бы один перенос.</p>';
 const detail=pool.find(x=>moveKey30(x)===s.detail);
 if(detail)h+='<div id="manualDetail36" style="margin-top:16px"><h3>'+esc(detail.group+" · "+detail.date+" · "+detail.subject)+'</h3>'+diagram34(detail)+'</div>';
 return h+'</section>';
}
function bindManual36(){
 const s=syncManual36();
 on("manualName36","input",e=>s.name=e.target.value);
 on("manualGroup36","change",e=>{s.group=e.target.value;render()});
 on("manualWeek36","change",e=>{s.week=e.target.value;render()});
 on("manualStrict36","change",e=>{s.strict=e.target.checked;s.keys=[];s.audit=null;s.detail="";s.message="Пакет сброшен: изменён режим проверки.";render()});
 document.querySelectorAll("[data-pick36]").forEach(b=>b.onclick=()=>{const k=b.dataset.pick36;setManual36(s.keys.includes(k)?s.keys.filter(x=>x!==k):[...s.keys,k])});
 document.querySelectorAll("[data-preview36]").forEach(b=>b.onclick=()=>{s.detail=b.dataset.preview36;render();$("manualDetail36")?.scrollIntoView?.({block:"start"})});
 on("clearManual36","click",()=>setManual36([]));
 on("exportManual36","click",()=>{try{const a=checkManual36(s.keys);if(!a.moves.length)return;download("kantor-manual-package.json",JSON.stringify({version:"0.36-manual",status:"observed-only",checked:s.source.checked,name:s.name.trim()||"Ручной вариант",strict:s.strict,...a},null,2),"application/json")}catch(e){s.message=e.message;render()}});
}
const heatState36={kind:"rooms",week:"",selected:""};
function renderHeat36(){
 const ctx=inter33.context,reg=ctx?.registry,st=heatState36;
 if(!opportunities29.data||ctx?.ready!==opportunities29.readiness||!reg?.occupancy)return "";
 const dates=[...new Set(reg.occupancy.entries.map(x=>x.date))].sort(),weeks=[...new Set(dates.map(monday32))];
 if(!weeks.includes(st.week)){st.week=weeks[0]||"";st.selected=""}
 const ds=Array.from({length:7},(_,i)=>plusDate32(st.week,i)),rows=heat36(reg.occupancy.entries,ds,starts29,st.kind),max=Math.max(1,...rows.flatMap(r=>r.cells.map(c=>c.resources.length)));
 const cell=(r,c)=>{const n=c.resources.length,key=r.date+"|"+c.start,alpha=.10+.70*n/max;return '<button data-heat36="'+key+'" aria-pressed="'+(st.selected===key)+'" aria-label="'+esc(r.date+" "+clock26(c.start)+": "+n+" известных ресурсов, "+c.incomplete+" неполных карточек")+'" style="background:rgba(8,126,120,'+alpha+');color:'+(alpha>.57?"#fff":"#172e40")+';width:100%;min-width:52px;padding:9px 4px;font-weight:700">'+n+'</button>'};
 let h='<section class="panel" id="heat36"><div class="eyebrow23">Анализ ресурсов · 0.36</div><h2>Тепловая карта наблюдаемой занятости</h2><p>Число разных явно обозначенных ресурсов, пересекающих стандартную пару. Составные карточки учитывают каждый явный компонент как возможную занятость. Повторные обозначения ресурса считаются один раз в ячейке.</p><div class="row"><label>Ресурс<select id="heatKind36"><option value="rooms" '+(st.kind==="rooms"?"selected":"")+'>Аудитории</option><option value="teachers" '+(st.kind==="teachers"?"selected":"")+'>Преподаватели (полные ФИО)</option></select></label><label>Неделя с<select id="heatWeek36">'+weeks.map(w=>'<option '+(w===st.week?"selected":"")+'>'+w+'</option>').join("")+'</select></label></div><p class="muted">Шкала относительная в выбранной неделе: от 0 до '+max+'. Это не процент использования, не число занятий и не подтверждение свободного ресурса. Нестандартное время учитывается, если пересекает стандартную пару.</p><div class="scroll"><table style="min-width:580px"><tr><th>Дата</th>'+starts29.map(t=>'<th>'+clock26(t)+'</th>').join("")+'<th>Без времени</th></tr>'+rows.map(r=>'<tr><td>'+esc(r.date)+'</td>'+r.cells.map(c=>'<td style="padding:4px">'+cell(r,c)+'</td>').join("")+'<td>'+r.unknownTime+'</td></tr>').join("")+'</table></div><p class="muted">Нажмите на ячейку для просмотра состава. Карточки без известного времени показаны отдельно; их нельзя отнести к конкретной паре.</p>';
 const [date,start]=st.selected.split("|"),c=rows.find(r=>r.date===date)?.cells.find(x=>x.start===+start);
 if(c)h+='<h3>'+esc(date+" · "+clock26(c.start)+"–"+clock26(c.end))+'</h3><div class="grid">'+[["Явных ресурсов",c.resources.length],["Карточек с пересечением",c.cards],["Карточек с неполными метками ресурса",c.incomplete]].map(([n,v])=>'<div class="metric"><small>'+n+'</small><strong>'+v+'</strong></div>').join("")+'</div><details open><summary>Список обозначений ('+c.resources.length+')</summary><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'+c.resources.map(x=>'<span class="tag">'+esc(x)+'</span>').join("")+'</div></details>';
 return h+'<button id="heatCSV36">Выгрузить выбранную неделю CSV</button></section>';
}
function bindHeat36(){
 const st=heatState36;
 on("heatKind36","change",e=>{st.kind=e.target.value;st.selected="";render()});
 on("heatWeek36","change",e=>{st.week=e.target.value;st.selected="";render()});
 document.querySelectorAll("[data-heat36]").forEach(b=>b.onclick=()=>{st.selected=b.dataset.heat36;render()});
 on("heatCSV36","click",()=>{const ctx=inter33.context;if(!ctx||ctx.ready!==opportunities29.readiness)return;const rows=heat36(ctx.registry.occupancy.entries,Array.from({length:7},(_,i)=>plusDate32(st.week,i)),starts29,st.kind);const data=[["Дата","Начало","Конец","Тип ресурса","Разных явных обозначений","Карточки","Неполные метки","Карточки без времени за день","Снимок"],...rows.flatMap(r=>r.cells.map(c=>[r.date,clock26(c.start),clock26(c.end),st.kind,c.resources.length,c.cards,c.incomplete,r.unknownTime,ctx.ready.checked]))];download("kantor-resource-heatmap.csv","\ufeff"+data.map(r=>r.map(v=>csv(String(v??""))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
