import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {appendProgressRecord,loadProgressRecords} from './object-progress.js?v=20260930-registration-v1';
import {applyActivityAssignments,elementFromMetadata,matchesRegistrationFilters,recordsForRegistrationElement,registrationTarget} from './bim-registration-state.js?v=20260930-activity-weight-v1';
import {activitySummaries,buildingSummary,deviationTone,formatDeviation,groupElementProgress,weightedElementProgress} from './bim-progress-dashboard.js?v=20260930-activity-weight-v1';

const $=id=>document.getElementById(id);
const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const query=new URLSearchParams(location.search);
const section=(query.get('section')||'PT108').toUpperCase();
const typeLabels={IfcWall:'Muro',IfcWallStandardCase:'Muro',IfcSlab:'Losa / piso',IfcWindow:'Ventana',IfcDoor:'Puerta',IfcColumn:'Columna',IfcBeam:'Viga',IfcMember:'Elemento estructural',IfcPlate:'Placa',IfcRoof:'Cubierta',IfcCovering:'Revestimiento',IfcCurtainWall:'Muro cortina',IfcRailing:'Baranda',IfcStair:'Escalera',IfcStairFlight:'Tramo de escalera',IfcFlowTerminal:'Luminaria / terminal',IfcFlowSegment:'Segmento de instalación',IfcElementAssembly:'Conjunto',IfcBuildingElementProxy:'Elemento arquitectónico'};
const typeLabel=type=>typeLabels[type]||String(type||'Elemento IFC').replace(/^Ifc/,'');
const filters={id:'',activityId:'',executionUnit:'',ifcType:'',level:''};
let activities=[],activityById=new Map(),primaveraMeta={},manifestEntry=null,elementPayload=null,elements=[],meshPickables=[],selectedElement=null,progressRecords=loadProgressRecords(),highlight=null,isolate=false,dashboardOpen=false,toastTimer;

async function loadGzipJSON(url){
  const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function option(value,label=value){return `<option value="${safe(value)}">${safe(label)}</option>`;}
function unique(values){return [...new Set(values.filter(value=>value&&value!=='Sin UE'&&value!=='Sin nivel'))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));}
function bogotaToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}

const canvas=$('modelCanvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color('#061019');
const camera=new THREE.PerspectiveCamera(42,1,.05,20000);camera.position.set(22,18,24);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.screenSpacePanning=true;controls.minDistance=.2;controls.maxDistance=12000;
scene.add(new THREE.HemisphereLight('#cdeaff','#392f28',2.2));const sun=new THREE.DirectionalLight('#fff2df',3.6);sun.position.set(30,60,42);scene.add(sun);const fill=new THREE.DirectionalLight('#7fc8ff',1.1);fill.position.set(-45,25,-35);scene.add(fill);
const modelRoot=new THREE.Group();scene.add(modelRoot);
const materialCache=new Map();
const materialSpecs={IfcMember:['#5a7182',.7,.15,1],IfcBeam:['#708593',.68,.12,1],IfcPlate:['#b7c3c8',.72,.07,1],IfcWallStandardCase:['#dce5e7',.8,.03,1],IfcWall:['#d8e2e4',.8,.03,1],IfcSlab:['#c5d0d3',.84,.03,1],IfcRoof:['#bdcbd1',.72,.08,1],IfcWindow:['#6fa7bd',.25,.12,.38],IfcCurtainWall:['#6296aa',.3,.12,.42],IfcDoor:['#765b45',.7,.04,1],IfcRailing:['#455d6c',.55,.23,1],IfcStairFlight:['#9eacb2',.76,.06,1],IfcStair:['#9eacb2',.76,.06,1],IfcCovering:['#bdc8ca',.8,.03,1],IfcFlowTerminal:['#697e88',.62,.14,1],IfcBuildingElementProxy:['#879aa2',.75,.05,1]};
function materialFor(type){
  const key=materialSpecs[type]?type:'IfcBuildingElementProxy';if(materialCache.has(key))return materialCache.get(key);
  const [color,,,opacity]=materialSpecs[key];const material=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1,side:THREE.DoubleSide,toneMapped:false});materialCache.set(key,material);return material;
}

