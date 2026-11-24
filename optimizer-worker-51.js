/* 0.51: worker for optimization. No DOM, no network except local versioned scripts. */
importScripts("diagnostics-25.js","resource-diagnostics-26.js","opportunities-29.js","joint-plans-30.js","evidence-register-31.js","academic-weeks-32.js","interday-33.js","model-studio-34.js","mixed-plans-37.js","room-alternatives-38.js","integrated-pedagogy-39.js","constraint-register-40.js","floor-optimization-41.js","workload-42.js","weekly-fairness-43.js","bounded-search-44.js","room-swaps-46.js","atomic-search-47.js","room-cycles-48.js","discipline-order-49.js","combined-placement-50.js");
const profiles51=[["balanced","Баланс"],["space","Меньше переходов"],["ped","Педагогический приоритет"],["fair","Охват и равномерность"]];
self.onmessage=e=>{
 const {token,context,screen,config,profile}=e.data;
 try{
  // Functions cannot be structured-cloned; all Map and Set indexes can.
  const ctx={...context,key:(v,d)=>JSON.stringify([v,d])};
  const send=(stage,label)=>self.postMessage({token,type:"progress",stage,label});
  send(1,"Проверяем переносы между днями");const inter=interday33(ctx);
  send(2,"Ищем альтернативные аудитории");const room=roomAlternatives38(ctx);
  send(3,"Формируем допустимые кандидаты");const pool=pool39(ctx,screen,inter,room,config,profile);
  const runs=[];for(let i=0;i<profiles51.length;i++){const [k,name]=profiles51[i];send(4+i,"Модель "+(i+1)+" из 4: "+name);runs.push({...solve39(ctx,pool,profile,config,k),name,config})}
  self.postMessage({token,type:"done",runs});
 }catch(err){self.postMessage({token,type:"error",message:err?.message||String(err)})}
};
