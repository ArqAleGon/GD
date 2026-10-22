import {installAnnotations} from './ifc-view-annotations.mjs?v=20261022-annotations-v2';
import {loadReportFonts,loadModoLogo,reportCover} from './ifc-report-cover.mjs?v=20261022-annotations-v2';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {modelLoading,loadingFrame} from './model-loading.js';
import {labels,matches,semantic,geometric,summary,groupCounts,csv,imagePDF} from './ifc-audit-core.mjs?v=20261021-native-v1';
import {linkAssemblies,displayOwners,objectTypeCheck,classificationSummary} from './ifc-correspondence.mjs?v=20261021-native-v1';
import {loadNativeFile} from './ifc-native-loader.mjs?v=20261021-native-v1';
import {observationLayout,filesLayout,localReportDate,reportIdentityError,includeObservedPages,reportFileName,containedImageRect} from './ifc-report-options.mjs?v=20261022-annotations-v2';
import {definitionFor,drawDefinition} from './ifc-entity-definitions.mjs?v=20261022-annotations-v2';
const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BASE='https://arqalegon.github.io/GD/',STORE='emb-ifc-correspondence-v1',verdictNames={pending:'Pendiente',yes:'Coincide',partial:'Parcial',no:'No coincide'};
const palette=['#57cfc1','#ffbf73','#8cafff','#cc9afb','#ff8e9d','#88d7e8','#a5cb71','#e3b8a0','#9aadc0','#ffd776','#82beff','#cd93c9'];
let nativeAbort=null,nativeDiagnostics=[];
let catalog=[],elements=[],shown=[],selected=null,section='',generation=0,loading=false,reporting=false,page=0,enabledTypes=new Set(),typeColors=new Map(),failed=[],reviews={},previousView=null,highlight=null,reportImages=[],reportName='',dataVersion='';
try{reviews=JSON.parse(localStorage.getItem(STORE)||'{}');}catch{}
const canvas=$('modelCanvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#101a26');const root=new THREE.Group();scene.add(root);
const camera=new THREE.PerspectiveCamera(42,1,.01,1000000),controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.screenSpacePanning=true;camera.position.set(20,15,25);
scene.add(new THREE.HemisphereLight(0xffffff,0x576477,2));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(25,50,40);scene.add(light);
const materials=new Map();
const contextMaterial=new THREE.MeshBasicMaterial({color:'#b7c6d5',transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide});materials.set('__context',contextMaterial);
const annotations=installAnnotations({canvas,overlay:$('annotationCanvas'),controls,onChange:()=>{$('reportViewStatus').textContent='Anotaciones modificadas: pulsa Vista para informe para guardar esta vista.';}});
controls.addEventListener('change',()=>annotations.clearForViewChange());
new ResizeObserver(()=>annotations.redraw()).observe(canvas);

function material(type,verdict){const color=$('colorBy').value==='visual'?({yes:'#56d6b2',partial:'#f2c45f',no:'#ef7589',pending:'#8c9cab'}[verdict||'pending']):typeColors.get(type)||'#8193a5';if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75,metalness:.05,side:THREE.DoubleSide}));return materials.get(color);}
async function resource(path){let response=await fetch('./'+path);if(!response.ok)response=await fetch(BASE+path);if(!response.ok)throw new Error('No se pudo cargar '+path);return response.json();}

function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();annotations.clearForViewChange();render();}new ResizeObserver(resize).observe(canvas);
function render(){renderer.render(scene,camera);}controls.addEventListener('change',render);
function state(){return {source:$('source').value,types:enabledTypes,level:$('level').value,id:$('idFilter').value,description:$('descriptionFilter').value,only:previousView?selected?.key:null};}
function viewState(){return {position:camera.position.clone(),target:controls.target.clone(),near:camera.near,far:camera.far,fov:camera.fov};}
function restoreView(v){camera.position.copy(v.position);controls.target.copy(v.target);camera.near=v.near;camera.far=v.far;camera.fov=v.fov;camera.updateProjectionMatrix();controls.update();render();}
function fit(items=shown,direction='iso',targetCamera=camera,targetControls=controls){const box=new THREE.Box3();for(const e of items)if(e.bounds&&!e.suppressed)box.union(e.bounds);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3());const dir=({top:new THREE.Vector3(.0001,1,.0001),front:new THREE.Vector3(0,0,1),side:new THREE.Vector3(1,0,0)})[direction]||new THREE.Vector3(.85,.7,1);dir.normalize();targetCamera.position.copy(center).add(dir);targetCamera.lookAt(center);targetCamera.updateMatrixWorld();const right=new THREE.Vector3().setFromMatrixColumn(targetCamera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(targetCamera.matrixWorld,1),tan=Math.tan(THREE.MathUtils.degToRad(targetCamera.fov/2));let distance=1;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,v.dot(dir)+Math.max(Math.abs(v.dot(up))/tan,Math.abs(v.dot(right))/(tan*targetCamera.aspect))*1.15);}targetCamera.position.copy(center).addScaledVector(dir,distance);targetCamera.near=Math.max(.001,distance/10000);targetCamera.far=Math.max(2000,distance*30);targetCamera.lookAt(center);targetCamera.updateProjectionMatrix();if(targetControls){targetControls.target.copy(center);targetControls.update();}render();}
function clearHighlight(){if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();highlight=null;}}
function dispose(){annotations.reset();$('annotationToggle').disabled=true;reportViews.clear();$('saveReportView').disabled=true;$('reportViewPreview').hidden=true;$('clearReportView').hidden=true;$('reportViewStatus').textContent='Selecciona una página IFC para guardar su vista.';$('pageObservation').disabled=true;$('pageObservationType').disabled=true;$('prepareReportSidebar').disabled=true;clearHighlight();const geometries=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material&&!materials.has(o.material.color?.getStyle())){for(const m of [].concat(o.material)){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);if(![...materials.values()].includes(m))m.dispose();}}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());root.clear();root.position.set(0,0,0);elements=[];shown=[];selected=null;previousView=null;}
function options(id,values,empty){$(id).innerHTML=`<option value="">${empty}</option>`+values.map(v=>`<option value="${safe(v)}">${safe(v)}</option>`).join('');}
function clearSelection(){selected=null;clearHighlight();$('reviewForm').hidden=true;$('isolate').disabled=true;$('selectedTitle').textContent='Selecciona un elemento';$('details').innerHTML='<p>Selecciona una geometría o una fila para consultar sus parámetros.</p>';}
function selectLocation(code){
 if(reporting)return;
 nativeAbort?.abort();nativeAbort=null;++generation;loading=false;section=code;nativeDiagnostics=[];failed=[];dataVersion='';
 dispose();clearSelection();enabledTypes=new Set();typeColors=new Map();page=0;
 for(const id of ['source','level','idFilter','descriptionFilter','classFilter'])$(id).value='';
 options('source',[],'Abre archivos IFC');options('level',[],'Todos los niveles');
 $('modelTitle').textContent=catalog.find(x=>x.code===code)?.label||code;
 $('status').textContent='Solo IFC originales · selecciona los archivos de esta ubicación';
 $('typeCount').textContent='0 tipos';$('types').replaceChildren();
 $('report').disabled=true;$('exportCSV').disabled=true;$('back').disabled=true;$('clearModels').disabled=true;
 $('dashboard').hidden=true;$('dashToggle').textContent='Mostrar dashboards';$('dashToggle').setAttribute('aria-expanded','false');
 $('pageObservationType').replaceChildren(new Option('Abre archivos IFC',''));$('pageObservation').value='';$('pageObservationStatus').textContent='Abre los IFC y selecciona una tipología para redactar su observación.';
 invalidateReport();apply();resize();$('empty').hidden=false;$('empty').textContent='Abre uno o varios archivos IFC originales para comenzar.';
 $('notice').className='notice';$('notice').textContent='Cada apertura reemplaza los modelos de la vista. No se cargan modelos WebGLB.';
}
function prepareBounds(){const body=new THREE.Box3();root.updateMatrixWorld(true);for(const e of elements){e.bounds=new THREE.Box3();const oriented=new THREE.Box3(),frame=new THREE.Matrix4();if(e.meshes.length){const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3();e.meshes[0].matrixWorld.decompose(pos,quat,scale);frame.compose(pos,quat,new THREE.Vector3(1,1,1)).invert();}for(const o of e.meshes){const b=o.geometry.boundingBox?.clone().applyMatrix4(o.matrixWorld);if(b)e.bounds.union(b);if(o.geometry.boundingBox)oriented.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(frame,o.matrixWorld)));}if(!oriented.isEmpty())e.dimensions=oriented.getSize(new THREE.Vector3()).toArray();if(!e.axis&&!e.bounds.isEmpty())body.union(e.bounds);}for(const e of elements)if(e.axis&&!body.clone().expandByScalar(1).intersectsBox(e.bounds)){e.suppressed=true;for(const m of e.meshes)m.visible=false;}
 if(!body.isEmpty()){root.position.sub(body.getCenter(new THREE.Vector3()));root.updateMatrixWorld(true);for(const e of elements)e.bounds.translate(root.position);}
 }