function guidFor(object){let node=object;while(node&&node!==modelRoot){if(elementPayload?.elements?.[node.name])return node.name;node=node.parent;}return object.name||'';}
function addLoadedScene(assetScene){
  modelRoot.add(assetScene);
  const byGuid=new Map(elements.map(element=>[element.guid,element]));
  assetScene.traverse(object=>{
    if(!object.isMesh)return;
    const guid=guidFor(object);const raw=elementPayload.elements[guid]||{t:'IfcBuildingElementProxy',u:'Sin UE',l:'Sin nivel',n:object.name,i:guid,f:manifestEntry.sources?.[0]||'',s:section};
    let element=byGuid.get(guid);
    if(!element){element=elementFromMetadata(guid,raw,activities);element.section=section;element.level=element.level.replace(/^Level:\s*/i,'')||'Sin nivel';element.progressObjectId=`ifc-element:${section}:${element.source}:${element.guid}`;element.meshes=[];elements.push(element);byGuid.set(guid,element);}
    element.meshes.push(object);object.userData.registrationElement=element;object.material=materialFor(element.ifcType);if(object.material.transparent)object.renderOrder=4;
    if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();meshPickables.push(object);
  });
}

function setSelectOptions(){
  const activeElements=elements.filter(element=>element.section===section);
  const units=unique(activeElements.map(element=>element.executionUnit));
  const types=unique(activeElements.map(element=>element.ifcType));
  const levels=unique(activeElements.map(element=>element.level));
  const unitSet=new Set(units),activityIds=unique(activities.filter(task=>unitSet.has(String(task.ue))).map(task=>String(task.id)));
  $('filterUE').innerHTML=option('','Todas las UE')+units.map(value=>option(value,`UE ${value}`)).join('');
  $('filterType').innerHTML=option('','Todos los tipos')+types.map(value=>option(value,`${typeLabel(value)} · ${value}`)).join('');
  $('filterLevel').innerHTML=option('','Todos los niveles')+levels.map(value=>option(value)).join('');
  $('filterActivity').innerHTML=option('','Todos los ActivityID')+activityIds.map(value=>option(value,`${value} · ${activityById.get(value)?.name||''}`)).join('');
}

function applyFilters(){
  let visible=0;
  for(const element of elements){const belongsToActiveModel=element.section===section;const show=belongsToActiveModel&&(isolate?element===selectedElement:matchesRegistrationFilters(element,filters));element.visible=show;if(show)visible++;for(const mesh of element.meshes)mesh.visible=show;}
  $('visibleCount').textContent=visible.toLocaleString('es-CO');$('isolateSelected').classList.toggle('active',isolate);$('isolateSelected').textContent=isolate?'Restablecer aislamiento':'Aislar selección';
  if(selectedElement&&!selectedElement.visible&&!isolate)clearHighlight();else if(selectedElement)highlightElement(selectedElement);
  renderDashboard();
}

