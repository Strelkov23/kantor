/* Physical grid to source-derived candidate records. No automatic verification of semantics. */
function normalizePhysical07(d,catalog){
 const labels=["ПОНЕДЕЛЬНИК","ВТОРНИК","СРЕДА","ЧЕТВЕРГ","ПЯТНИЦА"];
 const bell=["09.00-10.35","10.55-12.30","13.00-14.35","14.55-16.30","16.50-18.25"];
 const strip=s=>String(s||"").replace(/\s/g,"").replace(/[–—]/g,"-");
 let records=[],issues=[],pageStats=[],seenGroups=new Set();
 for(const p of d.pages){
  if(p.tables.length!==1){issues.push({page:p.page,problem:"Expected exactly one table"});continue}
  const t=p.tables[0],head=t.rows[0],groups=head.slice(2).filter(Boolean).map(x=>({id:x.text.trim().replace(/\s+/g," "),x0:x.box[0],x1:x.box[2]}));
  const expected=catalog.groups.filter(g=>g.course===d.course&&g.page===p.page).map(g=>g.id);
  if(groups.length!==expected.length||groups.some(g=>!expected.includes(g.id))||new Set(groups.map(g=>g.id)).size!==groups.length){issues.push({page:p.page,problem:"Header/catalog mismatch",found:groups.map(g=>g.id),expected});continue}
  groups.forEach(g=>seenGroups.add(g.id));
  let slots=[],day=-1;
  for(let row of t.rows.slice(1)){
   let a=strip(row[0]?.text),b=strip(row[1]?.text);
   if(labels.includes(a))day=labels.indexOf(a);
   if(bell.includes(b)&&day>=0)slots.push({day,period:bell.indexOf(b),y0:row[1].box[1],y1:row[1].box[3]});
  }
  if(slots.length!==25||new Set(slots.map(s=>s.day*5+s.period)).size!==25){issues.push({page:p.page,problem:"Invalid day/time grid",found:slots.length});continue}
  const seen=new Map();
  for(let row of t.rows.slice(1))for(let c of row.slice(2)){if(c?.text?.trim())seen.set(c.box.join("|"),c)}
  let start=records.length,unresolved=0;
  for(let c of seen.values()){
   let [x0,y0,x1,y1]=c.box;
   let id="C"+d.course+"P"+p.page+"-"+(records.length-start+1);
   let matchedGroups=groups.filter(g=>Math.min(x1,g.x1)-Math.max(x0,g.x0)>(g.x1-g.x0)*.9);
   let matchSlots=slots.filter(s=>Math.min(y1,s.y1)-Math.max(y0,s.y0)>Math.max(1.1,(s.y1-s.y0)*.08));
   if(!matchSlots.length){issues.push({page:p.page,id,problem:"Nonempty cell outside time grid",text:c.text,box:c.box});continue}
   let r={id,course:d.course,page:p.page,source:d.source,sourceHash:d.sha256,box:c.box,raw:c.text,groups:matchedGroups.map(g=>g.id),day:null,period:null,halves:[],geometryStatus:"unresolved"};
   if(matchedGroups.length&&matchSlots.length===1){
    let s=matchSlots[0],mid=(s.y0+s.y1)/2,tol=Math.max(1.2,(s.y1-s.y0)*.09),xtol=1.6;
    let xExact=Math.abs(x0-matchedGroups[0].x0)<=xtol&&Math.abs(x1-matchedGroups.at(-1).x1)<=xtol;
    r.day=s.day;r.period=s.period;
    if(xExact){
     if(Math.abs(y0-s.y0)<=tol&&Math.abs(y1-s.y1)<=tol)r.halves=[0,1];
     else if(Math.abs(y0-s.y0)<=tol&&Math.abs(y1-mid)<=tol)r.halves=[0];
     else if(Math.abs(y0-mid)<=tol&&Math.abs(y1-s.y1)<=tol)r.halves=[1];
    }
    if(r.halves.length)r.geometryStatus="mapped";
   }
   if(r.geometryStatus==="unresolved"){unresolved++;issues.push({page:p.page,id,problem:"Unresolved cell extent",box:c.box,text:c.text,groups:r.groups,slots:matchSlots.map(s=>[s.day,s.period])})}
   records.push(r);
  }
  pageStats.push({page:p.page,groups:groups.length,timeSlots:slots.length,records:records.length-start,unresolved});
 }
 // Coverage counts only cells assigned to a group/half, not unique lessons.
 const positions=new Map();
 for(let r of records.filter(r=>r.geometryStatus==="mapped"))for(let g of r.groups)for(let half of r.halves){let k=JSON.stringify([g,half,r.day,r.period]);if(!positions.has(k))positions.set(k,[]);positions.get(k).push(r.id)}
 for(let [key,ids] of positions)if(ids.length>1)issues.push({problem:"Multiple physical cells at same group/half/slot",key:JSON.parse(key),ids});
 return {version:"0.7",course:d.course,source:d.source,sourceHash:d.sha256,status:"geometry-mapped, semantics not verified",groups:[...seenGroups],records,issues,pageStats,positionCount:positions.size};
}

