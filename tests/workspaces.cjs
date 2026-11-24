// Regression tests for merged KANTOR workspaces. DOM stub, not a browser visual test.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const index=read("index.html"),names=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const core=index.match(/<script>\n"use strict";([\s\S]*?)<\/script>/)[1];
const source=names.slice(0,3).map(read).join("\n")+core+names.slice(3).map(read).join("\n");
const nodes={},doc={getElementById:id=>nodes[id]??=({innerHTML:"",textContent:"",style:{},addEventListener(){}}),querySelectorAll:()=>[]};
const inputs={baseline:JSON.parse(read("data/review-08/baseline-09.json")),calendar:JSON.parse(read("data/calendar-11/manifest.json")),spatial:JSON.parse(read("data/calendar-spatial-14.json")),points:JSON.parse(read("data/osm-address-pilot-15.json")),walk:JSON.parse(read("data/osm-walk-pilot-15.json")),course:JSON.parse(read("data/normalized/course-1.json")),programs:JSON.parse(read("data/electronic-groups-09.json"))};
function test(){
 init(demo());
 visual12.baseline=inputs.baseline;visual12.calendar=inputs.calendar;
 survey15.baseline=inputs.spatial;survey15.points=inputs.points;survey15.walk=inputs.walk;
 group07.data=inputs.course;programs10.data=inputs.programs;calendar11.data=inputs.calendar;
 let results=[];
 for(let w of workspaces16){
  tab=w.id;opened16.clear();render();let closed=w.tools.every(t=>!visible16(t[0]));
  for(let [id] of w.tools)opened16.add(id);
  render();let h=$("screen").innerHTML,ids=[...h.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
  results.push({page:w.id,closed,html:h.length,duplicates:ids.filter((v,i)=>ids.indexOf(v)!==i),expanded:w.tools.every(t=>visible16(t[0]))});
 }
 return {pages:workspaces16.length,legacy:tabs.length,covered:tabs.every(([id])=>workspaces16.some(w=>w.id===id||w.tools.some(t=>t[0]===id))),results};
}
const result=new Function("performance","document","inputs",source+"\nreturn ("+test.toString()+")()")({now:()=>Date.now()},doc,inputs);
console.log(JSON.stringify(result,null,2));
assert.equal(result.pages,10);assert.equal(result.legacy,28);assert.ok(result.covered);
for(const r of result.results){assert.ok(r.closed&&r.expanded,r.page);assert.ok(r.html>100,r.page);assert.deepEqual(r.duplicates,[],r.page)}

const manifest=inputs.calendar;
const files=manifest.groups.map(g=>JSON.parse(read("data/calendar-11/"+g.file)));
const roomChecks=new Function("manifest","files",read("rooms-18.js")+"\nreturn {aggregateRooms18,roomClass18,roomEvidence18};")(manifest,files);
const cat=JSON.parse(read("institute-catalog.js").split(/=(.*)/s)[1].trim().replace(/;$/,""));
const inventory=roomChecks.aggregateRooms18(manifest,files,cat.buildings);
assert.equal(inventory.total,manifest.totals.cards);
assert.equal(inventory.recognized+inventory.unknown.reduce((s,u)=>s+u.cards,0),inventory.total);
assert.ok(inventory.rooms.length>0);
assert.equal(new Set(inventory.rooms.map(r=>r.id)).size,inventory.rooms.length);
assert.ok(inventory.rooms.every(r=>r.intervals<=r.cards&&r.groups<=83&&r.groups<=r.cards));
assert.equal(roomChecks.roomClass18("02-108; 02-108",cat.buildings).room,"02-108");
assert.equal(roomChecks.roomClass18("02-108; 02-109",cat.buildings).reason,"multiple");
assert.equal(roomChecks.roomClass18("29-218",cat.buildings).reason,"unresolved");
assert.throws(()=>roomChecks.aggregateRooms18(manifest,files.slice(1),cat.buildings));
const id=inventory.rooms[0].id,passport={id,capacity:40,equipment:"Synthetic test only",source:"Synthetic test evidence",verifiedDate:"2026-11-24"};
const envelope=rooms=>({version:"0.18",checked:inventory.checked,rooms});
assert.equal(roomChecks.roomEvidence18(envelope([passport]),inventory)[id].capacity,40);
assert.throws(()=>roomChecks.roomEvidence18(envelope([{...passport,capacity:0}]),inventory));
assert.throws(()=>roomChecks.roomEvidence18(envelope([{...passport,verifiedDate:"2026-02-30"}]),inventory));
assert.throws(()=>roomChecks.roomEvidence18(envelope([passport,passport]),inventory));
assert.throws(()=>roomChecks.roomEvidence18(envelope([{...passport,source:""}]),inventory));
console.log("Room inventory:",JSON.stringify({total:inventory.total,recognized:inventory.recognized,rooms:inventory.rooms.length,unknown:inventory.total-inventory.recognized}));

const surveySource=read("survey-15.js");
const routeCalc=new Function(surveySource.slice(0,surveySource.indexOf("function renderSurvey15"))+"\n"+read("route-analysis-22.js")+"\nreturn routeAnalysis22;")();
const settings22={buffer:5,factor:1.25,tight:5};
const routeReport=routeCalc(inputs.spatial,inputs.points,inputs.walk,{},settings22);
assert.equal(routeReport.total,774);
assert.equal(routeReport.totals.model,381);
assert.equal(routeReport.totals.unknown,393);
assert.equal(routeReport.totals.field,0);
assert.equal(routeReport.totals.short,494);
assert.equal(routeReport.curve[19].count,624);
assert.equal(routeReport.missingKnown.length,6);
assert.equal(routeReport.totals.model+routeReport.totals.unknown+routeReport.totals.field,routeReport.total);
const mockSample22=i=>({id:"synthetic-"+i,date:"2026-11-24",condition:"normal",minutes:15+i,fromEntrance:"test A",toEntrance:"test B",source:"synthetic test",meters:null});
const routeMeasured=routeCalc(inputs.spatial,inputs.points,inputs.walk,{"12|01":[1,2,3].map(mockSample22)},settings22);
assert.equal(routeMeasured.totals.field,88);
assert.equal(routeMeasured.totals.model,293);
assert.equal(routeMeasured.totals.lateField,57);
const inconsistent=[1,2,3].map(mockSample22);inconsistent[2].toEntrance="different";
assert.equal(routeCalc(inputs.spatial,inputs.points,inputs.walk,{"12|01":inconsistent},settings22).totals.field,0);
const corrupted=JSON.parse(JSON.stringify(inputs.spatial));corrupted.strict.routes[0].count++;
assert.throws(()=>routeCalc(corrupted,inputs.points,inputs.walk,{},settings22));
console.log("Route analysis:",JSON.stringify(routeReport.totals));

const pilotComparison=new Function(source+`
pilotWalk="5";pilotBuffer=5;pilotExample24=true;iter03=1000;
pilotRuns=[solve03(profiles03[0],2026)];pilotChoice=0;
const r=pilotRuns[0];
if(!r.arr||r.audit.length)throw Error("No feasible synthetic-route pilot");
const c=comparisonMetrics24(fifthPilot.records,r.arr);
const html=renderComparison24();
return {before:c.base,after:c.next,changed:c.changes.length,count:r.arr.length,
  audit:r.audit,html,expectedMoves:r.metrics[5]};
`)();
assert.equal(pilotComparison.count,41);
assert.deepEqual(pilotComparison.audit,[]);
assert.equal(pilotComparison.changed,pilotComparison.expectedMoves);
assert.match(pilotComparison.html,/Действующий PDF/);
assert.match(pilotComparison.html,/Предложение/);
assert.match(pilotComparison.html,/Условный пример, не измерение/);
console.log("Pilot comparison:",JSON.stringify({before:pilotComparison.before,after:pilotComparison.after,changed:pilotComparison.changed}));

const diagnosticApi=new Function(read("diagnostics-25.js")+"\nreturn {dayMetrics25,groupDiag25,aggregateDiag25};")();
const diagnostic=diagnosticApi.aggregateDiag25(manifest,files,cat);
assert.equal(diagnostic.groups.length,83);
assert.equal(diagnostic.totals.cards,2599);
assert.equal(diagnostic.totals.activeDays,804);
assert.equal(diagnostic.totals.blocks,2555);
assert.equal(diagnostic.totals.multiBlocks,42);
assert.equal(diagnostic.totals.usableDays+diagnostic.totals.unusableDays,diagnostic.totals.activeDays);
assert.equal(diagnostic.totals.span,diagnostic.totals.lessonMinutes+diagnostic.totals.breakMinutes);
assert.equal(diagnostic.courses.reduce((n,c)=>n+c.groups,0),83);
assert.equal(diagnostic.courses.reduce((n,c)=>n+c.windows,0),diagnostic.totals.windows);
const card25=(start,end)=>({timing:{start,end}});
const duplicateDay25=diagnosticApi.dayMetrics25([card25(540,635),card25(540,635),card25(780,875)],"test");
assert.equal(duplicateDay25.windows,1);
assert.equal(duplicateDay25.blocks,2);
assert.equal(duplicateDay25.multiBlocks,1);
assert.equal(duplicateDay25.lessonMinutes,190);
assert.equal(duplicateDay25.breakMinutes,145);
assert.equal(duplicateDay25.span,335);
assert.equal(diagnosticApi.dayMetrics25([card25(540,635),card25(null,null)],"test").usable,false);
assert.throws(()=>diagnosticApi.aggregateDiag25(manifest,files.slice(1),cat));
console.log("Calendar diagnostics:",JSON.stringify(diagnostic.totals));

const resourceApi26=new Function(read("diagnostics-25.js")+"\n"+read("rooms-18.js")+"\n"+read("resource-diagnostics-26.js")+"\nreturn {resourceAggregate26,teacherClass26};")();
const observed26=resourceApi26.resourceAggregate26(manifest,files,cat);
assert.equal(observed26.total,2599);
for(const kind of ["teachers","rooms"]){
 const records=observed26[kind];
 assert.ok(records.length>0);
 assert.equal(observed26.coverage[kind]+Object.values(observed26.unknown[kind]).reduce((s,n)=>s+n,0),2599);
 assert.equal(records.reduce((s,r)=>s+r.cards,0),observed26.coverage[kind]);
 assert.ok(records.every(r=>r.cards===r.signatures+r.mergedCards&&r.minutes<=r.span&&r.pairs>=r.examples.length));
}
assert.equal(resourceApi26.teacherClass26("Иванов И.И.").reason,"unresolved");
assert.equal(resourceApi26.teacherClass26("Преподаватель не назначен").reason,"unresolved");
assert.equal(resourceApi26.teacherClass26("Иванов Иван Иванович; Петров Петр Петрович").reason,"multiple");
const groups26=manifest.groups.map(g=>({...g,cards:0}));
const files26=groups26.map(g=>({checked:manifest.checked,group:g.group,comparisons:[]}));
const sample26={calendar:{date:"2026-11-24",subject:"Тест A",type:"Лекция",teachers:"Иванов Иван Иванович",rooms:"02-101"},timing:{start:540,end:635}};
files26[0].comparisons=[sample26];groups26[0].cards=1;
files26[1].comparisons=[sample26,{...sample26,calendar:{...sample26.calendar,subject:"Тест B"},timing:{start:600,end:660}}];groups26[1].cards=2;
const fixture26=resourceApi26.resourceAggregate26({...manifest,groups:groups26,totals:{cards:3}},files26,cat);
for(const k of ["teachers","rooms"]){const r=fixture26[k][0];assert.equal(r.cards,3);assert.equal(r.signatures,2);assert.equal(r.mergedCards,1);assert.equal(r.minutes,120);assert.equal(r.pairs,1);}
console.log("Observed resources:",JSON.stringify({coverage:observed26.coverage,unknown:observed26.unknown,teachers:observed26.teachers.length,rooms:observed26.rooms.length}));

const bundleApi27=new Function(read("calendar-current-27.js")+"\nreturn {validateBundle27};")();
const bundle27={version:"0.27",manifest,files,period:{start:"2026-11-23",end:"2026-12-06"}};
assert.equal(bundleApi27.validateBundle27(bundle27,cat).files.size,83);
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,files:files.slice(1)},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,manifest:{...manifest,complete:false}},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,manifest:{...manifest,totals:{...manifest.totals,cards:2600}}},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,files:[{...files[0],checked:"invalid"},...files.slice(1)]},cat));