function clearHighlight(){
  if(highlight){scene.remove(highlight);highlight.traverse(object=>{if(object.userData.selectionGeometry)object.geometry?.dispose?.();if(object.userData.selectionMaterial)object.material?.dispose?.();});highlight=null;}
  $('selectionMarker').hidden=true;
}
function elementBounds(element){const box=new THREE.Box3();for(const mesh of element.meshes)if(mesh.visible)box.expandByObject(mesh,true);return box;}
function highlightElement(element){
  clearHighlight();const box=elementBounds(element);if(box.isEmpty())return;
  highlight=new THREE.Group();highlight.userData.bounds=box.clone();
  const boxHelper=new THREE.Box3Helper(box,0xffffff);boxHelper.material.depthTest=false;boxHelper.material.transparent=true;boxHelper.material.opacity=.95;boxHelper.renderOrder=1001;boxHelper.userData.selectionGeometry=true;boxHelper.userData.selectionMaterial=true;highlight.add(boxHelper);
  for(const mesh of element.meshes){
    if(!mesh.visible)continue;
    const surfaceMaterial=new THREE.MeshBasicMaterial({color:'#ed1400',transparent:true,opacity:.62,depthTest:false,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
    const surface=new THREE.Mesh(mesh.geometry,surfaceMaterial);surface.matrixAutoUpdate=false;surface.matrix.copy(mesh.matrixWorld);surface.renderOrder=999;surface.userData.selectionMaterial=true;surface.userData.selectionSurface=true;highlight.add(surface);
    const edgeGeometry=new THREE.EdgesGeometry(mesh.geometry,18),edgeMaterial=new THREE.LineBasicMaterial({color:'#fff35c',transparent:true,opacity:1,depthTest:false,toneMapped:false});
    const edges=new THREE.LineSegments(edgeGeometry,edgeMaterial);edges.matrixAutoUpdate=false;edges.matrix.copy(mesh.matrixWorld);edges.renderOrder=1000;edges.userData.selectionGeometry=true;edges.userData.selectionMaterial=true;highlight.add(edges);
  }
  scene.add(highlight);const marker=$('selectionMarker');marker.hidden=false;marker.querySelector('span').textContent=`${typeLabel(element.ifcType)} · ${element.guid}`;
}
function selectElement(element){selectedElement=element;isolate=false;highlightElement(element);$('isolateSelected').disabled=false;renderConsult();}

function historyHtml(records){
  if(!records.length)return '<p class="emptyHistory">Este elemento todavía no tiene registros directos ni registros heredados por ActivityID o UE.</p>';
  return `<div class="history">${records.map(record=>`<article><strong>${safe(record.progress)} %</strong><span><b>${safe(record.userName)}</b><small>${safe(new Date(record.date+'T12:00:00').toLocaleDateString('es-CO'))} · ${safe(record.kind)}${record.scopeValue?` · ${safe(record.scopeValue)}`:''}</small></span></article>`).join('')}</div>`;
}
function inspectorHead(element){return `<header class="inspectorHead"><span>ELEMENTO IFC SELECCIONADO</span><h2>${safe(typeLabel(element.ifcType))} · ${safe(element.guid)}</h2><p>${safe(section)} · ${safe(element.level)}</p></header>`;}
function actionBar(active){return `<div class="inspectorActions"><button data-inspector="consult" class="${active==='consult'?'active':''}">Consultar</button><button data-inspector="register" class="${active==='register'?'active':''}">Registrar</button></div>`;}
function bindInspectorActions(){document.querySelectorAll('[data-inspector]').forEach(button=>button.onclick=()=>button.dataset.inspector==='consult'?renderConsult():renderScopeChooser());}
function renderConsult(){
  if(!selectedElement)return;const element=selectedElement,records=recordsForRegistrationElement(progressRecords,element);
  const activitiesText=element.assignedActivityId?`${element.assignedActivityId} · ${activityById.get(element.assignedActivityId)?.name||''}`:'Sin ActivityID asignada';
  $('inspector').innerHTML=inspectorHead(element)+`<div class="inspectorBody">${actionBar('consult')}<table class="parameterTable"><tbody><tr><th>ID</th><td>${safe(element.id)}</td></tr><tr><th>GlobalId</th><td>${safe(element.guid)}</td></tr><tr><th>ActivityID</th><td>${safe(activitiesText)}</td></tr><tr><th>ExecutionUnit</th><td>${safe(element.executionUnit)}</td></tr><tr><th>Tipo de elemento</th><td>${safe(typeLabel(element.ifcType))} · ${safe(element.ifcType)}</td></tr><tr><th>Level</th><td>${safe(element.level)}</td></tr><tr><th>Nombre IFC</th><td>${safe(element.name)}</td></tr><tr><th>Archivo fuente</th><td>${safe(element.source)}</td></tr></tbody></table><h3 class="historyTitle">Historial · ${records.length}</h3>${historyHtml(records)}</div>`;
  bindInspectorActions();
}
function renderScopeChooser(){
  if(!selectedElement)return;const element=selectedElement,hasActivity=element.candidateActivityIds.length>0,hasUE=element.executionUnit&&element.executionUnit!=='Sin UE';
  $('inspector').innerHTML=inspectorHead(element)+`<div class="inspectorBody">${actionBar('register')}<p class="scopeIntro">Selecciona el alcance de la nueva entrada. En el siguiente paso debes asignar una ActivityID vigente de Primavera para la UE del elemento.</p><div class="scopeButtons"><button data-scope="element" ${hasActivity?'':'disabled'}><b>1. Por elemento</b><small>Solo ${safe(element.guid)}</small></button><button data-scope="activity" ${hasActivity?'':'disabled'}><b>2. Por ActivityID</b><small>${hasActivity?`${element.candidateActivityIds.length} actividades Primavera disponibles para UE ${safe(element.executionUnit)}`:'Sin actividad Primavera para la UE'}</small></button><button data-scope="ue" ${hasUE&&hasActivity?'':'disabled'}><b>3. Por UE</b><small>${hasUE?`UE ${safe(element.executionUnit)}`:'Elemento sin UE asignada'}</small></button></div></div>`;
  bindInspectorActions();document.querySelectorAll('[data-scope]').forEach(button=>button.onclick=()=>renderRegisterForm(button.dataset.scope));
}
function renderRegisterForm(scopeType){
  const element=selectedElement;if(!element)return;const activitiesOptions=element.candidateActivityIds.map(id=>option(id,`${id} · ${activityById.get(id)?.name||''}`)).join('');
  const scopeValue=scopeType==='ue'?element.executionUnit:element.guid,scopeLabel=scopeType==='ue'?`UE ${element.executionUnit}`:scopeType==='activity'?'La ActivityID seleccionada será el alcance del registro':`Elemento ${element.guid}`;
  $('inspector').innerHTML=inspectorHead(element)+`<div class="inspectorBody">${actionBar('register')}<form id="registrationForm" class="registerForm"><div class="scopeBadge">${safe(scopeLabel)}</div><label>ActivityID Primavera vigente<select name="activityId" required>${option('','Selecciona una actividad')}${activitiesOptions}</select><small>Listado limitado a la UE ${safe(element.executionUnit)} del edificio activo.</small></label><input type="hidden" name="scopeValue" value="${safe(scopeValue)}"><label>Nombre de usuario<input name="userName" required maxlength="100" autocomplete="name" placeholder="Responsable del registro"></label><label>Fecha<input name="date" type="date" required value="${bogotaToday()}"></label><label>Porcentaje de avance<input name="progress" type="number" min="0" max="100" step="0.01" required placeholder="0–100"></label><p id="formError" class="formError" role="alert"></p><p class="storageNote">La ActivityID seleccionada quedará asignada al elemento. Los registros se conservan localmente en este navegador y no modifican el IFC ni Primavera P6.</p><div class="formActions"><button type="button" id="scopeBack">Atrás</button><button class="primary" type="submit">Guardar registro</button></div></form></div>`;
  const activitySelect=$('registrationForm').elements.activityId;if(element.assignedActivityId&&element.candidateActivityIds.includes(element.assignedActivityId))activitySelect.value=element.assignedActivityId;
  bindInspectorActions();$('scopeBack').onclick=renderScopeChooser;$('registrationForm').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget),activityId=String(data.get('activityId')||'');try{const value=scopeType==='activity'?activityId:data.get('scopeValue');const target=registrationTarget(element,scopeType,value,activityId);const result=appendProgressRecord(localStorage,{...target,userName:data.get('userName'),date:data.get('date'),progress:data.get('progress')});progressRecords=result.records;element.assignedActivityId=activityId;element.activityIds=[activityId];updateKpis();toast(`Avance de ${result.record.progress} % registrado para ${target.objectTitle}`);renderConsult();}catch(error){$('formError').textContent=error?.message||'No fue posible guardar el registro.';}};
}

