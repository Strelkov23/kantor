/* 0.31: evidence registry for streams, teacher labels and subgroup signals.
 * All associations are review candidates. Never infer student atoms or teacher-room pairing.
 */
const label31=v=>norm26(v).toLocaleLowerCase("ru");
function initials31(raw){
 const s=norm26(raw),m=s.match(/^([А-ЯЁа-яё]+(?:-[А-ЯЁа-яё]+)?)\s+([А-ЯЁа-яё])\.\s*([А-ЯЁа-яё])\.$/u);
 return m?[m[1],m[2],m[3]].map(label31).join("|"):null;
}
function fullInitials31(raw){
 const a=teacherClass26(norm26(raw));if(!a.id)return null;
 const p=a.name.split(" ");return [p[0],p[1][0],p[2][0]].map(label31).join("|");
}
function tokens31(raw,room=false){
 return [...new Set(String(raw??"").split(room?/;| \/ /:/;/).map(norm26).filter(Boolean))];
}
function reviewRegistry31(m,files,catalog){
 if(m.complete!==true||m.groups.length!==83||files.length!==83||new Set(m.groups.map(g=>g.group)).size!==83||m.groups.some(g=>!catalog.groups.some(c=>c.id===g.group&&c.course===g.course)))throw Error("Нужен полный снимок института");
 const cards=[],full=new Map(),signatures=new Map(),aliases=new Map(),subgroups=[];
 const count=(map,k,v)=>{if(!map.has(k))map.set(k,[]);map.get(k).push(v)};
 for(let i=0;i<83;i++){
  const g=m.groups[i],f=files[i];if(f.checked!==m.checked||f.group!==g.group||f.course!==g.course||f.comparisons.length!==g.cards)throw Error("Несогласованный снимок "+g.group);
  for(let j=0;j<f.comparisons.length;j++){
   const x=f.comparisons[j],c=x.calendar,t=x.timing,teacherTokens=tokens31(c.teachers),roomTokens=tokens31(c.rooms,true);
   const q={id:g.file+":"+j,group:g.group,course:g.course,date:c.date,start:t?.start,end:t?.end,time:c.time,subject:norm26(c.subject),type:norm26(c.type),teachers:norm26(c.teachers),rooms:norm26(c.rooms),teacherTokens,roomTokens,pdfId:x.pdfId||null,pdfPage:x.pdfPage||null,pdfSource:f.pdfSource||null,pdfHash:f.pdfHash||null,pdfRaw:x.pdfRaw||"",status:x.status,teacherCheck:x.teacherCheck||"not-evaluable",roomCheck:x.numberedRoomCheck||"not-evaluable",valid:validTime25(t)};
   cards.push(q);
   for(const p of teacherTokens){const key=fullInitials31(p);if(key){if(!full.has(key))full.set(key,new Map());full.get(key).set(label31(p),p)}}
   if(q.valid)count(signatures,JSON.stringify([q.date,q.start,q.end,label31(q.subject),label31(q.type),label31(q.teachers),label31(q.rooms)]),q);
   const signals=[];if(teacherTokens.length>1)signals.push("multiple-teachers");if(roomTokens.length>1)signals.push("multiple-rooms");
   if(/спец\.\s*(?:мед\.\s*)?группа/iu.test(q.type)||/спец\.\s*(?:мед\.\s*)?группа/iu.test(q.subject))signals.push("special-group");
   if(signals.length)subgroups.push({...q,signals});
  }
 }
 if(cards.length!==m.totals.cards)throw Error("Не совпадает число карточек");
 const teacherRows=[];
 for(const q of cards){
  const entries=q.teacherTokens.length?q.teacherTokens:[""];
  for(const p of entries){
   if(fullInitials31(p))continue;
   const k=label31(p),initial=initials31(p);
   if(!aliases.has(k)){const candidates=initial?[...(full.get(initial)?.values()||[])].sort((a,b)=>a.localeCompare(b,"ru")):[];aliases.set(k,{id:"teacher:"+k,label:p||"(не указано)",kind:!p||/^преподаватель не назначен$/iu.test(p)?"missing":initial?(candidates.length===1?"unique-candidate":candidates.length>1?"multiple-candidates":"no-candidate"):"other",candidates,cards:[],groups:new Set()})}
   const a=aliases.get(k);a.cards.push(q.id);a.groups.add(q.group);
  }
 }
 for(const a of aliases.values())teacherRows.push({...a,groups:[...a.groups].sort(),count:new Set(a.cards).size,cards:[...new Set(a.cards)]});
 teacherRows.sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,"ru"));
 const streams=[];
 for(const a of signatures.values()){
  if(a.length<2)continue;
  const q=a[0],groups=[...new Set(a.map(x=>x.group))].sort(),onePerGroup=groups.length===a.length;
  // Independent PDF positions need not share an ID: each group may have its own cell.
  const textSupported=a.every(x=>x.status==="text-and-room-match"&&x.pdfId&&x.pdfHash&&x.pdfRaw);
  const strictLabels=!!(teacherClass26(q.teachers).id&&roomClass18(q.rooms,catalog.buildings).room&&q.subject&&q.type);
  const resourceSupported=textSupported&&a.every(x=>x.teacherCheck==="initials-match"&&x.roomCheck==="exact");
  const level=groups.length<2||!onePerGroup?"repeat-within-group":strictLabels&&resourceSupported?"calendar-and-pdf-resources":strictLabels&&textSupported?"calendar-and-pdf-text":strictLabels?"calendar-only":"ambiguous-resources";
  streams.push({id:"stream:"+a.map(x=>x.id).sort().join(","),date:q.date,start:q.start,end:q.end,time:q.time,subject:q.subject,type:q.type,teachers:q.teachers,rooms:q.rooms,groups,cardIds:a.map(x=>x.id).sort(),cards:a.length,level,pdfIds:[...new Set(a.map(x=>x.pdfId).filter(Boolean))]});
 }
 streams.sort((a,b)=>b.groups.length-a.groups.length||a.date.localeCompare(b.date)||a.start-b.start||a.subject.localeCompare(b.subject,"ru"));
 const byId=new Map(cards.map(x=>[x.id,x]));
 const totals={cards:cards.length,streams:streams.length,streamCards:streams.reduce((n,x)=>n+x.cards,0),multiGroupStreams:streams.filter(x=>x.groups.length>1).length,teacherLabels:teacherRows.length,teacherReviewCards:new Set(teacherRows.flatMap(x=>x.cards)).size,uniqueAliasLabels:teacherRows.filter(x=>x.kind==="unique-candidate").length,uniqueAliasCards:new Set(teacherRows.filter(x=>x.kind==="unique-candidate").flatMap(x=>x.cards)).size,subgroupCards:subgroups.length,multiTeacherCards:subgroups.filter(x=>x.signals.includes("multiple-teachers")).length,multiRoomCards:subgroups.filter(x=>x.signals.includes("multiple-rooms")).length,specialGroupCards:subgroups.filter(x=>x.signals.includes("special-group")).length};
 const levels={};for(const r of streams){if(!levels[r.level])levels[r.level]={sets:0,cards:0};levels[r.level].sets++;levels[r.level].cards+=r.cards}
 const aliasKinds={};for(const r of teacherRows)aliasKinds[r.kind]=(aliasKinds[r.kind]||0)+1;
 if(totals.streamCards>totals.cards||totals.teacherReviewCards>totals.cards||totals.subgroupCards>totals.cards||streams.some(s=>s.cardIds.some(id=>!byId.has(id))))throw Error("Нарушен баланс реестра");
 return {checked:m.checked,totals,levels,aliasKinds,streams,teacherRows,subgroups,byId};
}
const levels31={"calendar-and-pdf-resources":"Календарь + ФИО и аудитория PDF","calendar-and-pdf-text":"Календарь + текст PDF","calendar-only":"Совпадение календаря","ambiguous-resources":"Неоднозначные ресурсы","repeat-within-group":"Повтор внутри группы"};
const kinds31={"unique-candidate":"Один кандидат в снимке","multiple-candidates":"Несколько кандидатов","no-candidate":"Нет полного ФИО в снимке","missing":"Не назначен / отсутствует","other":"Другой формат"};
let review31={data:null,snapshot:null,error:"",loading:false,mode:"streams",filter:"",kind:"all",selected:"",decisions:{}};
function prepareReview31(snap,files){
 const s=review31;
 try{const d=reviewRegistry31(snap.manifest,files,instituteCatalog);if(s.data?.checked!==d.checked){s.selected="";s.decisions={}}s.data=d;s.snapshot=snap;s.error=""}catch(e){s.data=null;s.error=e.message}
}
async function loadReview31(){const s=review31;if(s.loading)return;s.loading=true;s.error="";render();try{const snap=await calendarSnapshot27(true);prepareReview31(snap,await calendarFiles27(snap))}catch(e){s.error=e.message}s.loading=false;if(visible16("baseline09"))render()}
function rows31(){
 const s=review31,d=s.data;if(!d)return [];
 const rows=s.mode==="streams"?d.streams:s.mode==="teachers"?d.teacherRows:d.subgroups;
 return rows.filter(x=>(s.kind==="all"||(s.mode==="streams"?x.level===s.kind:s.mode==="teachers"?x.kind===s.kind:x.signals.includes(s.kind)))&&label31([x.group,x.subject,x.teachers,x.rooms,x.label,...(x.groups||[]),...(x.candidates||[])].filter(Boolean).join(" ")).includes(label31(s.filter)));
}
function decision31(id,status,evidence,registry,mode){
 if(!["streams","teachers"].includes(mode)||!["supported","rejected"].includes(status)||typeof evidence!=="string"||!evidence.trim()||evidence.length>1000)throw Error("Укажите решение и основание (до 1000 знаков)");
 const row=(mode==="streams"?registry.streams:registry.teacherRows).find(x=>x.id===id);
 if(!row)throw Error("Запись отсутствует");
 if(status==="supported"&&mode==="teachers"&&row.kind!=="unique-candidate")throw Error("Для неоднозначного имени требуется внешний идентификатор, а не автоматический выбор");
 if(status==="supported"&&mode==="streams"&&(row.groups.length<2||row.level==="repeat-within-group"))throw Error("Нельзя подтвердить общий поток внутри одной группы");
 return {id,mode,status,evidence:evidence.trim(),checked:registry.checked,candidate:mode==="teachers"&&status==="supported"?row.candidates[0]:null};
}
function renderReview31(){
 const s=review31,d=s.data;
 let html='<section class="panel"><h2>Потоки, подгруппы и идентификация ресурсов</h2><p>Реестр доказательности. Совпадение календарных назначений не устанавливает состав потока; одинаковые инициалы не устанавливают личность. Несколько преподавателей и аудиторий в одной карточке не означают подтверждённую связь между ними.</p><div class="row"><button id="reviewLoad31" class="primary" '+(s.loading?"disabled":"")+'>'+(s.loading?"Расчёт…":d?"Обновить реестр":"Построить реестр")+'</button><button data-tab="scenarios">Перейти к проверке переносов</button></div><p role="status">'+esc(s.error)+'</p>';
 if(!d)return html+'</section>';
 const t=d.totals,metric=(n,v)=>'<div class="metric"><small>'+esc(n)+'</small><strong>'+v+'</strong></div>';
 html+='<div class="source23">'+esc(calendarStatus27(s.snapshot))+'</div><div class="grid">'+metric("Повторяющиеся сигнатуры",t.streams)+metric("Карточки повторов",t.streamCards)+metric("Карточки с неясной меткой преподавателя",t.teacherReviewCards)+metric("Карточки с признаками подгрупп",t.subgroupCards)+'</div><div class="row">'+[["streams","Потоки"],["teachers","Имена преподавателей"],["subgroups","Признаки подгрупп"]].map(([v,n])=>'<button data-review-mode31="'+v+'" aria-pressed="'+(v===s.mode)+'" class="'+(v===s.mode?"primary":"")+'">'+n+'</button>').join("")+'</div>';
 const opts=s.mode==="streams"?levels31:s.mode==="teachers"?kinds31:{"multiple-teachers":"Несколько преподавателей","multiple-rooms":"Несколько аудиторий","special-group":"Специальная группа"};
 const rows=rows31(),sel=rows.find(x=>x.id===s.selected),status=x=>s.decisions[x.id]?.status==="supported"?"Поддержано пользователем":s.decisions[x.id]?.status==="rejected"?"Отклонено пользователем":"Не проверено";
 html+='<div class="row"><label>Поиск<input id="reviewFilter31" value="'+esc(s.filter)+'"></label><label>Признак<select id="reviewKind31"><option value="all">Все</option>'+Object.entries(opts).map(([v,n])=>'<option value="'+v+'" '+(s.kind===v?"selected":"")+'>'+esc(n)+'</option>').join("")+'</select></label><button id="reviewExport31">JSON реестра</button><button id="reviewCSV31">CSV таблицы</button></div><p>Показано '+Math.min(rows.length,150)+' из '+rows.length+'; экспорт содержит весь отфильтрованный набор. Решения пользователя: '+Object.keys(s.decisions).length+' (только в текущем сеансе, не передаются решателю).</p>';
 const cols=s.mode==="streams"?["Дата / время","Дисциплина","Группы","Уровень основания","Решение"]:s.mode==="teachers"?["Запись","Карточки","Кандидаты","Статус","Решение"]:["Группа / дата","Дисциплина","Преподаватели","Аудитории","Признаки"];
 html+='<div class="scroll"><table><tr>'+cols.map(n=>'<th>'+n+'</th>').join("")+'</tr>'+rows.slice(0,150).map(x=>{
  const values=s.mode==="streams"?[x.date+" "+x.time,x.subject,x.groups.join(", "),levels31[x.level],status(x)]:s.mode==="teachers"?[x.label,x.count,x.candidates.join("; ")||"—",kinds31[x.kind],status(x)]:[x.group+" "+x.date,x.subject,x.teachers,x.rooms,x.signals.map(k=>opts[k]).join(", ")];
  return '<tr><td><button data-review-select31="'+esc(x.id)+'">'+esc(values[0])+'</button></td>'+values.slice(1).map(v=>'<td>'+esc(v)+'</td>').join("")+'</tr>';
 }).join("")+'</table></div>';
 if(sel){
  const ids=s.mode==="streams"?sel.cardIds:s.mode==="teachers"?sel.cards:[sel.id],details=ids.map(id=>d.byId.get(id));
  html+='<section class="panel" id="reviewDetail31"><h3>Первичные записи: '+esc(sel.subject||sel.label)+'</h3><p>Указано '+details.length+' карточек; источники приведены без автоматического исправления.</p><div class="scroll"><table><tr><th>Группа / дата</th><th>Назначение</th><th>PDF / текст</th></tr>'+details.map(q=>'<tr><td><button data-review-group31="'+esc(q.group)+'" data-review-date31="'+esc(q.date)+'">'+esc(q.group)+'</button><br>'+esc(q.date+" "+q.time)+'</td><td>'+esc(q.subject)+'<br>'+esc(q.teachers)+'<br>'+esc(q.rooms)+'</td><td>'+(q.pdfId?esc(q.pdfId)+" · ":"")+ (q.pdfSource&&/^https:\/\/www\.timacad\.ru\//.test(q.pdfSource)?'<a href="'+esc(q.pdfSource)+(q.pdfPage?'#page='+q.pdfPage:'')+'" target="_blank" rel="noopener">PDF</a>':"")+'<br>'+esc(q.pdfRaw||"Нет сопоставленной записи")+'</td></tr>').join("")+'</table></div>';
  if(s.mode!=="subgroups"){const old=s.decisions[sel.id];html+='<div class="row"><label>Решение<select id="decisionStatus31"><option value="supported" '+(old?.status==="supported"?"selected":"")+'>Поддержать кандидат</option><option value="rejected" '+(old?.status==="rejected"?"selected":"")+'>Отклонить</option></select></label><label>Основание (источник, дата)<input maxlength="1000" id="decisionEvidence31" value="'+esc(old?.evidence||"")+'"></label><button id="decisionSave31">Записать решение</button></div><p id="decisionMessage31" role="status">Поддержка — только пользовательская отметка для проверки. Не подтверждает состав студентов или внешнюю доступность.</p>'}
  html+='</section>';
 }
 return html+'<p class="muted">Никакая запись этого реестра не меняет исходное расписание и не становится входом оптимизатора без отдельной проверенной модели.</p></section>';
}
function bindReview31(){
 const s=review31;
 on("reviewLoad31","click",loadReview31);
 document.querySelectorAll("[data-review-mode31]").forEach(b=>b.onclick=()=>{s.mode=b.dataset.reviewMode31;s.filter="";s.kind="all";s.selected="";render()});
 for(const [id,k] of [["reviewFilter31","filter"],["reviewKind31","kind"]])on(id,"change",e=>{s[k]=e.target.value;s.selected="";render()});
 document.querySelectorAll("[data-review-select31]").forEach(b=>b.onclick=()=>{s.selected=b.dataset.reviewSelect31;render();$("reviewDetail31")?.scrollIntoView?.({block:"start"})});
 document.querySelectorAll("[data-review-group31]").forEach(b=>b.onclick=()=>{tab="group07";loadPersonal23(b.dataset.reviewGroup31,b.dataset.reviewDate31)});
 on("decisionSave31","click",()=>{try{const x=decision31(s.selected,$("decisionStatus31").value,$("decisionEvidence31").value,s.data,s.mode);s.decisions[x.id]=x;render();$("decisionMessage31").textContent="Отметка сохранена для экспорта."}catch(e){$("decisionMessage31").textContent=e.message}});
 on("reviewExport31","click",()=>{const d=s.data;if(!d)return;download("kantor-evidence-register.json",JSON.stringify({version:"0.31",checked:d.checked,status:"review-only",totals:d.totals,levels:d.levels,aliasKinds:d.aliasKinds,streams:d.streams,teacherRows:d.teacherRows,subgroups:d.subgroups,sourceCards:[...d.byId.values()],decisions:Object.values(s.decisions)},null,2),"application/json")});
 on("reviewCSV31","click",()=>{const cols=s.mode==="streams"?["date","time","subject","teachers","rooms","groups","cards","level"]:s.mode==="teachers"?["label","count","kind","candidates","groups"]:["group","date","time","subject","teachers","rooms","signals"],rows=rows31();download("kantor-"+s.mode+"-review.csv","\ufeff"+[[...cols,"reviewStatus","evidence","snapshot"],...rows.map(x=>[...cols.map(k=>Array.isArray(x[k])?x[k].join("; "):x[k]),s.decisions[x.id]?.status||"unreviewed",s.decisions[x.id]?.evidence||"",s.data.checked])].map(r=>r.map(v=>csv(String(v??"").replace(/^[=+\-@\t\r]/,"'$&"))).join(";")).join("\r\n"),"text/csv;charset=utf-8")});
}