const api28=new Function(read("diagnostics-25.js")+"\n"+read("spatial-current-28.js")+"\n"+read("discipline-diagnostics-28.js")+"\nreturn {spatialReport28,disciplineAggregate28,disciplineGroup28,classifyLocation28};")();
const aliases28=JSON.parse(read("data/location-aliases-14.json"));
const spatial28=api28.spatialReport28(manifest,files,cat,aliases28);
for(const mode of ["strict","expanded"]){
 for(const [k,v] of Object.entries(inputs.spatial[mode].totals))assert.equal(spatial28[mode].totals[k],v);
 const canonical=r=>Object.fromEntries(r.routes.map(x=>[x.from+"|"+x.to,{count:x.count,minimum:x.minimum,gaps:x.gaps}]));
 assert.deepEqual(canonical(spatial28[mode]),canonical(inputs.spatial[mode]));
 for(const g of spatial28[mode].groups){const prev=inputs.spatial[mode].groups.find(x=>x.group===g.group);for(const [k,v] of Object.entries(g))if(k!=="group"&&k!=="course")assert.equal(v,prev[k]||0);}
}
for(const [k,v] of Object.entries(inputs.spatial.previous))assert.equal(spatial28.previous[k],v);
assert.equal(api28.classifyLocation28("01-213; 01-214",cat.buildings,aliases28.aliases,"strict").building,"01");
assert.equal(api28.classifyLocation28("01-213;",cat.buildings,aliases28.aliases,"numbered").building,null);
assert.equal(api28.classifyLocation28("01-213 / ",cat.buildings,aliases28.aliases,"numbered").building,null);
assert.equal(api28.classifyLocation28(" 01-213 ",cat.buildings,aliases28.aliases,"numbered").building,"01");
assert.equal(api28.classifyLocation28("01-213;",cat.buildings,aliases28.aliases,"strict").building,"01");
assert.equal(api28.classifyLocation28("01-213; 01-214",cat.buildings,aliases28.aliases,"numbered").building,null);
assert.equal(api28.classifyLocation28("01-213; 12-214",cat.buildings,aliases28.aliases,"strict").building,null);
assert.equal(api28.classifyLocation28("29-218",cat.buildings,aliases28.aliases,"strict").building,null);
assert.equal(api28.classifyLocation28("17-ФОС",cat.buildings,aliases28.aliases,"strict").building,null);
assert.equal(api28.classifyLocation28("17-ФОС",cat.buildings,aliases28.aliases,"expanded").building,"17А");
assert.throws(()=>api28.spatialReport28(manifest,files.slice(1),cat,aliases28));
const disciplinesReport28=api28.disciplineAggregate28(manifest,files,cat);
assert.deepEqual(disciplinesReport28.totals,{cards:2599,unclassified:0,lecture:889,practice:1471,other:239,overlapCandidates:20,sequenceEligible:704,practiceFirst:410,sameStart:0});
assert.equal(disciplinesReport28.courses.reduce((n,c)=>n+c.cards,0),2599);
assert.throws(()=>api28.disciplineAggregate28(manifest,files.slice(1),cat));
const sample28=(date,start,end,type)=>({calendar:{date,subject:"Тест",type},timing:{start,end}});
const synthetic28=api28.disciplineGroup28({group:"test",course:1,comparisons:[sample28("2026-11-23",540,635,"Практика"),sample28("2026-11-23",540,635,"Практика"),sample28("2026-11-23",600,660,"Лекция"),sample28("2026-11-24",540,635,"Лекция"),sample28("2026-11-24",780,875,"Практика")]});
assert.equal(synthetic28.totals.cards,5);
assert.equal(synthetic28.totals.practiceFirst,1);
assert.equal(synthetic28.subjects[0].intervals,4);
assert.equal(synthetic28.subjects[0].sameDay,2);
assert.equal(synthetic28.subjects[0].overlap,1);
assert.equal(synthetic28.subjects[0].consecutive,1);
console.log("Updated spatial and disciplines:",JSON.stringify({strict:spatial28.strict.totals,disciplines:disciplinesReport28.totals}));