const percent=value=>value==null?'—':`${Math.round(value)} %`;
const precisePercent=value=>value==null?'Sin registro':value>0&&value<.1?'< 0,1 %':`${Math.round(value*10)/10} %`;
function dashboardBar(label,progress,count,filterKey,filterValue,detail=''){
  const active=filters[filterKey]===filterValue,registered=progress!=null;
  return `<button class="dashboardRow ${active?'active':''}" data-dashboard-filter="${safe(filterKey)}" data-dashboard-value="${safe(filterValue)}" title="Filtrar el modelo activo por ${safe(label)}"><span><b>${safe(label)}</b><small>${safe(detail||`${count.toLocaleString('es-CO')} elementos`)}</small></span><i><em style="width:${registered?Math.max(0,Math.min(100,progress)):0}%"></em></i><strong>${registered?precisePercent(progress):'Sin registro'}</strong></button>`;
}
function activityRow(item){
  const active=filters.activityId===item.id,tone=deviationTone(item.deviation),model=item.registered==null?0:item.registered;
  return `<button class="activityRow ${active?'active':''}" data-dashboard-filter="activityId" data-dashboard-value="${safe(item.id)}" title="${safe(item.name)}"><span><b>${safe(item.id)}</b><small>${safe(item.name)} · UE ${safe(item.ue)} · ${item.registeredElements}/${item.elementCount} elementos</small></span><div class="dualProgress"><i class="modelBar" style="width:${Math.max(0,Math.min(100,model))}%"></i><i class="p6Bar" style="width:${Math.max(0,Math.min(100,item.primavera))}%"></i></div><strong><span>Modelo ${precisePercent(item.registered)}</span><span>P6 ${percent(item.primavera)}</span></strong><em class="deviation ${tone}">${safe(formatDeviation(item.deviation))}</em></button>`;
}
function renderDashboard(){
  if(!manifestEntry||!elements.length)return;
  const activeElements=elements.filter(element=>element.section===section),visibleElements=activeElements.filter(element=>element.visible),summary=buildingSummary(section,activeElements,progressRecords,activities),tone=deviationTone(summary.deviation);
  $('buildingDashboard').innerHTML=`<div class="buildingCompare"><div><span>Modelo registrado</span><b>${precisePercent(summary.registered)}</b></div><div><span>Primavera vigente</span><b>${percent(summary.primavera)}</b></div><em class="deviation ${tone}">${safe(formatDeviation(summary.deviation))}</em></div><div class="legendBars"><span><i class="modelLegend"></i>Modelo</span><span><i class="p6Legend"></i>Primavera</span></div><p>${summary.targets.toLocaleString('es-CO')} de ${activeElements.length.toLocaleString('es-CO')} elementos con avance efectivo</p><small>El avance del edificio se pondera por la cantidad total de elementos. Fuente P6: ${safe(primaveraMeta.source||'Primavera vigente')} · corte ${safe(primaveraMeta.cutoff||'—')}</small>`;
  let activityData=activitySummaries(section,visibleElements,progressRecords,activities);if(filters.activityId)activityData=activityData.filter(item=>item.id===filters.activityId);
  $('activityDashboard').innerHTML=activityData.length?activityData.map(activityRow).join(''):'<p class="dashboardEmpty">No hay actividades Primavera vinculadas a la selección actual.</p>';
  const levels=groupElementProgress(visibleElements,progressRecords,'level'),types=groupElementProgress(visibleElements,progressRecords,'ifcType');
  $('levelDashboard').innerHTML=levels.length?levels.map(item=>dashboardBar(item.name,item.progress,item.count,'level',item.name,`${item.registered}/${item.count} elementos con avance`)).join(''):'<p class="dashboardEmpty">Sin niveles para los filtros activos.</p>';
  $('typeDashboard').innerHTML=types.length?types.map(item=>dashboardBar(typeLabel(item.name),item.progress,item.count,'ifcType',item.name,`${item.registered}/${item.count} · ${item.name}`)).join(''):'<p class="dashboardEmpty">Sin tipos para los filtros activos.</p>';
  renderTypeFilterSummary(visibleElements);
  document.querySelectorAll('[data-dashboard-filter]').forEach(button=>button.onclick=()=>setFilterFromDashboard(button.dataset.dashboardFilter,button.dataset.dashboardValue));
  const deviation=$('kpiDeviation');deviation.textContent=formatDeviation(summary.deviation);deviation.className=`${tone}`;$('kpiDeviationNote').textContent=summary.deviation==null?'Falta un registro comparable':`Modelo ${precisePercent(summary.registered)} · P6 ${percent(summary.primavera)}`;
}
function typeSummaryRow(label,item){return `<div class="typeSummaryRow"><span><b>${safe(label)}</b><small>${item.registered.toLocaleString('es-CO')}/${item.count.toLocaleString('es-CO')} con registro</small></span><strong>${safe(precisePercent(item.progress))}</strong></div>`;}
function renderTypeFilterSummary(visibleElements){
  const panel=$('typeFilterSummary');if(!filters.ifcType){panel.hidden=true;panel.innerHTML='';return;}
  const aggregate=weightedElementProgress(visibleElements,progressRecords),ueGroups=groupElementProgress(visibleElements,progressRecords,'executionUnit'),activityGroups=groupElementProgress(visibleElements,progressRecords,'activityId');
  panel.hidden=false;panel.innerHTML=`<header><span>TIPO SELECCIONADO</span><b>${safe(typeLabel(filters.ifcType))}</b></header><div class="typeCounter"><strong>${visibleElements.length.toLocaleString('es-CO')}</strong><span>elementos</span></div><div class="typeAggregate"><span>Avance por elemento</span><b>${safe(precisePercent(aggregate.progress))}</b><small>${aggregate.registered.toLocaleString('es-CO')}/${aggregate.count.toLocaleString('es-CO')} con registro</small></div><h3>Avance por UE</h3><div class="typeSummaryRows">${ueGroups.map(item=>typeSummaryRow(`UE ${item.name}`,item)).join('')||'<p>Sin registro</p>'}</div><h3>Avance por ActivityID</h3><div class="typeSummaryRows">${activityGroups.map(item=>typeSummaryRow(item.name,item)).join('')||'<p>Sin registro</p>'}</div>`;
}
function setFilterFromDashboard(key,value){
  const control={activityId:'filterActivity',level:'filterLevel',ifcType:'filterType'}[key];if(!control)return;
  filters[key]=filters[key]===value?'':value;$(control).value=filters[key];isolate=false;applyFilters();toast(filters[key]?`Filtro ${value} aplicado solo a ${section}`:`Filtro ${value} retirado`);
}
function updateKpis(){
  const activeElements=elements.filter(element=>element.section===section),relevant=progressRecords.filter(record=>record.section===section),summary=buildingSummary(section,activeElements,progressRecords,activities),units=unique(activeElements.map(element=>element.executionUnit));
  $('kpiElements').textContent=activeElements.length.toLocaleString('es-CO');$('kpiUE').textContent=units.length.toLocaleString('es-CO');$('kpiRecords').textContent=relevant.length.toLocaleString('es-CO');$('kpiProgress').textContent=precisePercent(summary.registered);renderDashboard();
}
function resize(){const rect=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);
function fitModel(direction='iso'){const box=new THREE.Box3();if(isolate&&selectedElement)box.copy(elementBounds(selectedElement));else for(const element of elements)if(element.visible)for(const mesh of element.meshes)box.expandByObject(mesh,true);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.length()*.55,.35),aspectAllowance=1/Math.max(.35,Math.min(1,camera.aspect)),distance=radius/Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*1.25*aspectAllowance;const dir=direction==='top'?new THREE.Vector3(.001,1,.001):direction==='front'?new THREE.Vector3(0,.12,1):new THREE.Vector3(.72,.52,1);dir.normalize();camera.position.copy(center).addScaledVector(dir,distance);controls.target.copy(center);controls.update();camera.near=Math.max(.01,distance/5000);camera.far=Math.max(2000,distance*20);camera.updateProjectionMatrix();}

