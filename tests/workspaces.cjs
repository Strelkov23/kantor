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