const api29=new Function(["diagnostics-25.js","rooms-18.js","resource-diagnostics-26.js","spatial-current-28.js","opportunities-29.js"].map(read).join("\n")+"\nreturn {readiness29,candidates29,auditMove29};")();
const ready29=api29.readiness29(manifest,files,cat,aliases28),moves29=api29.candidates29(ready29);
assert.equal(ready29.totals.cards,2599);
assert.equal(ready29.groups.length,83);
assert.equal(ready29.groups.reduce((n,g)=>n+g.eligible,0),ready29.totals.eligible);
assert.equal(moves29.eligible,ready29.totals.eligible);
assert.equal(Object.values(moves29.groupCounts).reduce((n,v)=>n+v,0),moves29.results.length);
assert.ok(moves29.results.every(x=>api29.auditMove29(ready29.cards,x)));
assert.throws(()=>api29.readiness29(manifest,files.slice(1),cat,aliases28));
const gs29=manifest.groups.map(g=>({...g,cards:0})),fs29=gs29.map(g=>({group:g.group,course:g.course,checked:manifest.checked,comparisons:[]}));
const card29=(start,subject,teacher,rooms)=>({calendar:{date:"2026-11-24",subject,type:"Практика",teachers:teacher,rooms},timing:{start,end:start+95}});
const A29="Иванов Иван Иванович",B29="Петров Петр Петрович";
function run29(){gs29.forEach((g,i)=>g.cards=fs29[i].comparisons.length);const m={...manifest,groups:gs29,totals:{cards:gs29.reduce((n,g)=>n+g.cards,0)}};const ready=api29.readiness29(m,fs29,cat,aliases28);return {ready,moves:api29.candidates29(ready)};}
fs29[0].comparisons=[card29(540,"А",A29,"02-101"),card29(780,"Б",B29,"02-102")];
let test29=run29();
assert.equal(test29.moves.results.length,2);
assert.ok(test29.moves.results.every(r=>r.groupAfter.windows===0));
assert.equal(api29.auditMove29(test29.ready.cards,{...test29.moves.results[0],newEnd:999}),false);
fs29[1].comparisons=[card29(655,"Занято",A29,"02-103")];
assert.ok(run29().moves.results.every(r=>r.subject!=="А"));
fs29[1].comparisons=[card29(655,"Занято",B29,"02-101")];
assert.equal(run29().moves.results.length,0);
fs29[1].comparisons=[];fs29[0].comparisons[1]=card29(780,"Б",B29,"03-102");
assert.equal(run29().moves.results.length,0);
fs29[0].comparisons[1]=card29(780,"Б",B29,"02-102");fs29[1].comparisons=[fs29[0].comparisons[0]];
assert.ok(run29().moves.results.every(r=>r.subject!=="А"));
fs29[1].comparisons=[card29(655,"Занято","Иванов И.И.","02-103")];
assert.ok(run29().moves.results.every(r=>r.subject!=="А"));
fs29[0].comparisons=[card29(540,"А",A29,"02-101а"),card29(780,"Б",B29,"02-102")];
fs29[1].comparisons=[card29(655,"Занято",B29,"02-101А")];
assert.equal(run29().moves.results.length,0);
console.log("Preliminary moves:",JSON.stringify({readiness:ready29.totals,attempts:moves29.attempts,results:moves29.results.length,reasons:moves29.reasons}));