function contextItems(){const source=$('source').value;return elements.filter(e=>(!source||e.source===source)&&!e.void&&!e.suppressed);}
function paint(items){
 const owners=displayOwners(elements,items),context=displayOwners(elements,contextItems());
 let ghostCount=0;
 for(const m of new Set(elements.flatMap(e=>e.meshes))){
  const e=owners.get(m);m.visible=!!e||context.has(m);m.renderOrder=e?1:0;
  m.userData.contextOnly=!e;
  if(e){m.material=material(e.type,reviews[e.key]?.verdict);m.userData.displayElement=e;}
  else {m.material=contextMaterial;delete m.userData.displayElement;if(m.visible)ghostCount++;}
 }
 $('modelCanvas').dataset.contextMeshes=String(ghostCount);
}

async function openNativeFiles(files){
 if(reporting||!files.length)return;
 if(files.some(f=>!/\.ifc$/i.test(f.name))){$('notice').textContent='Solo se admiten archivos IFC originales (.ifc). La selección actual se conserva.';return;}
 if(new Set(files.map(f=>f.name.toLocaleLowerCase())).size!==files.length){$('notice').textContent='Selecciona archivos con nombres distintos para conservar la identidad de cada fuente.';return;}
 nativeAbort?.abort();nativeAbort=new AbortController();const signal=nativeAbort.signal,token=++generation;
 nativeDiagnostics=[];loading=true;failed=[];dispose();clearSelection();page=0;$('clearModels').disabled=false;
 $('report').disabled=true;$('exportCSV').disabled=true;$('back').disabled=true;$('dashboard').hidden=true;$('dashToggle').textContent='Mostrar dashboards';$('dashToggle').setAttribute('aria-expanded','false');
 $('types').replaceChildren();$('rows').replaceChildren();$('empty').hidden=true;$('notice').textContent='Lectura directa de IFC original. Los archivos permanecen en este equipo.';
 for(const id of ['idFilter','descriptionFilter','classFilter'])$(id).value='';options('source',[],'Todos los archivos');options('level',[],'Todos los niveles');
 const clock=modelLoading(canvas,'IFC original · '+files.length+' archivo(s)');
 try{
  for(let i=0;i<files.length;i++){
   const file=files[i];$('status').textContent=`IFC original ${i+1}/${files.length} · ${file.name}`;
   const result=await loadNativeFile(file,section,root,(stage,info)=>clock.progress(stage,info),signal);
   if(token!==generation)return;elements.push(...result.elements);nativeDiagnostics.push({source:file.name,...result.diagnostics});
  }
  linkAssemblies(elements);clock.preparing();prepareBounds();
  const types=[...new Set(elements.map(e=>e.type))].sort();enabledTypes=new Set(elements.filter(e=>!e.void).map(e=>e.type));typeColors=new Map(types.map((t,i)=>[t,palette[i%palette.length]]));
  options('source',files.map(f=>f.name),'Todos los archivos');options('level',[...new Set(elements.map(e=>e.level))].sort(),'Todos los niveles');$('typeCount').textContent=types.length+' tipos';
  renderTypes();apply();resize();fit();
  const issues=nativeDiagnostics.reduce((n,d)=>n+d.diagnostics,0),missing=elements.filter(e=>!e.meshes.length).length,voids=elements.filter(e=>e.void).length;
  $('status').textContent=`IFC original · ${files.length} archivo(s) · ${elements.length.toLocaleString('es-CO')} entidades · ${types.length} tipos`;
  $('notice').className='notice'+(issues||missing?' warning':'');
  $('notice').textContent=[`${elements.filter(e=>e.aggregate&&e.meshes.length).length} conjuntos representados por sus componentes.`,voids?`${voids} huecos IFC ocultos inicialmente; se pueden aislar por tipo. No son sólidos físicos.`:'',missing?`${missing} entidades sin malla obtenida por el lector.`:'',issues?`El lector registró ${issues} avisos de teselación. Puede haber caras incompletas: revisar visualmente antes de validar.`:'', 'ObjectType e IfcEntity se leen directamente del archivo.'].filter(Boolean).join(' ');
  $('report').disabled=!elements.length;$('exportCSV').disabled=!elements.length;dataVersion='web-ifc-0.0.78 · '+files.map(f=>f.name+':'+f.size+':'+f.lastModified).join('|');
 }catch(error){if(token===generation&&error.name!=='AbortError'){failed.push(error.message);$('status').textContent='No se completó la lectura IFC';$('notice').textContent=error.message+' Abre de nuevo los IFC o prueba con un archivo de menor tamaño.';dispose();apply();}}
 finally{clock.finish();if(token===generation){loading=false;syncReportSidebar();}}
}
document.querySelector('.nativeButton').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('nativeFiles').click();}};
$('nativeFiles').onchange=event=>{const files=[...event.target.files];event.target.value='';openNativeFiles(files);};