let pointerDown=null;const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function elementAt(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(meshPickables.filter(mesh=>mesh.visible),false)[0]?.object?.userData?.registrationElement||null;}
canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY,button:event.button};});
canvas.addEventListener('pointerup',event=>{if(!pointerDown||Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6)return;const element=elementAt(event);if(element)selectElement(element);pointerDown=null;});
canvas.addEventListener('contextmenu',event=>{event.preventDefault();const element=elementAt(event);if(element)selectElement(element);});

function bindFilters(){
  $('filterId').addEventListener('input',event=>{filters.id=event.target.value;isolate=false;applyFilters();});
  for(const [id,key] of [['filterActivity','activityId'],['filterUE','executionUnit'],['filterType','ifcType'],['filterLevel','level']])$(id).addEventListener('change',event=>{filters[key]=event.target.value;isolate=false;applyFilters();});
  $('resetFilters').onclick=()=>{Object.assign(filters,{id:'',activityId:'',executionUnit:'',ifcType:'',level:''});$('filterId').value='';for(const id of ['filterActivity','filterUE','filterType','filterLevel'])$(id).value='';isolate=false;applyFilters();fitModel();};
  $('isolateSelected').onclick=()=>{if(!selectedElement)return;isolate=!isolate;applyFilters();if(isolate)fitModel();};
  $('fitModel').onclick=()=>fitModel();$('topView').onclick=()=>fitModel('top');$('frontView').onclick=()=>fitModel('front');
  $('toggleDashboard').onclick=()=>{dashboardOpen=!dashboardOpen;$('progressDashboard').classList.toggle('collapsed',!dashboardOpen);document.querySelector('.workspace').classList.toggle('dashboardCollapsed',!dashboardOpen);$('toggleDashboard').textContent=dashboardOpen?'Ocultar dashboards':'Mostrar dashboards';$('toggleDashboard').setAttribute('aria-expanded',String(dashboardOpen));resize();};
}