const packedApi30=new Function(read("calendar-current-27.js")+"\nreturn {validatePacked30};")();
const parts30=Array.from({length:6},(_,i)=>JSON.parse(read("data/calendar-packed-30/part-0"+(i+1)+".json")));
const map30=packedApi30.validatePacked30(manifest,parts30);
assert.equal(map30.size,83);
for(let i=0;i<files.length;i++)assert.deepEqual(map30.get(manifest.groups[i].file),files[i]);
assert.throws(()=>packedApi30.validatePacked30(manifest,parts30.slice(1)));
assert.throws(()=>packedApi30.validatePacked30(manifest,[...parts30.slice(0,5),parts30[0]]));
assert.throws(()=>packedApi30.validatePacked30(manifest,[{...parts30[0],checked:"wrong"},...parts30.slice(1)]));
const src30=["diagnostics-25.js","rooms-18.js","resource-diagnostics-26.js","spatial-current-28.js","discipline-diagnostics-28.js","opportunities-29.js","joint-plans-30.js","analytical-report-30.js"].map(read).join("\n");
const api30=new Function("instituteCatalog","esc","calendarStatus27",src30+"\nreturn {readiness29,candidates29,jointPlans30,auditJoint30,reportData30,reportContent30,prepareJoint30,prepareReport30,opportunities29,renderJoint30,renderReport30,renderUncertainty30};")(cat,x=>String(x??""),()=> "Historical fixture");
const ready30=api30.readiness29(manifest,files,cat,aliases28),screen30=api30.candidates29(ready30);
assert.deepEqual(ready30.totals,{cards:2599,unknownTime:0,unknownTeacher:528,unknownRoom:653,unknownBuilding:421,nonstandard:5,sharedOrRepeated:871,eligible:1179});
assert.equal(screen30.attempts,448);
assert.equal(screen30.results.length,2);
const plans30=api30.jointPlans30(ready30,screen30);
assert.deepEqual(plans30.map(p=>[p.moves.length,p.windows,p.spanMinutes,p.unresolvedMoves]),[[2,2,230,2],[2,2,230,2],[0,0,0,0]]);
assert.equal(plans30[0].before.group.windows,92);
assert.equal(plans30[0].after.group.windows,90);
assert.equal(plans30[0].before.group.lessonMinutes,plans30[0].after.group.lessonMinutes);
assert.equal(plans30[0].after.teacher.windows,208);
assert.ok(plans30.every(p=>api30.auditJoint30(ready30,p.moves,screen30.results).ok));
assert.equal(api30.auditJoint30(ready30,[screen30.results[0],screen30.results[0]],screen30.results).ok,false);
assert.equal(api30.auditJoint30(ready30,[{...screen30.results[0],unresolved:0}],screen30.results).ok,false);
const reportFixture30=api30.reportData30({manifest,source:"frozen"},files,aliases28,ready30,screen30);
assert.deepEqual(reportFixture30.teachers,{recognizedLabels:162,covered:2071,excluded:528,overlapPairs:15});
assert.deepEqual(reportFixture30.rooms,{recognizedLabels:115,covered:1946,excluded:653,overlapPairs:6});
assert.equal(reportFixture30.spatial.short,494);
assert.equal(reportFixture30.groups.windows,92);
Object.assign(api30.opportunities29,{data:screen30,readiness:ready30,snapshot:{manifest,source:"frozen"}});
api30.prepareJoint30(ready30,screen30);api30.prepareReport30({manifest,source:"frozen"},files,aliases28,ready30,screen30);
const html30=api30.renderJoint30()+api30.renderReport30();
assert.match(html30,/Пакет изменений/);
assert.match(html30,/Аналитическое заключение/);
assert.match(html30,/2599/);
assert.match(api30.renderUncertainty30(screen30.results[0]),/Что необходимо уточнить/);
const ids30=[...html30.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids30.length,new Set(ids30).size);
// Two individually valid moves of different groups to the same room and same time
// must not be combined. Both groups have one window, with separate teachers.
const g30=manifest.groups.map(g=>({...g,cards:0})),f30=g30.map(g=>({group:g.group,course:g.course,checked:manifest.checked,comparisons:[]}));
const c30=(start,subject,teachers,rooms)=>({calendar:{date:"2026-11-24",subject,type:"Практика",teachers,rooms},timing:{start,end:start+95}});
f30[0].comparisons=[c30(540,"А","Иванов Иван Иванович","02-101"),c30(780,"Б","Петров Петр Петрович","02-102")];
f30[1].comparisons=[c30(780,"В","Сидоров Сидор Сидорович","02-101"),c30(540,"Г","Орлов Олег Олегович","02-103")];
g30[0].cards=2;g30[1].cards=2;
const rr30=api30.readiness29({...manifest,groups:g30,totals:{cards:4}},f30,cat,aliases28),ss30=api30.candidates29(rr30);
const both30=ss30.results.filter(x=>x.room==="02-101"&&x.newStart===655);
assert.equal(both30.length,2);
assert.equal(api30.auditJoint30(rr30,both30,ss30.results).ok,false);
assert.ok(api30.jointPlans30(rr30,ss30).every(p=>p.moves.length<=2&&api30.auditJoint30(rr30,p.moves,ss30.results).ok));
console.log("Joint packages and analytical report:",JSON.stringify({ready:ready30.totals,attempts:screen30.attempts,plans:plans30.map(p=>({id:p.id,moves:p.moves.length,windows:p.windows,minutes:p.spanMinutes,unresolved:p.unresolvedMoves})),teachers:reportFixture30.teachers,rooms:reportFixture30.rooms}));