function extendedCSV(items){
 const base=csv(items,reviews),header=';"ObjectType";"Cruce ObjectType-IfcEntity";"Criterio del cruce";"Asociación geométrica";"Componentes sin resolver";"Tag IFC";"ExpressID IFC"';
 // Generate complete rows individually so multiline descriptions remain valid CSV.
 const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,c=>"'"+c).replaceAll('"','""')+'"';
 return base.split('\r\n')[0]+header+'\r\n'+items.map(e=>{const raw=csv([e],reviews),row=raw.slice(raw.indexOf('\r\n')+2),r=objectTypeCheck(e);return row+';'+[e.objectType,r.state,r.reason,e.geometryAssociation,e.componentGaps||0,e.tag,e.expressId].map(quote).join(';');}).join('\r\n');
}
function renderTypes(){const counts=new Map(groupCounts(elements,'type'));$('types').innerHTML=[...counts.keys()].sort().map(t=>`<div class="typeRow"><label><input type="checkbox" data-type="${safe(t)}" ${enabledTypes.has(t)?'checked':''}><b style="background:${typeColors.get(t)}"></b><span title="${safe(labels[t]||t)}">${safe(t)}</span></label><small>${counts.get(t)}</small><button data-solo="${safe(t)}">Solo</button></div>`).join('');$('types').querySelectorAll('[data-type]').forEach(i=>i.onchange=()=>{i.checked?enabledTypes.add(i.dataset.type):enabledTypes.delete(i.dataset.type);previousView=null;$('back').disabled=true;apply();});$('types').querySelectorAll('[data-solo]').forEach(b=>b.onclick=()=>{enabledTypes=new Set([b.dataset.solo]);syncTypes();previousView=null;$('back').disabled=true;apply();});}
function syncTypes(){$('types').querySelectorAll('[data-type]').forEach(i=>i.checked=enabledTypes.has(i.dataset.type));}
function apply(resetPage=true){annotations.clearForViewChange();if(resetPage)page=0;const f=state();shown=elements.filter(e=>matches(e,f)&&(!$('classFilter').value||objectTypeCheck(e).state===$('classFilter').value));const set=new Set(shown);paint(shown);if(selected&&!set.has(selected))clearSelection();clearHighlight();if(selected&&selected.meshes.length){highlight=new THREE.Box3Helper(selected.bounds,0xffffff);scene.add(highlight);}const count=shown.filter(e=>!e.grouped).length;$('visibleCount').textContent=count.toLocaleString('es-CO')+' / '+elements.filter(e=>!e.grouped).length.toLocaleString('es-CO');$('empty').hidden=shown.some(e=>e.meshes.length&&!e.suppressed);$('empty').textContent=shown.length?'La selección no tiene geometría vinculada.':'No hay entidades para los filtros activos.';renderTable();renderDashboard();render();syncReportSidebar();}
function renderTable(){const rows=shown.slice(page*60,(page+1)*60);$('rows').innerHTML=rows.map((e,i)=>`<tr data-row="${i}" tabindex="0" class="${selected===e?'selected':''}"><td>${safe(e.id||'—')}<small>${safe(e.guid||'Sin GlobalId')}</small></td><td>${safe(e.type)}<small title="${safe(e.objectType||'')}">${safe(e.objectType||'ObjectType no disponible')}</small></td><td>${safe(e.level)}</td><td>${safe(e.description||e.name||'Sin texto publicado')}${!e.description?'<small>Nombre IFC</small>':''}</td><td>${e.grouped?'No evaluable':safe(verdictNames[reviews[e.key]?.verdict||'pending'])}</td></tr>`).join('');$('rows').querySelectorAll('tr').forEach(tr=>{tr.onclick=()=>select(rows[+tr.dataset.row]);tr.onkeydown=e=>{if(e.key==='Enter')tr.click();};});$('tableCount').textContent=shown.length.toLocaleString('es-CO')+' registros';$('pageLabel').textContent=`${shown.length?page+1:0} / ${Math.ceil(shown.length/60)}`;$('prev').disabled=page===0;$('next').disabled=(page+1)*60>=shown.length;}
const percent=n=>n==null?'Pendiente':n.toLocaleString('es-CO',{maximumFractionDigits:1})+' %';
function renderDashboard(){const s=summary(shown,reviews),cs=classificationSummary(shown);$('classification').textContent=`ObjectType ↔ IfcEntity: ${cs.yes} compatibles · ${cs.review} para revisar · ${cs.unknown} no evaluables. Es un cruce de clasificación, no una comprobación geométrica.`;$('kpis').innerHTML=[[s.total.toLocaleString('es-CO'),'Entidades IFC','Grupos excluidos: '+s.groups],[s.withGeometry.toLocaleString('es-CO'),'Con geometría','Vinculadas a una entidad'],[percent(s.visual),'Correspondencia visual',s.reviewed+' revisadas'],[percent(s.coverage),'Cobertura visual',s.total-s.reviewed+' pendientes']].map(([n,l,d])=>`<div><span>${l}</span><strong>${n}</strong><small>${d}</small></div>`).join('');for(const [id,key] of [['typeChart','type'],['levelChart','level']]){const rows=groupCounts(shown.filter(e=>!e.grouped),key),max=rows[0]?.[1]||1;$(id).innerHTML=rows.map(([name,n],i)=>`<button class="bar" data-chart="${i}"><span title="${safe(name)}">${safe(name)}</span><i><em style="width:${n/max*100}%"></em></i><b>${n}</b></button>`).join('');$(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{if(key==='type'){enabledTypes=new Set([rows[+b.dataset.chart][0]]);syncTypes();}else $('level').value=rows[+b.dataset.chart][0];previousView=null;$('back').disabled=true;apply();});}}
function select(e){if(reporting||loading)return;previousView=null;$('back').disabled=true;selected=e;$('selectedTitle').textContent=labels[e.type]||e.type;const s=semantic(e),g=geometric(e),states={compatible:'Compatible · indicio',review:'Revisar',unknown:'No evaluable'};$('details').innerHTML='<dl class="params">'+[['IfcEntity',e.type],['ID / Tag IFC',e.id||'No disponible'],['Tag IFC',e.tag||'No disponible'],['ExpressID IFC',e.expressId||'No disponible'],['GlobalId',e.guid||'No disponible'],['Nivel',e.level],['Nombre IFC',e.name||'No publicado'],['Description',e.description||'No publicado'],['ObjectType',e.objectType||'No disponible'],['Fuente IFC',e.source],['Esquema fuente',e.schema||'No disponible'],['Componentes pendientes',e.componentGaps||0],['Geometría',e.meshes.length?(e.aggregate?'Por componentes IFC ('+e.children.length+')':'Disponible')+(e.suppressed?' · eje separado suprimido':''):'No vinculada']].map(([k,v])=>`<dt>${k}</dt><dd>${safe(v)}</dd>`).join('')+'</dl>'+`<div class="assessment"><b>ObjectType ↔ IfcEntity · ${states[objectTypeCheck(e).state]}</b>${safe(objectTypeCheck(e).reason)}</div><div class="assessment"><b>Texto · ${states[s.state]}</b>${safe(s.reason)}<br>${safe(s.basis||'')}</div><div class="assessment"><b>Geometría · ${states[g.state]}</b>${safe(g.reason)}</div>`;$('reviewForm').hidden=e.grouped||!e.meshes.length||e.suppressed;const r=reviews[e.key]||{};$('verdict').value=r.verdict||'pending';$('reviewer').value=r.reviewer||$('reviewer').value;$('reviewNote').value=r.note||'';$('isolate').disabled=!e.meshes.length;apply(false);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function saveReviews(){localStorage.setItem(STORE,JSON.stringify(reviews));}
$('reviewForm').onsubmit=event=>{event.preventDefault();if(!selected)return;const entry={verdict:$('verdict').value,reviewer:$('reviewer').value.trim(),note:$('reviewNote').value.trim(),at:new Date().toISOString(),version:dataVersion,section,source:selected.source,guid:selected.guid};if(!entry.reviewer)return;if(entry.verdict==='pending')delete reviews[selected.key];else reviews[selected.key]=entry;try{saveReviews();$('notice').textContent='Revisión guardada para '+selected.guid;}catch{$('notice').textContent='No se pudo guardar en el navegador. Exporta las revisiones para conservarlas.';}apply(false);};
$('saveReviews').onclick=()=>download(new Blob([JSON.stringify({schema:1,reviews},null,2)],{type:'application/json'}),'revisiones-ifc.json');
$('loadReviews').onchange=async event=>{try{const data=JSON.parse(await event.target.files[0].text());if(data.schema!==1||!data.reviews||typeof data.reviews!=='object')throw new Error('Formato no válido');for(const [key,r] of Object.entries(data.reviews)){const id=JSON.parse(key);if(!Array.isArray(id)||id.length!==3||!['pending','yes','partial','no'].includes(r.verdict)||typeof r.reviewer!=='string')throw new Error('Registro no válido');}reviews={...reviews,...data.reviews};saveReviews();apply();$('notice').textContent='Revisiones importadas.';}catch(error){$('notice').textContent='No se importó: '+error.message;}event.target.value='';};
$('clearModels').onclick=()=>{if(!reporting)selectLocation(section);};
$('location').onchange=()=>selectLocation($('location').value);for(const id of ['source','level','classFilter'])$(id).onchange=()=>{previousView=null;$('back').disabled=true;apply();};for(const id of ['idFilter','descriptionFilter'])$(id).oninput=()=>{previousView=null;$('back').disabled=true;apply();};$('allTypes').onclick=()=>{previousView=null;$('back').disabled=true;enabledTypes=new Set(elements.map(e=>e.type));syncTypes();apply();};$('noTypes').onclick=()=>{previousView=null;$('back').disabled=true;enabledTypes.clear();syncTypes();apply();};$('reset').onclick=()=>{for(const id of ['source','level','idFilter','descriptionFilter','classFilter'])$(id).value='';enabledTypes=new Set(elements.map(e=>e.type));previousView=null;$('back').disabled=true;syncTypes();clearSelection();apply();};$('prev').onclick=()=>{page--;renderTable();};$('next').onclick=()=>{page++;renderTable();};$('dashToggle').onclick=()=>{const d=$('dashboard');d.hidden=!d.hidden;$('dashToggle').textContent=d.hidden?'Mostrar dashboards':'Ocultar dashboards';$('dashToggle').setAttribute('aria-expanded',String(!d.hidden));};$('colorBy').onchange=()=>apply(false);
$('isolate').onclick=()=>{if(!selected)return;previousView=viewState();$('back').disabled=false;apply();};$('back').onclick=()=>{const old=previousView;previousView=null;$('back').disabled=true;apply();if(old)restoreView(old);};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit([...new Set([...contextItems(),...shown])],b.dataset.view));$('exportCSV').onclick=()=>download(new Blob([extendedCSV(shown)],{type:'text/csv;charset=utf-8'}),section+'-entidades.csv');
const raycaster=new THREE.Raycaster();let down=null;canvas.onpointerdown=e=>down=[e.clientX,e.clientY,e.button];canvas.onpointerup=e=>{if(!down||down[2]!==0||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return;}down=null;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObjects(shown.flatMap(e=>e.meshes).filter(m=>m.visible&&!m.userData.contextOnly),false)[0];if(hit)select(hit.object.userData.displayElement||hit.object.userData.auditElement);};

