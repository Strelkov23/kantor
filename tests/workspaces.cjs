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
const bundle27={version:"0.27",manifest,files};
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
