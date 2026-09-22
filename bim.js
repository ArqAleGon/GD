import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {STATES,DEMO,metrics,matches,normalizeUE,ueOptions,recordUEs} from './bim-state.js?v=20260916-elements';
async function loadGzipJSON(url){const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(stream).text());}
const primaveraPayload=await loadGzipJSON('./primavera-data.json.gz?v=20260921');
const PRIMAVERA_META=primaveraPayload.meta,PRIMAVERA_TASKS=primaveraPayload.tasks;
const $=id=>document.getElementById(id);
const canvas=$('model'),host=canvas.parentElement;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(40,1,.1,100000);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.maxDistance=50000;
scene.add(new THREE.HemisphereLight(0xffffff,0x627381,2.3));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(60,100,40);scene.add(sun);
const records=[];let selected=null,isolated=false,mode='iso';
const materials=Object.fromEntries(Object.entries(STATES).map(([key,s])=>[key,new THREE.MeshStandardMaterial({color:s.color,roughness:.72,metalness:.05,flatShading:true,transparent:s.opacity<1,opacity:s.opacity,depthWrite:s.opacity===1,side:THREE.DoubleSide})]));
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filters=()=>({ue:$('ue').value,sector:$('sector').value,discipline:$('discipline').value,status:$('status').value,search:$('search').value.trim()});
const visibleRecords=()=>records.filter(r=>matches(r,filters()));
const swatch=k=>`<i class="swatch ${k}" style="--state:${STATES[k].color}"></i>`;
const percent=x=>Math.round(x)+' %';
const taskStatus=task=>task.actual>=99.5?'done':task.actual+.25<task.planned?'late':task.actual>0?'started':'pending';
const scheduleByUE=new Map();
for(const task of PRIMAVERA_TASKS){if(!scheduleByUE.has(task.ue))scheduleByUE.set(task.ue,[]);scheduleByUE.get(task.ue).push(task);}
const days=(start,end)=>Math.max(1,(Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000+1);
function scheduleFor(record){
 const tasks=recordUEs(record).flatMap(ue=>scheduleByUE.get(ue)||[]);if(!tasks.length)return null;
 const weight=task=>task.hours||days(task.start,task.finish),total=tasks.reduce((sum,task)=>sum+weight(task),0)||1;
 return {tasks,start:tasks.reduce((min,task)=>task.start<min?task.start:min,tasks[0].start),end:tasks.reduce((max,task)=>task.finish>max?task.finish:max,tasks[0].finish),planned:tasks.reduce((sum,task)=>sum+task.planned*weight(task),0)/total,actual:tasks.reduce((sum,task)=>sum+task.actual*weight(task),0)/total};
}
function recordMetrics(record,cutoff){
 if(record.schedule&&cutoff===PRIMAVERA_META.cutoff){const planned=record.schedule.planned,actual=record.actual;return {planned,status:actual>=99.5?'done':actual+.25<planned?'late':actual>0?'started':'pending'};}
 return metrics(record,cutoff);
}
function fit(list=visibleRecords(),direction=mode){
 const bounds=new THREE.Box3();for(const r of list)if(r.group)bounds.union(new THREE.Box3().setFromObject(r.group));
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(size.length()/2,2),distance=radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.28/Math.min(camera.aspect,1);
 controls.target.copy(center);camera.up.set(0,1,0);
 const directions={top:new THREE.Vector3(0,1,.001),front:new THREE.Vector3(0,.12,1),side:new THREE.Vector3(1,.12,0),iso:new THREE.Vector3(.9,.65,1)};
 const dir=(directions[direction]||directions.iso).normalize();
 camera.position.copy(center).addScaledVector(dir,distance);camera.near=Math.max(.02,distance/20000);camera.far=Math.max(10000,distance*10);camera.updateProjectionMatrix();controls.update();
}
function applyMaterials(){
 const allowed=new Set(visibleRecords());
 for(const r of records){if(!r.group)continue;r.group.visible=allowed.has(r)&&(!isolated||!selected||selected===r);
 r.group.traverse(o=>{if(!o.isMesh)return;o.material=$('appearance').value==='original'?o.userData.baseMaterial:materials[r.status];});}
 // Selection uses a bounding box, keeping construction colors unchanged.
 selectionBox.visible=!!selected?.group&&allowed.has(selected);
 if(selectionBox.visible)selectionBox.setFromObject(selected.group);
}
const selectionBox=new THREE.BoxHelper(undefined,'#b6e1ff');selectionBox.visible=false;scene.add(selectionBox);
function select(r){selected=r;isolated=isolated&&!!r;$('context').setAttribute('aria-pressed',String(isolated));render();}
function ganttTasks(){
 const selectedUE=normalizeUE($('ue').value),sector=$('sector').value,discipline=$('discipline').value,status=$('ganttStatus').value,query=$('ganttSearch').value.trim().toLowerCase();
 let allowedUEs=null;
 if(selectedUE)allowedUEs=new Set([selectedUE]);
 else if(sector||discipline)allowedUEs=new Set(records.filter(record=>(!sector||record.section===sector)&&(!discipline||record.discipline===discipline)).flatMap(recordUEs));
 return PRIMAVERA_TASKS.filter(task=>(!allowedUEs||allowedUEs.has(task.ue))&&(!status||taskStatus(task)===status)&&(!query||(task.id+' '+task.name+' '+task.ue+' '+task.package).toLowerCase().includes(query)));
}
function monthTicks(start,end){
 const ticks=[],cursor=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),1)),span=end-start||1,fmt=new Intl.DateTimeFormat('es-CO',{month:'short',year:'2-digit',timeZone:'UTC'});
 while(cursor<=end){ticks.push({left:Math.max(0,Math.min(100,(cursor-start)/span*100)),label:fmt.format(cursor).replace('.','')});cursor.setUTCMonth(cursor.getUTCMonth()+1);}
 return ticks;
}
function renderGantt(){
 let tasks=ganttTasks(),windowMode=$('ganttWindow').value,rangeStart,rangeEnd;
 if(/^\d{4}$/.test(windowMode)){rangeStart=new Date(`${windowMode}-01-01T12:00:00Z`);rangeEnd=new Date(`${windowMode}-12-31T12:00:00Z`);tasks=tasks.filter(task=>Date.parse(task.finish+'T12:00:00Z')>=rangeStart&&Date.parse(task.start+'T12:00:00Z')<=rangeEnd);}
 else if(windowMode==='all'){rangeStart=new Date(PRIMAVERA_META.dateMin+'T12:00:00Z');rangeEnd=new Date(PRIMAVERA_META.dateMax+'T12:00:00Z');}
 else if(tasks.length){rangeStart=new Date(Math.min(...tasks.map(task=>Date.parse(task.start+'T12:00:00Z'))));rangeEnd=new Date(Math.max(...tasks.map(task=>Date.parse(task.finish+'T12:00:00Z'))));}
 const total=tasks.length;tasks.sort((a,b)=>a.start.localeCompare(b.start)||a.ue.localeCompare(b.ue,'es',{numeric:true}));tasks=tasks.slice(0,120);
 $('ganttSummary').textContent=`${total.toLocaleString('es')} actividades vinculadas por UE · corte ${new Date(PRIMAVERA_META.cutoff+'T12:00:00').toLocaleDateString('es-CO')}${total>120?' · se muestran 120':''}`;
 if(!tasks.length||!rangeStart||!rangeEnd){$('gantt').innerHTML='<div class="ganttEmpty">No hay actividades del programa para esta combinación de filtros y periodo.</div>';return;}
 if(rangeEnd<=rangeStart)rangeEnd=new Date(rangeStart.getTime()+86400000);
 const span=rangeEnd-rangeStart,cut=Date.parse(PRIMAVERA_META.cutoff+'T12:00:00Z'),cutLeft=(cut-rangeStart)/span*100,ticks=monthTicks(rangeStart,rangeEnd);
 const header=`<div class="ganttHeader"><div class="ganttHeaderLabel">Actividad · UE</div><div class="ganttTimelineHeader">${ticks.map(tick=>`<span class="monthTick" style="left:${tick.left}%">${escapeHTML(tick.label)}</span>`).join('')}${cutLeft>=0&&cutLeft<=100?`<i class="ganttCut" style="left:${cutLeft}%"></i>`:''}</div></div>`;
 const rows=tasks.map(task=>{const start=Math.max(rangeStart,Date.parse(task.start+'T12:00:00Z')),finish=Math.min(rangeEnd,Date.parse(task.finish+'T12:00:00Z')),left=(start-rangeStart)/span*100,width=Math.max(.25,(finish-start)/span*100),state=taskStatus(task),title=`${task.id} · UE ${task.ue}\n${task.name}\n${task.start} / ${task.finish}\nPlan ${percent(task.planned)} · Real ${percent(task.actual)}`;return `<div class="ganttRow"><div class="ganttTask" title="${escapeHTML(title)}"><b>${escapeHTML(task.id)} · UE ${escapeHTML(task.ue)}</b><span>${escapeHTML(task.name)}</span></div><div class="ganttTrack">${cutLeft>=0&&cutLeft<=100?`<i class="ganttCut" style="left:${cutLeft}%"></i>`:''}<div class="ganttBar" title="${escapeHTML(title)}" style="--left:${left}%;--width:${width}%;--progress:${task.actual}%;--state:${STATES[state].color}"><i></i></div></div></div>`;}).join('');
 $('gantt').innerHTML=`<div class="ganttGrid">${header}${rows}</div>`;
}
function render(){
 for(const r of records)Object.assign(r,recordMetrics(r,$('cutoff').value||PRIMAVERA_META.cutoff));
 const f=filters(),base=records.filter(r=>matches(r,{...f,status:''})),list=visibleRecords();
 if(selected&&!list.includes(selected)){selected=null;isolated=false;$('context').setAttribute('aria-pressed','false');}
 $('count').textContent=`${list.reduce((n,r)=>n+r.count,0).toLocaleString('es')} elementos · ${new Set(list.map(r=>r.file)).size} modelos`;
 const missing=list.filter(r=>!recordUEs(r).length).reduce((n,r)=>n+r.count,0);
 $('ueNote').textContent=`${ueOptions(list).length} UE en la selección. ${missing.toLocaleString('es')} elementos sin UE válida. Unidades extraídas de los IFC; pueden aparecer en varios modelos.`;
 $('kpis').innerHTML=Object.entries(STATES).map(([key,s])=>`<button class="kpi" data-state="${key}" aria-pressed="${f.status===key}" style="--state:${s.color}"><span>${s.label}</span><b>${base.filter(r=>r.status===key).reduce((n,r)=>n+r.count,0).toLocaleString('es')}<small>elementos</small></b></button>`).join('');
 $('kpis').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('status').value=f.status===b.dataset.state?'':b.dataset.state;render();fit();});
 const avg=key=>list.length?list.reduce((sum,r)=>sum+r[key],0)/list.length:0;
 $('planned').textContent=list.length?percent(avg('planned')):'—';$('actual').textContent=list.length?percent(avg('actual')):'—';
 $('plannedBar').style.width=avg('planned')+'%';$('actualBar').style.width=avg('actual')+'%';
 $('rows').innerHTML=list.map(r=>`<tr class="${selected===r?'selected':''}"><td><button class="modelButton" data-id="${r.id}" aria-pressed="${selected===r}">${r.section} · ${r.code}<small>${r.count.toLocaleString('es')} elementos · ${r.file}</small></button></td><td>${escapeHTML(recordUEs(r).map(v=>'UE '+v).join(', ')||'Sin asignar')}</td><td>${r.discipline==='ARQ'?'Arquitectura':'Estructura'}</td><td>${r.version}</td><td>${percent(r.planned)}<div class="miniBar"><i style="width:${r.planned}%"></i></div></td><td>${percent(r.actual)}</td><td><span class="statusPill" style="--state:${STATES[r.status].color}">${swatch(r.status)}${STATES[r.status].label}</span></td><td>${r.start} / ${r.end}</td></tr>`).join('');
 $('rows').querySelectorAll('button').forEach(b=>b.onclick=()=>{const r=records.find(x=>x.id===Number(b.dataset.id));select(r);fit([r]);});
 $('empty').hidden=!!list.length;
 $('viewTitle').textContent=(f.sector||'E15 + I16 + E16')+(f.ue?' · '+(f.ue==='__unassigned__'?'Sin UE asignada':f.ue):'');
 $('detail').hidden=!selected;
 if(selected){const r=selected;$('detail').innerHTML=`<b>${r.section} · ${r.discipline} · ${r.code}</b><span class="statusPill" style="--state:${STATES[r.status].color}">${swatch(r.status)}${STATES[r.status].label}</span><p>UE · ${escapeHTML(recordUEs(r).map(v=>'UE '+v).join(', ')||'Sin asignar')}</p><p>Planificado ${percent(r.planned)} / ejecutado ${percent(r.actual)}${r.schedule?' · Primavera P6':''}</p><p>${r.count.toLocaleString('es')} elementos de este grupo UE–modelo. Geometría aislada por propiedades IFC.</p><p>${r.source}</p><a href="./documents.html?sector=${encodeURIComponent(r.section)}">Ver documentos de ${r.section}</a>`;}
 $('context').disabled=!selected;$('clearSelection').disabled=!selected;applyMaterials();renderGantt();
}
$('legend').innerHTML=Object.entries(STATES).map(([k,s])=>`<span>${swatch(k)}${s.label}</span>`).join('');
$('ganttLegend').innerHTML=Object.entries(STATES).map(([k,s])=>`<span><i style="--state:${s.color}"></i>${s.label}</span>`).join('');
for(const id of ['sector','ue','discipline','status','cutoff'])$(id).onchange=()=>{render();fit();};
$('search').oninput=()=>{render();fit();};
$('ganttWindow').onchange=renderGantt;$('ganttStatus').onchange=renderGantt;$('ganttSearch').oninput=renderGantt;
$('appearance').onchange=applyMaterials;
$('reset').onclick=()=>{for(const id of ['sector','ue','discipline','status','search','ganttStatus','ganttSearch'])$(id).value='';$('cutoff').value=PRIMAVERA_META.cutoff;$('ganttWindow').value='2026';select(null);fit();};
$('fit').onclick=()=>fit(isolated&&selected?[selected]:visibleRecords());
$('top').onclick=()=>{mode='top';fit(isolated&&selected?[selected]:visibleRecords());};
$('iso').onclick=()=>{mode='iso';fit(isolated&&selected?[selected]:visibleRecords());};
document.addEventListener('sceneorientation',event=>{const view=event.detail?.view;if(!['home','top','front','side'].includes(view))return;mode=view==='home'?'iso':view;fit(isolated&&selected?[selected]:visibleRecords(),mode);});
$('context').onclick=()=>{if(!selected)return;isolated=!isolated;$('context').setAttribute('aria-pressed',String(isolated));applyMaterials();fit(isolated?[selected]:visibleRecords());};
$('clearSelection').onclick=()=>{select(null);fit();};
const raycaster=new THREE.Raycaster();let down;
canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const roots=visibleRecords().filter(r=>r.group?.visible).map(r=>r.group);const hit=raycaster.intersectObjects(roots,true)[0];if(hit)select(records.find(r=>r.id===hit.object.userData.recordId));else select(null);});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
async function load(){
 const response=await fetch('./ifc-placement-20260915-i16-e16.json');if(!response.ok)throw new Error('No se pudo leer la lista de modelos');const placement=await response.json();
 const ueResponse=await fetch('./bim-ue-elements.json?v=20260916-elements');if(!ueResponse.ok)throw new Error('No se pudo leer el índice UE por elementos');const ueMapping=await ueResponse.json();
 ueMapping.models.forEach((definition,i)=>{const [fallbackStart,fallbackEnd,fallbackActual]=DEMO[i];for(const group of definition.groups){const record={...definition,...group,ues:[...new Set(group.ues.map(normalizeUE).filter(Boolean))],id:records.length,code:definition.source.split('-')[1],start:fallbackStart,end:fallbackEnd,actual:fallbackActual};record.schedule=scheduleFor(record);if(record.schedule)Object.assign(record,{start:record.schedule.start,end:record.schedule.end,actual:record.schedule.actual});Object.assign(record,recordMetrics(record,$('cutoff').value));records.push(record);}});
 for(const ue of ueOptions(records)){const option=document.createElement('option');option.value=ue;option.textContent=ue;$('ue').append(option);}
 $('sector').value='E16';render();
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let complete=0;
 const results=await Promise.allSettled(records.map(async r=>{const gltf=await loader.loadAsync('./'+r.geometry);const group=gltf.scene;group.position.set(-placement.gisOrigin[0],-placement.streetDatum,placement.gisOrigin[1]);group.traverse(o=>{if(o.isMesh){o.userData.baseMaterial=o.material;o.userData.recordId=r.id;}});r.group=group;scene.add(group);complete++;$('load').textContent=`Cargando modelos… ${complete} / ${records.length}`;applyMaterials();}));
 const failed=results.filter(r=>r.status==='rejected');$('load').hidden=!failed.length;if(failed.length)$('load').textContent=`No se pudieron cargar ${failed.length} modelos. Recarga la página para reintentar.`;
 render();fit();
}
load().catch(error=>{$('load').hidden=false;$('load').textContent='No se pudieron cargar los modelos. Recarga para reintentar.';console.error(error);});
