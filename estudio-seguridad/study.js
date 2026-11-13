import {originalSheets} from './study-plan-originals.js?v=20261113-e11bici55';
import {AreaRegister} from './study-area-register.js?v=20261103-areas37';
import {station,stations} from './study-stations.js?v=20261113-e11bici55';
import {StationVideo} from './study-station-video.js?v=20261106-e04delivery52';
import {displayName,initCameraDashboard} from './study-dashboard.js?v=20261103-quality36';
import {PlanViewer} from './study-plans.js?v=20261113-e11bici55';
import {StudyScene} from './study-scene.js?v=20261104-integrity45';
import {opticsProfiles,initDrawers,initFullscreen} from './study-controls.js?v=20261028-e01media23';
import {RouteStudy} from './study-routes.js?v=20261113-e11bici55';
import {SpaceStudy} from './study-spaces.js?v=20261109-e0708integration57';
const $=s=>document.querySelector(s);
const levels=station.levels;
let records=[],types={},architecture=[],inventory=[],modelManifest,scene,active=null,level=levels.find(l=>l.id==='A')||levels[0],started=false,modelsReady=false,loadingPromise;
let spacesData,spaces,routes,areaRegister,stationVideo;let securityContext;
let zoom=1,planToken=0;const settingsById=new Map();let settings={fov:90,range:25,yaw:0,tilt:0};let profiles=[],loadStart=0,loadTimer;
const planErrors={};const planView=new PlanViewer({svg:$('#plan-svg'),container:$('#plan-scroll'),onSelect:selectCamera});
const defaults=()=>({fov:90,range:25,yaw:0,tilt:0});
initDrawers();initFullscreen(()=>{window.dispatchEvent(new Event('resize'));});
const canView=r=>!!r&&typeOf(r)==='F';
const typeOf=r=>Object.keys(types).find(k=>(r.ifcTypeName||'').includes(types[k].ifcFamilyToken));
async function json(url){const request=new URL(url,location.href);if(!request.searchParams.has('v'))request.searchParams.set('v','20261104-integrity45');const r=await fetch(request);if(!r.ok)throw Error(`${r.status}: ${url}`);return r.json();}
function options(select,items){select.replaceChildren(...items.map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));}
const levelSelectors=['#level-select','#plan-level'];
function syncLevelSelectors(){for(const selector of levelSelectors)$(selector).value=level.id;}
for(const selector of ['#entry-level',...levelSelectors]){options($(selector),levels.map(l=>[l.id,l.name]));$(selector).value=level.id;}
$('#entry-dialog').showModal();
function setRows(target,rows){target.replaceChildren(...rows.map(([name,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value===null||value===undefined||value===''?'En construcción':String(value);row.append(dt,dd);return row;}));}
const prop=(r,set,prefix)=>Object.entries(r.properties?.[set]||{}).find(([k])=>k.startsWith(prefix))?.[1];
const frameRate=r=>{const raw=prop(r,'Data','Frame_rate-');if(!raw)return null;const values=[...new Set([...String(raw).matchAll(/(\d+)\s*fps/gi)].map(m=>Number(m[1])))].sort((a,b)=>a-b);return values.length?values.join(' / ')+' fps · según flujo':raw;};
function cameraLabel(r){const type=types[typeOf(r)]?.label||'Cámara';const variant=r.ifcTypeName.includes('OUTDOOR')?' exterior':r.ifcTypeName.includes('INDOOR')?' interior':'';return `${type}${variant} · Marca IFC ${r.mark||r.ifcGlobalId.slice(-6)}`;}
function updateCameraMenu(){const cams=records.filter(r=>level.id==='all'||r.ifcStorey===level.ifc).sort((a,b)=>(typeOf(a)==='F'?0:1)-(typeOf(b)==='F'?0:1)||String(a.mark||'').localeCompare(String(b.mark||''),undefined,{numeric:true}));options($('#camera-select'),[...(cams.length?[['','Selecciona una cámara']]:[]),...cams.map(r=>[r.ifcGlobalId,cameraLabel(r)])]);if(active&&cams.includes(active))$('#camera-select').value=active.ifcGlobalId;if(!cams.length)$('#camera-select').append(new Option('En construcción',''));$('#camera-select').disabled=!cams.length;$('#camera-count').textContent=station.cameraInventoryPending?'Inventario de cámaras · En construcción':`${cams.length} cámaras · ${cams.filter(r=>typeOf(r)==='F').length} fijas ${level.id==='all'?'en la estación':'en este nivel'}`;return cams;}
function selectCamera(id){
 if(routes?.active)routes.enable(false);
 if(id&&stationVideo?.active)stationVideo.enable(false);
 const record=records.find(r=>r.ifcGlobalId===id);if(!record){active=null;scene?.select(null,settings);planView.select(null);$('#camera-select').value='';$('#active-title').textContent='Selecciona una cámara';$('#camera-location').textContent=station.name+' · '+level.name;for(const target of ['#specs','#raw-properties','#position-specs'])$(target).replaceChildren();$('#camera-description').textContent='Selecciona un indicador en planta o una cámara del listado.';$('#optics').hidden=true;$('#pov-badge').hidden=true;$('#resolution-summary').textContent='Propiedades de la cámara seleccionada';updatePovMessage();return;}
 if(record.ifcStorey!==level.ifc){level=levels.find(l=>l.ifc===record.ifcStorey)||level;syncLevelSelectors();updateCameraMenu();populateSheets();scene?.setLevel(level);spaces?.setLevel(level);areaRegister?.setLevel(level);syncAxonView();}
 active=record;$('#camera-select').value=id;settings=settingsById.get(id)||defaults();settingsById.set(id,settings);
 $('#active-title').textContent=cameraLabel(record);$('#camera-location').textContent=`${record.displayBuilding} · ${level.name} · ${record.ifcGlobalId}`;
 $('#camera-description').textContent=prop(record,'Other','Description-')||record.ifcTypeName;
 setRows($('#specs'),[['Fabricante',prop(record,'Other','Manufacturer-')],['Familia',record.ifcTypeName.split(':').at(-1)],['Resolución',prop(record,'Data','Resolution_ratio-')],['Sensor',prop(record,'Data','Sensor-')],['Fotogramas',frameRate(record)],['Codificación',prop(record,'Data','Encoding-')],['Alimentación',prop(record,'Data','Power_supply-')],['Potencia',prop(record,'Data','Rated_DC_Power-')],['Protección',prop(record,'Data','Protection')],['Óptica / FOV',prop(record,'Data','Lens')],['Peso',prop(record,'Data','Weight-')]]);
 const raw=$('#raw-properties');raw.replaceChildren();for(const [group,values] of Object.entries(record.properties)){const section=document.createElement('section'),h=document.createElement('h4'),dl=document.createElement('dl');h.textContent=group;setRows(dl,Object.entries(values).filter(([k])=>k!=='id'));section.append(h,dl);raw.append(section);}
 const fixed=typeOf(record)==='F';$('#optics').hidden=!fixed;$('#axis-note').textContent=fixed?'Frente inferido de la geometría de la lente: eje local −X. Posición de vista a 0,246 m del origen de la familia.':'Perspectiva no habilitada para este tipo de cámara en esta etapa.';
 const [x,y,z]=record.positionIfcMetres;
 setRows($('#position-specs'),[['X IFC',x.toFixed(3)+' m'],['Y IFC',y.toFixed(3)+' m'],['Z IFC',z.toFixed(3)+' m'],['Altura sobre nivel',record.heightAboveStoreyMetres.toFixed(2)+' m'],['Giro / inclinación','Ver parámetros de evaluación']]);
 $('#resolution-summary').textContent='IFC: '+(prop(record,'Data','Resolution_ratio-')||'resolución no declarada');
 configureProfile();for(const k of ['fov','range','yaw','tilt'])$('#'+k).value=settings[k];updateOptics();updatePovMessage();
 syncPlan();$('#observer-info').textContent=canView(active)?'Referencia a 8 m de la dirección de evaluación, sobre la cota del nivel IFC.':'Vista POV solo activa para cámaras Fixed.';
}
function updateOptics(){for(const k of ['fov','range','yaw','tilt'])$('#'+k+'-value').textContent=settings[k]+(k==='range'?' m':'°');$('#fov-summary').textContent=canView(active)?`Evaluación: ${settings.fov}° H · cono ${settings.range} m`:'Perspectiva solo para Fixed Camera';scene?.select(active,settings);planView.select(active,canView(active)?scene?.pose:null,settings);if(scene?.pose&&canView(active)){const d=scene.pose.direction,heading=(Math.atan2(d.x,-d.z)*180/Math.PI+360)%360,pitch=Math.asin(Math.max(-1,Math.min(1,d.y)))*180/Math.PI;const rows=$('#position-specs').lastElementChild;if(rows)rows.querySelector('dd').textContent=`${heading.toFixed(1)}° / ${pitch.toFixed(1)}°`;}}
function updatePovMessage(){if(station.cameraInventoryPending||(station.modelOnly&&!active)){$('#pov-message').hidden=modelsReady;$('#pov-message').textContent='Cargando estación completa…';return;}const fixed=canView(active);$('#pov-message').hidden=!!(fixed&&modelsReady);$('#pov-badge').hidden=!(fixed&&modelsReady);$('#pov-badge').textContent=fixed?cameraLabel(active):'';$('#pov-message').textContent=!active?'Selecciona una cámara fija.':!fixed?'Vista POV solo activa para cámaras Fixed. Esta cámara conserva su ubicación, ficha y perfil seleccionado.':!modelsReady?'Cargando geometría detallada para la perspectiva…':'';}
function changeLevel(id){if(routes?.active)routes.pauseForInspection();level=levels.find(l=>l.id===id)||levels[0];syncLevelSelectors();areaRegister?.setLevel(level);const cams=updateCameraMenu();populateSheets();scene?.setLevel(level);spaces?.setLevel(level);areaRegister?.setLevel(level);syncAxonView();if(routes?.active){routes.invalidateViews();routes.drawPlan();return;}selectCamera(level.id==='all'?null:cams[0]?.ifcGlobalId);}
function showError(where,text){$(where).textContent=text;$(where).classList.add('resources-error');}
async function loadData(){
 if(station.modelOnly){await loadRecoveredData();return;}
 const results=await Promise.allSettled([json('./assets/camera-types.json'),json(station.assets.cameras),json(station.assets.architecture),json(station.assets.inventory),json(station.assets.models),json(station.assets.registration),station.assets.spaces?json(station.assets.spaces):Promise.resolve(null),json(station.assets.locations)]);
 for(const i of [0,1,4,5,7])if(results[i].status==='rejected')throw results[i].reason;
 types=results[0].value;records=results[1].value.cameras;modelManifest=results[4].value;if(station.id==='E02'){modelManifest.preserveFlatFaces=true;modelManifest.frameDirection=[.863,.65,.505];}planView.configure(results[5].value,records,types);const locations=initCameraDashboard(records,types,levels,results[7].value,station.name);for(const r of records)r.displayBuilding=locations.get(r.ifcGlobalId)?.building||'Exterior / por asignar';
 architecture=results[2].status==='fulfilled'?results[2].value.pages:[];inventory=results[3].status==='fulfilled'?results[3].value.pages:[];
 if(results[6].status==='fulfilled'&&results[6].value)spacesData=results[6].value;else{$('#spaces-summary').textContent=station.spaceNote||'No se pudo cargar el catálogo de espacios. Recarga para reintentar.';for(const b of document.querySelectorAll('[data-open-spaces],#open-spaces,#show-spaces,#show-space-labels')){b.disabled=true;b.title=station.spaceNote||'Catálogo no disponible';}}
 for(const [i,key] of [[2,'architecture'],[3,'inventory']])if(results[i].status==='rejected')planErrors[key]=results[i].reason.message;
 $('#type-legend').replaceChildren(...Object.entries(types).map(([k,t])=>{const span=document.createElement('span');span.className='legend-chip';const dot=document.createElement('i');dot.style.background=t.color;span.append(dot,document.createTextNode(`${k} · ${t.label}`));return span;}));const selected=document.createElement('span');selected.textContent='Anillo blanco · activa';$('#type-legend').append(selected);
}
async function start(){
 if(started){changeLevel($('#entry-level').value);scene.dirty=true;return;}
 started=true;loadStart=performance.now();loadTimer=setInterval(()=>{$('#load-elapsed').textContent=Math.floor((performance.now()-loadStart)/1000)+' s transcurridos';},500);$('#resource-status').textContent='Cargando inventario, plantas y modelos…';
 try{
  await (loadingPromise ||= loadData());
  scene=new StudyScene({origin:station.origin,modelBase:station.modelBase,cameraBase:station.cameraBase,axon:$('#axon-art'),pov:$('#pov-art'),onSelect:selectCamera,onProgress:(done,total)=>{const percent=Math.floor(done/total*100);$('#load-percent').textContent=percent+'%';$('#load-progress').value=percent;$('#load-parts').textContent=`Partes cargadas: ${done} de ${total}`;$('#resource-status').textContent=`Paquete ${station.id} · ${done}/${total} partes de geometría`;}});
  if(spacesData)spaces=new SpaceStudy({scene,plan:planView,data:spacesData,onSelectPlan:r=>{if(r.level!==level.id)changeLevel(r.level);if(scene.fullStation)showLevelView();const page=architecture.find(p=>p.level===level.name);if(page){if($('#plan-kind').value!=='architecture'){$('#plan-kind').value='architecture';populateSheets();}$('#plan-sheet').value=page.page;zoom=1;drawPlan();}}});scene.showMarkers=camerasVisible;
  changeLevel($('#entry-level').value);
  await scene.load(modelManifest,records,types);scene.setLevel(level);scene.select(active,settings);modelsReady=true;if(station.modelOnly)scene.enableStationOverview();$('#frame-station').disabled=false;syncAxonView();$('#model-loading').hidden=true;updatePovMessage();
  $('#resource-status').textContent=`${station.summary} · arquitectura, estructura e instalaciones · ${records.length} cámaras · ${records.filter(canView).length} perspectivas Fixed${station.id==='E01'?' · 3 tipos de recorrido · 2 videos originales Full HD':''}`;
  if(station.cameraInventoryPending){$('#resource-status').textContent=`${station.summary} · ${station.sourceCount} modelos · detalle completo · recursos de seguridad: En construcción`;}
  clearInterval(loadTimer);document.body.dataset.ready='true';
  if(station.assets.routes)try{const routeData=await json(station.assets.routes);routes=new RouteStudy({scene,plan:planView,data:routeData,onEnter:()=>expandPanel(null),setContext:(id,page)=>{if(!securityContext)securityContext={level:level.id,camera:active?.ifcGlobalId};level=levels.find(l=>l.id===id)||level;syncLevelSelectors();scene.setLevel(level);spaces?.setLevel(level);areaRegister?.setLevel(level);syncAxonView();$('#plan-kind').value='architecture';populateSheets();if(page)$('#plan-sheet').value=String(page);drawPlan();updateCameraMenu();},onExit:()=>{const saved=securityContext;securityContext=null;if(saved){changeLevel(saved.level);selectCamera(saved.camera);}else changeLevel(level.id);}});document.body.dataset.routesReady='true';}catch(error){$('#routes-tab').disabled=true;$('#resource-status').textContent+=' · No se pudieron cargar los recorridos: '+error.message;console.error(error);}

 }catch(error){clearInterval(loadTimer);showError('#resource-status','No se completó la carga: '+error.message);$('#model-loading').textContent='No se pudo cargar el paquete. Usa «Reintentar modelos».';$('#retry-model').hidden=false;updatePovMessage();document.body.dataset.ready='error';console.error(error);}
}
$('#entry-form').addEventListener('submit',e=>{e.preventDefault();const selected=$('#entry-building').value;if(selected!==station.id){const url=new URL(location.href);url.searchParams.set('station',selected);url.searchParams.set('level',$('#entry-level').value);url.searchParams.set('start','1');location.assign(url);return;}$('#entry-dialog').close();start();});
$('#change-context').addEventListener('click',()=>{if(routes?.active)routes.pauseForInspection();if(stationVideo?.active)stationVideo.enable(false);$('#entry-building').value=station.id;updateEntry(station,level.id);$('#entry-dialog').showModal();if(scene)scene.dirty=true;});
$('#entry-dialog').addEventListener('cancel',e=>{if(!started)e.preventDefault();else if(scene)scene.dirty=true;});
$('#retry-model').addEventListener('click',()=>location.reload());
for(const selector of levelSelectors)$(selector).addEventListener('change',e=>changeLevel(e.target.value));$('#camera-select').addEventListener('change',e=>selectCamera(e.target.value));
for(const k of ['fov','range','yaw','tilt'])$('#'+k).addEventListener('input',e=>{settings[k]=Number(e.target.value);updateOptics();});
$('#reset-optics').addEventListener('click',()=>{if(!active)return;settingsById.delete(active.ifcGlobalId);selectCamera(active.ifcGlobalId);});
$('#show-installations').addEventListener('change',e=>{if(scene){scene.installations=e.target.checked;scene.filter();}});$('#show-cone').addEventListener('change',e=>{if(scene){scene.showCone=e.target.checked;scene.dirty=true;planView.select(active,canView(active)?scene.pose:null,settings);}});
$('#show-brt').addEventListener('change',e=>{if(scene){scene.showBrt=e.target.checked;scene.filter();}});
for(const code of ['1100','1310'])$('#show-structure-'+code).addEventListener('change',e=>{if(scene){scene.hiddenPackages ||= new Set();const key='e09-est-complementary-'+code;if(e.target.checked)scene.hiddenPackages.delete(key);else scene.hiddenPackages.add(key);scene.filter();}});
$('#show-structure-914').addEventListener('change',e=>{if(scene){scene.hiddenPackages ||= new Set();if(e.target.checked)scene.hiddenPackages.delete('e09-str-914');else scene.hiddenPackages.add('e09-str-914');scene.filter();}});
$('#show-structure-1300').addEventListener('change',e=>{if(scene){scene.showStructure1300=e.target.checked;scene.filter();}});
function syncAxonView(){const full=!!scene?.fullStation||level.id==='all',cut=routes?.active?(routes.routeSource?.routeCuts?.[level.id]??routes.data.routeCuts?.[level.id]):null;$('#frame-station').setAttribute('aria-pressed',String(full));$('#axon-title').textContent='Planta 3D';$('#axon-subtitle').textContent=full?'Todos los niveles · sin cortes · modelos cargados':`${level.name} · corte de ${(cut?.min??level.cutMin).toFixed(1)} a ${(cut?.max??level.cutMax).toFixed(1)} m`;document.body.dataset.axonMode=full?'station':'level';}
function showLevelView(){scene?.setLevel(level);syncAxonView();}
$('#frame-station').addEventListener('click',()=>{if(!modelsReady)return;for(const id of ['show-installations','show-brt','show-structure-1300','show-structure-1100','show-structure-1310','show-structure-914'])$('#'+id).checked=true;scene.showFullStation();syncAxonView();});
$('#frame-level').addEventListener('click',showLevelView);$('#frame-camera').addEventListener('click',()=>{showLevelView();scene?.focusSelected();});$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
const opticsHome=$('#optics').parentElement,opticsAnchor=document.createComment('Equalizadores');opticsHome.insertBefore(opticsAnchor,$('#optics'));
function expandPanel(panel){
 document.querySelectorAll('.view.is-expanded').forEach(p=>p.classList.remove('is-expanded'));
 if(panel)panel.classList.add('is-expanded');
 if(panel?.id==='pov-panel')$('#expanded-optics').append($('#optics'));else opticsAnchor.after($('#optics'));
 for(const b of document.querySelectorAll('.expand'))b.setAttribute('aria-expanded',String(b.dataset.panel===panel?.id));
 window.dispatchEvent(new Event('resize'));if(scene)scene.dirty=true;
}
for(const b of document.querySelectorAll('.expand'))b.addEventListener('click',()=>{const panel=document.getElementById(b.dataset.panel);expandPanel(panel.classList.contains('is-expanded')?null:panel);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#spaces-dialog').open)expandPanel(null);});
let camerasVisible=true;
for(const button of document.querySelectorAll('[data-toggle-cameras]'))button.addEventListener('click',()=>{
 camerasVisible=!camerasVisible;for(const b of document.querySelectorAll('[data-toggle-cameras]')){b.setAttribute('aria-pressed',String(camerasVisible));b.textContent=camerasVisible?'Cámaras visibles':'Cámaras ocultas';}
 planView.setMarkersVisible(camerasVisible);if(scene){scene.showMarkers=camerasVisible;scene.dirty=true;routes?.invalidateViews();}
});
function svgElement(tag,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function pagesForLevel(pages){return pages.filter(p=>level.id==='all'||!p.level||p.level===level.name).sort((a,b)=>Number(!a.level)-Number(!b.level));}
function populateSheets(){const hasArchitecture=architecture.some(p=>p.level===level.name)||originalSheets(station.id,'architecture',undefined,level).length>0;$('#plan-kind option[value="architecture"]').disabled=false;if(!hasArchitecture&&inventory.length&&$('#plan-kind').value==='architecture'&&!station.modelOnly)$('#plan-kind').value='inventory';const pages=$('#plan-kind').value==='architecture'?architecture:inventory;const filtered=pagesForLevel(pages);options($('#plan-sheet'),filtered.map(p=>[p.page,p.label||`${p.level} · ${p.buildings?.length===1?p.buildings[0]:'Todas las edificaciones'}`]));if(!filtered.length)$('#plan-sheet').append(new Option('En construcción',''));$('#plan-sheet').disabled=!filtered.length;zoom=1;drawPlan();}
function syncPlan(){
 if(routes?.active){routes.drawPlan();return;}
 const kind=$('#plan-kind').value,pages=(kind==='architecture'?architecture:inventory).filter(p=>p.level===level.name),current=Number($('#plan-sheet').value),preferred=planView.choosePage(kind,pages,active,current);
 if(preferred&&preferred.page!==current){$('#plan-sheet').value=preferred.page;zoom=1;drawPlan();}else planView.select(active,canView(active)?scene?.pose:null,settings);
}
const originalSelection=new Map();
function renderOriginalLinks(kind,page){
 $('#plan-original')?.remove();$('#plan-original-sheet')?.closest('label')?.remove();$('#plan-original-status')?.remove();
 const sheets=originalSheets(station.id,kind,page,level),controls=$('#plan-panel .zoom-controls');
 if(!sheets.length){
  if(kind!=='architecture'&&page?.pdf){const link=document.createElement('a');link.id='plan-original';link.href=page.pdf;link.target='_blank';link.rel='noopener';link.textContent='Abrir PDF original ↗';controls.append(link);return;}
  if(kind==='architecture'){const status=document.createElement('span');status.id='plan-original-status';status.textContent=level.id==='all'&&!page?'PDF original · selecciona un nivel':'PDF original · En construcción';controls.append(status);}return;
 }
 const key=station.id+'|'+(page?.level||level.name),chosen=originalSelection.get(key),link=document.createElement('a');link.id='plan-original';link.target='_blank';link.rel='noopener';link.textContent='Abrir PDF original ↗';
 const setLink=sheet=>{originalSelection.set(key,sheet.pdf);link.href=sheet.pdf;link.title=`${sheet.level} · ${sheet.attachment||sheet.source} · página ${sheet.sourcePage} · PDF de una sola página`;link.setAttribute('aria-label',`Abrir PDF original de ${sheet.level}${sheet.building&&sheet.building!=='General'?' · '+sheet.building:''}, página ${sheet.sourcePage}`);};
 const selected=sheets.find(sheet=>sheet.pdf===chosen)||sheets[0];setLink(selected);
 if(sheets.length>1){const label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select');label.className='original-sheet-control';caption.textContent='Hoja original';select.id='plan-original-sheet';select.setAttribute('aria-label','Hoja técnica original');options(select,sheets.map(sheet=>[sheet.pdf,`${sheet.building||sheet.level} · página ${sheet.sourcePage}`]));select.value=selected.pdf;select.addEventListener('change',()=>setLink(sheets.find(sheet=>sheet.pdf===select.value)));label.append(caption,select);controls.append(label);}
 controls.append(link);
}
function drawPlan(){
 $('#plan-panel h2').textContent=$('#plan-kind').value==='inventory'?'Plano de inventario de cámaras 2D':'Plano de planta arquitectónica 2D';
 const token=++planToken,kind=$('#plan-kind').value,pages=kind==='architecture'?architecture:inventory,page=pages.find(p=>p.page===Number($('#plan-sheet').value));$('#plan-retry').hidden=true;$('#plan-loading').hidden=true;
 $('#plan-empty')?.remove();renderOriginalLinks(kind,page);if(!page){const empty=document.createElement('div');empty.id='plan-empty';empty.className='viewport-message';empty.textContent=planErrors[kind]?'No se pudo cargar el plano. Reintenta la carga.':'En construcción';$('#plan-scroll').append(empty);$('#plan-registration').textContent='';$('#plan-svg').replaceChildren();planView.layer=null;planView.page=null;planView.reg=null;planView.markers=[];if(routes)routes.planLeader=null;$('#plan-status').textContent=planErrors[kind]?'Error al cargar catálogo: '+planErrors[kind]:'En construcción';$('#plan-retry').hidden=!planErrors[kind];return;}
 $('#plan-loading').hidden=false;planView.zoom=zoom;
 planView.draw(kind,page,level.id==='all'?(levels.find(l=>l.id===page.levelId||l.name===page.level)||level):level,active,()=>{if(token===planToken){$('#plan-loading').hidden=true;$('#plan-status').textContent=station.cameraInventoryPending?(page.label||`Planta arquitectónica · ${level.name}`):`${kind==='architecture'?'Planta arquitectónica':'Inventario CCTV'} · nivel completo · ${planView.markers.length} cámaras IFC`;$('#plan-status').classList.remove('resources-error');}},()=>{if(token===planToken){$('#plan-loading').hidden=true;showError('#plan-status','No se pudo cargar esta lámina.');$('#plan-retry').hidden=false;}});
 routes?.drawPlan();$('#plan-registration').textContent=planView.reg?.status||(station.modelOnly?'Indicadores interactivos · En construcción':'Sin registro espacial');planView.select(active,canView(active)?scene?.pose:null,settings);
}
$('#plan-kind').addEventListener('change',()=>{populateSheets();syncPlan();});$('#plan-sheet').addEventListener('change',()=>{const id=Number($('#plan-sheet').value),page=($('#plan-kind').value==='architecture'?architecture:inventory).find(p=>p.page===id);if(station.modelOnly&&page?.levelId&&level.id!==page.levelId){changeLevel(page.levelId);$('#plan-sheet').value=String(id);}zoom=1;drawPlan();});$('#plan-retry').addEventListener('click',async()=>{const kind=$('#plan-kind').value;if(planErrors[kind]){try{const data=await json(station.assets[kind]);if(kind==='architecture')architecture=data.pages;else inventory=data.pages;delete planErrors[kind];populateSheets();}catch(error){showError('#plan-status',error.message);}}else drawPlan();});
for(const [id,fn] of [['zoom-in',()=>Math.min(8,zoom*1.5)],['zoom-out',()=>Math.max(1,zoom/1.5)],['zoom-fit',()=>1]])$('#'+id).addEventListener('click',()=>{zoom=fn();planView.zoom=zoom;planView.fit();});
function configureProfile(){
 const id=settings.profile,p=profiles.find(p=>p.id===id),o=opticsProfiles[id];
 $('#applied-profile').textContent=p?`${p.name} · ${o.mode==='multi'?'4 sensores':o.mode==='fisheye'?'Ojo de pez':'Perspectiva'}`:'Óptica de evaluación · sin perfil aplicado';
 $('#reference-select').value=id||'';$('#optics').hidden=!canView(active);if(active&&typeOf(active)!=='F'){$('#axis-note').textContent='Vista POV solo activa para cámaras Fixed; el perfil se conserva para la consulta de características.';}
 $('#fov').min=o?.minFov??2;$('#fov').max=o?.fov??150;$('#fov').disabled=!!o&&o.minFov===o.fov;
 if(o){$('#resolution-summary').textContent=`Perfil: ${o.width} × ${o.height}${o.sensors?' / sensor':''} · ${o.fps} fps nominales`;}else if(active){$('#resolution-summary').textContent='IFC: '+(prop(active,'Data','Resolution_ratio-')||'resolución no declarada');}
 $('#observer-info').textContent=canView(active)?'Referencia a 8 m de la dirección de evaluación, sobre la cota del nivel IFC.':'Vista POV solo activa para cámaras Fixed.';
 showReference();
}
function showReference(){const p=profiles.find(p=>p.id===$('#reference-select').value);$('#reference-link').hidden=!p?.url;if(p?.url)$('#reference-link').href=p.url;$('#reference-info').textContent=p?`${p.type}. ${p.description}`:'Elige un equipo para consultar sus características.';
 setRows($('#reference-specs'),p?[['Resolución',p.resolution],['Campo visual',p.fov],['Óptica',p.lens],['Fotogramas',p.fps],['Protección',p.protection]]:[]);
 $('#reference-feedback').textContent=!active?'Aplicación a cámara activa: En construcción':p?'Perfil asignado a esta cámara. En cámaras Fixed, la apertura, proyección y formato de imagen se usan en la simulación. Alcance = extensión de evaluación; FPS y protección son datos nominales. No se simulan enfoque, iluminación IR ni compresión.'+(active&&typeOf(active)!=='F'?' La vista POV permanece disponible solo para cámaras Fixed.':''):'';
}
json('./assets/reference-cameras.json').then(data=>{profiles=data;options($('#reference-select'),[['','Sin perfil · parámetros de evaluación'],...profiles.map(p=>[p.id,p.name])]);$('#reference-select').value=settings.profile||'';$('#reference-select').addEventListener('change',()=>{if(!active){showReference();return;}const id=$('#reference-select').value,o=opticsProfiles[id];if(o){settings.profile=id;settings.optics={...o};settings.fov=o.fov;}else{delete settings.profile;delete settings.optics;settings.fov=90;}configureProfile();$('#fov').value=settings.fov;updateOptics();updatePovMessage();});showReference();}).catch(()=>{$('#reference-info').textContent='Catálogo de referencia no disponible.';});

function updateEntry(config,selected='A'){
 options($('#entry-level'),config.levels.map(l=>[l.id,l.name]));$('#entry-level').value=config.levels.some(l=>l.id===selected)?selected:config.levels[0].id;
 $('.entry-caption h2').textContent='Explora los espacios de la estación.';$('.entry-info p').textContent='Vista 3D disponible para Fixed Camera. Domos y PTZ conservan su ficha y posición. Los recursos pendientes se indican como En construcción.';$('.entry-caption .eyebrow').textContent=config.name;$('.entry-caption p').textContent=config.description;
 if(config.cameraInventoryPending){$('.entry-caption h2').textContent='Explora los espacios de la estación.';$('.entry-info p').textContent='Modelos 3D detallados. Los recursos sin información se indican como En construcción.';}
 $('.entry-steps').replaceChildren(...(config.cameraInventoryPending?[`${config.sourceCount} modelos de origen IFC`,'Recursos de seguridad · En construcción']:[`${config.fixed} cámaras Fixed con perspectiva`,`${config.cameras} cámaras IFC`]).map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
}
options($('#entry-building'),Object.values(stations).sort((a,b)=>a.id.localeCompare(b.id)).map(s=>[s.id,s.name+' — conjunto de estación']));$('#entry-building').value=station.id;updateEntry(station,new URLSearchParams(location.search).get('level')||'A');
$('#entry-building').addEventListener('change',()=>updateEntry(stations[$('#entry-building').value]));
document.title='Estudio de Seguridad · '+station.name;document.body.dataset.station=station.id;
$('.prototype').lastChild.textContent=' '+station.summary;$('.context-bar .context-item b').textContent=station.name;$('.loading-card > span').textContent=station.name;
$('#camera-count').textContent=`${station.cameras} cámaras · ${station.fixed} Fixed`;
$('#help-dialog h2').textContent='Estudio integrado · '+station.id;
$('#spaces-dialog .eyebrow').textContent='PLANTAS ARQUITECTÓNICAS · '+station.id;
if(station.packages){
 document.querySelector('.status-bar a').hidden=true;
 for(const id of ['show-installations','show-brt','show-structure-1100','show-structure-1310','show-structure-1300','show-structure-914'])$('#'+id).closest('label').hidden=true;
 const target=$('#show-cone').closest('label');for(const [key,title] of station.packages){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.modelPackage=key;input.addEventListener('change',()=>{if(!scene)return;scene.hiddenPackages ||= new Set();if(input.checked)scene.hiddenPackages.delete(key);else scene.hiddenPackages.add(key);scene.filter();});label.append(input,document.createTextNode(' '+title));target.before(label);}
 $('#frame-station').addEventListener('click',()=>{for(const input of document.querySelectorAll('[data-model-package]'))input.checked=true;});
 if(station.id==='E01'){$('#routes-drawer h2').textContent='Recorridos · E01';$('#routes-drawer > p').textContent='Selecciona Biciusuarios, Biciusuarios-Acceso Peatonal o PMR. EM1 BICI sigue la línea negra desde Plataforma hasta Acceso y continúa por la línea verde. EM1 PMR sigue la línea naranja.';$('#routes-drawer .micro-note').textContent='Verde: Biciusuarios. Negro: Acceso Peatonal. Naranja: PMR. Videos originales vinculados a los trazados actualizados del 28/10/2026.';} 
}
if(station.cameraInventoryPending){
 $('#pov-panel h2').textContent='Vista 3D';$('#pov-panel .view-heading p').textContent=station.povVideo?'Modelo completo · video POV disponible en Recorridos':'Modelo completo · POV: En construcción';
 $('#fov-summary').textContent='Arquitectura, estructura e instalaciones';$('#resolution-summary').textContent=station.povVideo?'Cámaras IFC · En construcción':'Cámaras y POV · En construcción';
 $('#active-title').textContent='En construcción';$('#camera-location').textContent='Inventario interactivo de cámaras';
 for(const id of ['applied-profile','observer-info','camera-description','axis-note'])$('#'+id).textContent='En construcción';
 for(const control of document.querySelectorAll('#optics input,#optics button,#frame-camera,[data-toggle-cameras],#show-cone')){control.disabled=true;control.title='En construcción';}
 $('#camera-select').replaceChildren(new Option('En construcción',''));
}
if(['E02','E03','E04','E05'].includes(station.id)&&station.assets.routes){$('#routes-drawer h2').textContent='Recorridos · '+station.id;$('#routes-drawer > p').textContent='Biciusuarios y PMR · recorridos por los niveles de '+station.id+'.';$('#routes-drawer .micro-note').textContent='Negro: Biciusuarios. Naranja: PMR. Avance sincronizado con cada video; transiciones de edición identificadas.';}
if(!station.assets.routes){
 $('#routes-tab').disabled=false;$('#routes-drawer h2').textContent='Recorridos · '+station.id;
 $('#routes-drawer > p').textContent='En construcción';$('#routes-drawer .micro-note').textContent='Trazados y videos de esta estación: En construcción';
 $('#routes-enter').disabled=true;$('#routes-enter').textContent='En construcción';
 if(station.povVideo)stationVideo=new StationVideo({config:station.povVideo,getScene:()=>scene,onEnter:()=>expandPanel(null)});
 if(!station.povVideo&&station.externalVideos?.length){
  $('#routes-drawer > p').textContent='Videorecorridos originales de '+station.id+' disponibles en SharePoint.';
  $('#routes-drawer .micro-note').textContent='Los videos se abren en otra pestaña con los permisos de SharePoint. Trazado y sincronización con plantas 2D/3D: En construcción.';
  $('#routes-enter').hidden=true;
  const list=document.createElement('ul');list.className='external-videotours';list.setAttribute('aria-label','Videorecorridos de '+station.id);
  for(const video of station.externalVideos){
   const item=document.createElement('li'),link=document.createElement('a'),title=document.createElement('strong'),detail=document.createElement('span');
   link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';
   title.textContent=video.title+' ↗';detail.textContent=video.filename+' · '+video.duration+' · Abrir en SharePoint';
   link.append(title,detail);item.append(link);list.append(item);
  }
  $('#route-legend').replaceChildren(list);
 }
}
if(new URLSearchParams(location.search).get('start')==='1'){const url=new URL(location.href);url.searchParams.delete('start');history.replaceState(null,'',url);$('#entry-dialog').close();start();}

async function loadRecoveredData(){
 const source=await json(station.modelManifest);types=await json('./assets/camera-types.json');
 station.origin=source.renderOriginGltfMetres||source.bounds.min.map((v,i)=>(v+source.bounds.max[i])/2);
 modelManifest={...source,recovered:true};
 const size=source.bounds.max.map((v,i)=>v-source.bounds.min[i]);modelManifest.frameDirection=size[2]>size[0]?[1,.8,.35]:[.35,.8,1];
 records=station.assets.cameras?(await json(station.assets.cameras)).cameras:[];
 const locations=station.assets.locations?await json(station.assets.locations):{records:[],method:'Posiciones y tipologías del IFC. Edificación pendiente de asignación.',pending:!records.length};
 const buildingLookup=new Map(locations.records.map(r=>[r.id,r.building]));
 for(const r of records)r.displayBuilding=buildingLookup.get(r.ifcGlobalId)||station.name+' · edificación por asignar';
 planView.configure(station.assets.registration?await json(station.assets.registration):{},records,types);
 if(station.assets.architecture){
  try{architecture=(await json(station.assets.architecture)).pages;}
  catch(error){planErrors.architecture=error.message;console.error(error);}
 }
 if(station.assets.inventory){inventory=(await json(station.assets.inventory)).pages;}
 else if(station.insDocuments){
  const documents=await json(station.insDocuments);let pageId=0;
  inventory=documents.documents.flatMap(doc=>doc.pages.map(page=>({page:++pageId,levelId:station.insLevelIds[page.level],level:station.levels.find(l=>l.id===station.insLevelIds[page.level])?.name||null,label:doc.revision+' · '+doc.name.split('-PL-')[1]+' · '+page.label,imageUrl:page.image,width:page.width,height:page.height,pdf:doc.pdf})));
 }
 const packageTarget=$('#show-cone').closest('label');
 for(const source of modelManifest.sourceIfcFiles){
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.modelPackage=source;
  input.addEventListener('change',()=>{if(!scene)return;scene.hiddenPackages ||= new Set();if(input.checked)scene.hiddenPackages.delete(source);else scene.hiddenPackages.add(source);scene.filter();});
  const sourceLabel=modelManifest.sourceLabels?.[source]||((source.includes('-INS-')?'Instalaciones':source.includes('-ARQ-')?'Arquitectura':'Estructura')+' · '+source.split('-')[1]+' · '+source.split('-MO-')[1]);label.title=source;label.append(input,document.createTextNode(' '+sourceLabel));packageTarget.before(label);
 }
 $('#plan-kind option[value="architecture"]').textContent=station.assets.architecture?'Planta arquitectónica':'Planta arquitectónica · En construcción';if(!inventory.length)$('#plan-kind option[value="inventory"]').textContent='Inventario CCTV · En construcción';$('#type-legend').textContent='Arquitectura · estructura · instalaciones';
 if(station.assets.spaces){
  spacesData=await json(station.assets.spaces);
 }else if(['E03','E04','E11'].includes(station.id)){
  try{areaRegister=new AreaRegister(await json('./assets/stations/'+station.id.toLowerCase()+'/area-register.json'));}
  catch(error){$('#spaces-summary').textContent='No se pudo cargar el cuadro de áreas';$('#spaces-source').textContent='Recarga para reintentar la consulta del registro PDF.';console.error(error);}
 }else{
 $('#spaces-summary').textContent='En construcción';$('#spaces-source').textContent='Etiquetas, colores y áreas de esta estación: En construcción';
 $('#space-rows').innerHTML='<tr><td colspan="4">En construcción</td></tr>';
 for(const button of document.querySelectorAll('[data-open-spaces]'))button.addEventListener('click',()=>$('#spaces-dialog').showModal());
 $('#close-spaces').addEventListener('click',()=>$('#spaces-dialog').close());
 }
 if(!spacesData)for(const button of document.querySelectorAll('#toggle-space-labels,#toggle-space-colors,#show-spaces,#show-space-labels')){button.disabled=true;button.title='En construcción';}
 initCameraDashboard(records,types,levels,locations,station.name);
 $('#type-legend').replaceChildren(...Object.entries(types).map(([key,type])=>{const span=document.createElement('span');span.className='legend-chip';const dot=document.createElement('i');dot.style.background=type.color;span.append(dot,document.createTextNode(key+' · '+type.label));return span;}));
}

if(station.id==='E07'&&station.assets.routes){$('#routes-drawer h2').textContent='Recorridos · E07';$('#routes-drawer > p').textContent='BRT–Metro, Usuarios y PMR · recorridos sincronizados con el POV.';$('#routes-drawer .micro-note').textContent='Azul: BRT–Metro · Negro: Usuarios · Naranja: PMR.';}

if(station.id==='E08'&&station.assets.routes){$('#routes-drawer h2').textContent='Recorridos · E08';$('#routes-drawer > p').textContent='Biciusuarios · recorrido negro sincronizado con BICI-EM8.';$('#routes-drawer .micro-note').textContent='PMR: video disponible; trazado En construcción.';}

if(station.id==='E11'&&station.assets.routes){$('#routes-drawer h2').textContent='Recorridos · E11';$('#routes-drawer > p').textContent='Biciusuarios · línea negra sincronizada con EM11-BICI.';$('#routes-drawer .micro-note').textContent='BRT y PMR: videos disponibles; trazados En construcción.';}