function wrap(ctx,text,x,y,width,lineHeight,maxLines=3){const words=String(text).split(/\s+/),lines=[];let line='';for(let word of words){while(ctx.measureText(word).width>width){let cut=word.length;while(cut>1&&ctx.measureText(word.slice(0,cut)).width>width)cut--;if(line){lines.push(line);line='';}lines.push(word.slice(0,cut));word=word.slice(cut);}if(ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);for(let i=0;i<Math.min(lines.length,maxLines);i++)ctx.fillText(lines[i]+(i===maxLines-1&&lines.length>maxLines?'…':''),x,y+i*lineHeight);return Math.min(lines.length,maxLines)*lineHeight;}
function fitReportText(c,text,x,y,width,size,bold=false){do{c.font=(bold?'bold ':'')+size+'px Gotham';if(c.measureText(text).width<=width)break;size--;}while(size>10);c.fillText(text,x,y);}
function reportPage(type,items,snapshot,index,total,sourceScope,observation,documentInfo,logo,savedView){const out=document.createElement('canvas');out.width=1754;out.height=1240;const c=out.getContext('2d'),s=summary(items,reviews),color=typeColors.get(type)||'#8193a5';c.fillStyle='#0b1119';c.fillRect(0,0,1754,1240);c.drawImage(logo,38,25,100,100);c.fillStyle='#54d4c7';c.font='bold 18px Gotham';c.fillText('METRO DIGITAL / CONTROL DE CORRESPONDENCIA IFC',162,44);c.fillStyle='#eef4f8';let titleSize=30;do{c.font='bold '+titleSize+'px Gotham';if(c.measureText(catalog.find(x=>x.code===section).label).width<1010)break;titleSize--;}while(titleSize>18);c.fillText(catalog.find(x=>x.code===section).label,162,85);c.font='15px Gotham';c.fillStyle='#9caebe';c.fillText('Alcance: '+(sourceScope?'archivo seleccionado':'IFC originales abiertos')+' · todos los niveles e IDs',162,119);c.fillStyle='#182431';c.fillRect(1210,22,506,109);c.fillStyle='#eef4f8';fitReportText(c,'INFORME '+documentInfo.number,1228,50,470,20,true);c.fillStyle='#b8c8d6';fitReportText(c,'Fecha: '+documentInfo.date.split('-').reverse().join('/')+'   ·   Versión: '+documentInfo.version,1228,80,470,17);c.font='17px Gotham';c.fillText(section+' · Hoja '+String(index+1).padStart(2,'0')+' / '+total,1228,110);
 c.fillStyle='#111e2a';c.fillRect(38,152,1110,902);const imageBox=containedImageRect(snapshot.width,snapshot.height,54,205,1078,observation?550:760);c.drawImage(snapshot,imageBox.x,imageBox.y,imageBox.width,imageBox.height);if(observation){const layout=observationLayout(c,observation);c.fillStyle='#1c2d3a';c.fillRect(54,773,1078,212);c.fillStyle='#54d4c7';c.font='bold 18px Gotham';c.fillText('OBSERVACIÓN · '+type,74,802);c.fillStyle='#e6eef5';c.font=layout.size+'px Gotham';layout.lines.forEach((line,i)=>c.fillText(line,74,829+i*layout.height));}if(!items.some(e=>e.meshes.length&&!e.suppressed)){c.fillStyle='#b7c6d5';c.font='bold 28px Gotham';c.textAlign='center';c.fillText('Sin geometría vinculada a esta entidad',593,580);c.font='19px Gotham';c.fillText('Las entidades se conservan en el inventario y en el dashboard.',593,620);c.textAlign='left';}c.strokeStyle=color;c.lineWidth=3;c.strokeRect(38,152,1110,902);c.fillStyle=color;c.font='bold 20px Gotham';c.fillText(savedView?'VISTA 3D · VISTA GUARDADA PARA ESTA PÁGINA':'VISTA 3D · ENTIDADES Y CONTEXTO',60,185);c.fillStyle='#aebfcd';c.font='17px Gotham';c.fillText(savedView?'Vista guardada · '+savedView.count+' entidades del filtro · contexto transparente':'Color: '+type+' · Contexto transparente · IFC original',62,1003);const absent=items.filter(e=>!e.meshes.length).length,engineWarnings=nativeDiagnostics.some(d=>items.some(e=>e.source===d.source)&&d.diagnostics);c.fillText(engineWarnings?'El lector IFC registró avisos: pueden existir caras incompletas.':items.some(e=>e.void)?'Huecos IFC: volúmenes de sustracción; no son sólidos físicos.':absent?`${absent} entidades de esta tipología no tienen geometría vinculada.`:items.some(e=>e.aggregate)?'Conjuntos IFC representados por sus componentes, sin duplicar geometría.':'Cantidades por identidad IFC; no por materiales ni partes.',62,1031);
 c.fillStyle='#182431';c.fillRect(1170,152,546,257);c.fillStyle=color;const typeTitle=type==='GroupedGeometry'?'Geometría agrupada':type;let typeSize=30;do{c.font='bold '+typeSize+'px Gotham';if(c.measureText(typeTitle).width<=253)break;typeSize--;}while(typeSize>15);c.fillText(typeTitle,1192,194);c.fillStyle='#e6eef5';c.font='20px Gotham';wrap(c,labels[type]||type,1192,230,253,23,2);c.font='800 66px Gotham';c.fillText((s.groups||s.total).toLocaleString('es-CO'),1192,310);c.font='16px Gotham';c.fillStyle='#aebfcd';c.fillText(s.groups?'GRUPOS SIN IDENTIDAD IFC':'ENTIDADES IFC ÚNICAS',1195,343);wrap(c,s.groups?'No se pueden evaluar instancias IFC':`${s.withGeometry} con geometría`,1195,370,248,21,2);drawDefinition(c,type);
 c.fillStyle='#182431';c.fillRect(1170,425,546,629);c.fillStyle='#e6eef5';c.font='bold 23px Gotham';c.fillText('Comprobaciones automáticas',1192,465);
 const cs=classificationSummary(items);const metrics=[['ObjectType / IfcEntity',cs.yes,cs.known],['Texto compatible',s.semanticYes,s.semanticKnown],['Forma compatible',s.geometryYes,s.geometryKnown]];metrics.forEach(([name,yes,known],i)=>{const y=515+i*55;c.fillStyle='#d9e3ed';c.font='18px Gotham';c.fillText(name,1192,y);c.fillText(known?`${(100*yes/known).toFixed(1)} % · ${yes}/${known}`:'No evaluable',1490,y);c.fillStyle='#2c3d4d';c.fillRect(1192,y+12,492,5);c.fillStyle=color;c.fillRect(1192,y+12,known?492*yes/known:0,5);});c.fillStyle='#9caebe';c.font='14px Gotham';c.fillText('ObjectType: '+cs.unknown+' no evaluables. % sobre casos evaluables.',1192,674);c.fillText('Cruce de parámetros: no certifica la forma geométrica.',1192,696);
 c.fillStyle='#e6eef5';c.font='bold 19px Gotham';c.fillText('Distribución por nivel',1192,777);const levels=groupCounts(items,'level');let y=803;for(const [name,n] of levels.slice(0,4)){c.font='16px Gotham';c.fillStyle='#b8c8d6';c.fillText(name.slice(0,36),1192,y);c.fillStyle=color;c.fillText(String(n),1640,y);y+=24;}if(levels.length>4){c.font='14px Gotham';c.fillStyle='#aebfcd';c.fillText('+'+(levels.length-4)+' niveles adicionales · ver CSV',1192,y);}
 c.font='bold 17px Gotham';c.fillStyle='#e6eef5';c.fillText('Muestra de ID y texto fuente',1192,967);c.font='14px Gotham';c.fillStyle='#aebfcd';const example=items.find(e=>e.description||e.name)||items[0];wrap(c,(example.id||example.guid||'Sin ID')+' · '+(example.description||example.name||'Sin texto fuente'),1192,991,490,20,2);c.font='12px Gotham';c.fillText(example.description?'Description publicado':'Nombre IFC; Description no publicado',1192,1040);
 c.fillStyle='#182431';c.fillRect(38,1072,1678,130);c.font='bold 17px Gotham';c.fillStyle='#e6eef5';c.fillText('ARCHIVOS REVISADOS EN ESTE INFORME',58,1102);const sourceText=filesLayout(c,documentInfo.files);c.font=sourceText.size+'px Gotham';c.fillStyle='#afc0ce';sourceText.lines.forEach((line,i)=>c.fillText(line,58,1126+i*sourceText.height));const definition=definitionFor(type);c.font='12px Gotham';c.fillText(definition.url?'Definición: síntesis en español, no traducción oficial · buildingSMART · '+definition.url:'Sin definición normativa: clasificación no disponible.',58,1191);c.font='italic 400 12px Gotham';c.fillText('Resultados automáticos orientativos: coherencia de parámetros y proporciones; no certifican correspondencia geométrica. Detalle de entidades: CSV.',38,1223);return out.toDataURL('image/jpeg',.94);}


let reportDraft=null;
const reportViews=new Map();
const reportDraftCache=new Map(),noteMeasure=document.createElement('canvas').getContext('2d');
function invalidateReport(){reportImages=[];$('reportActions').hidden=true;$('reportPreview').replaceChildren();$('reportStatus').textContent='Configura las páginas y pulsa Generar páginas seleccionadas.';}
function saveReportDraft(){
 if(!reportDraft)return;
 includeObservedPages(reportDraft);
 const data={selected:[...reportDraft.selected],notes:reportDraft.notes,meta:reportDraft.meta};reportDraftCache.set(reportDraft.key,data);
 try{localStorage.setItem(reportDraft.key,JSON.stringify(data));}catch{$('reportSetupError').textContent='El navegador no pudo guardar el borrador. Se conserva durante esta sesión.';}
}
function validateReportDraft(){
 const chosen=reportDraft.types.filter(t=>reportDraft.selected.has(t));let message='';
 if(!chosen.length)message='Selecciona al menos una página para generar el informe.';else if(reportIdentityError(reportDraft.meta))message=reportIdentityError(reportDraft.meta);else if(!filesLayout(noteMeasure,reportFilesForDraft()))message='Los nombres de los archivos exceden el espacio disponible. Selecciona menos archivos fuente para este informe.';
 else for(const type of chosen){const note=reportDraft.notes[type]||'';if(note.length>1000||note.trim()&&!observationLayout(noteMeasure,note)){message='La observación de '+type+' no cabe completa. Reduce el texto o los saltos de línea antes de generar.';break;}}
 try{$('reportFilename').textContent='Nombre del archivo: '+reportFileName(section,reportDraft.meta.number)+'.pdf';}catch{$('reportFilename').textContent='Completa el número del informe para definir el nombre del archivo.';}
 $('reportSetupError').textContent=message;$('buildReport').disabled=!!message;return !message;
}
function showReportNote(){const type=$('reportNoteType').value;$('reportPageNote').disabled=!type;$('reportPageNote').value=reportDraft.notes[type]||'';$('reportNoteCount').textContent=$('reportPageNote').value.length+' / 1000';}
function refreshReportSelection(){
 includeObservedPages(reportDraft);
 document.querySelectorAll('#reportPageList input').forEach(box=>{const required=!!reportDraft.notes[box.value]?.trim();box.checked=reportDraft.selected.has(box.value);box.disabled=required;box.title=required?'Incluida automáticamente porque tiene observación.':'';});
 const chosen=reportDraft.types.filter(t=>reportDraft.selected.has(t)),current=$('reportNoteType').value;
 $('reportPageSummary').textContent=`Páginas del informe: ${chosen.length} de ${reportDraft.types.length} seleccionadas + portada`;
 $('reportNoteType').replaceChildren(...reportDraft.types.map(t=>new Option(t+' · '+(labels[t]||'Sin clasificación'),t)));
 if(reportDraft.types.includes(current))$('reportNoteType').value=current;
 $('reportNoteType').disabled=!reportDraft.types.length;$('reportFiles').value=reportFilesForDraft().join('\n');showReportNote();validateReportDraft();showSidebarNote();
}
function openReportSetup(){
 if(loading||reporting||failed.length)return;
 const scope=$('source').value,items=elements.filter(e=>!scope||e.source===scope),types=[...new Set(items.map(e=>e.type))].sort();
 if(!types.length)return;
 ensureReportDraft();fillReportIdentity();
 $('reportPageList').replaceChildren(...types.map(type=>{const label=document.createElement('label'),box=document.createElement('input'),span=document.createElement('span');box.type='checkbox';box.value=type;box.checked=reportDraft.selected.has(type);span.textContent=type+' · '+(labels[type]||'Sin clasificación')+' ('+items.filter(e=>e.type===type).length.toLocaleString('es-CO')+')';label.append(box,span);box.onchange=()=>{box.checked?reportDraft.selected.add(type):reportDraft.selected.delete(type);invalidateReport();refreshReportSelection();saveReportDraft();};return label;}));
 $('reportPagePicker').open=false;invalidateReport();refreshReportSelection();$('reportDialog').showModal();
}
for(const [id,all] of [['reportSelectAll',true],['reportSelectNone',false]])$(id).onclick=()=>{reportDraft.selected=new Set(all?reportDraft.types:[]);document.querySelectorAll('#reportPageList input').forEach(box=>box.checked=all);invalidateReport();refreshReportSelection();saveReportDraft();};
$('reportNoteType').onchange=showReportNote;
$('reportPageNote').oninput=()=>{const type=$('reportNoteType').value;if(!type)return;reportDraft.notes[type]=$('reportPageNote').value;invalidateReport();refreshReportSelection();saveReportDraft();};


let localReportSequence=0;
try{localReportSequence=Number(localStorage.getItem('emb-ifc-report-sequence-v1'))||0;}catch{}
function nextReportNumber(){
 try{localReportSequence=Math.max(localReportSequence,Number(localStorage.getItem('emb-ifc-report-sequence-v1'))||0);}catch{}
 localReportSequence++;
 try{localStorage.setItem('emb-ifc-report-sequence-v1',String(localReportSequence));}catch{}
 return String(localReportSequence).padStart(4,'0');
}
function ensureReportDraft(){
 const scope=$('source').value;
 if(reportDraft?.modelGeneration===generation&&reportDraft.scope===scope)return;
 const items=elements.filter(e=>!scope||e.source===scope),types=[...new Set(items.map(e=>e.type))].sort();
 const key='emb-ifc-report-draft-v1:'+JSON.stringify([section,'native',scope||[...new Set(items.map(e=>e.source))].sort()]);
 let saved=reportDraftCache.get(key);try{saved=saved||JSON.parse(localStorage.getItem(key)||'null');}catch{}
 reportDraft={key,scope,modelGeneration:generation,types,selected:new Set(Array.isArray(saved?.selected)?saved.selected.filter(t=>types.includes(t)):types),notes:{},meta:{number:typeof saved?.meta?.number==='string'?saved.meta.number.replace(/^IFC-/i,''):nextReportNumber(),date:typeof saved?.meta?.date==='string'?saved.meta.date:localReportDate(),version:typeof saved?.meta?.version==='string'?saved.meta.version:'V00'}};
 for(const t of types)if(typeof saved?.notes?.[t]==='string')reportDraft.notes[t]=saved.notes[t];
 saveReportDraft();invalidateReport();
}
function reportFilesForDraft(){return [...new Set(elements.filter(e=>(!reportDraft.scope||e.source===reportDraft.scope)&&reportDraft.selected.has(e.type)).map(e=>e.source||'Fuente no determinada'))].sort();}
function fillReportIdentity(){for(const [id,key] of [['reportNumber','number'],['reportDate','date'],['reportVersion','version']])$(id).value=reportDraft.meta[key];}
function showSidebarNote(){
 syncReportView();
 const type=$('pageObservationType').value;if(!reportDraft||!type){$('pageObservation').value='';$('pageObservation').disabled=true;$('pageObservationStatus').textContent='Selecciona la página IFC para escribir su observación.';return;}
 const note=reportDraft.notes[type]||'';if(document.activeElement!==$('pageObservation'))$('pageObservation').value=note;
 $('pageObservation').disabled=loading||reporting;
 $('pageObservationStatus').textContent=note.length+' / 1000 · '+(note.trim()&&!observationLayout(noteMeasure,note)?'Reduce el texto o los saltos de línea: debe caber completo.':!reportDraft.selected.has(type)?'Esta página no está seleccionada para el PDF. Puedes incluirla en Preparar informe.':'Guardado en este navegador. Se incluirá en la página '+type+'.');
}
function syncReportSidebar(){
 if(loading||reporting||!elements.length)return;
 const oldKey=reportDraft?.key;ensureReportDraft();const types=reportDraft.types,current=oldKey===reportDraft.key?$('pageObservationType').value:'',single=enabledTypes.size===1?[...enabledTypes][0]:null;
 $('pageObservationType').replaceChildren(new Option('Selecciona una tipología',''),...types.map(t=>new Option(t+' · '+(labels[t]||'Sin clasificación'),t)));
 $('pageObservationType').value=types.includes(single)?single:types.includes(current)?current:'';
 $('annotationToggle').disabled=false;$('pageObservationType').disabled=false;$('prepareReportSidebar').disabled=!!failed.length;showSidebarNote();
}
$('pageObservationType').onchange=()=>{annotations.reset();showSidebarNote();};
$('pageObservation').oninput=()=>{const type=$('pageObservationType').value;if(!type||!reportDraft)return;reportDraft.notes[type]=$('pageObservation').value;saveReportDraft();invalidateReport();refreshReportSelection();};
$('prepareReportSidebar').onclick=openReportSetup;
for(const [id,key] of [['reportNumber','number'],['reportDate','date'],['reportVersion','version']])$(id).oninput=()=>{reportDraft.meta[key]=$(id).value;saveReportDraft();invalidateReport();validateReportDraft();};
$('nextReportNumber').onclick=()=>{reportDraft.meta={number:nextReportNumber(),date:localReportDate(),version:'V00'};fillReportIdentity();saveReportDraft();invalidateReport();validateReportDraft();};
function syncReportView(){
 const type=$('pageObservationType').value,saved=reportDraft&&reportViews.get(reportDraft.key)?.get(type);
 $('saveReportView').disabled=loading||reporting||!type||!shown.some(e=>e.type===type&&e.meshes.length&&!e.suppressed);
 $('saveReportView').title=type?'Guardar la vista actual para '+type:'Selecciona Página IFC en Observación por tipología, o aísla una tipología con Solo.';
 $('reportViewStatus').textContent=saved?'Vista guardada para '+type+'. Se conserva durante esta carga de modelos.':type?'Página '+type+': ajusta la vista 3D y pulsa Vista para informe.':'Selecciona una página IFC o aísla una tipología con Solo para guardar su vista.';
 $('reportViewPreview').hidden=!saved;$('clearReportView').hidden=!saved;
 if(saved){$('reportViewPreview').src=saved.preview;$('reportViewPreview').alt='Vista guardada para '+type;}
}
$('saveReportView').onclick=()=>{
 if(loading||reporting||!reportDraft)return;
 const type=$('pageObservationType').value;if(!type||!shown.some(e=>e.type===type&&e.meshes.length&&!e.suppressed))return;
 render();const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);annotations.drawTo(copy.getContext('2d'),copy.width,copy.height);
 if(!reportViews.has(reportDraft.key))reportViews.set(reportDraft.key,new Map());
 reportViews.get(reportDraft.key).set(type,{canvas:copy,preview:copy.toDataURL('image/png'),count:shown.filter(e=>!e.grouped).length});
 reportDraft.selected.add(type);saveReportDraft();invalidateReport();refreshReportSelection();
};
$('clearReportView').onclick=()=>{reportViews.get(reportDraft?.key)?.delete($('pageObservationType').value);invalidateReport();syncReportView();};
async function reportLogo(){const img=new Image();img.src=new URL('./assets/logo-metro.jpg',location.href).href;await img.decode();return img;}

