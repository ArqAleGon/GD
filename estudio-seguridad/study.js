import {PlanViewer} from './study-plans.js?v=20261021-structure-v06';
import {StudyScene} from './study-scene.js?v=20261021-structure-v06';
import {opticsProfiles,initDrawers,initFullscreen} from './study-controls.js?v=20261021-structure-v06';
import {SpaceStudy} from './study-spaces.js?v=20261021-structure-v06';
const $=s=>document.querySelector(s);
const levels=[
 {id:'B',name:'Sótano',ifc:'ARC_PL_00_BASEMENT',cutMin:2552.8,cutMax:2558.8},
 {id:'A',name:'Acceso',ifc:'ARC_PL_01_ACCESS',cutMin:2559.2,cutMax:2566.2},
 {id:'I',name:'Intermedio',ifc:'ARC_PL_02_INTERMEDIATE',cutMin:2568.2,cutMax:2574.5},
 {id:'P',name:'Plataforma',ifc:'ARC_PL_03_PLATFORM',cutMin:2577.0,cutMax:2583.3}
];
let records=[],types={},architecture=[],inventory=[],modelManifest,scene,active=null,level=levels[1],started=false,modelsReady=false,loadingPromise;
let spacesData,spaces;
let zoom=1,planToken=0;const settingsById=new Map();let settings={fov:90,range:25,yaw:0,tilt:0};let profiles=[],loadStart=0,loadTimer;
const planErrors={};const planView=new PlanViewer({svg:$('#plan-svg'),container:$('#plan-scroll'),onSelect:selectCamera});
const defaults=()=>({fov:90,range:25,yaw:0,tilt:0});
initDrawers();initFullscreen(()=>{window.dispatchEvent(new Event('resize'));});
const canView=r=>!!r&&(typeOf(r)==='F'||!!settings.profile);
const typeOf=r=>Object.keys(types).find(k=>(r.ifcTypeName||'').includes(types[k].ifcFamilyToken));
async function json(url){const request=new URL(url,location.href);request.searchParams.set('v','20261021-structure-v06');const r=await fetch(request);if(!r.ok)throw Error(`${r.status}: ${url}`);return r.json();}
function options(select,items){select.replaceChildren(...items.map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o;}));}
for(const selector of ['#entry-level','#level-select']){options($(selector),levels.map(l=>[l.id,l.name]));$(selector).value=level.id;}
$('#entry-dialog').showModal();
function setRows(target,rows){target.replaceChildren(...rows.map(([name,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value===null||value===undefined||value===''?'No declarado en IFC':String(value);row.append(dt,dd);return row;}));}
const prop=(r,set,prefix)=>Object.entries(r.properties?.[set]||{}).find(([k])=>k.startsWith(prefix))?.[1];
const frameRate=r=>{const raw=prop(r,'Data','Frame_rate-');if(!raw)return null;const values=[...new Set([...String(raw).matchAll(/(\d+)\s*fps/gi)].map(m=>Number(m[1])))].sort((a,b)=>a-b);return values.length?values.join(' / ')+' fps · según flujo':raw;};
function cameraLabel(r){const type=types[typeOf(r)]?.label||'Cámara';const variant=r.ifcTypeName.includes('OUTDOOR')?' exterior':r.ifcTypeName.includes('INDOOR')?' interior':'';return `${type}${variant} · Marca IFC ${r.mark||r.ifcGlobalId.slice(-6)}`;}
function updateCameraMenu(){const cams=records.filter(r=>r.ifcStorey===level.ifc).sort((a,b)=>(typeOf(a)==='F'?0:1)-(typeOf(b)==='F'?0:1)||String(a.mark||'').localeCompare(String(b.mark||''),undefined,{numeric:true}));options($('#camera-select'),cams.map(r=>[r.ifcGlobalId,cameraLabel(r)]));$('#camera-select').disabled=!cams.length;$('#camera-count').textContent=`${cams.length} cámaras · ${cams.filter(r=>typeOf(r)==='F').length} fijas en este nivel`;return cams;}
function selectCamera(id){
 const record=records.find(r=>r.ifcGlobalId===id);if(!record)return;
 if(record.ifcStorey!==level.ifc){level=levels.find(l=>l.ifc===record.ifcStorey);$('#level-select').value=level.id;updateCameraMenu();populateSheets();scene?.setLevel(level);}
 active=record;$('#camera-select').value=id;settings=settingsById.get(id)||defaults();settingsById.set(id,settings);
 $('#active-title').textContent=cameraLabel(record);$('#camera-location').textContent=`${level.name} · ${record.ifcGlobalId}`;
 $('#camera-description').textContent=prop(record,'Other','Description-')||record.ifcTypeName;
 setRows($('#specs'),[['Fabricante',prop(record,'Other','Manufacturer-')],['Familia',record.ifcTypeName.split(':').at(-1)],['Resolución',prop(record,'Data','Resolution_ratio-')],['Sensor',prop(record,'Data','Sensor-')],['Fotogramas',frameRate(record)],['Codificación',prop(record,'Data','Encoding-')],['Alimentación',prop(record,'Data','Power_supply-')],['Potencia',prop(record,'Data','Rated_DC_Power-')],['Protección',prop(record,'Data','Protection')],['Óptica / FOV',prop(record,'Data','Lens')],['Peso',prop(record,'Data','Weight-')]]);
 const raw=$('#raw-properties');raw.replaceChildren();for(const [group,values] of Object.entries(record.properties)){const section=document.createElement('section'),h=document.createElement('h4'),dl=document.createElement('dl');h.textContent=group;setRows(dl,Object.entries(values).filter(([k])=>k!=='id'));section.append(h,dl);raw.append(section);}
 const fixed=typeOf(record)==='F';$('#optics').hidden=!fixed;$('#axis-note').textContent=fixed?'Frente inferido de la geometría de la lente: eje local −X. Posición de vista a 0,246 m del origen de la familia.':'Perspectiva no habilitada para este tipo de cámara en esta etapa.';
 const [x,y,z]=record.positionIfcMetres;
 setRows($('#position-specs'),[['X IFC',x.toFixed(3)+' m'],['Y IFC',y.toFixed(3)+' m'],['Z IFC',z.toFixed(3)+' m'],['Altura sobre nivel',record.heightAboveStoreyMetres.toFixed(2)+' m'],['Giro / inclinación','Ver parámetros de evaluación']]);
 $('#resolution-summary').textContent='IFC: '+(prop(record,'Data','Resolution_ratio-')||'resolución no declarada');
 configureProfile();for(const k of ['fov','range','yaw','tilt'])$('#'+k).value=settings[k];updateOptics();updatePovMessage();
 syncPlan();$('#observer-info').textContent=canView(active)?'Referencia a 8 m de la dirección de evaluación, sobre la cota del nivel IFC.':'Disponible al seleccionar una cámara fija o aplicar un perfil.';
}
function updateOptics(){for(const k of ['fov','range','yaw','tilt'])$('#'+k+'-value').textContent=settings[k]+(k==='range'?' m':'°');$('#fov-summary').textContent=canView(active)?`Evaluación: ${settings.fov}° H · cono ${settings.range} m`:'Perspectiva solo para Fixed Camera';scene?.select(active,settings);planView.select(active,canView(active)?scene?.pose:null,settings);if(scene?.pose&&canView(active)){const d=scene.pose.direction,heading=(Math.atan2(d.x,-d.z)*180/Math.PI+360)%360,pitch=Math.asin(Math.max(-1,Math.min(1,d.y)))*180/Math.PI;const rows=$('#position-specs').lastElementChild;if(rows)rows.querySelector('dd').textContent=`${heading.toFixed(1)}° / ${pitch.toFixed(1)}°`;}}
function updatePovMessage(){const fixed=canView(active);$('#pov-message').hidden=!!(fixed&&modelsReady);$('#pov-badge').hidden=!(fixed&&modelsReady);$('#pov-badge').textContent=fixed?cameraLabel(active):'';$('#pov-message').textContent=!active?'Selecciona una cámara fija.':!fixed?'Consulta la ficha y ubicación. Aplica un perfil del catálogo para evaluar una vista en esta posición.':!modelsReady?'Cargando geometría detallada para la perspectiva…':'';}
function changeLevel(id){level=levels.find(l=>l.id===id)||levels[1];$('#level-select').value=level.id;const cams=updateCameraMenu();populateSheets();scene?.setLevel(level);spaces?.setLevel(level);$('#axon-subtitle').textContent=`${level.name} · corte de ${level.cutMin.toFixed(1)} a ${level.cutMax.toFixed(1)} m`;selectCamera(cams[0]?.ifcGlobalId);}
function showError(where,text){$(where).textContent=text;$(where).classList.add('resources-error');}
async function loadData(){
 const results=await Promise.allSettled([json('./assets/camera-types.json'),json('./assets/models/e09-ins/cameras.json'),json('./assets/plants/manifest.json'),json('./assets/cctv/inventory.json'),json('./assets/models/e09-study/manifest.json'),json('./assets/plan-registration.json'),json('./assets/spaces.json')]);
 for(const i of [0,1,4,5])if(results[i].status==='rejected')throw results[i].reason;
 types=results[0].value;records=results[1].value.cameras;modelManifest=results[4].value;planView.configure(results[5].value,records,types);
 architecture=results[2].status==='fulfilled'?results[2].value.pages:[];inventory=results[3].status==='fulfilled'?results[3].value.pages:[];
 if(results[6].status==='fulfilled')spacesData=results[6].value;else{$('#spaces-summary').textContent='No se pudo cargar el catálogo de espacios. Recarga para reintentar.';$('#open-spaces').disabled=true;}
 for(const [i,key] of [[2,'architecture'],[3,'inventory']])if(results[i].status==='rejected')planErrors[key]=results[i].reason.message;
 $('#type-legend').replaceChildren(...Object.entries(types).map(([k,t])=>{const span=document.createElement('span');span.className='legend-chip';const dot=document.createElement('i');dot.style.background=t.color;span.append(dot,document.createTextNode(`${k} · ${t.label}`));return span;}));const selected=document.createElement('span');selected.textContent='Anillo blanco · activa';$('#type-legend').append(selected);
}
async function start(){
 if(started){changeLevel($('#entry-level').value);scene.dirty=true;return;}
 started=true;loadStart=performance.now();loadTimer=setInterval(()=>{$('#load-elapsed').textContent=Math.floor((performance.now()-loadStart)/1000)+' s transcurridos';},500);$('#resource-status').textContent='Cargando inventario, plantas y modelos…';
 try{
  await (loadingPromise ||= loadData());
  scene=new StudyScene({axon:$('#axon-art'),pov:$('#pov-art'),onSelect:selectCamera,onProgress:(done,total)=>{const percent=Math.floor(done/total*100);$('#load-percent').textContent=percent+'%';$('#load-progress').value=percent;$('#load-parts').textContent=`Partes cargadas: ${done} de ${total}`;$('#resource-status').textContent=`Paquete E09 · ${done}/${total} partes de geometría`;}});
  if(spacesData)spaces=new SpaceStudy({scene,plan:planView,data:spacesData,onSelectPlan:r=>{const part=r.building.includes('DESCENDENTE')?'A':'B',page=architecture.find(p=>p.level===level.name&&p.part===part);if(page){if($('#plan-kind').value!=='architecture'){$('#plan-kind').value='architecture';populateSheets();}$('#plan-sheet').value=page.page;zoom=1;drawPlan();}}});scene.showMarkers=camerasVisible;
  changeLevel($('#entry-level').value);
  await scene.load(modelManifest,records,types);scene.setLevel(level);scene.select(active,settings);modelsReady=true;$('#model-loading').hidden=true;updatePovMessage();
  $('#resource-status').textContent=`E09 + BRT NQS · arquitectura, estructura e instalaciones · 3 IFC de accesos (${modelManifest.structure1300Elements} elementos) · ${records.length} cámaras · 26 perspectivas fijas`;
  clearInterval(loadTimer);document.body.dataset.ready='true';
 }catch(error){clearInterval(loadTimer);showError('#resource-status','No se completó la carga: '+error.message);$('#model-loading').textContent='No se pudo cargar el paquete. Usa «Reintentar modelos».';$('#retry-model').hidden=false;updatePovMessage();document.body.dataset.ready='error';console.error(error);}
}
$('#entry-form').addEventListener('submit',e=>{e.preventDefault();$('#entry-dialog').close();start();});
$('#change-context').addEventListener('click',()=>{$('#entry-level').value=level.id;$('#entry-dialog').showModal();if(scene)scene.dirty=true;});
$('#entry-dialog').addEventListener('cancel',e=>{if(!started)e.preventDefault();else if(scene)scene.dirty=true;});
$('#retry-model').addEventListener('click',()=>location.reload());
$('#level-select').addEventListener('change',e=>changeLevel(e.target.value));$('#camera-select').addEventListener('change',e=>selectCamera(e.target.value));
for(const k of ['fov','range','yaw','tilt'])$('#'+k).addEventListener('input',e=>{settings[k]=Number(e.target.value);updateOptics();});
$('#reset-optics').addEventListener('click',()=>{settingsById.delete(active.ifcGlobalId);selectCamera(active.ifcGlobalId);});
$('#show-installations').addEventListener('change',e=>{if(scene){scene.installations=e.target.checked;scene.filter();}});$('#show-cone').addEventListener('change',e=>{if(scene){scene.showCone=e.target.checked;scene.dirty=true;planView.select(active,canView(active)?scene.pose:null,settings);}});
$('#show-brt').addEventListener('change',e=>{if(scene){scene.showBrt=e.target.checked;scene.filter();}});
$('#show-structure-1300').addEventListener('change',e=>{if(scene){scene.showStructure1300=e.target.checked;scene.filter();}});
$('#frame-level').addEventListener('click',()=>scene?.frame());$('#frame-camera').addEventListener('click',()=>scene?.focusSelected());$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
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
 planView.setMarkersVisible(camerasVisible);if(scene){scene.showMarkers=camerasVisible;scene.dirty=true;}
});
function svgElement(tag,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function populateSheets(){const hasArchitecture=architecture.some(p=>p.level===level.name);$('#plan-kind option[value="architecture"]').disabled=!hasArchitecture;if(!hasArchitecture&&$('#plan-kind').value==='architecture')$('#plan-kind').value='inventory';const pages=$('#plan-kind').value==='architecture'?architecture:inventory;const filtered=pages.filter(p=>p.level===level.name);options($('#plan-sheet'),filtered.map(p=>[p.page,p.sourceFile?`${p.level} · Plano ${p.part} · ${p.sourceFile.replace(/\.pdf$/i,'')}`:`${p.level} · ${p.buildings?.join(' / ')||'parte '+p.part} · pág. ${p.page}`]));$('#plan-sheet').disabled=!filtered.length;zoom=1;drawPlan();}
function syncPlan(){
 const kind=$('#plan-kind').value,pages=(kind==='architecture'?architecture:inventory).filter(p=>p.level===level.name),current=Number($('#plan-sheet').value),preferred=planView.choosePage(kind,pages,active,current);
 if(preferred&&preferred.page!==current){$('#plan-sheet').value=preferred.page;zoom=1;drawPlan();}else planView.select(active,canView(active)?scene?.pose:null,settings);
}
function drawPlan(){
 const token=++planToken,kind=$('#plan-kind').value,pages=kind==='architecture'?architecture:inventory,page=pages.find(p=>p.page===Number($('#plan-sheet').value));$('#plan-retry').hidden=true;$('#plan-loading').hidden=true;
 if(!page){$('#plan-svg').replaceChildren();$('#plan-status').textContent=planErrors[kind]?'Error al cargar catálogo: '+planErrors[kind]:'No hay láminas disponibles para este nivel.';$('#plan-retry').hidden=!planErrors[kind];return;}
 $('#plan-loading').hidden=false;planView.zoom=zoom;
 planView.draw(kind,page,level,active,()=>{if(token===planToken){$('#plan-loading').hidden=true;$('#plan-status').textContent=`${kind==='architecture'?'Planta arquitectónica':'Inventario CCTV'} · página ${page.page} · ${planView.markers.length} cámaras IFC`;$('#plan-status').classList.remove('resources-error');}},()=>{if(token===planToken){$('#plan-loading').hidden=true;showError('#plan-status','No se pudo cargar esta lámina.');$('#plan-retry').hidden=false;}});
 $('#plan-registration').textContent=level.id==='B'?'Sótano: plano arquitectónico no aportado · inventario conservado':planView.reg?.status||'Sin registro espacial';planView.select(active,canView(active)?scene?.pose:null,settings);
}
$('#plan-kind').addEventListener('change',()=>{populateSheets();syncPlan();});$('#plan-sheet').addEventListener('change',()=>{zoom=1;drawPlan();});$('#plan-retry').addEventListener('click',async()=>{const kind=$('#plan-kind').value;if(planErrors[kind]){try{const data=await json(kind==='architecture'?'./assets/plants/manifest.json':'./assets/cctv/inventory.json');if(kind==='architecture')architecture=data.pages;else inventory=data.pages;delete planErrors[kind];populateSheets();}catch(error){showError('#plan-status',error.message);}}else drawPlan();});
for(const [id,fn] of [['zoom-in',()=>Math.min(8,zoom*1.5)],['zoom-out',()=>Math.max(1,zoom/1.5)],['zoom-fit',()=>1]])$('#'+id).addEventListener('click',()=>{zoom=fn();planView.zoom=zoom;planView.fit();});
function configureProfile(){
 const id=settings.profile,p=profiles.find(p=>p.id===id),o=opticsProfiles[id];
 $('#applied-profile').textContent=p?`${p.name} · ${o.mode==='multi'?'4 sensores':o.mode==='fisheye'?'Ojo de pez':'Perspectiva'}`:'Óptica de evaluación · sin perfil aplicado';
 $('#reference-select').value=id||'';$('#optics').hidden=!canView(active);if(active&&typeOf(active)!=='F'){$('#axis-note').textContent=id?'Orientación inicial de evaluación sobre el eje local −X de la familia; ajustar giro e inclinación según montaje.':'Perspectiva inicial solo para Fixed Camera; aplica un perfil para evaluar otro tipo.';}
 $('#fov').min=o?.minFov??2;$('#fov').max=o?.fov??150;$('#fov').disabled=!!o&&o.minFov===o.fov;
 if(o){$('#resolution-summary').textContent=`Perfil: ${o.width} × ${o.height}${o.sensors?' / sensor':''} · ${o.fps} fps nominales`;}else if(active){$('#resolution-summary').textContent='IFC: '+(prop(active,'Data','Resolution_ratio-')||'resolución no declarada');}
 $('#observer-info').textContent=canView(active)?'Referencia a 8 m de la dirección de evaluación, sobre la cota del nivel IFC.':'Disponible al seleccionar una cámara fija o aplicar un perfil.';
 showReference();
}
function showReference(){const p=profiles.find(p=>p.id===$('#reference-select').value);$('#reference-link').hidden=!p?.url;if(p?.url)$('#reference-link').href=p.url;$('#reference-info').textContent=p?`${p.type}. ${p.description}`:'Elige un equipo para evaluar sus características en la cámara activa.';
 setRows($('#reference-specs'),p?[['Resolución',p.resolution],['Campo visual',p.fov],['Óptica',p.lens],['Fotogramas',p.fps],['Protección',p.protection]]:[]);
 $('#reference-feedback').textContent=p?'Perfil aplicado a esta cámara. Apertura, proyección y formato de imagen se usan en la simulación. Alcance = extensión de evaluación; FPS y protección son datos nominales. No se simulan enfoque, iluminación IR ni compresión.'+(active&&typeOf(active)!=='F'?' Ajusta giro e inclinación para definir el montaje de evaluación.':''):'';
}
json('./assets/reference-cameras.json').then(data=>{profiles=data;options($('#reference-select'),[['','Sin perfil · parámetros de evaluación'],...profiles.map(p=>[p.id,p.name])]);$('#reference-select').value=settings.profile||'';$('#reference-select').addEventListener('change',()=>{if(!active)return;const id=$('#reference-select').value,o=opticsProfiles[id];if(o){settings.profile=id;settings.optics={...o};settings.fov=o.fov;}else{delete settings.profile;delete settings.optics;settings.fov=90;}configureProfile();$('#fov').value=settings.fov;updateOptics();updatePovMessage();});showReference();}).catch(()=>{$('#reference-info').textContent='Catálogo de referencia no disponible.';});
