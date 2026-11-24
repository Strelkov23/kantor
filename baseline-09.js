/* Source-derived group occupancy diagnostic, not individual attendance or teacher utilization. */
function baseline09(courses,second,catalog){
 const extra=new Map(second.suggestions.map(x=>[x.id,x])), by=new Map(), groupInfo=new Map(catalog.groups.map(x=>[x.id,x]));
 for(const d of courses)for(const r of d.records)for(const g of r.groups)for(const half of r.halves){
  const key=JSON.stringify([g,half,r.day]);if(!by.has(key))by.set(key,[]);
  const s=extra.get(r.id)||r,whole=["ordinary","recovered","named-room"].includes(s.kind),res=s.resources;
  const building=whole&&res.length===1&&Object.hasOwn(catalog.buildings,res[0].building)&&!res[0].nameBoundaryAmbiguous?res[0].building:null;
  by.get(key).push({period:r.period,id:r.id,building});
 }
 const rows=new Map(catalog.groups.map(g=>[g.id,{id:g.id,course:g.course,positions:0,activeDays:0,onePairDays:0,gaps:0,early:0,late:0,maxDaily:0,adjacentEvents:0,knownBuildingPairs:0,unknownBuildingPairs:0,sameBuilding:0,crossBuilding:0}]));
 const routes=new Map(),starts=[540,655,780,895,1010],duration=95;
 for(const [key,events] of by){
  let [g,half,day]=JSON.parse(key),m=rows.get(g);if(!m)throw Error("group outside catalog");
  let a=events.sort((x,y)=>x.period-y.period);
  if(new Set(a.map(x=>x.period)).size!==a.length)throw Error("duplicate group positions "+key);
  m.positions+=a.length;m.activeDays++;m.onePairDays+=Number(a.length===1);m.maxDaily=Math.max(m.maxDaily,a.length);m.early+=Number(a[0].period===0);m.late+=Number(a.at(-1).period===4);
  m.gaps+=a.at(-1).period-a[0].period+1-a.length;
  for(let i=1;i<a.length;i++){
   let x=a[i-1],y=a[i];m.adjacentEvents++;
   if(!x.building||!y.building){m.unknownBuildingPairs++;continue}
   m.knownBuildingPairs++;
   if(x.building===y.building){m.sameBuilding++;continue}
   m.crossBuilding++;let k=x.building+"|"+y.building;
   if(!routes.has(k))routes.set(k,{from:x.building,to:y.building,count:0,minAvailable:Infinity,examples:[]});
   let r=routes.get(k),gap=starts[y.period]-starts[x.period]-duration;r.count++;r.minAvailable=Math.min(r.minAvailable,gap);if(r.examples.length<3)r.examples.push({group:g,half,day,from:x.id,to:y.id,available:gap});
  }
 }
 const groups=[...rows.values()], fields=["positions","activeDays","onePairDays","gaps","early","late","adjacentEvents","knownBuildingPairs","unknownBuildingPairs","sameBuilding","crossBuilding"];
 const sum=a=>Object.fromEntries(fields.map(k=>[k,a.reduce((n,x)=>n+x[k],0)]));
 return {version:"0.9",scope:"83 очные группы, две половины PDF",status:"group-cell occupancy, not person-level actual attendance",method:"Окно — незаполненная пара между первой и последней непустой ячейкой дня группы. Возможный переход — последовательные непустые ячейки с одной распознанной локацией; сложные записи не пропускаются, а помечаются неизвестными. Не учтены реальные маршруты, индивидуальные подгруппы и внешние ресурсы.",sourceHashes:courses.map(d=>({course:d.course,hash:d.hash})),totals:sum(groups),courses:[1,2,3,4,5].map(course=>({course,groups:groups.filter(g=>g.course===course).length,...sum(groups.filter(g=>g.course===course))})),groups,routes:[...routes.values()].sort((a,b)=>b.count-a.count||a.minAvailable-b.minAvailable)};
}
