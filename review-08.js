/* Review layer 0.8. Original cells remain immutable; extracted resource mentions are not verified allocations. */
function reviewCell08(r,catalog){
 const flat=r.raw.trim().replace(/\s+/g," ").replace(/(\d{2})-\s+(?=\d|Планетарий)/gu,"$1-");
 const buildings=catalog.buildings;
 const name="[А-ЯЁA-Z][А-ЯЁA-Z-]+(?:\\s+[А-ЯЁA-Z][А-ЯЁA-Z-]+)*\\s+[А-ЯЁA-Z]\\.\\s*[А-ЯЁA-Z]\\.?";
 const room="(?:\\d{2}[А-ЯA-Z]?)-(?:\\d{1,4}[А-Яа-яЁёA-Za-z]?|Планетарий1|ФОС\\s+АГРО(?:\\s*\\([^)]*\\))?|ПРОДИМЕКС(?:\\s*\\([^)]*\\))?|БХ|БП|БАг|ХД|каф\\.)";
 const re=new RegExp("("+name+")\\s*("+room+")","gu");
 const matches=[...flat.matchAll(re)].map(m=>({teacher:m[1].trim().replace(/\s+/g," ").replace(/([А-ЯЁA-Z]\.)\s+([А-ЯЁA-Z]\.?)$/u,"$1$2"),room:m[2],building:m[2].split("-")[0],start:m.index,end:m.index+m[0].length}));
 const refs=matches.map(({teacher,room,building})=>({teacher,room,building,buildingKnown:Object.hasOwn(buildings,building),nameBoundaryAmbiguous:teacher.split(/\s+/).length>2}));
 const mentions=[...flat.matchAll(/[А-ЯЁA-Z]\.\s*[А-ЯЁA-Z]\.?/gu)].length;
 const roomMentions=[...flat.matchAll(new RegExp(room,"gu"))].length;
 const subgroup=[...flat.matchAll(/([12])\s*п\s*\/?\s*г/giu)].map(m=>m[1]);
 const elective=/(?:КпоВ|ФТД|КМ:|РКИ)/iu.test(flat);
 let kind,reason,title=null;
 if(r.suggestion){
  kind="ordinary";reason="Простой структурный кандидат";
  title=r.suggestion.title;
 }else if(/Базовые виды спорта|Базовая физическая культура/u.test(flat)&&/\bСК$| СК$/u.test(flat)){
  kind="sport";reason="Секция или спортивное занятие; не указан конкретный преподаватель и зал";
 }else if(matches.length&&matches.every(m=>Object.hasOwn(buildings,m.building))){
  let prefix=flat.slice(0,matches[0].start).trim();
  let lesson=prefix.match(/^(лек|пр|лаб(?:\.пр)?)\s*\.\s*(.+)$/u);
  let tail=flat.slice(matches.at(-1).end).trim();
  let gaps=matches.slice(1).map((m,i)=>flat.slice(matches[i].end,m.start).trim());
  if(lesson)title=lesson[2];
  if(refs.some(m=>m.nameBoundaryAmbiguous)){kind="incomplete";reason="Неоднозначная граница составного имени и названия; сверить исходную строку"}else if(!lesson||tail||gaps.some(s=>s&&!/^[,;]+$/.test(s))||mentions!==matches.length||roomMentions!==matches.length){
   kind="incomplete";reason="Не все ресурсные обозначения однозначно связаны";
  }else if(matches.length>1){
   kind="parallel";reason="Несколько пар преподаватель–аудитория; распределение участников неизвестно";
  }else if(subgroup.length){
   kind="subgroup";reason="Есть обозначение подгруппы, но её состав и связь с другими делениями не подтверждены";
  }else if(elective){
   kind="elective";reason="Выборное/специальное занятие; состав участников требует подтверждения";
  }else if(!/^\d{2}[А-ЯA-Z]?-\d{1,4}[А-Яа-яЁёA-Za-z]?$/u.test(matches[0].room)){
   kind="named-room";reason="Именованное помещение; точный вход/идентификатор требует сверки";
  }else{
   kind="recovered";reason="Дополнительный структурный разбор; проверить название, фамилию и аудиторию";
  }
 }else{
  kind="incomplete";reason="Не удалось надёжно выделить ресурсные пары; необходима сверка с PDF";
 }
 return {id:r.id,page:r.page,groups:r.groups,halves:r.halves,day:r.day,period:r.period,raw:r.raw,kind,reason,title,subgroupMarkers:subgroup,resources:r.suggestion?[{teacher:r.suggestion.teacher,room:r.suggestion.room,building:r.suggestion.building,buildingKnown:true}]:refs,reviewStatus:"pending"};
}
function buildReview08(courses,catalog,previous){
 let records=courses.flatMap(d=>d.records.map(r=>({...reviewCell08(r,catalog),course:d.course,source:d.source,sourceHash:d.sourceHash})));
 let counts={};for(const r of records)counts[r.kind]=(counts[r.kind]||0)+1;
 const conflicts=previous.conflicts.map((c,i)=>({id:"conflict-"+(i+1),key:c.key,events:c.events.map(e=>({...e,evidence:e.sourceIds.map(id=>{let r=records.find(r=>r.id===id);return r?{id,source:r.source,page:r.page,raw:r.raw,sourceHash:r.sourceHash}:null}).filter(Boolean)})),status:"source-supported-potential",required:"Сверить назначение, формат занятия, подгруппы и оперативные изменения; не исправлять автоматически."}));
 return {version:"0.8",scope:previous.scope,counts,records,conflicts,possibleFlows:previous.possibleFlows,notes:"Структурный разбор не подтверждает фактические ресурсы или участников. Все записи требуют решения о допуске. Оригинальные строки сохранены."};
}