function classifyPhysical07(r,catalog){
 const raw=r.raw.trim(), lines=raw.split(/\n/).map(s=>s.trim()).filter(Boolean), flat=raw.replace(/\s+/g," ");
 const initials="[А-ЯЁA-Z]\\.\\s*[А-ЯЁA-Z]\\.";
 const upper="[А-ЯЁA-Z][А-ЯЁA-Z-]+";
 const room="\\d{2}[А-ЯA-Z]?-\\d{1,4}[А-Яа-яЁёA-Za-z]?";
 const name=upper+"(?:\\s+"+upper+")*\\s+"+initials;
 const terminal=new RegExp("^("+name+")\\s*("+room+")$","u");
 const attached=new RegExp("^(.*?)\\s+("+upper+"\\s+"+initials+")\\s*("+room+")$","u");
 const teacherMentions=[...flat.matchAll(new RegExp(initials,"gu"))];
 const rooms=[...flat.matchAll(new RegExp(room+"(?=$|\\s|[,;])","gu"))];
 let last=lines.at(-1)||"", m=last.match(terminal), title="",teacher="",roomValue="",reason="";
 if(m&&lines.length>1){teacher=m[1];roomValue=m[2];title=lines.slice(0,-1).join(" ")}
 else{
  m=last.match(attached);
  if(m){title=[...lines.slice(0,-1),m[1]].join(" ");teacher=m[2];roomValue=m[3];
   // Uppercase text immediately before an attached surname is ambiguous (acronym vs compound surname).
   if(new RegExp("(?:^|\\s)"+upper+"$","u").test(m[1]))reason="Неоднозначная граница фамилии и названия дисциплины";
  }
 }
 let lesson=title.match(/^(лек|пр|лаб)\s*\.\s*(.+)$/u);
 if(r.geometryStatus!=="mapped")reason="Геометрия не определена";
 else if(/(?:[12]\s*п\/?г|подгрупп|РКИ|КпоВ|ФТД|КМ:)/iu.test(flat))reason="Подгруппа, выборная дисциплина или специальная запись";
 else if(!lesson||!teacher||teacherMentions.length!==1||rooms.length!==1)reason="Сложная или неоднозначная структура преподавателя/аудитории";
 else if(!Object.hasOwn(catalog.buildings,roomValue.split("-")[0]))reason="Корпус не найден в справочнике";
 else if(/[;]|(?:лек|пр|лаб)\s*\./iu.test(lesson[2]))reason="Возможны несколько занятий";
 if(reason)return {...r,parseStatus:"manual",parseReason:reason,suggestion:null};
 return {...r,parseStatus:"simple",parseReason:"Структурный кандидат; состав участников и достоверность требуют сверки",suggestion:{type:lesson[1],title:lesson[2].trim().replace(/\s+/g," "),teacher:teacher.replace(/\s+/g," ").replace(/([А-ЯЁA-Z]\.)\s+([А-ЯЁA-Z]\.)$/u,"$1$2"),room:roomValue,building:roomValue.split("-")[0]}};
}
function semanticReview07(normalized,catalog){
 let records=normalized.flatMap(d=>d.records).map(r=>classifyPhysical07(r,catalog)), by=new Map(), events=[];
 for(let r of records){
  if(!r.suggestion)continue;
  for(let w of r.halves){
   let s=r.suggestion,key=JSON.stringify([w,r.day,r.period,s.type,s.title.toLocaleLowerCase("ru-RU"),s.teacher.toLocaleUpperCase("ru-RU"),s.room]);
   if(!by.has(key))by.set(key,[]);
   by.get(key).push({r,w});
  }
 }
 for(let list of by.values()){
  let {r,w}=list[0],s=r.suggestion,groups=[...new Set(list.flatMap(x=>x.r.groups))],sourceIds=list.map(x=>x.r.id);
  events.push({id:"E"+(events.length+1),week:w,day:r.day,period:r.period,groups,sourceIds,...s,status:groups.length>1?"possible-flow":"unverified"});
 }
 // Detect conflicting structural candidates; possible shared session isn't automatically confirmed.
 const resources=new Map(),conflicts=[];
 for(const e of events)for(const k of ["teacher:"+e.teacher,"room:"+e.room,...e.groups.map(g=>"group:"+g)]){
  let key=JSON.stringify([e.week,e.day,e.period,k]);if(!resources.has(key))resources.set(key,[]);resources.get(key).push(e.id);
 }
 for(const [key,ids] of resources)if(ids.length>1)conflicts.push({key:JSON.parse(key),ids});
 return {records,events,conflicts};
}
