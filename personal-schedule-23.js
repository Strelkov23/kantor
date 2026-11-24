/* 0.23: calendar-first personal timetable, no invented appointments. */
let personal23={group:"",week:"",day:"all",manifest:null,detail:null,loading:false,error:""};
let personalToken23=0;
let advanced23=false,homeChoice23=null;
function renderAdvanced23(){return '<section class="panel advanced23"><button type="button" id="advancedToggle23" aria-expanded="'+advanced23+'" class="foldhead16"><span>Семестровое расписание PDF и исследовательские отчёты</span><span aria-hidden="true">'+(advanced23?"−":"+")+'</span></button>'+(advanced23?renderGroup07():"")+'</section>'}
function restorePersonal23(){
 try{let g=localStorage.getItem("kantor.group.v1");if(instituteCatalog.groups.some(x=>x.id===g))personal23.group=g}catch(e){}
}
function personalOptions23(group){
 return '<option value="">Выберите свою группу</option>'+[1,2,3,4,5].map(c=>'<optgroup label="'+c+' курс">'+instituteCatalog.groups.filter(g=>g.course===c).slice().sort((a,b)=>a.id.localeCompare(b.id,"ru",{numeric:true})).map(g=>'<option value="'+esc(g.id)+'" '+(g.id===group?"selected":"")+'>'+esc(g.id)+'</option>').join("")+'</optgroup>').join("");
}
function personalWeeks23(detail){
 return (detail?.sections||[]).filter(s=>Array.isArray(s.dates)&&s.dates.length).map(s=>({id:s.id,dates:[...new Set(s.dates)].sort()}));
}
function personalDate23(date){let d=new Date(date+"T12:00:00Z");return Number.isFinite(d.getTime())?d.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}):date}
function personalRows23(detail,week,day){
 let dates=new Set(week.dates);
 return detail.comparisons.filter(x=>dates.has(x.calendar.date)&&(day==="all"||x.calendar.date===day)).sort((a,b)=>a.calendar.date.localeCompare(b.calendar.date)||(a.timing.start??1440)-(b.timing.start??1440));
}
async function loadPersonal23(group=personal23.group,targetDate=null){
 let s=personal23,t=++personalToken23;homeChoice23=null;s.group=group;s.detail=null;s.error="";s.week="";s.day="all";s.loading=!!group;
 try{if(group)localStorage.setItem("kantor.group.v1",group);else localStorage.removeItem("kantor.group.v1")}catch(e){}
 render();if(!group)return;
 try{
  let snap=await calendarSnapshot27(),m=snap.manifest;
  if(m.complete!==true||m.groups.length!==83)throw Error("Полный календарный снимок недоступен");
  let g=m.groups.find(x=>x.group===group);
  if(!g||!/^\d+\.json$/.test(g.file))throw Error("Группа не найдена в календарном снимке");
  let d=await calendarFile27(snap,g);
  if(t!==personalToken23)return;
  if(d.group!==group||d.checked!==m.checked||!Array.isArray(d.comparisons)||d.comparisons.length!==g.cards)throw Error("Версии данных не совпадают");
  s.manifest=m;s.snapshot=snap;s.detail=d;
  let weeks=personalWeeks23(d),today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"});
  let chosen=weeks.find(w=>targetDate&&w.dates.includes(targetDate))||weeks.find(w=>w.dates.includes(today))||weeks[0];
  s.week=chosen?.id||"";s.day=chosen?.dates.includes(targetDate)?targetDate:"all";
 }catch(e){if(t!==personalToken23)return;s.error=e.message}
 if(t===personalToken23){s.loading=false;if(visible16("group07"))render()}
}
function renderPersonal23(){
 const s=personal23,d=s.detail,weeks=personalWeeks23(d),w=weeks.find(x=>x.id===s.week)||weeks[0],g=s.manifest?.groups.find(x=>x.group===s.group);
 let rows=d&&w?personalRows23(d,w,s.day):[],today=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"});
 let expired=weeks.length&&today>weeks.at(-1).dates.at(-1);
 return '<section class="panel personal23"><div class="eyebrow23">Студенту и преподавателю</div><h2>Найдите своё расписание</h2><p>Выберите группу — покажем занятия по датам, время, преподавателя и аудиторию из сохранённого официального электронного журнала.</p><div class="row"><label>Учебная группа<select id="personalGroup23">'+personalOptions23(s.group)+'</select></label><button id="personalLoad23" class="primary" '+(!s.group||s.loading?'disabled':'')+'>'+(s.loading?"Загрузка…":"Загрузить расписание")+'</button><a href="https://eg.timacad.ru/schedule/groups/" target="_blank" rel="noopener">Открыть официальный журнал</a></div><p role="status">'+esc(s.error)+'</p>'+(d&&w?'<div class="source23"><b>Сохранённый снимок, не онлайн-расписание</b><p>'+esc(calendarStatus27(s.snapshot))+' '+(expired?'Даты снимка уже прошли. ':'')+'Для замен и отмен проверяйте <a href="'+esc(g.url)+'" target="_blank" rel="noopener">официальное расписание группы</a>.</p></div><div class="row"><label>Неделя<select id="personalWeek23">'+weeks.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===w.id?'selected':'')+'>'+esc(x.dates[0]+' — '+x.dates.at(-1))+'</option>').join("")+'</select></label><label>День<select id="personalDay23"><option value="all" '+(s.day==="all"?"selected":"")+'>Вся неделя</option>'+w.dates.map(date=>'<option value="'+esc(date)+'" '+(s.day===date?'selected':'')+'>'+esc(personalDate23(date))+'</option>').join("")+'</select></label><button id="personalCSV23">Скачать CSV</button></div><p class="muted">Показано '+rows.length+' карточек. Одновременные карточки могут относиться к разным подгруппам; состав уточняйте у преподавателя.</p><div class="personal-days23">'+w.dates.filter(date=>s.day==="all"||date===s.day).map(date=>{let a=rows.filter(x=>x.calendar.date===date);return '<section class="personal-day23"><h3>'+esc(personalDate23(date))+(date===today?' · сегодня':'')+'</h3>'+(a.length?a.map(x=>{let c=x.calendar;return '<article class="personal-lesson23"><div class="personal-time23">'+esc(c.time||"Время не указано")+'</div><div><small>'+esc(c.type||"Вид не указан")+'</small><b>'+esc(c.subject||"Дисциплина не указана")+'</b><span>'+esc(c.teachers||"Преподаватель не указан")+'</span><span class="personal-room23">'+esc(c.rooms||"Аудитория не указана")+'</span><details><summary>Подробнее об источнике</summary><p>'+esc(x.pdfRaw||"Нет сопоставленной записи PDF")+'</p><p>'+esc(x.status==="text-and-room-match"?"Текст и аудитория совпали с PDF":"Требуется сверка с PDF")+'</p></details></div></article>'}).join(""):'<p class="muted">В снимке нет карточек на этот день.</p>')+'</section>'}).join("")+'</div>':'<p class="muted">Группа запоминается только в этом браузере. Семестровые таблицы PDF и отчёты расположены ниже.</p>')+'</section>';
}
function bindPersonal23(){
 on("advancedToggle23","click",()=>{advanced23=!advanced23;if(advanced23&&!group07.data&&group07.status!=="loading")loadGroup07();else render()});
 on("personalGroup23","change",e=>loadPersonal23(e.target.value));
 on("personalLoad23","click",()=>loadPersonal23());
 on("personalWeek23","change",e=>{personal23.week=e.target.value;personal23.day="all";render()});
 on("personalDay23","change",e=>{personal23.day=e.target.value;render()});
 on("personalCSV23","click",()=>{let d=personal23.detail,w=personalWeeks23(d).find(x=>x.id===personal23.week);if(!d||!w)return;let rows=[["Группа","Дата","Время","Дисциплина","Вид","Преподаватель","Аудитория","Снимок","Источник"],...personalRows23(d,w,personal23.day).map(x=>{let c=x.calendar;return [d.group,c.date,c.time,c.subject,c.type,c.teachers,c.rooms,d.checked,d.url]})];download("kantor-personal-schedule.csv","\ufeff"+rows.map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
