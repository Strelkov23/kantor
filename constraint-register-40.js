/* 0.40: dated user-supplied resource constraints. */
const kinds40=["groups","teachers","rooms","subjects"];
const empty40=checked=>({version:"0.40",checked,groups:[],teachers:[],rooms:[],subjects:[]});
const subject40=(g,s)=>JSON.stringify([g,key26(s)]);
const schema40={
 groups:{size:[1,10000],maxPairs:[1,20],minBreak:[0,180],earliest:[0,1440],latest:[0,1440],lunchStart:[0,1440],lunchEnd:[0,1440],lunchMinutes:[1,180],accessible:"bool"},
 teachers:{maxPairs:[1,20],minBreak:[0,180],earliest:[0,1440],latest:[0,1440],lunchStart:[0,1440],lunchEnd:[0,1440],lunchMinutes:[1,180]},
 rooms:{capacity:[1,10000],floor:[-5,50],equipment:"tags",accessible:"bool"},
 subjects:{equipment:"tags"}
};
function catalog40(ctx){
 const c={groups:new Map(ctx.ready.groups.map(x=>[x.group,x.group])),teachers:new Map(),rooms:new Map(),subjects:new Map()};
 for(const q of ctx.ready.cards){if(q.teacher)c.teachers.set(q.teacher,q.teacherName);if(q.room)c.rooms.set(q.roomKey,q.room);if(q.subject)c.subjects.set(subject40(q.group,q.subject),q.group+" · "+q.subject)}
 return c;
}
const validDate40=d=>typeof d==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
function validate40(raw,ctx){
 if(!raw||raw.version!=="0.40"||raw.checked!==ctx.ready.checked)throw Error("Паспорт относится к другому снимку или версии");
 const out=empty40(raw.checked),cat=catalog40(ctx),dates=new Set(ctx.ready.cards.map(q=>q.date));
 for(const kind of kinds40){
  if(!Array.isArray(raw[kind])||raw[kind].length>cat[kind].size)throw Error("Некорректный список: "+kind);
  const seen=new Set();
  for(const x of raw[kind]){
   if(!x||!cat[kind].has(x.id)||seen.has(x.id)||typeof x.source!=="string"||!x.source.trim()||x.source.length>300||!validDate40(x.verified))throw Error("Требуются известный ресурс, источник и дата: "+kind);
   seen.add(x.id);const q={id:x.id,source:x.source.trim(),verified:x.verified};
   for(const [key,spec] of Object.entries(schema40[kind])){
    const v=x[key];if(v===null||v===undefined)continue;
    if(spec==="bool"){if(typeof v!=="boolean")throw Error(key);q[key]=v}
    else if(spec==="tags"){if(!Array.isArray(v)||v.length>30||v.some(t=>typeof t!=="string"||!t.trim()||t.length>80))throw Error(key);q[key]=[...new Set(v.map(key26))]}
    else {if(!Number.isInteger(v)||v<spec[0]||v>spec[1])throw Error(key);q[key]=v}
   }
   if(q.earliest!==undefined&&q.latest!==undefined&&q.earliest>=q.latest)throw Error("Начало позже конца");
   const lunch=[q.lunchStart,q.lunchEnd,q.lunchMinutes];if(lunch.some(v=>v!==undefined)&&(lunch.some(v=>v===undefined)||q.lunchEnd-q.lunchStart<q.lunchMinutes))throw Error("Заполните все три поля обеда; окно должно вмещать перерыв");
   if(kind!=="subjects"){
    if(!Array.isArray(x.blocked)||x.blocked.length>200)throw Error("Некорректный список недоступности");
    q.blocked=x.blocked.map(b=>{if(!b||!dates.has(b.date)||!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<0||b.end>1440||b.start>=b.end)throw Error("Неверный интервал недоступности");return {date:b.date,start:b.start,end:b.end}});
   }
   out[kind].push(q);
  }
 }
 return out;
}
function freeGap40(list,start,end){
 let cursor=start,max=0;
 for(const q of sorted29(list)){if(q.end<=start||q.start>=end)continue;max=Math.max(max,Math.min(end,q.start)-cursor);cursor=Math.max(cursor,Math.min(end,q.end))}
 return Math.max(max,end-cursor);
}
function dayLimits40(list,r){
 if(!r||!list.length)return [];
 if(list.some(q=>!q.time)||collision29(list))return ["unknown-day"];
 const a=sorted29(list),errors=[];
 if(r.maxPairs!==undefined&&a.length>r.maxPairs)errors.push("daily-limit");
 if((r.earliest!==undefined&&a[0].start<r.earliest)||(r.latest!==undefined&&a.at(-1).end>r.latest))errors.push("hours");
 if(r.minBreak!==undefined&&a.some((q,i)=>i&&q.start-a[i-1].end<r.minBreak))errors.push("break");
 if(r.lunchMinutes!==undefined&&a[0].start<=r.lunchStart&&a.at(-1).end>=r.lunchEnd&&freeGap40(a,r.lunchStart,r.lunchEnd)<r.lunchMinutes)errors.push("lunch");
 return errors;
}
function check40(ctx,final,moves,register,requireRoom){
 const idx=Object.fromEntries(kinds40.map(k=>[k,new Map(register[k].map(x=>[x.id,x]))])),issues=[],unknown=[],by=new Map(final.map(x=>[x.id,x]));
 const add=(a,q,code)=>a.push({id:q.id,code});
 for(const x of moves){
  const q=by.get(x.id),old=ctx.byId.get(x.id);if(!q||!old)throw Error("Нет карточки");
  const g=idx.groups.get(q.group),t=idx.teachers.get(q.teacher),r=idx.rooms.get(q.roomKey),sub=idx.subjects.get(subject40(q.group,q.subject));
  for(const [kind,p] of [["group",g],["teacher",t],["room",r]]){
   if(!p){add(unknown,q,kind+"-profile");continue}
   if(p.blocked.some(b=>b.date===q.date&&b.start<q.end&&q.start<b.end))add(issues,q,kind+"-blocked");
  }
  if(q.room!==old.room){
   if(g?.size!==undefined&&r?.capacity!==undefined){if(g.size>r.capacity)add(issues,q,"capacity")}
   else add(requireRoom?issues:unknown,q,"capacity-unknown");
   if(g?.accessible===true){if(r?.accessible===false)add(issues,q,"accessibility");else if(r?.accessible!==true)add(requireRoom?issues:unknown,q,"accessibility-unknown")}
   if(g?.accessible===undefined)add(requireRoom?issues:unknown,q,"accessibility-requirement-unknown");
   if(sub?.equipment!==undefined&&r?.equipment!==undefined){if(sub.equipment.some(e=>!r.equipment.includes(e)))add(issues,q,"equipment")}
   else add(requireRoom?issues:unknown,q,"equipment-unknown");
  }
  for(const [kind,p] of [["group",g],["teacher",t]]){
   if(!p)continue;
   for(const date of new Set([old.date,q.date])){
    const list=final.filter(v=>v.date===date&&(kind==="group"?v.group===q.group:ctx.occ.get(v.id).knownTeachers.includes(q.teacher)));
    if(kind==="teacher"&&list.some(v=>v.teacher!==q.teacher)){add(issues,q,"teacher-unknown-day");continue}
    for(const reason of dayLimits40(kind==="teacher"?unique29(list):list,p))add(issues,q,kind+"-"+reason);
   }
  }
 }
 return {ok:issues.length===0,issues,unknown};
}
const passport40={source:null,data:null,kind:"groups",id:"",open:false,requireRoom:false,msg:""};
const storage40="kantor-constraint-register-v040";
function sync40(){
 const s=passport40;if(s.source!==inter33.context){s.source=inter33.context;s.id="";s.msg="";s.data=s.source?empty40(s.source.ready.checked):null;s.requireRoom=false;
  if(s.source)try{const raw=localStorage.getItem(storage40);if(raw){const z=JSON.parse(raw);if(z.checked===s.data.checked)s.data=validate40(z,s.source);else s.msg="Локальный паспорт относится к другому снимку. Не применяется автоматически."}}catch(e){s.msg="Не удалось прочитать паспорт: "+e.message}
 }return s;
}
function store40(){const s=sync40();try{localStorage.setItem(storage40,JSON.stringify(s.data));s.msg="Паспорт сохранён на этом устройстве."}catch(e){s.msg="Локальное хранение недоступно. Выгрузите JSON."}invalidate39()}
const fieldLabels40={size:"Численность группы",maxPairs:"Максимум карточек в день",minBreak:"Минимальный перерыв, мин",earliest:"Начало не раньше (минуты от полуночи)",latest:"Конец не позже (минуты от полуночи)",lunchStart:"Начало обеденного окна",lunchEnd:"Конец обеденного окна",lunchMinutes:"Минимум непрерывного перерыва, мин",accessible:"Требуется / подтверждена доступность",capacity:"Вместимость",floor:"Этаж (уточнение номера)",equipment:"Оснащение (через точку с запятой)"};
function render40(){
 const s=sync40();if(!s.source)return "";
 const cat=catalog40(s.source),entries=[...cat[s.kind]].sort((a,b)=>a[1].localeCompare(b[1],"ru",{numeric:true}));
 if(!cat[s.kind].has(s.id))s.id=entries[0]?.[0]||"";
 const q=s.data[s.kind].find(x=>x.id===s.id)||{};
 const opts=(a,v)=>a.map(([k,n])=>'<option value="'+esc(k)+'" '+(k===v?"selected":"")+'>'+esc(n)+'</option>').join("");
 const field=([k,spec])=>{
  let input;
  if(spec==="bool")input='<select data-field40="'+k+'">'+opts([["","Не установлено"],["true","Да"],["false","Нет"]],q[k]===undefined?"":String(q[k]))+'</select>';
  else if(spec==="tags")input='<input data-field40="'+k+'" value="'+esc(q[k]===undefined?"":q[k].length?q[k].join("; "):"нет")+'" placeholder="нет / проектор; компьютеры">';
  else input='<input data-field40="'+k+'" type="number" min="'+spec[0]+'" max="'+spec[1]+'" value="'+esc(q[k]??"")+'">';
  return '<label>'+esc(fieldLabels40[k])+input+'</label>';
 };
 let h='<section class="panel" id="passport40"><div class="eyebrow23">Ограничения · 0.40</div><h2>Паспорта ресурсов и учебной нагрузки</h2><p>Введённые ограничения применяются к комплексным моделям. Это пользовательские сведения, а не официальная верификация. Этаж определяется по номеру либо уточняется в паспорте и учитывается в пространственной оптимизации. Время ходьбы не выдумывается.</p><div class="grid">'+kinds40.map(k=>'<div class="metric"><small>'+esc({groups:"Группы",teachers:"Преподаватели",rooms:"Аудитории",subjects:"Предмет × группа"}[k])+'</small><strong>'+s.data[k].length+' / '+cat[k].size+'</strong></div>').join("")+'</div>';
 h+='<label style="display:block;margin:12px 0"><input type="checkbox" id="requireRoom40" '+(s.requireRoom?"checked":"")+'> Для замены аудитории требовать введённые сведения о вместимости, доступности и оснащении</label><p class="muted">Явные запреты действуют в обоих режимах. Обед — свободный интервал по карточкам, без вычета ходьбы. Часы в числовых полях: 09:00 = 540, 13:00 = 780, 18:25 = 1105.</p>';
 h+='<details id="details40" '+(s.open?"open":"")+'><summary>Настроить паспорт</summary><div class="row"><label>Тип<select id="kind40">'+opts([["groups","Группа"],["teachers","Преподаватель"],["rooms","Аудитория"],["subjects","Дисциплина группы"]],s.kind)+'</select></label><label>Ресурс<select id="id40" style="max-width:100%">'+opts(entries,s.id)+'</select></label></div><div class="row">'+Object.entries(schema40[s.kind]).map(field).join("")+'</div>';
 if(s.kind!=="subjects")h+='<label>Недоступные интервалы (дата; начало; конец, минуты от полуночи)<textarea id="blocked40" rows="3" placeholder="2026-11-24; 540; 635">'+esc((q.blocked||[]).map(b=>b.date+"; "+b.start+"; "+b.end).join("\n"))+'</textarea></label>';
 h+='<div class="row"><label>Основание<input id="source40" maxlength="300" value="'+esc(q.source||"")+'"></label><label>Дата сведения<input id="date40" type="date" value="'+esc(q.verified||"")+'"></label></div><div class="row"><button id="save40" class="primary">Сохранить паспорт</button><button id="delete40" '+(!q.id?"disabled":"")+'>Удалить паспорт ресурса</button></div></details><div class="row"><button id="export40">Скачать JSON</button><label>Импорт паспорта текущего снимка<input id="import40" type="file" accept=".json,application/json"></label></div><p role="status">'+esc(s.msg)+'</p></section>';
 return h;
}
function bind40(){
 const s=sync40();if(!s.source)return;
 on("details40","toggle",e=>s.open=e.target.open);
 on("kind40","change",e=>{s.kind=e.target.value;s.id="";s.open=true;render()});
 on("id40","change",e=>{s.id=e.target.value;s.open=true;render()});
 on("requireRoom40","change",e=>{s.requireRoom=e.target.checked;invalidate39();render()});
 on("save40","click",()=>{try{
  const q={id:s.id,source:$("source40").value,verified:$("date40").value};
  for(const el of document.querySelectorAll("[data-field40]")){const k=el.dataset.field40,v=el.value.trim(),spec=schema40[s.kind][k];if(!v)continue;q[k]=spec==="bool"?v==="true":spec==="tags"?v.toLowerCase()==="нет"?[]:v.split(";").map(t=>t.trim()).filter(Boolean):Number(v)}
  if(s.kind!=="subjects")q.blocked=$("blocked40").value.split(/\n/).filter(x=>x.trim()).map(line=>{const a=line.split(";").map(x=>x.trim());if(a.length!==3||!a[1]||!a[2])throw Error("Три поля интервала");return {date:a[0],start:Number(a[1]),end:Number(a[2])}});
  const raw={...s.data,[s.kind]:[...s.data[s.kind].filter(x=>x.id!==s.id),q]};s.data=validate40(raw,s.source);store40()
 }catch(e){s.msg=e.message}s.open=true;render()});
 on("delete40","click",()=>{if(!confirm("Удалить паспорт ресурса?"))return;s.data={...s.data,[s.kind]:s.data[s.kind].filter(x=>x.id!==s.id)};store40();render()});
 on("export40","click",()=>download("kantor-constraints.json",JSON.stringify(s.data,null,2),"application/json"));
 on("import40","change",async e=>{try{const f=e.target.files?.[0],ctx=s.source;if(!f)return;if(f.size>3000000)throw Error("Файл больше 3 МБ");const raw=JSON.parse(await f.text());if(ctx!==inter33.context)throw Error("Снимок изменился");const next=validate40(raw,ctx);if(!confirm("Заменить текущий паспорт импортированным?"))return;s.data=next;store40()}catch(err){s.msg=err.message}render()});
}