window.addEventListener('storage',event=>{if(event.key==='emb-gd-object-progress-v1'){progressRecords=loadProgressRecords();applyActivityAssignments(elements,progressRecords);updateKpis();if(selectedElement)renderConsult();}});

async function init(){
  try{
    const [manifest,primavera]=await Promise.all([fetch('./bim-registration-models.json?v=20260930').then(response=>{if(!response.ok)throw new Error('No se encontró el catálogo de modelos de registro.');return response.json();}),loadGzipJSON('./primavera-data.json.gz?v=20260923')]);
    manifestEntry=manifest.sections?.[section];activities=primavera.tasks||[];primaveraMeta=primavera.meta||{};activityById=new Map(activities.map(task=>[String(task.id),task]));
    if(!manifestEntry)throw new Error(`El modelo ${section} no está disponible.`);if(manifestEntry.status==='no-geometry'||!manifestEntry.files?.length)throw new Error(`El IFC ${section} no contiene geometría web para procesar.`);
    elementPayload=await loadGzipJSON(`./${manifestEntry.data}?v=20260930`);
    $('headerModel').textContent=`${section} · ${manifestEntry.label}`;$('modelName').textContent=`${section} · ${manifestEntry.label}`;$('sceneTitle').textContent=`Registro y consulta · ${manifestEntry.label}`;$('modelSource').textContent=(manifestEntry.sources||[]).join(' · ');$('filterScope').textContent=`Alcance fijo: ${section} · ${manifestEntry.label}`;document.title=`${section} · Registro BIM | Asistente Digital EMB`;
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for(let index=0;index<manifestEntry.files.length;index++){$('loadingDetail').textContent=`Parte ${index+1} de ${manifestEntry.files.length}`;const loaded=await loader.loadAsync(`./${manifestEntry.files[index]}?v=20260930-registration`);addLoadedScene(loaded.scene);}
    if(!elements.length)throw new Error('El modelo cargó sin elementos seleccionables.');
    const box=new THREE.Box3().setFromObject(modelRoot,true),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());modelRoot.position.sub(center);modelRoot.updateMatrixWorld(true);
    const floor=new THREE.GridHelper(Math.max(size.x,size.z)*1.4,24,'#496779','#233744');floor.position.y=-size.y*.5-.04;scene.add(floor);
    applyActivityAssignments(elements,progressRecords);setSelectOptions();applyFilters();updateKpis();bindFilters();resize();fitModel();$('loading').hidden=true;$('loadState').textContent=`${elements.length.toLocaleString('es-CO')} elementos · ${manifestEntry.files.length} archivo${manifestEntry.files.length===1?'':'s'} cargado${manifestEntry.files.length===1?'':'s'}`;
  }catch(error){console.error(error);$('loading').innerHTML=`<b>No fue posible abrir el modelo</b><span>${safe(error?.message||error)}</span><a class="returnLink" href="./index.html?view=urban">Volver a Modelos BIM Integrados</a>`;$('loadState').textContent='Modelo no disponible';}
}

const selectionCenter=new THREE.Vector3();
function updateSelectionHighlight(time){
  if(!highlight||!selectedElement)return;
  const pulse=.56+Math.sin(time*.006)*.16;highlight.traverse(object=>{if(object.userData.selectionSurface)object.material.opacity=pulse;});
  highlight.userData.bounds.getCenter(selectionCenter).project(camera);const marker=$('selectionMarker');
  const visible=selectionCenter.z>-1&&selectionCenter.z<1;if(!visible){marker.hidden=true;return;}marker.hidden=false;
  const left=(selectionCenter.x*.5+.5)*canvas.clientWidth,top=(-selectionCenter.y*.5+.5)*canvas.clientHeight;
  marker.style.left=`${Math.max(120,Math.min(canvas.clientWidth-120,left))}px`;marker.style.top=`${Math.max(76,Math.min(canvas.clientHeight-52,top))}px`;
}
function frame(time=0){requestAnimationFrame(frame);controls.update();updateSelectionHighlight(time);renderer.render(scene,camera);}frame();init();
