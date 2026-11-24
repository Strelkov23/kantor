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
