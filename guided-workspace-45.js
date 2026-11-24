/* 0.45: guided workflow; all research tools are retained in task-based folds. */
const guide45={opened:new Set(),lastAction:"",advanced:false};
const sections45=[
 ["settings","Настройки комплексной модели","Ограничения ресурсов, сложность предметов, веса и точность поиска.",()=>render40()+renderOrder49()+render42()+render43()+render44()],
 ["results","Подробное сравнение комплексных моделей","Все изменения, методика, паспорта и экспорт протокола.",()=>renderMulti39()],
 ["custom","Собственные модели времени и их библиотека","Настройте свои веса, сохраните сценарий и сравните календарь группы.",()=>renderStudio34()+renderLibrary35()+renderCalendar35()],
 ["manual","Отдельные изменения и ручные пакеты","Выберите переносы самостоятельно или исследуйте их совместимость.",()=>renderManual36()+renderMixed37()+renderOpportunities29()+renderJoint30()+renderInterday33()],
 ["space","Аудитории, этажи и занятость","Найдите обмены, альтернативные помещения и посмотрите тепловую карту.",()=>renderSwap46()+renderRoom38()+renderFloor41()+renderHeat36()],
 ["research","Данные, доказательства и отчёты","Сверка ресурсов, неоднозначные записи и исследовательские сценарии.",()=>renderResourceReview33()+renderReport30()+renderScenarios03()]
];
function reveal45(id,scroll=true){
 const e=$("guideFold45-"+id);if(!e)return;
 guide45.opened.add(id);e.open=true;
 if(scroll)e.scrollIntoView?.({block:"start"});
}
function revealNode45(id){
 const e=$(id);if(!e)return false;const d=e.closest?.("[data-fold45]");if(d)reveal45(d.dataset.fold45,false);e.scrollIntoView?.({block:"start"});return true;
}

function plural45(n){return n%100>=11&&n%100<=14?"изменений":n%10===1?"изменение":n%10>=2&&n%10<=4?"изменения":"изменений"}
function preview45(ctx,model){
 if(!model.moves.length)return '<p>В выбранной модели нет допустимых изменений.</p>';
 const groups=[...new Set(model.moves.map(x=>ctx.byId.get(x.id).group))].sort((a,b)=>a.localeCompare(b,"ru",{numeric:true}));
 if(!groups.includes(guide45.group))guide45.group=groups[0];
 const changes=model.moves.filter(x=>ctx.byId.get(x.id).group===guide45.group),dates=[...new Set(changes.flatMap(x=>[ctx.byId.get(x.id).date,x.newDate]))].sort();
 if(!dates.includes(guide45.date))guide45.date=dates[0];
 const group=guide45.group,date=guide45.date,changed=new Set(changes.map(x=>x.id)),all=ctx.ready.cards.filter(q=>q.group===group),after=apply39(all,changes);
 const linked=model.moves.filter(x=>x.swapKey&&changes.some(y=>y.swapKey===x.swapKey)&&x.group!==group);
 const opts=(a,v)=>a.map(x=>'<option value="'+esc(x)+'" '+(x===v?"selected":"")+'>'+esc(x)+'</option>').join("");
 const order=a=>a.slice().sort((p,q)=>Number(!p.time)-Number(!q.time)||(p.start||0)-(q.start||0)||p.id.localeCompare(q.id));
 const day=(cards,title)=>{const rows=order(cards.filter(q=>q.date===date));return '<div class="compare-day24"><h4>'+title+'</h4>'+(rows.length?rows.map(q=>'<div class="compare-lesson24 '+(changed.has(q.id)?"changed24":"")+'"><strong>'+esc(q.time?clock26(q.start):"—")+'</strong><div><b>'+esc(q.subject)+'</b><small>'+esc(q.time?clock26(q.start)+"–"+clock26(q.end):"Время не установлено")+' · '+esc(q.type||"")+'</small><small>'+esc(q.room||q.roomLabel||"Аудитория не установлена")+'</small>'+(changed.has(q.id)?'<small class="change-label24">Занятие затронуто моделью</small>':"")+'</div></div>').join(""):'<p>Нет наблюдаемых карточек на эту дату.</p>')+'</div>'};
 return '<section class="dayPreview45"><h3>Что изменится в расписании группы?</h3><div class="guideForm45"><label>Группа<select id="previewGroup45">'+opts(groups,group)+'</select></label><label>Дата<select id="previewDate45">'+opts(dates,date)+'</select></label></div><div class="compare-grid24">'+day(all,"Исходное расписание")+day(after,"Предлагаемый вариант")+'</div>'+(linked.length?'<p><b>Связанные назначения:</b> '+linked.map(x=>esc(x.group+" · "+x.oldRoom+" → "+x.newRoom)).join("; ")+'. Весь обмен применяется целиком.</p>':"")+'<p class="muted">Выделены занятия, затронутые выбранной моделью. Если пара перенесена на другую дату, переключите дату, чтобы увидеть её новое назначение.</p></section>';
}