async function generateReport(){
 if(loading||reporting||failed.length||!reportDraft)return;
 try{await loadReportFonts();}catch(error){$('reportStatus').textContent=error.message;return;}
 saveReportDraft();const scope=$('source').value,types=reportDraft.types.filter(t=>reportDraft.selected.has(t)),items=elements.filter(e=>(!scope||e.source===scope)&&types.includes(e.type));if(!validateReportDraft())return;
 reporting=true;$('clearModels').disabled=true;$('reportSetup').disabled=true;$('reportActions').hidden=true;$('closeReport').disabled=true;$('reportPreview').replaceChildren();reportImages=[];
 const before=viewState(),oldColor=$('colorBy').value;clearHighlight();
 const reportRenderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});reportRenderer.setSize(1078,760);reportRenderer.outputColorSpace=THREE.SRGBColorSpace;const reportCamera=camera.clone();
 const append=(img,alt)=>{reportImages.push(img);const preview=document.createElement('img');preview.src=img;preview.alt=alt;preview.loading='lazy';$('reportPreview').append(preview);};
 try{
  const [logo,modoLogo]=await Promise.all([reportLogo(),loadModoLogo()]),documentInfo={...reportDraft.meta,files:reportFilesForDraft()};
  append(reportCover({section,label:catalog.find(x=>x.code===section).label,meta:documentInfo,total:types.length+1,logo:modoLogo}),'Portada · Modo Metro · Equipo BIM-OTI-EMB');
  for(let i=0;i<types.length;i++){
   const type=types[i],members=items.filter(e=>e.type===type),observation=(reportDraft.notes[type]||'').trim();
   reportRenderer.setSize(1078,observation?550:760);reportCamera.aspect=1078/(observation?550:760);reportCamera.updateProjectionMatrix();$('reportStatus').textContent=`Generando hoja ${i+2} de ${types.length+1} · ${type}`;
   $('colorBy').value='type';paint(members);fit([...new Set([...contextItems(),...members])],'iso',reportCamera,null);reportRenderer.render(scene,reportCamera);
   const savedView=reportViews.get(reportDraft.key)?.get(type),img=reportPage(type,members,savedView?.canvas||reportRenderer.domElement,i+1,types.length+1,scope,observation,documentInfo,logo,savedView);
   append(img,`Hoja ${i+2}: ${type}. Observación: ${observation||'Sin observación'}`);await loadingFrame();
  }
  reportName=reportFileName(section,reportDraft.meta.number);$('reportStatus').textContent=`1 portada + ${types.length} hojas IFC · ${summary(items,reviews).total.toLocaleString('es-CO')} entidades del informe. El contexto transparente no se cuenta.`;$('reportActions').hidden=false;
 }catch(error){$('reportStatus').textContent='No se pudo completar: '+error.message;reportImages=[];}
 finally{reportRenderer.dispose();reportRenderer.forceContextLoss();$('colorBy').value=oldColor;reporting=false;apply(false);restoreView(before);$('closeReport').disabled=false;$('reportSetup').disabled=false;$('clearModels').disabled=!elements.length;}
}