const src31=["diagnostics-25.js","rooms-18.js","resource-diagnostics-26.js","evidence-register-31.js"].map(read).join("\n");
const api31=new Function("instituteCatalog","esc","calendarStatus27",src31+"\nreturn {reviewRegistry31,decision31,importDecisions31,possibleConflict31,prepareReview31,review31,renderReview31};")(cat,x=>String(x??""),()=> "Historical fixture");
const reg31=api31.reviewRegistry31(manifest,files,cat);
assert.deepEqual(reg31.totals,{cards:2599,streams:272,streamCards:871,multiGroupStreams:272,teacherLabels:23,teacherReviewCards:247,uniqueAliasLabels:0,uniqueAliasCards:0,subgroupCards:366,multiTeacherCards:329,multiRoomCards:180,specialGroupCards:36});
assert.deepEqual(reg31.levels["calendar-and-pdf-resources"],{sets:156,cards:461});
assert.deepEqual(reg31.occupancy.counts,{cards:2599,teacherAny:2396,teacherAll:2352,roomAny:2126,roomAll:2123,bothAll:1980,multiTeacherAll:281,multiRoomAll:177});
assert.throws(()=>api31.reviewRegistry31(manifest,files.slice(1),cat));
const decisionFixture31=api31.decision31(reg31.streams[0].id,"supported","Synthetic test",reg31,"streams");
assert.equal(api31.importDecisions31({version:"0.31",checked:reg31.checked,decisions:[decisionFixture31]},reg31)[decisionFixture31.id].evidence,"Synthetic test");
for(const envelope of [{version:"0.31",checked:"wrong",decisions:[decisionFixture31]},{version:"0.31",checked:reg31.checked,decisions:[decisionFixture31,decisionFixture31]},{version:"0.31",checked:reg31.checked,decisions:[{...decisionFixture31,candidate:"changed"}]}])assert.throws(()=>api31.importDecisions31(envelope,reg31));
assert.throws(()=>api31.decision31(reg31.streams[0].id,"supported","",reg31,"streams"));
assert.throws(()=>api31.decision31(reg31.teacherRows.find(x=>x.kind==="missing").id,"supported","Test",reg31,"teachers"));
const groups31=manifest.groups.map(x=>({...x,cards:0})),files31=groups31.map(x=>({group:x.group,course:x.course,checked:manifest.checked,comparisons:[]}));
const mk31=(teachers,rooms,start=540)=>({calendar:{date:"2026-11-24",subject:"Тест",type:"Лекция",teachers,rooms,time:"09:00-10:35"},timing:{start,end:start+95},status:"needs-review"});
files31[0].comparisons=[mk31("Иванов Иван Иванович; Петров Пётр Петрович","02-101; 02-102"),mk31("Иванов И.И.","02-101",655),mk31("Иванов Игорь Иванович","03-101",780),mk31("Петров П.П.","02-102",895)];groups31[0].cards=4;
files31[1].comparisons=[mk31("Петров Пётр Петрович","02-102")];groups31[1].cards=1;
const fixture31=api31.reviewRegistry31({...manifest,groups:groups31,totals:{cards:5}},files31,cat);
const unique31=fixture31.teacherRows.find(x=>x.kind==="unique-candidate"),multiple31=fixture31.teacherRows.find(x=>x.kind==="multiple-candidates");
assert.equal(unique31.candidates[0],"Петров Пётр Петрович");
assert.equal(multiple31.candidates.length,2);
assert.equal(api31.decision31(unique31.id,"supported","Synthetic test",fixture31,"teachers").candidate,"Петров Пётр Петрович");
assert.throws(()=>api31.decision31(multiple31.id,"supported","Synthetic test",fixture31,"teachers"));
const entries31=fixture31.occupancy.entries;
assert.deepEqual(api31.possibleConflict31(entries31[0],entries31[4]).sort(),["room","teacher"]);
assert.deepEqual(api31.possibleConflict31(entries31[0],entries31[1]),[]);
api31.prepareReview31({manifest,source:"frozen"},files);
for(const mode of ["streams","teachers","subgroups"]){
 const state=api31.review31;state.mode=mode;state.selected=(mode==="streams"?reg31.streams:mode==="teachers"?reg31.teacherRows:reg31.subgroups)[0].id;
 const html=api31.renderReview31(),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
 assert.match(html,/reviewDetail31/);assert.match(html,/reviewImport31/);assert.match(html,/Покрытие возможной занятости/);assert.equal(ids.length,new Set(ids).size);
}
console.log("Evidence registry:",JSON.stringify({totals:reg31.totals,levels:reg31.levels,aliases:reg31.aliasKinds,occupancy:reg31.occupancy.counts}));

