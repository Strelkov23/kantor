/* 0.26: observed teacher labels and rooms; exact signatures are candidates, not certified sessions. */
let analysisView26="groups";
let resourceDiag26={data:null,error:"",mode:"teachers",filter:"",sort:"minutes",selected:""};
const norm26=v=>String(v??"").trim().replace(/\s+/gu," ");
const key26=v=>norm26(v).toLocaleLowerCase("ru");
function teacherClass26(raw){
 const p=[...new Set(String(raw??"").split(";").map(norm26).filter(Boolean))];
 if(p.length!==1)return {reason:p.length?"multiple":"missing"};
 const s=p[0];
 if(!/^[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?(?: [А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?){2}$/u.test(s))return {reason:"unresolved"};
 return {id:key26(s),name:s};
}
function resourceAggregate26(manifest,files,catalog){
 if(manifest.complete!==true||manifest.groups.length!==83||files.length!==83||new Set(manifest.groups.map(g=>g.group)).size!==83||manifest.groups.some(g=>!catalog.groups.some(c=>c.id===g.group)))throw Error("Нужен полный снимок 83 групп");
 const maps={teachers:new Map(),rooms:new Map()},unknown={teachers:{},rooms:{}},coverage={teachers:0,rooms:0};let total=0;
 function add(kind,id,name,group,x){
   let a=maps[kind].get(id);
   if(!a){a={id,name,cards:0,groups:new Set(),sessions:new Map()};maps[kind].set(id,a)}
   a.cards++;a.groups.add(group);
   const c=x.calendar,t=x.timing;
   const signature=JSON.stringify([c.date,t.start,t.end,key26(c.subject),key26(c.type),key26(c.teachers),key26(c.rooms)]);
   let q=a.sessions.get(signature);
   if(!q){q={date:c.date,start:t.start,end:t.end,subject:norm26(c.subject),type:norm26(c.type),teachers:norm26(c.teachers),rooms:norm26(c.rooms),groups:new Set(),cards:0};a.sessions.set(signature,q)}
   q.cards++;q.groups.add(group);coverage[kind]++;
 }
 function miss(kind,reason){unknown[kind][reason]=(unknown[kind][reason]||0)+1}
 for(let i=0;i<files.length;i++){
   const g=manifest.groups[i],f=files[i];
   if(f.checked!==manifest.checked||f.group!==g.group||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок "+g.group);
   for(const x of f.comparisons){
     total++;const c=x.calendar,t=x.timing;
     if(!validTime25(t)||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)){miss("teachers","time");miss("rooms","time");continue}
     const a=teacherClass26(c.teachers),b=roomClass18(norm26(c.rooms),catalog.buildings);
     if(a.id)add("teachers",a.id,a.name,g.group,x);else miss("teachers",a.reason);
     if(b.room)add("rooms",b.room,b.room,g.group,x);else miss("rooms",b.reason);
   }
 }
 if(total!==manifest.totals.cards)throw Error("Несовпадение числа карточек");
 function summarize(a){
   let sessions=[...a.sessions.values()].map(x=>({...x,groups:[...x.groups].sort()})).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start||a.end-b.end||a.subject.localeCompare(b.subject));
   const dates=new Map();for(const q of sessions){if(!dates.has(q.date))dates.set(q.date,[]);dates.get(q.date).push(q)}
   let minutes=0,windows=0,days=0,span=0,overlapDays=0,pairs=0,examples=[];
   for(const [date,list] of dates){
      const m=dayMetrics25(list.map(x=>({timing:{start:x.start,end:x.end}})),date);
      minutes+=m.lessonMinutes;windows+=m.windows;days++;span+=m.span;
      let n=0;
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length&&list[j].start<list[i].end;j++){
        n++;if(examples.length<20)examples.push({a:list[i],b:list[j]});
      }
      if(n)overlapDays++;pairs+=n;
   }
   return {id:a.id,name:a.name,cards:a.cards,groups:a.groups.size,signatures:sessions.length,mergedCards:a.cards-sessions.length,minutes,windows,days,span,overlapDays,pairs,examples,sessions};
 }
 let result={checked:manifest.checked,total,coverage,unknown};
 for(const kind of ["teachers","rooms"]){
   if(coverage[kind]+Object.values(unknown[kind]).reduce((a,b)=>a+b,0)!==total)throw Error("Нарушен баланс ресурса "+kind);
   result[kind]=[...maps[kind].values()].map(summarize).sort((a,b)=>b.minutes-a.minutes||a.name.localeCompare(b.name,"ru"));
 }
 return result;
}
function resourceRows26(){
 const s=resourceDiag26;
 return (s.data?.[s.mode]||[]).filter(r=>key26(r.name).includes(key26(s.filter))).slice().sort((a,b)=>b[s.sort]-a[s.sort]||a.name.localeCompare(b.name,"ru"));
}
function clock26(n){return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function renderAnalysis26(){
 const views=[["groups","Учебные группы"],["teachers","Преподаватели"],["rooms","Аудитории"],["pdf","Семестровые PDF"]];
 return '<section class="panel"><h2>Анализ текущего расписания</h2><p>Выберите объект анализа. Показатели основаны на сохранённом снимке, а не на полном расписании всех подразделений вуза.</p><div class="row analysis-tabs26" aria-label="Объект анализа">'+views.map(([v,n])=>'<button type="button" data-analysis26="'+v+'" aria-pressed="'+(analysisView26===v)+'" class="'+(analysisView26===v?"primary":"")+'">'+n+'</button>').join("")+'</div></section>'+(analysisView26==="groups"?renderDiag25():analysisView26==="pdf"?renderBaseline09():renderResource26());
}
function renderResource26(){
 const s=resourceDiag26,d=s.data,kind=s.mode,isTeacher=kind==="teachers",label=isTeacher?"преподаватели":"аудитории";
 let html='<section class="panel"><h2>Нагрузка преподавателей и использование аудиторий</h2><p>Учёт только занятий 83 очных групп института. Не полная нагрузка преподавателей и не полный график занятости помещений академии. Одинаковые карточки общего потока сворачиваются в одну наблюдаемую сигнатуру по дате, времени, дисциплине, виду, преподавателю и аудитории.</p>';
 if(!d)return html+'<p role="status">'+esc(s.error||(diag25.loading?"Загрузка календарных данных…":"Для расчёта требуется полный снимок."))+'</p><button id="loadResource26" class="primary" '+(diag25.loading?"disabled":"")+'>Загрузить и проанализировать</button></section>';
 let rows=resourceRows26(),all=d[kind],sel=rows.find(r=>r.id===s.selected);
 let metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+esc(v)+'</strong></div>';
 let totals=all.reduce((a,r)=>({signatures:a.signatures+r.signatures,merged:a.merged+r.mergedCards,minutes:a.minutes+r.minutes,pairs:a.pairs+r.pairs}),{signatures:0,merged:0,minutes:0,pairs:0});
 let reasons={multiple:"Несколько обозначений",missing:"Отсутствует",unresolved:"Не распознано однозначно",time:"Неизвестное время"};
 return html+'<div class="source23"><b>'+esc(calendarStatus27(diag25.snapshot))+'</b><p>Для преподавателей учитываются только одиночные записи полного ФИО; инициалы и составные записи не склеиваются с полными именами. Совпадение ФИО не гарантирует идентичность человека. Для аудиторий — только однозначные номера по строгому справочнику.</p></div><div class="row"><label>Ресурс<select id="resourceMode26"><option value="teachers" '+(isTeacher?"selected":"")+'>Преподаватели</option><option value="rooms" '+(!isTeacher?"selected":"")+'>Аудитории</option></select></label><label>Поиск<input id="resourceFilter26" value="'+esc(s.filter)+'" placeholder="'+(isTeacher?"Фамилия":"02-108")+'"></label><label>Сортировка<select id="resourceSort26">'+[["minutes","Наблюдаемое время"],["windows","Полные окна"],["pairs","Пересечения сигнатур"],["days","Дни с занятиями"]].map(([v,n])=>'<option value="'+v+'" '+(s.sort===v?"selected":"")+'>'+n+'</option>').join("")+'</select></label><button id="exportResource26">CSV ресурсов</button></div><div class="grid">'+metric("Распознанные "+label,all.length)+metric("Охвачено карточек",d.coverage[kind]+" / "+d.total)+metric("Совпавшие повторные карточки",totals.merged)+metric("Пары пересекающихся сигнатур",totals.pairs)+'</div><p class="muted">Исключено: '+esc(Object.entries(d.unknown[kind]).map(([k,n])=>(reasons[k]||k)+": "+n).join("; ")||"0")+'. Пересечение — повод для сверки, не доказанная двойная занятость. Наблюдаемое время — объединение интервалов, без двойного счёта.</p><h3>Первые 10 по выбранной сортировке</h3>'+chartRows12(rows.slice(0,10).map(r=>[r.name,s.sort==="minutes"?Math.round(r.minutes/60*10)/10:r[s.sort]]))+'<p class="muted">'+(s.sort==="minutes"?"Часы наблюдаемого времени.":s.sort==="windows"?"Полные пустые интервалы между известными блоками; могут быть заняты другими группами.":"Число наблюдений.")+'</p><div class="scroll"><table><tr><th>Ресурс</th><th>Карточки</th><th>Сигнатуры</th><th>Дни</th><th>Часы</th><th>Наблюдаемые окна</th><th>Пересечения</th></tr>'+rows.map(r=>'<tr><td><button data-resource26="'+esc(r.id)+'">'+esc(r.name)+'</button></td><td>'+r.cards+'</td><td>'+r.signatures+'</td><td>'+r.days+'</td><td>'+fmt(r.minutes/60)+'</td><td>'+r.windows+'</td><td>'+r.pairs+'</td></tr>').join("")+'</table></div>'+(sel?'<section class="panel" id="resourceDetail26"><h3>'+esc(sel.name)+' · наблюдаемые занятия</h3><p>Групп: '+sel.groups+'; '+sel.signatures+' различных сигнатур. '+sel.overlapDays+' дней с пересечениями; показаны до 20 пар для проверки.</p>'+ (sel.examples.length?'<details open><summary>Кандидаты пересечений</summary>'+sel.examples.map(({a,b})=>'<p>'+esc(a.date+" "+clock26(a.start)+"–"+clock26(a.end)+" "+a.subject+" ("+a.groups.join(", ")+")")+'<br>'+esc(b.date+" "+clock26(b.start)+"–"+clock26(b.end)+" "+b.subject+" ("+b.groups.join(", ")+")")+'</p>').join("")+'</details>':"")+'<div class="scroll"><table><tr><th>Дата</th><th>Время</th><th>Дисциплина</th><th>Группы</th><th>Преподаватель</th><th>Аудитория</th></tr>'+sel.sessions.map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+clock26(r.start)+'–'+clock26(r.end)+'</td><td>'+esc(r.subject)+'</td><td>'+r.groups.map(g=>'<button data-resource-group26="'+esc(g)+'" data-resource-date26="'+esc(r.date)+'">'+esc(g)+'</button>').join(" ")+'</td><td>'+esc(r.teachers)+'</td><td>'+esc(r.rooms)+'</td></tr>').join("")+'</table></div></section>':"")+'<p class="muted">Занятия других институтов, индивидуальные консультации, научная работа и неучтённые помещения могут отсутствовать. Свободные интервалы не подтверждают доступность для переноса.</p></section>';
}
function bindResource26(){
 document.querySelectorAll("[data-analysis26]").forEach(b=>b.onclick=()=>{analysisView26=b.dataset.analysis26;if(analysisView26==="teachers"||analysisView26==="rooms"){resourceDiag26.mode=analysisView26;resourceDiag26.selected="";resourceDiag26.filter=""}render();if(analysisView26==="pdf"&&!baselineState09.data&&!baselineState09.loading)loadBaseline09();else if(analysisView26!=="pdf"&&!diag25.data&&!diag25.loading)loadDiag25()});
 on("loadResource26","click",loadDiag25);
 for(const [id,k] of [["resourceMode26","mode"],["resourceSort26","sort"],["resourceFilter26","filter"]])on(id,"change",e=>{resourceDiag26[k]=e.target.value;if(k==="mode"){analysisView26=e.target.value;resourceDiag26.selected="";resourceDiag26.filter=""}render()});
 document.querySelectorAll("[data-resource26]").forEach(b=>b.onclick=()=>{resourceDiag26.selected=b.dataset.resource26;render();$("resourceDetail26")?.scrollIntoView?.({block:"start",behavior:"instant"})});
 document.querySelectorAll("[data-resource-group26]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.resourceGroup26,b.dataset.resourceDate26)});
 on("exportResource26","click",()=>{let cols=["name","cards","signatures","mergedCards","groups","days","minutes","span","windows","overlapDays","pairs"];let rows=[...resourceRows26()];download("kantor-observed-"+resourceDiag26.mode+".csv","\ufeff"+[[...cols,"snapshot"],...rows.map(r=>[...cols.map(k=>r[k]),resourceDiag26.data.checked])].map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