$('reportSaveDestination').textContent=location.hostname==='127.0.0.1'&&location.port==='8767'?'Destino PDF: D:/OneDrive - EMB/_0_Complementarios/00 Informe IFC. Los archivos existentes se conservan.':'Destino PDF: carpeta de descargas configurada en el navegador.';
$('report').onclick=openReportSetup;$('buildReport').onclick=generateReport;$('closeReport').onclick=()=>$('reportDialog').close();$('reportDialog').addEventListener('cancel',e=>{if(reporting)e.preventDefault();});$('downloadPDF').onclick=async()=>{
 const blob=imagePDF(reportImages);
 if(location.hostname!=='127.0.0.1'||location.port!=='8767'){download(blob,reportName+'.pdf');return;}
 $('downloadPDF').disabled=true;$('reportStatus').textContent='Guardando PDF en la carpeta de informes de OneDrive…';
 try{
  const response=await fetch('./save-report',{method:'POST',headers:{'Content-Type':'application/pdf','X-Report-Name':reportName+'.pdf'},body:blob});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Error al guardar el archivo');
  $('reportStatus').textContent='PDF guardado en: '+result.file;
 }catch(error){$('reportStatus').textContent='No se guardó el PDF: '+error.message+' Reintenta la descarga cuando la carpeta esté disponible.';}
 finally{$('downloadPDF').disabled=false;}
};$('downloadHTML').onclick=()=>download(new Blob([`<!doctype html><html lang="es"><meta charset="utf-8"><title>${safe(reportName)}</title><style>body{margin:0;background:#0b1119}img{display:block;width:100%;page-break-after:always}@page{size:A4 landscape;margin:0}button{margin:15px;padding:12px}@media print{button{display:none}}</style><button onclick="print()">Imprimir / Guardar como PDF</button>${reportImages.map((src,i)=>`<img src="${src}" alt="Hoja ${i+1}">`).join('')}</html>`],{type:'text/html'}),reportName+'.html');
async function init(){
 try{
  const data=await resource('ifc-locations.json?v=20261022-ifc-only-v1');catalog=data.locations;
  if(!Array.isArray(catalog)||!catalog.length)throw new Error('El catálogo de ubicaciones está vacío');
  $('location').innerHTML=catalog.map(x=>`<option value="${safe(x.code)}">${safe(x.label.replace(/^IFC\s*·\s*/,''))}</option>`).join('');
  const requested=new URLSearchParams(location.search).get('section')||'PT102';$('location').value=catalog.some(x=>x.code===requested)?requested:catalog[0].code;
  selectLocation($('location').value);
 }catch(error){catalog=[{code:'LOCAL',label:'Archivos IFC locales'}];$('location').replaceChildren(new Option('Archivos IFC locales','LOCAL'));selectLocation('LOCAL');$('notice').textContent='Catálogo de ubicaciones no disponible. Puedes abrir tus archivos IFC en esta sesión local.';}
}
// Reuse the mockup header and expose this module without replacing its navigation.
const panel=document.querySelector('.headerModulePanel');if(panel&&!panel.querySelector('a[href="./ifc-audit.html"]')){const a=document.createElement('a');a.href='./ifc-audit.html';a.textContent='Control IFC';a.setAttribute('aria-current','page');panel.append(a);}const reference=document.querySelector('#reference');if(reference)reference.onclick=()=>{alert('Fuentes activas: '+[...new Set(elements.map(e=>e.source))].join('\n')+'\nGeometría, parámetros y relaciones leídos de los archivos IFC originales. Catálogo: ifc-locations.json (solo ubicaciones).' );};
resize();init();