const api32=new Function(read("diagnostics-25.js")+"\n"+read("academic-weeks-32.js")+"\n"+read("personal-schedule-23.js")+"\nreturn {weekAggregate32,weekEvidence32,personalWeeks23,monday32,labelType32};")();
const weeks32=api32.weekAggregate32(manifest,files,cat);
assert.equal(weeks32.cycle,"verified-alternation");
assert.deepEqual(weeks32.periods.map(p=>[p.monday,p.end,p.status,p.evidence.upper,p.evidence.lower,p.totals.cards,p.totals.activeDays,p.totals.windows,p.totals.longDays]),[
 ["2026-11-23","2026-11-29","upper",83,0,1313,402,44,185],
 ["2026-11-30","2026-12-06","lower",0,83,1286,402,48,162]
]);
assert.equal(weeks32.periods.reduce((n,p)=>n+p.totals.cards,0),2599);
assert.equal(weeks32.periods.reduce((n,p)=>n+p.totals.windows,0),92);
assert.ok(files.every(f=>api32.personalWeeks23(f).map(w=>w.weekType).join(",")==="upper,lower"));
const both32={sections:[{dates:["2026-11-23"]}],comparisons:[{calendar:{date:"2026-11-23",weekLabel:"Неделя: Обе"}}]};
assert.equal(api32.weekEvidence32(both32)[0].status,"unknown");
const conflict32={...both32,comparisons:[...both32.comparisons,{calendar:{date:"2026-11-23",weekLabel:"Неделя: Верхняя"}},{calendar:{date:"2026-11-24",weekLabel:"Неделя: Нижняя"}}]};
assert.equal(api32.weekEvidence32(conflict32)[0].status,"conflict");
const wrong32={...both32,weekEvidence:{"2026-11-23":[1]},comparisons:[{calendar:{date:"2026-11-23",weekLabel:"Неделя: Верхняя"}}]};
assert.equal(api32.weekEvidence32(wrong32)[0].status,"conflict");
assert.equal(api32.monday32("2027-01-01"),"2026-12-28");
assert.throws(()=>api32.monday32("2026-02-30"));
assert.throws(()=>api32.weekAggregate32(manifest,files.slice(1),cat));
console.log("Academic cycle:",JSON.stringify(weeks32.periods.map(p=>({start:p.monday,type:p.status,evidence:p.evidence,cards:p.totals.cards,windows:p.totals.windows}))));

