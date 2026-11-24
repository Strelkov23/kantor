/* Evidence-based second pass: names observed in simple PDF cells, not verified identities. */
function secondPass09(courses,catalog){
 const canonical=s=>String(s).toLocaleUpperCase("ru-RU").replace(/\s+/g," ").trim().replace(/([А-ЯЁA-Z]\.)\s+([А-ЯЁA-Z]\.)/gu,"$1$2");
 const names=[...new Set(courses.flatMap(d=>d.records).filter(r=>r.kind==="ordinary").flatMap(r=>r.resources.map(x=>canonical(x.teacher))))].sort((a,b)=>b.length-a.length);
 const quote=s=>Array.from(s).map(c=>"\\^$.*+?()[]{}|".includes(c)?"\\"+c:c).join("");
 const alternatives=names.map(n=>quote(n).replace(/\\\./g,"\\.\\s*").replace(/ /g,"\\s+")).join("|");
 const namePattern=new RegExp("(?<![А-ЯЁA-Zа-яёa-z])("+alternatives+")(?![А-ЯЁA-Zа-яёa-z])","gu");
 const roomPattern=/^\s*((?:\d{2}[А-ЯA-Z]?)-(?:\d{1,4}[А-Яа-яЁёA-Za-z]?|Планетарий1|ФОС\s+АГРО(?:\s*\([^)]*\))?|ПРОДИМЕКС(?:\s*\([^)]*\))?|БХ|БП|БАг|ХД|каф\.))(?=$|\s|[;,])/u;
 const results=[];
 for(const d of courses)for(const r of d.records.filter(r=>r.kind==="incomplete")){
  const flat=r.raw.trim().replace(/\s+/g," ").replace(/(\d{2})-\s+(?=\d|Планетарий)/gu,"$1-");
  const ms=[...flat.toLocaleUpperCase("ru-RU").matchAll(namePattern)];
  if(!ms.length)continue;
  let title=flat.slice(0,ms[0].index).trim(), type=title.match(/^(лек|пр|лаб(?:\.пр)?)\s*\.\s*(.+)$/u);
  if(!type||!type[2]||/(?:лек|пр|лаб)\s*\./iu.test(type[2])||/[А-ЯЁ]\.\s*[А-ЯЁ]\./u.test(type[2]))continue;
  let refs=[],valid=true;
  for(let i=0;i<ms.length;i++){
   let m=ms[i],start=m.index+m[0].length,end=ms[i+1]?.index??flat.length;
   let fragment=flat.slice(start,end),room=fragment.match(roomPattern);
   if(!room||!Object.hasOwn(catalog.buildings,room[1].split("-")[0])||fragment.slice(room[0].length).trim().replace(/^[;,]+$/,"")){valid=false;break}
   refs.push({teacher:canonical(m[1]),room:room[1],building:room[1].split("-")[0]});
  }
  if(!valid||new Set(refs.map(x=>x.teacher+"|"+x.room)).size!==refs.length)continue;
  const kind=refs.length>1?"parallel":/(?:КпоВ|ФТД|КМ:|РКИ)/iu.test(type[2])?"elective":/[12]\s*п\s*\/?\s*г/iu.test(type[2])?"subgroup":!/^\d{2}[А-ЯA-Z]?-\d{1,4}[А-Яа-яЁёA-Za-z]?$/u.test(refs[0].room)?"named-room":"recovered";
  results.push({id:r.id,course:d.course,hash:d.hash,page:r.page,groups:r.groups,raw:r.raw,title:type[2],type:type[1],resources:refs,kind,status:"candidate-only",basis:"Совпадение написания имени с простой ячейкой того же набора PDF; участники и доступность не подтверждены."});
 }
 return {version:"0.9",dictionarySize:names.length,previousIncomplete:courses.reduce((n,d)=>n+d.records.filter(r=>r.kind==="incomplete").length,0),suggestions:results};
}
