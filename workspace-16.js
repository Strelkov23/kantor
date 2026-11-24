/* v0.16: merged task workspaces. Legacy tools are retained as expandable sections. */
const workspaces16=[
 {id:"home12",section:"home",title:"Главная",description:"Выберите задачу и начните работу.",tools:[]},
 {id:"group07",section:"study",title:"Группы и расписание",description:"Выберите группу и день. Семестровые таблицы и исследовательские отчёты доступны ниже.",tools:[["programs10","Направления, профили и календарный пилот"],["groups","Полный каталог очных групп"],["scope04","Другие формы и уровни обучения"]]},
 {id:"calendar11",section:"study",title:"Сверка с первоисточниками",description:"Сравнивайте календарные назначения и семестровые документы, не смешивая их.",tools:[["source07","Официальные PDF и извлечённые таблицы"]]},
 {id:"space12",section:"space",title:"Карта и переходы",description:"Ориентация в кампусе, частота переходов и доступные интервалы на одной странице.",tools:[["campus13","Официальная карта, паспорта корпусов и расчёт интервалов"]]},
 {id:"survey15",section:"space",title:"Измерение маршрутов",description:"От приоритетных направлений до журнала замеров и матрицы решателя.",tools:[["routes04","Матрица времени переходов"],["priority06","Источники и приоритеты пилота"],["campus","Справочник корпусов и пилотный переход"]]},
 {id:"scenarios",section:"opt",title:"Варианты и вычислители",description:"Посмотрите, как можно сократить окна и переходы. Пока расчёт на реальных данных ограничен двумя группами пятого курса.",tools:[["unified04","Расширенная настройка модели"],["exact05","Точный расчёт и проверка результата"]]},
 {id:"baseline09",section:"research",title:"Состояние расписания",description:"Диагностика окон, нагрузки, длинных дней и других особенностей по датам; ниже — расчёт по семестровым PDF и научные инструменты.",tools:[["experiment06","Результаты вычислительных экспериментов"],["audit","Критерии и качество данных"]]},
 {id:"review08",section:"research",title:"Проверка данных",description:"Единое место для семантической проверки, исходных записей и журнала решений.",tools:[["review05","Первичный структурный разбор"],["source1","Ручная сверка первого курса"]]},
 {id:"overview",section:"demo",title:"Результаты демо",description:"Условный набор данных, не расписание академии.",tools:[["schedule","Просмотр расписания демо"],["checks","Проверка ограничений демо"]]},
 {id:"optimize",section:"demo",title:"Настройка демо",description:"Учебная настройка расчёта и импорт условной модели.",tools:[["data","Исходные данные и импорт"],["method","Методология демонстрации"]]}
];
const mainSections16=[["home","Главная"],["study","Расписание"],["space","Кампус"],["opt","Улучшить расписание"],["research","Анализ расписания"],["demo","Попробовать демо"]];
const opened16=new Set();
function workspace16(id=tab){return workspaces16.find(w=>w.id===id||w.tools.some(t=>t[0]===id))||workspaces16[0]}
function visible16(id){let w=workspace16();return w.id===id||w.tools.some(t=>t[0]===id)&&(opened16.has(id)||tab===id)}
function navigation16(){
 let w=workspace16(),btn=(id,title,active)=>'<button data-tab="'+esc(id)+'" class="'+(active?"active":"")+'" '+(active?'aria-current="page"':"")+'>'+esc(title)+'</button>';
 let others=workspaces16.filter(x=>x.section===w.section);
 return '<div class="nav-main12" aria-label="Основные разделы">'+mainSections16.map(([id,n])=>btn(workspaces16.find(x=>x.section===id).id,n,w.section===id)).join("")+'</div>'+(others.length>1?'<div class="nav-sub12" aria-label="Рабочие страницы">'+others.map(x=>btn(x.id,x.title,x.id===w.id)).join("")+'</div>':"");
}
function renderWorkspace16(){
 let w=workspace16(),heading=w.id==="home12"?"":'<div class="workspace16"><div class="breadcrumb16">'+esc(mainSections16.find(x=>x[0]===w.section)[1])+' / '+esc(w.title)+'</div><h2>'+esc(w.title)+'</h2><p>'+esc(w.description)+'</p>'+(w.tools.length?'<div class="workspace-links16">'+w.tools.map(([id,n])=>'<button class="tooljump16" data-tool16="'+id+'" aria-expanded="'+visible16(id)+'">'+(visible16(id)?"− ":"+ ")+esc(n)+'</button>').join("")+'</div>':"")+'</div>';
 return heading+'<div id="tool16-'+w.id+'">'+renderLegacyBody16(w.id)+'</div>'+w.tools.map(([id,n])=>'<section class="fold16" id="tool16-'+id+'"><button type="button" class="foldhead16" data-tool16="'+id+'" aria-expanded="'+visible16(id)+'"><span>'+esc(n)+'</span><span aria-hidden="true">'+(visible16(id)?"−":"+")+'</span></button>'+(visible16(id)?'<div class="foldbody16">'+renderLegacyBody16(id)+'</div>':'<p class="foldhint16">Открыть инструмент на этой странице</p>')+'</section>').join("");
}
function activate16(id,scroll=false){
 let w=workspace16(id);if(id!==w.id)opened16.add(id);
 tab=id;render();
 // Reopening a workspace must also load its previously expanded children.
 if(visible16("group07")&&personal23.group&&!personal23.detail&&!personal23.loading)loadPersonal23();
 if(visible16("group07")&&advanced23&&!group07.data&&group07.status!=="loading")loadGroup07();
 if(["home12","space12"].includes(w.id)&&!visual12.baseline&&!visual12.loading)loadVisual12();
 if(visible16("programs10")&&!programs10.data&&!programs10.loading)loadPrograms10();
 if(visible16("calendar11")&&!calendar11.data&&!calendar11.loading)load11();
 if(visible16("survey15")&&!survey15.baseline&&!survey15.loading)loadSurvey15();
 if(visible16("baseline09")&&!diag25.data&&!diag25.loading)loadDiag25();
 if(visible16("baseline09")&&!baselineState09.data&&!baselineState09.loading)loadBaseline09();
 if(scroll&&id!==w.id){let node=$("tool16-"+id);if(node&&node.scrollIntoView)node.scrollIntoView({block:"start"})}
}
function bindWorkspace16(){
 document.querySelectorAll("[data-tool16]").forEach(b=>b.onclick=()=>{let id=b.dataset.tool16;if(visible16(id)){opened16.delete(id);if(tab===id)tab=workspace16(id).id;render()}else activate16(id,true)});
}