const src33=["diagnostics-25.js","rooms-18.js","resource-diagnostics-26.js","spatial-current-28.js","opportunities-29.js","evidence-register-31.js","academic-weeks-32.js","interday-33.js"].map(read).join("\n");
const api33=new Function(src33+"\nreturn {readiness29,reviewRegistry31,weekAggregate32,context33,interday33,verifyInterday33,possibleResource33,resourceReview33};")();
const ctx33=api33.context33(ready30,reg31,weeks32,files,manifest),result33=api33.interday33(ctx33);
assert.equal(result33.attempts,22835);
assert.equal(result33.moves.length,0);
assert.deepEqual(result33.reasons,{"inactive-teacher-day":7840,"order-travel-or-overlap":6563,"subject-order":3492,"worse-load":377,"no-gain":12,"ambiguous-or-overlap-day":4210,"week-or-source":340,"explicit-resource":1});
const gs33=manifest.groups.map(g=>({...g,cards:0})),fs33=gs33.map(g=>({group:g.group,course:g.course,checked:manifest.checked,comparisons:[]}));
const teacher33="Иванов Иван Иванович";
const card33=(date,start,subject,teachers=teacher33,rooms="02-101",weekLabel="Неделя: Верхняя")=>({calendar:{date,subject,type:"Практика",teachers,rooms,weekLabel,time:"Тест"},timing:{start,end:start+95},status:"text-and-room-match"});
const source33=[card33("2026-11-23",540,"А"),card33("2026-11-23",655,"Б"),card33("2026-11-23",1010,"В"),card33("2026-11-24",540,"Г")];
fs33[0].comparisons=source33.slice();
function fixture33(){
 gs33.forEach((g,i)=>g.cards=fs33[i].comparisons.length);
 const m={...manifest,groups:gs33,totals:{cards:gs33.reduce((n,g)=>n+g.cards,0)}};
 const r=api33.readiness29(m,fs33,cat,aliases28),v=api33.reviewRegistry31(m,fs33,cat);
 // Synthetic explicit week contract; not a public timetable or inferred week.
 const w={checked:m.checked,cycle:"verified-alternation",byGroup:new Map(gs33.map(g=>[g.group,[{monday:"2026-11-23",status:"upper",dates:["2026-11-23","2026-11-24"]},{monday:"2026-11-30",status:"lower",dates:["2026-11-30"]}]]))};
 return api33.context33(r,v,w,fs33,m);
}
let fx33=fixture33(),q33=fx33.ready.cards.find(q=>q.subject==="В");
const good33=api33.verifyInterday33(fx33,q33,"2026-11-24",655).move;
assert.ok(good33);
assert.equal(good33.groupBefore.windows,2);
assert.equal(good33.groupAfter.windows,0);
assert.equal(good33.groupBefore.span-good33.groupAfter.span,240);
assert.equal(good33.unresolved,0);
assert.equal(api33.verifyInterday33(fx33,q33,"2026-11-30",655).reason,"not-eligible");
fs33[1].comparisons=[card33("2026-11-24",655,"Занято","Петров Петр Петрович","02-101; 02-102")];
fx33=fixture33();q33=fx33.ready.cards.find(q=>q.subject==="В");
assert.equal(api33.verifyInterday33(fx33,q33,"2026-11-24",655).reason,"explicit-resource");
fs33[1].comparisons=[card33("2026-11-24",655,"Занято","Иванов И.И.","02-103")];
fx33=fixture33();q33=fx33.ready.cards.find(q=>q.subject==="В");
assert.equal(api33.verifyInterday33(fx33,q33,"2026-11-24",655).reason,"ambiguous-match");
fs33[1].comparisons=[];fs33[0].comparisons=[...source33.slice(0,3),card33("2026-11-24",540,"Г",teacher33,"03-101")];
fx33=fixture33();q33=fx33.ready.cards.find(q=>q.subject==="В");
assert.equal(api33.verifyInterday33(fx33,q33,"2026-11-24",655).reason,"order-travel-or-overlap");
console.log("Interday screening:",JSON.stringify({attempts:result33.attempts,moves:result33.moves.length,reasons:result33.reasons}));

