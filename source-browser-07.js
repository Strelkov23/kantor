
/* KANTOR 0.7 — source grid browser; this is not a verified timetable. */
let src07={course:1,page:1,status:"idle",data:null,error:"",search:"",view:"grid"};
let pending07=0;
function getPage07(){return src07.data?.pages?.find(p=>p.page===src07.page)}
function sourceLink07(){let g=instituteCatalog.groups.find(x=>x.course===src07.course);return g?.url||instituteCatalog.officialSchedule}
function grid07(p){
 if(!p.tables?.length)return '<p class="notice">Границы таблицы не обнаружены. Откройте текстовый слой или оригинал PDF.</p>';
 let q=src07.search.toLocaleLowerCase("ru-RU").trim();
 return p.tables.map((t,i)=>{
   let cells=t.rows.flat().filter(Boolean), dedup=new Map(cells.map(c=>[c.box.join("|"),c])), [x0,y0,x1,y1]=t.box;
   let w=x1-x0,h=y1-y0;
   if(w<=0||h<=0)return '<p>Некорректные границы таблицы.</p>';
   return '<section style="margin:12px 0"><h3>Таблица '+(i+1)+'</h3><p class="muted">'+t.rowCount+' строк · '+t.columnCount+' столбцов · '+dedup.size+' физических ячеек. Объединённые ячейки сохраняются в геометрии PDF.</p><div class="scroll"><div style="position:relative;width:'+Math.max(1000,Math.round(w*1.4))+'px;aspect-ratio:'+w+'/'+h+';background:#fff;border:1px solid #c8d3db">'+[...dedup.values()].map(c=>{
      let [a,b,d,e]=c.box;let match=q&&c.text.toLocaleLowerCase("ru-RU").includes(q);
      return '<div title="'+esc(c.text)+'" style="position:absolute;box-sizing:border-box;left:'+((a-x0)/w*100)+'%;top:'+((b-y0)/h*100)+'%;width:'+((d-a)/w*100)+'%;height:'+((e-b)/h*100)+'%;border:1px solid #c9d6dd;overflow:hidden;padding:2px 3px;font-size:10px;line-height:1.15;white-space:pre-wrap;'+(match?'background:#fff3b8;':q?'opacity:.28;':'')+'">'+esc(c.text)+'</div>';
   }).join("")+'</div></div></section>';
 }).join("");
}
function words07(p){
 let q=src07.search.trim().toLocaleLowerCase("ru-RU"), a=p.words.filter(w=>!q||w.text.toLocaleLowerCase("ru-RU").includes(q));
 return '<p class="muted">Слов текстового слоя: '+a.length+' из '+p.words.length+'. Координаты — в пунктах PDF, в исходной системе документа.</p><div class="scroll" style="max-height:520px"><table><tr><th>Слово</th><th>Координаты (x₀, y₀, x₁, y₁)</th><th>Блок / строка</th></tr>'+a.map(w=>'<tr><td>'+esc(w.text)+'</td><td>'+esc(w.box.join(", "))+'</td><td>'+w.block+' / '+w.line+'</td></tr>').join("")+'</table></div>'
}
function renderSources07(){
 let p=getPage07(),data=src07.data;
 return '<section class="panel"><h2>Официальные таблицы · 1–5 курс</h2><p>Институт экономики и управления АПК, первый семестр 2026/2027. Просмотр извлечённой геометрии и текста всех страниц. Не заменяет оперативное расписание и не допускает записи в решатель автоматически.</p><div class="row"><label>Курс<select id="course07">'+[1,2,3,4,5].map(k=>'<option value="'+k+'" '+(k===src07.course?"selected":"")+'>'+k+'</option>').join("")+'</select></label><label>Страница<select id="page07">'+(data?.pages||Array.from({length:[4,4,4,3,1][src07.course-1]},(_,i)=>({page:i+1}))).map(p=>'<option value="'+p.page+'" '+(p.page===src07.page?"selected":"")+'>'+p.page+'</option>').join("")+'</select></label><label>Режим<select id="view07"><option value="grid" '+(src07.view==="grid"?"selected":"")+'>Физическая таблица</option><option value="words" '+(src07.view==="words"?"selected":"")+'>Текстовый слой</option></select></label><label>Поиск<input id="search07" value="'+esc(src07.search)+'" placeholder="Группа, аудитория, фамилия"></label><button id="load07">Загрузить курс</button><a target="_blank" rel="noopener" href="'+esc(sourceLink07())+'#page='+src07.page+'">Оригинал PDF</a></div><p id="status07" role="status">'+(src07.status==="loading"?"Загрузка…":src07.status==="error"?esc(src07.error):data?"Источник: "+esc(data.source)+" · SHA-256: "+esc(data.sha256):"Выберите курс и загрузите данные.")+'</p><div id="sourceBody07">'+(p?(src07.view==="grid"?grid07(p):words07(p)):"")+'</div>'+(data?'<p><button id="export07">Скачать извлечённые данные курса JSON</button></p>':"")+'<p class="muted">Снимок содержит опубликованные исходные документы. Все автоматически извлечённые ячейки имеют статус «не сверено». Отсутствие текста в ячейке не доказывает отсутствие занятия.</p></section>'
}
async function load07(){
 let token=++pending07,course=src07.course;
 src07.status="loading";src07.error="";src07.data=null;render();
 try{
  let response=await fetch("data/source-tables/course-"+course+".json",{cache:"no-cache"});
  if(!response.ok)throw Error("Снимок курса пока недоступен: HTTP "+response.status);
  let d=await response.json();
  if(d.course!==course||!Array.isArray(d.pages)||d.pages.length!==[4,4,4,3,1][course-1]||typeof d.sha256!=="string")throw Error("Неполный или некорректный снимок");
  if(token!==pending07)return;src07.data=d;src07.status="ready";if(!d.pages.some(p=>p.page===src07.page))src07.page=1;
 }catch(e){if(token!==pending07)return;src07.status="error";src07.error=e.message}
 if(visible16("source07"))render()
}
function bind07(){
 on("course07","change",e=>{src07.course=+e.target.value;src07.page=1;src07.data=null;src07.status="idle";load07()});
 on("page07","change",e=>{src07.page=+e.target.value;render()});
 on("view07","change",e=>{src07.view=e.target.value;render()});
 on("search07","change",e=>{src07.search=e.target.value;render()});
 on("load07","click",load07);
 on("export07","click",()=>{if(src07.data)download("course-"+src07.course+"-source-grid.json",JSON.stringify(src07.data,null,2),"application/json")});
}