function modelSummary45(r,i,active){
 const counts=r.moves.length,g=r.before.group.windows-r.after.group.windows,span=r.before.group.span-r.after.group.span;
 const kinds=r.moves.reduce((m,x)=>(m[x.kind]=(m[x.kind]||0)+1,m),{});
 return '<article class="choice45 '+(active===i?"chosen45":"")+'"><button class="modelName45" data-pick45="'+i+'" aria-pressed="'+(active===i)+'">'+esc(r.name)+'</button><p class="choiceCount45"><strong>'+counts+'</strong> '+plural45(counts)+'</p><dl><div><dt>Переходы групп</dt><dd>−'+r.groupCross+'</dd></div><div><dt>Переходы преподавателей</dt><dd>−'+r.teacherCross+'</dd></div><div><dt>Окна групп</dt><dd>−'+g+'</dd></div><div><dt>Длительность дней групп</dt><dd>−'+span+' мин</dd></div></dl><p class="muted">Аудитории: '+(kinds.room||0)+' · время: '+(kinds.same||0)+' · дни: '+(kinds.inter||0)+'</p><p class="muted">Обмены двух групп: '+(r.pairCount||0)+' / '+(r.swapCandidates||0)+'; трёх групп: '+(r.cycleCount||0)+' / '+(r.cycleCandidates||0)+'. Выбрано / доступно для поиска.</p>'+(r.cycleSearch?.truncated?'<p class="notice">Поиск тройных обменов ограничен первыми '+r.cycleSearch.limit+' найденными вариантами; рассмотрены не все цепочки.</p>':"")+'<p class="muted">Требуют уточнения карточек: '+r.uncertain+' / '+counts+'; неполные паспорта: '+new Set((r.passport?.unknown||[]).map(x=>x.id)).size+' / '+counts+'.</p></article>';
}
function renderGuide45(){
 const s=sync39(),o=opportunities29,ctx=inter33.context,ready=!!ctx&&ctx.ready.checked===o.data?.checked&&!o.loading;
 const active=s.runs[s.active],busy=o.loading||s.running,select=(id,items,v)=>'<select id="'+id+'">'+items.map(([k,n])=>'<option value="'+esc(k)+'" '+(v===k?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select>';
 const step=(n,title,desc,done)=>'<div class="step45"><span class="stepNum45" aria-hidden="true">'+n+'</span><div><b>'+title+'</b><p>'+desc+'</p></div><span class="stepStatus45">'+(done?"Готово":"")+'</span></div>';
 let h='<section class="panel guide45"><div class="eyebrow23">Быстрый старт</div><h2>Сделать расписание удобнее</h2><p>Сравните действующее расписание с предлагаемыми изменениями. Для начала не нужно знать математические методы.</p><div class="steps45">'+step(1,"Загрузить расписание","83 очные группы института",ready)+step(2,"Выбрать охват","Курс, неделя и режим проверки",ready)+step(3,"Сравнить модели","Результаты и конкретные изменения",!!s.runs.length)+'</div>';
 h+='<div class="source23"><b>Источник</b><p>'+esc(ready?calendarStatus27(o.snapshot):o.loading?"Загружается расписание…":"Исходные данные ещё не загружены.")+'</p><a href="https://eg.timacad.ru/schedule/groups/" target="_blank" rel="noopener">Официальное расписание академии</a></div><div class="row"><button id="guideLoad45" '+(busy?"disabled":"")+' class="'+(!ready?"primary":"")+'">'+(o.loading?"Загрузка…":ready?"Обновить расписание":"Загрузить расписание")+'</button>'+(ready?'<span class="muted">'+ctx.ready.groups.length+' групп · '+ctx.ready.cards.length+' карточек</span>':"")+'</div>';
 if(o.error)h+='<p class="notice" role="alert">'+esc(o.error)+'</p>';
 if(ready){h+='<div class="guideForm45"><label>Какая неделя?'+select("guideWeek45",[["all","Обе"],["upper","Верхняя"],["lower","Нижняя"]],s.week)+'</label><label>Какой курс?'+select("guideCourse45",[["all","Все"],...["1","2","3","4","5"].map(x=>[x,x+" курс"])],s.course)+'</label><label>Максимум изменений'+select("guideLimit45",[...new Set([5,15,30,50,s.limit])].filter(n=>Number.isInteger(n)&&n>=1&&n<=50).sort((a,b)=>a-b).map(n=>[String(n),String(n)]),String(s.limit))+'</label></div><label style="display:block;margin-top:12px"><input id="includeSwaps47" type="checkbox" '+(atomic47.enabled?"checked":"")+'> Учитывать обмены аудиториями между двумя и тремя группами</label><fieldset class="mode45"><legend>Режим проверки</legend><label><input type="radio" name="guideMode45" value="strict" '+(s.strict?"checked":"")+'> <span><b>Осторожный</b><small>Исключает варианты с неясными карточками. Результатов может быть мало.</small></span></label><label><input type="radio" name="guideMode45" value="preview" '+(!s.strict?"checked":"")+'> <span><b>Исследовательский</b><small>Больше альтернатив; непроверенные ресурсы требуют уточнения.</small></span></label></fieldset><div class="row"><button class="primary" id="guideRun45" '+(busy?"disabled":"")+'>'+(s.running?"Выполняется расчёт…":"Сравнить четыре модели")+'</button><button id="guideSettings45">Дополнительные настройки</button><button id="guidePed45">Сложность предметов</button><button id="guideOrder49">Порядок изучения</button></div><p class="muted">Используются текущие параметры комплексной модели. Ни один режим не подтверждает занятость всего вуза или разрешение на перенос.</p>'}
 h+='<p role="status" aria-live="polite">'+esc(s.msg||"")+'</p></section>';
 if(ready&&s.runs.length){h+='<section class="panel" id="guideResults45"><h2>Выберите подходящий вариант</h2><p>Каждая модель — отдельный исследовательский сценарий. Их изменения нельзя складывать без повторной проверки.</p><div class="choiceGrid45">'+s.runs.map((r,i)=>modelSummary45(r,i,s.active)).join("")+'</div>'+(active?'<p><b>Выбрано:</b> '+esc(active.name)+'.</p>'+preview45(ctx,active)+'<div class="row"><button class="primary" id="guideDetails45">Посмотреть конкретные изменения</button><button id="guideExport45">Скачать протокол всех моделей</button></div>':"")+'<p class="notice">Это предложения для согласования, а не новое утверждённое расписание. Если вариантов нет, это не доказывает оптимальность исходного расписания.</p></section>'}
 h+='<section class="panel toolMenu45"><h2>Все инструменты</h2><p>Раскройте нужный раздел. Основной расчёт доступен выше; исследовательские функции сохранены.</p><div class="guideMenu45">'+sections45.map(([id,title,desc],i)=>'<button data-guide45="'+id+'"><b>'+esc(title)+'</b><small>'+esc(desc)+'</small><span aria-hidden="true">Открыть →</span></button>').join("")+'</div></section>';
 h+=sections45.map(([id,title,desc,fn])=>'<details class="groupFold45" data-fold45="'+id+'" id="guideFold45-'+id+'" '+(guide45.opened.has(id)?"open":"")+'><summary><span><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></span></summary><div class="groupBody45">'+fn()+'</div></details>').join("");
 return h;
}
function bindGuide45(){
 const s=sync39();
 document.querySelectorAll("[data-fold45]").forEach(el=>el.addEventListener("toggle",()=>{if(!el.isConnected)return;if(el.open)guide45.opened.add(el.dataset.fold45);else guide45.opened.delete(el.dataset.fold45)}));
 document.querySelectorAll("[data-guide45]").forEach(el=>el.onclick=()=>reveal45(el.dataset.guide45));
 document.querySelectorAll("[data-pick45]").forEach(el=>el.onclick=()=>{s.active=+el.dataset.pick45;render();$("guideResults45")?.scrollIntoView?.({block:"start"})});
 on("guideLoad45","click",()=>loadOpportunities29());
 for(const [id,key] of [["guideWeek45","week"],["guideCourse45","course"],["guideLimit45","limit"]])on(id,"change",e=>{s[key]=key==="limit"?+e.target.value:e.target.value;invalidate39();render()});
 document.querySelectorAll("[name=guideMode45]").forEach(el=>el.onchange=()=>{if(!el.checked)return;s.strict=el.value==="strict";invalidate39();render()});
 on("guideSettings45","click",()=>reveal45("settings"));
 on("guideOrder49","click",()=>revealNode45("order49"));
 on("guidePed45","click",()=>{reveal45("results",false);const d=$("pedDetails39");if(d){multi39.pedOpen=true;d.open=true;d.scrollIntoView?.({block:"start"})}});
 on("guideRun45","click",()=>{const run=$("runMulti39");if(run&&!run.disabled)run.click()});
 on("guideDetails45","click",()=>reveal45("results"));
 on("previewGroup45","change",e=>{guide45.group=e.target.value;guide45.date="";render()});
 on("previewDate45","change",e=>{guide45.date=e.target.value;render()});
 on("guideExport45","click",()=>$("exportMulti39")?.click());
}
