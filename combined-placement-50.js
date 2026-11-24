/* 0.50 — simultaneous time and room changes, with fresh source and target audit. */
function combinedRooms50(ctx){
 const rooms=new Map();for(const q of ctx.ready.cards){if(!q.time||!q.room||!q.building||!q.type)continue;const k=q.roomKey;if(!rooms.has(k))rooms.set(k,{room:q.room,building:q.building,types:new Set()});rooms.get(k).types.add(key26(q.type))}
 return rooms;
}
function timeFrame50(ctx,q,date,start){
 if(!q?.eligible||!starts29.includes(start)||q.date===date&&q.start===start||monday32(q.date)!==monday32(date))return {reason:"time"};
 const w=swapWeek46(ctx,q),o=ctx.occ.get(q.id);
 if(!w||!w.dates.includes(date)||!o?.valid||!o.teacherComplete||!o.roomComplete||o.knownRooms.length!==1||o.knownTeachers.length!==1||o.knownRooms[0]!==q.roomKey||o.knownTeachers[0]!==q.teacher)return {reason:"source"};
 const dates=[...new Set([q.date,date])],next={...q,date,start,end:start+q.end-q.start},position=v=>v.date+"|"+String(v.start).padStart(4,"0"),sign=(a,b)=>Math.sign(position(a).localeCompare(position(b)));
 if((ctx.subjectWeeks.get(JSON.stringify([q.group,w.monday,key26(q.subject)]))||[]).some(v=>v.id!==q.id&&(!v.time||sign(q,v)!==sign(next,v))))return {reason:"subject-order"};
 const plans={};
 for(const kind of ["group","teacher"]){
  const id=kind==="group"?q.group:q.teacher,idx=kind==="group"?ctx.groupDays:ctx.teacherDays;
  const before=dates.map(d=>{const a=idx.get(ctx.key(id,d))||[];return kind==="teacher"?unique29(a):a});
  if(!before[0].some(v=>v.id===q.id)||!before.at(-1).length||before.some(a=>a.some(v=>!v.time||kind==="teacher"&&v.teacher!==q.teacher)||collision29(a)))return {reason:"day"};
  const after=before.map((a,i)=>[...a.filter(v=>v.id!==q.id),...(dates[i]===date?[next]:[])]);
  if(after.some(collision29))return {reason:"collision"};
  if(dates.length===1&&sorted29(before[0]).map(v=>v.id).join("|")!==sorted29(after[0]).map(v=>v.id).join("|"))return {reason:"order"};
  const a=scoreDays33(before),b=scoreDays33(after);
  if(!a||!b||b.activeDays>a.activeDays||b.windows>a.windows||b.span>a.span||b.maxSpan>a.maxSpan||b.maxBlocks>a.maxBlocks||a.lessonMinutes!==b.lessonMinutes)return {reason:"load"};
  plans[kind]={before,after,a,b};
 }
 return {q,next,w,o,plans,dates,timeGain:plans.group.a.windows>plans.group.b.windows||plans.group.a.span>plans.group.b.span||plans.group.a.activeDays>plans.group.b.activeDays||plans.teacher.a.windows>plans.teacher.b.windows||plans.teacher.a.span>plans.teacher.b.span};
}
function combinedResource50(ctx,frame,room){
 const {q,next,o}=frame,moved={...o,date:next.date,start:next.start,end:next.end,knownRooms:[key26(room)]},unknown=new Set(),surname=q.teacher.split(" ")[0];
 for(const date of frame.dates)for(const v of ctx.dateCards.get(date)||[]){
  if(v.id===q.id)continue;const e=ctx.occ.get(v.id),original=date===q.date&&(!e.valid||e.start<q.end&&q.start<e.end),target=date===next.date&&(!e.valid||e.start<next.end&&next.start<e.end);
  if(!original&&!target)continue;
  if(original&&possibleConflict31(e,o).length||target&&possibleConflict31(e,moved).length)return {reason:"resource"};
  const tokens=(value,regex)=>key26(value).split(regex);
  if(e.unknownTeachers.some(t=>tokens(t,/[^\p{L}-]+/u).includes(surname))||e.unknownRooms.some(r=>original&&tokens(r,/[^\p{L}\p{N}-]+/u).includes(q.roomKey)||target&&tokens(r,/[^\p{L}\p{N}-]+/u).includes(key26(room))))return {reason:"ambiguous-match"};
  if(!e.valid||!e.teacherComplete||!e.roomComplete)unknown.add(e.id);
 }
 return {unknown:[...unknown].sort()};
}
function combinedPlacement50(ctx,frame,r,config){
 const {q,next,w,plans}=frame;if(r.room===q.room||!r.types.has(key26(q.type)))return {reason:"room-type"};
 const floor={},edges={};
 for(const kind of ["group","teacher"]){
  const p=plans[kind],after=p.after.map(a=>a.map(v=>v.id===q.id?{...v,room:r.room,roomKey:key26(r.room),building:r.building}:v));
  try{edges[kind]=edges39(p.before,after)}catch(e){return {reason:"route"}}
  const a=floorDay41(p.before,config.register),b=floorDay41(after,config.register);floor[kind]={before:a,after:b,saved:a.levels-b.levels};
 }
 const spaceGain=edges.group.before>edges.group.after||edges.teacher.before>edges.teacher.after||floor.group.saved+floor.teacher.saved>0&&[floor.group,floor.teacher].every(f=>!f.before.unknown&&!f.after.unknown&&f.saved>=0);
 if(!frame.timeGain&&!spaceGain)return {reason:"no-gain"};
 const res=combinedResource50(ctx,frame,r.room);if(res.reason)return res;
 if(config.strict&&res.unknown.length)return {reason:"unclear"};
 return {move:{id:q.id,group:q.group,course:q.course,subject:q.subject,type:q.type,teacher:q.teacherName,kind:"combined",date:q.date,weekStart:w.monday,weekType:w.status,oldDate:q.date,newDate:next.date,oldStart:q.start,oldEnd:q.end,newStart:next.start,newEnd:next.end,oldRoom:q.room,newRoom:r.room,oldBuilding:q.building,newBuilding:r.building,groupBefore:plans.group.a,groupAfter:plans.group.b,teacherBefore:plans.teacher.a,teacherAfter:plans.teacher.b,groupSaved:edges.group.before-edges.group.after,teacherSaved:edges.teacher.before-edges.teacher.after,floor,uncertainty:res.unknown.length,unresolvedIds:res.unknown}};
}
function combinedCandidates50(ctx,config,limit=3000){
 const rooms=combinedRooms50(ctx),results=[],reasons={},count=k=>reasons[k]=(reasons[k]||0)+1;let frames=0,placements=0,truncated=false;
 outer:for(const q of ctx.ready.cards){
  if(!q.eligible||config.course!=="all"&&String(q.course)!==config.course)continue;
  const w=swapWeek46(ctx,q);if(!w||config.week!=="all"&&w.status!==config.week)continue;
  for(const date of ctx.datesByGroup.get(q.group)||[]){
   if(monday32(date)!==w.monday)continue;
   for(const start of starts29){if(date===q.date&&start===q.start)continue;frames++;const frame=timeFrame50(ctx,q,date,start);if(frame.reason){count(frame.reason);continue}
    for(const room of rooms.values()){
     if(room.room===q.room||!room.types.has(key26(q.type)))continue;placements++;
     const v=combinedPlacement50(ctx,frame,room,config);if(v.reason){count(v.reason);continue}results.push(v.move);
     if(results.length>=limit){truncated=true;break outer}
    }
   }
  }
 }
 return {checked:ctx.ready.checked,frames,placements,results,reasons,truncated,limit};
}
function verifyCombined50(ctx,x,config,rooms){
 const q=ctx.byId.get(x.id),r=rooms.get(key26(x.newRoom)),f=timeFrame50(ctx,q,x.newDate,x.newStart);
 if(f.reason||!r)return false;const result=combinedPlacement50(ctx,f,r,config).move;
 return !!result&&result.newEnd===x.newEnd&&result.newBuilding===x.newBuilding&&result.oldRoom===x.oldRoom&&result.oldDate===x.oldDate&&result.oldStart===x.oldStart&&result.uncertainty===x.uncertainty;
}