const resourceReviewFixture33=api33.resourceReview33(ctx33,screen30);
assert.deepEqual(resourceReviewFixture33.map(x=>[x.group,x.previousUnclear,x.remainingUnclear,x.explicitHits.length]),[["ДЭ 16-26",33,28,0],["Д-Э 441",47,33,0]]);


 // Interactive campus pilot: all 16 directional selections, including missing and same-building routes.
const mapPilot53=new Function("p","w","esc",read("spatial-current-28.js")+
  `\nmap53.points=p;map53.walk=w;
 const a=mapGeometry53(p,w),all=[];
 for(const from of a.points)for(const to of a.points){
 map53.from=from.buildingCode;map53.to=to.buildingCode;
 all.push({from:map53.from,to:map53.to,html:renderMap53()});
 }
 return {a,all};`)(inputs.points,inputs.walk,String);
assert.equal(mapPilot53.a.points.length,4);
assert.equal(mapPilot53.a.routes.length,6);
assert.equal(mapPilot53.all.length,16);
for(const r of mapPilot53.a.routes)for(const c of r.geometry){
 const [x,y]=mapPilot53.a.project(...c);
 assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=640&&y>=0&&y<=370);
}
for(const v of mapPilot53.all){
 assert.ok(v.html.includes("<svg"));
 assert.equal(v.html.includes("<polyline"),mapPilot53.a.routes.some(r=>r.from===v.from&&r.to===v.to));
 if(v.from===v.to)assert.ok(v.html.includes("Не рассчитывается"));
}
console.log("Interactive campus: 4 points, 6 directions, 16 combinations");

 // Calendar integrity and repeated-card comparisons.
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,period:undefined},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,period:{start:"2026-11-16",end:"2026-11-29"}},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,period:{start:"2026-02-30",end:"2026-03-15"}},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,files:[{...files[0],sections:[{...files[0].sections[0],dates:["2026-11-30"]},files[0].sections[1]]},...files.slice(1)]},cat));
assert.throws(()=>bundleApi27.validateBundle27({...bundle27,files:[{...files[0],comparisons:[{...files[0].comparisons[0],calendar:{...files[0].comparisons[0].calendar,date:"2026-01-01"}},...files[0].comparisons.slice(1)]},...files.slice(1)]},cat));
const diff54=new Function(read("calendar-updates-52.js")+"\nreturn diffCalendar52;")();
const row54={group:"test",date:"2026-11-24",subject:"test",type:"lecture",teacher:"t",room:"r",start:540,end:635,week:"upper"};
const a54={...row54,sourceStatus:"a"},z54={...row54,sourceStatus:"z"},b54={...row54,sourceStatus:"b"};
const removed54=diff54([a54,z54],[z54]),added54=diff54([z54],[a54,z54]),changed54=diff54([a54,z54],[b54,z54]);
assert.deepEqual([removed54.removed,removed54.sourceChanged,removed54.rows[0].sourceStatus],[1,0,"a"]);
assert.deepEqual([added54.added,added54.sourceChanged,added54.rows[0].sourceStatus],[1,0,"a"]);
assert.deepEqual([changed54.sourceChanged,changed54.rows.length],[1,0]);
console.log("Calendar integrity and repeated-card diff: passed");
