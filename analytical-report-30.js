/* 0.30: reproducible analytical note for the same snapshot and selected package. */
let report30={data:null,error:""};
function reportData30(snap,files,aliases,ready,screen){
 const m=snap.manifest;
 if(ready.checked!==m.checked||screen.checked!==m.checked)throw Error("Разные снимки");
 const groups=aggregateDiag25(m,files,instituteCatalog),resources=resourceAggregate26(m,files,instituteCatalog),spatial=spatialReport28(m,files,instituteCatalog,aliases),disciplines=disciplineAggregate28(m,files,instituteCatalog);
 const t=groups.totals,st=spatial.strict.totals;
 if(t.cards!==ready.totals.cards||t.cards!==resources.total||t.cards!==st.cards||t.cards!==disciplines.totals.cards||t.blocks!==st.blocks||t.activeDays!==st.days)throw Error("Разные итоги диагностических модулей");
 const short=spatial.strict.routes.reduce((n,r)=>n+Object.entries(r.gaps).reduce((k,[g,v])=>k+(+g<=20?v:0),0),0);
 const res=kind=>({recognizedLabels:resources[kind].length,covered:resources.coverage[kind],excluded:t.cards-resources.coverage[kind],overlapPairs:resources[kind].reduce((n,r)=>n+r.pairs,0)});
 return {checked:m.checked,firstDate:groups.firstDate,lastDate:groups.lastDate,source:snap.source,groupCount:m.groups.length,groups:t,courses:groups.courses,topWindows:groups.groups.filter(g=>g.windows>0).slice().sort((a,b)=>b.windows-a.windows||a.group.localeCompare(b.group,"ru")).slice(0,10).map(g=>({group:g.group,course:g.course,windows:g.windows,windowDays:g.windowDays,activeDays:g.activeDays})),teachers:res("teachers"),rooms:res("rooms"),spatial:{...st,short,top:spatial.strict.routes.slice(0,8)},disciplines:disciplines.totals,readiness:ready.totals,screen:{attempts:screen.attempts,independent:screen.results.length,groups:Object.values(screen.groupCounts).filter(x=>x>0).length}};
}
function prepareReport30(snap,files,aliases,ready,screen){
 report30.data=null;report30.error="";
 try{report30.data=reportData30(snap,files,aliases,ready,screen)}catch(e){report30.error=e.message}
}
function reportContent30(d,p){
 const t=d.groups,s=d.spatial,rt=d.readiness,per=(a,b)=>b?(100*a/b).toFixed(1)+"%":"—";
 const table=(headers,rows)=>'<div class="scroll"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
 let html='<h2>Аналитическая записка: организация учебного процесса</h2><p>Институт экономики и управления АПК · очный бакалавриат и специалитет · '+d.groupCount+' группы. Календарные даты: '+esc(d.firstDate)+" — "+esc(d.lastDate)+'. Снимок: '+esc(d.checked)+' · '+esc(d.source==="current"?"автоматически полученный пакет":"резервный исторический снимок")+'.</p><h3>1. Текущее состояние</h3>'+table(["Показатель","Значение","Интерпретация"],[
 ["Карточки занятий",t.cards,"Не число уникальных занятий или студентов"],
 ["Активные группо-дни",t.activeDays,"Период наблюдения"],
 ["Полные окна",t.windows,"95-минутные стандартные интервалы"],
 ["Дни с окнами",t.windowDays+" / "+t.usableDays+" ("+per(t.windowDays,t.usableDays)+")","Доля проверяемых дней"],
 ["Дни от 6 часов",t.longDays+" / "+t.usableDays+" ("+per(t.longDays,t.usableDays)+")","Аналитический порог, не норматив"],
 ["Дни с одним блоком",t.oneBlockDays,"Повод проверить возможность компактного графика"],
 ["Дни с неизвестным временем",t.unusableDays,"Не включены во временные показатели"],
 ["Однозначные метки преподавателей",d.teachers.recognizedLabels,d.teachers.covered+" из "+t.cards+" карточек"],
 ["Однозначные аудитории",d.rooms.recognizedLabels,d.rooms.covered+" из "+t.cards+" карточек"],
 ["Кандидаты пересечений ресурсов",d.teachers.overlapPairs+" / "+d.rooms.overlapPairs,"Преподаватели / аудитории; не доказанные конфликты"],
 ["Межкорпусные переходы",s.cross,"По строгой классификации"],
 ["Межкорпусные интервалы до 20 мин",s.short+" / "+s.cross+" ("+per(s.short,s.cross)+")","Не доказательство опоздания"],
 ["Переходы с неизвестной локацией",s.unknown+" / "+s.transitions,"Требуют уточнения"],
 ["Комбинации группа × дисциплина с практикой раньше первой видимой лекции",d.disciplines.practiceFirst+" / "+d.disciplines.sequenceEligible,"Не нарушение; предыдущие темы неизвестны"]
 ])+'<h3>2. Приоритеты для проверки</h3><p>Сначала проверить группы с наибольшим числом полных окон; затем наиболее частые короткие переходы и неоднозначные назначения ресурсов. При сравнении курсов использовать относительные показатели, а не только абсолютные числа.</p>'+table(["Курс","Группы","Проверяемые дни","Окон","Дни ≥6 ч","Окон на 100 дней"],d.courses.map(c=>[c.course,c.groups,c.usableDays,c.windows,c.longDays,c.usableDays?(100*c.windows/c.usableDays).toFixed(1):"—"]))+table(["Группа","Окна","Дни с окнами","Активные дни"],d.topWindows.map(g=>[g.group,g.windows,g.windowDays,g.activeDays]))+table(["Направление","Переходы","Мин. интервал, мин"],s.top.map(r=>[r.from+" → "+r.to,r.count,r.minimum]))+'<h3>3. Возможности изменения</h3><p>Первично пригодны '+rt.eligible+' из '+rt.cards+' карточек. Проверено '+d.screen.attempts+' вариантов времени; найдено '+d.screen.independent+' отдельных предложений в '+d.screen.groups+' группах. Причины непригодности пересекаются, поэтому не суммируются.</p>';
 if(p)html+='<p>Выбран пакет: '+esc(p.name)+'. '+p.moves.length+' совместимых переносов, устраняется '+p.windows+' полных окон, сокращается суммарная длительность группо-дней на '+p.spanMinutes+' минут. '+p.unresolvedMoves+' переносов имеют остаточную неопределённость по карточкам в интервалах. Это не индивидуальные человеко-минуты и не гарантированный эффект внедрения.</p>'+table(["Показатель","До","После"],[["Окна групп",p.before.group.windows,p.after.group.windows],["Длительность группо-дней, мин",p.before.group.span,p.after.group.span],["Окна преподавателей",p.before.teacher.windows,p.after.teacher.windows],["Длительность дней преподавателей, мин",p.before.teacher.span,p.after.teacher.span]])+table(["Группа","Дата","Дисциплина","Было → стало","Аудитория","Карточки, требующие уточнения"],p.moves.map(x=>[x.group,x.date,x.subject,clock26(x.oldStart)+" → "+clock26(x.newStart),x.room,x.unresolved]));
 else html+='<p>Совместимый пакет не рассчитан; эффекты отдельных предложений не суммируются.</p>';
 return html+'<h3>4. Предложения для администрации</h3><ol><li>Сверить исходные карточки предложенных переносов, участников потоков и подгрупп, занятость преподавателей и аудиторий вне института.</li><li>Подтвердить вместимость, оборудование и доступность помещений; измерить приоритетные маршруты от входа до входа.</li><li>Проверить учебную последовательность, доступность студентов и преподавателей, локальные нормы, перерывы для питания.</li><li>Согласовать и повторно проверить единый пакет на полном расписании академии перед экспериментальным внедрением.</li></ol><h3>5. Методические ограничения</h3><p>Источник: публичный электронный журнал академии, семестровые PDF используются отдельно. Снимок не отражает последующие замены. Групповые пересечения объединяются для временного анализа; совпадающие карточки не подтверждают единый поток. Полные ФИО являются метками, не идентификаторами людей. Порог 6 часов, 20 минут и запас 15 минут — аналитические параметры. Нет полных сведений о внешней занятости и индивидуальных маршрутах. Пакет — результат ограниченного жадного поиска, не доказательство оптимальности.</p><p><a href="https://eg.timacad.ru/schedule/groups/">Официальный электронный журнал</a> · <a href="https://github.com/Strelkov23/kantor">Методика и исходный код КАНТОРА</a></p>';
}
function renderReport30(){
 const s=opportunities29,d=report30.data;
 if(!s.data)return "";
 if(!d||d.checked!==s.data.checked)return '<section class="panel"><h2>Аналитическое заключение</h2><p role="status">'+esc(report30.error||"Нет согласованного снимка.")+'</p></section>';
 const p=joint30.checked===d.checked?selectedJoint30():null;
 return '<section class="panel"><div class="row"><h2>Аналитическое заключение для администрации</h2><button id="reportHTML30">Скачать записку HTML для печати</button><button id="reportJSON30">Данные JSON</button></div><p class="muted">Отчёт формируется по тому же снимку и выбранному пакету, без смешивания дат. HTML можно открыть в браузере и распечатать или сохранить в PDF.</p><details><summary>Открыть аналитическую записку</summary><div class="report-body30">'+reportContent30(d,p)+'</div></details></section>';
}
function bindReport30(){
 on("reportHTML30","click",()=>{const d=report30.data;if(!d)return;const p=joint30.checked===d.checked?selectedJoint30():null;const body=reportContent30(d,p);
 download("kantor-analytical-note.html",'<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>КАНТОР · аналитическая записка</title><style>body{font:15px/1.55 system-ui,sans-serif;color:#183247;max-width:1000px;margin:32px auto;padding:0 18px}h2,h3{color:#174e55}table{border-collapse:collapse;width:100%;margin:12px 0 22px}th,td{border:1px solid #cbd5dc;padding:8px;vertical-align:top;text-align:left;overflow-wrap:anywhere}th{background:#eef5f5}.scroll{overflow:auto}@media print{body{font-size:11pt;margin:0}thead{display:table-header-group}tr{break-inside:avoid}h3{break-after:avoid}.scroll{overflow:visible}}</style><main>'+body+'</main></html>',"text/html;charset=utf-8")});
 on("reportJSON30","click",()=>{const d=report30.data;if(d)download("kantor-analytical-note.json",JSON.stringify({version:"0.30",status:"research-review",diagnostics:d,plan:joint30.checked===d.checked?selectedJoint30():null},null,2),"application/json")});
}
