/* 0.48: directed three-room cycles, preserving the entire occupied room set. */
function validCycle48(moves){
 if(!Array.isArray(moves)||![2,3].includes(moves.length))return false;
 const a=moves[0],old=new Set(moves.map(x=>x.oldRoom)),next=new Set(moves.map(x=>x.newRoom));
 if(old.size!==moves.length||next.size!==moves.length||new Set(moves.map(x=>x.id)).size!==moves.length||[...old].some(r=>!next.has(r)))return false;
 if(moves.some(x=>!x.swapKey||x.swapKey!==a.swapKey||x.kind!=="room"||x.oldRoom===x.newRoom||x.oldDate!==a.oldDate||x.newDate!==a.newDate||x.newDate!==x.oldDate||x.oldStart!==a.oldStart||x.newStart!==a.newStart||x.oldEnd!==a.oldEnd||x.newEnd!==a.newEnd||x.oldStart!==x.newStart||x.oldEnd!==x.newEnd))return false;
 return true;
}
function cycles48(ctx,register,requireRoom,strict,limit=500){
 if(register.checked!==ctx.ready.checked)throw Error("Паспорт относится к другому снимку");
 const slots=new Map(),days=new Map(),results=[],reasons={};let edges=0,cycles=0,truncated=false;
 for(const e of ctx.occ.values()){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e)}
 for(const q of ctx.ready.cards){
  const w=swapWeek46(ctx,q),o=ctx.occ.get(q.id);
  if(!w||!o?.valid||!o.roomComplete||!o.teacherComplete||o.knownRooms.length!==1||o.knownRooms[0]!==q.roomKey)continue;
  const k=JSON.stringify([q.date,q.start,q.end,key26(q.type),w.status]);
  if(!slots.has(k))slots.set(k,[]);slots.get(k).push({q,w,o});
 }
 outer:for(const list of slots.values()){
  const day=days.get(list[0].q.date)||[],eligible=list.filter(a=>!day.some(e=>e.id!==a.q.id&&possibleConflict31(e,a.o).length)),adj=new Map();
  for(const a of eligible){const m=new Map();adj.set(a.q.id,m);for(const b of eligible){
   if(a===b||a.q.group===b.q.group||a.q.teacher===b.q.teacher||a.q.roomKey===b.q.roomKey)continue;
   const x=swapMove46(a.q,b.q,a.w),route=swapRoute46(ctx,a.q,x,register);edges++;
   if(route)m.set(b.q.id,{x,route,b});
  }}
  for(const a of eligible)for(const ab of adj.get(a.q.id).values()){
   const b=ab.b;if(a.q.id.localeCompare(b.q.id)>=0)continue;
   for(const bc of adj.get(b.q.id).values()){
    const c=bc.b;if(c===a||a.q.id.localeCompare(c.q.id)>=0||a.q.group===c.q.group||a.q.teacher===c.q.teacher||a.q.roomKey===c.q.roomKey)continue;
    const ca=adj.get(c.q.id).get(a.q.id);if(!ca)continue;
    cycles++;const links=[ab,bc,ca],ids=new Set([a.q.id,b.q.id,c.q.id]),others=day.filter(e=>!ids.has(e.id)),moves=links.map(v=>v.x),routes=links.map(v=>v.route);
    const gain={groupCross:0,teacherCross:0,groupLevels:0,teacherLevels:0};
    for(const r of routes){gain.groupCross+=r.group.cross;gain.teacherCross+=r.teacher.cross;gain.groupLevels+=r.group.levels;gain.teacherLevels+=r.teacher.levels}
    if(!Object.values(gain).some(v=>v>0)){reasons.noGain=(reasons.noGain||0)+1;continue}
    const unknown=others.filter(e=>(!e.valid||e.start<a.q.end&&a.q.start<e.end)&&(!e.valid||!e.teacherComplete||!e.roomComplete)).map(e=>e.id);
    if(strict&&unknown.length){reasons.unclear=(reasons.unclear||0)+1;continue}
    const finalOcc=[a,b,c].map((v,i)=>({...v.o,knownRooms:[key26(moves[i].newRoom)]}));
    if(finalOcc.some((o,i)=>others.some(e=>possibleConflict31(e,o).length)||finalOcc.some((p,j)=>j!==i&&possibleConflict31(p,o).length)||roomBusy38(others,o.id,o.knownRooms[0],a.q.start,a.q.end).conflicts.length)){reasons.conflict=(reasons.conflict||0)+1;continue}
    const final=apply39(ctx.ready.cards,moves),passport=check40(ctx,final,moves,register,requireRoom);
    if(!passport.ok){reasons.passport=(reasons.passport||0)+1;continue}
    const key=JSON.stringify(moves.map(x=>[x.id,x.newRoom]).sort((x,y)=>x[0].localeCompare(y[0])));
    results.push({key,date:a.q.date,weekStart:a.w.monday,weekType:a.w.status,start:a.q.start,end:a.q.end,moves,routes,gain,unknown,passportUnknown:passport.unknown});
    if(results.length>=limit){truncated=true;break outer}
   }
  }
 }
 results.sort((a,b)=>b.gain.groupCross+b.gain.teacherCross-a.gain.groupCross-a.gain.teacherCross||b.gain.groupLevels+b.gain.teacherLevels-a.gain.groupLevels-a.gain.teacherLevels||a.unknown.length-b.unknown.length||a.key.localeCompare(b.key));
 return {checked:ctx.ready.checked,edges,cycles,results,reasons,truncated,limit};
}
