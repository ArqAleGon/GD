import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';
import {station,stations} from './study-stations.js?v=20261030-stations';
import {initFullscreen} from './study-controls.js?v=20261028-e01media23';

const $=s=>document.querySelector(s),link=document.createElement('link');
link.rel='stylesheet';link.href='./study-model-viewer.css?v=20261030-stations';document.head.append(link);
document.body.classList.add('model-only');document.body.dataset.station=station.id;
document.title='Estudio de Seguridad · '+station.name;
$('#pov-panel').remove();$('#plan-panel').remove();$('.inspector').remove();$('.side-tools').remove();
$('#open-camera-dashboard').hidden=true;$('.camera-menu').hidden=true;$('.status-bar a').hidden=true;
$('.context-bar .context-item b').textContent=station.name;$('.prototype').lastChild.textContent=' '+station.name;
$('#camera-count').textContent='Planos, cámaras y recorridos pendientes';
$('#axon-title').textContent='Vista 3D · estación completa';$('#axon-subtitle').textContent='Modelos recuperados del mockup';
$('#axon-panel .panel-actions').innerHTML='<button id="model-fit">Encuadrar</button><button id="model-top">Planta</button><button id="model-front">Frente</button><button id="model-side">Lateral</button><button id="model-full">Estación completa</button><button id="model-detail" aria-pressed="false" disabled>Detalle IFC</button><button id="model-expand" aria-label="Ampliar vista 3D">⛶</button>';
$('#axon-art .scene-note').textContent='Arrastrar: orbitar · rueda: acercar · botón derecho: desplazar';
$('.loading-card > span').textContent=station.name;
const info=document.createElement('aside');info.className='model-information';info.innerHTML='<span class="eyebrow">MODELOS RECUPERADOS</span><h2></h2><p id="model-quality"></p><div id="model-packages"></div><details><summary>Archivos IFC de origen</summary><ul id="model-sources"></ul></details><p id="level-source"></p><hr><b>Pendiente de incorporar</b><p>Planos arquitectónicos, inventario de cámaras, etiquetas y áreas de espacios, trazados y videos de recorridos.</p>';
info.querySelector('h2').textContent=station.name;$('.study-layout').append(info);
$('#type-legend').textContent='Geometría del mockup · arquitectura y estructura';
let level=station.levels.find(l=>l.id===new URLSearchParams(location.search).get('level'))||station.levels[0];
let started=false,manifest,renderer,camera,controls,world,origin,bounds,preview,detailReady=false,loading=false,dirty=true,detailGroup=new THREE.Group(),direction=new THREE.Vector3(1,1,1),generation=0;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),loaded=new Set(),sourceVisible=new Map();
const options=(element,rows)=>{element.replaceChildren(...rows.map(([value,label])=>{const o=document.createElement('option');o.value=value;o.textContent=label;return o;}));};
function entry(config,selected=config.modelOnly?'all':'A'){
 options($('#entry-level'),config.levels.map(l=>[l.id,l.name]));$('#entry-level').value=config.levels.some(l=>l.id===selected)?selected:config.levels[0].id;
 $('.entry-caption .eyebrow').textContent=config.name;$('.entry-caption p').textContent=config.description;
 $('.entry-caption h2').textContent=config.modelOnly?'Explora los modelos de la estación.':'Conoce lo que ve cada cámara.';
 $('.entry-steps').replaceChildren(...(config.modelOnly?[`${config.sourceCount} modelos de origen IFC`,'Recursos de seguridad pendientes']:[`${config.fixed} cámaras Fixed`,`${config.cameras} cámaras IFC`]).map(t=>{const s=document.createElement('span');s.textContent=t;return s;}));
 $('.entry-info p').textContent=config.modelOnly?'Vista 3D disponible. Los demás recursos se incorporarán cuando estén disponibles.':'Cámaras, plantas y recorridos del estudio integrado.';
}
options($('#entry-building'),Object.values(stations).sort((a,b)=>a.id.localeCompare(b.id)).map(s=>[s.id,s.name]));$('#entry-building').value=station.id;entry(station,level.id);
options($('#level-select'),station.levels.map(l=>[l.id,l.name]));$('#level-select').value=level.id;
$('#entry-building').addEventListener('change',()=>entry(stations[$('#entry-building').value]));
$('#entry-form').addEventListener('submit',e=>{e.preventDefault();const id=$('#entry-building').value;if(id!==station.id){const url=new URL(location.href);url.searchParams.set('station',id);url.searchParams.set('level',$('#entry-level').value);url.searchParams.set('start','1');location.assign(url);return;}level=station.levels.find(l=>l.id===$('#entry-level').value)||station.levels[0];$('#level-select').value=level.id;$('#entry-dialog').close();if(!started)start();else applyLevel();});
$('#change-context').addEventListener('click',()=>{$('#entry-building').value=station.id;entry(station,level.id);$('#entry-dialog').showModal();});
$('#entry-dialog').addEventListener('cancel',e=>{if(!started)e.preventDefault();});
$('#level-select').addEventListener('change',()=>{level=station.levels.find(l=>l.id===$('#level-select').value);applyLevel();});
$('#model-full').addEventListener('click',()=>{level=station.levels[0];$('#level-select').value=level.id;applyLevel();});
$('#model-fit').addEventListener('click',()=>frame());
for(const [id,dir] of [['model-top',[0,1,.001]],['model-front',[0,.15,1]],['model-side',[1,.15,0]]])$('#'+id).addEventListener('click',()=>{direction.fromArray(dir);frame();});
$('#model-expand').addEventListener('click',()=>{$('#axon-panel').classList.toggle('is-expanded');resize();frame();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#axon-panel').classList.remove('is-expanded');resize();}});
initFullscreen(()=>{resize();frame();});
$('#help-button').addEventListener('click',()=>{const content=$('#help-dialog .help-content');content.querySelector('h2').textContent='Modelos 3D · '+station.name;content.querySelectorAll('p').forEach(p=>p.remove());const p=document.createElement('p');p.textContent='Explora la estación completa o selecciona un nivel disponible. Detalle IFC carga las geometrías procesadas originales. Los planos y recursos de seguridad de esta estación aún están pendientes.';content.querySelector('form').before(p);$('#help-dialog').showModal();});
$('#model-detail').addEventListener('click',()=>loadDetails());$('#retry-model').addEventListener('click',()=>{if(manifest&&renderer)loadDetails();else location.reload();});

function resize(){if(!renderer)return;const r=$('#axon-art').getBoundingClientRect();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();dirty=true;}
function activeBounds(){const b=bounds.clone();if(level.id!=='all'){b.min.y=Math.max(b.min.y,level.cutMin-origin.y);b.max.y=Math.min(b.max.y,level.cutMax-origin.y);if(b.max.y<b.min.y)return bounds.clone();}return b;}
function frame(){if(!camera)return;resize();const b=activeBounds(),center=b.getCenter(new THREE.Vector3()),dir=direction.clone().normalize(),right=new THREE.Vector3().crossVectors(camera.up,dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right),tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;let distance=1;
 for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,p.dot(dir)+Math.max(Math.abs(p.dot(right))/tanH,Math.abs(p.dot(up))/tanV));}
 camera.position.copy(center).addScaledVector(dir,distance*1.14);camera.near=.05;camera.far=Math.max(3000,distance*8);camera.updateProjectionMatrix();controls.target.copy(center);controls.update();dirty=true;
}
function applyLevel(){if(!renderer)return;renderer.clippingPlanes=level.id==='all'?[]:[new THREE.Plane(new THREE.Vector3(0,1,0),-(level.cutMin-origin.y)),new THREE.Plane(new THREE.Vector3(0,-1,0),level.cutMax-origin.y)];$('#axon-title').textContent=level.id==='all'?'Vista 3D · estación completa':'Planta 3D · '+level.name;$('#axon-subtitle').textContent=level.id==='all'?'Todos los modelos · sin corte':`Corte ${level.cutMin.toFixed(2)} a ${level.cutMax.toFixed(2)} m · niveles del IFC`;frame();}
async function binary(url){for(let n=0;n<3;n++){try{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);const b=await r.arrayBuffer();const a=new Uint8Array(b);return a[0]===31&&a[1]===139?new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():b;}catch(e){if(n===2)throw e;await new Promise(r=>setTimeout(r,500*2**n));}}}
function dispose(group){if(!group)return;const geometries=new Set(),materials=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();group.removeFromParent();}
function positionModel(scene,file){const wrapper=new THREE.Group();wrapper.position.copy(origin).negate();wrapper.add(scene);if(file.displayTransform){if(!Array.isArray(file.displayTransform)||file.displayTransform.length!==16)throw Error('Transformación no compatible');scene.applyMatrix4(new THREE.Matrix4().fromArray(file.displayTransform));}return wrapper;}
function transformedGeometry(source,matrix){const g=source.clone();for(const name of ['position','normal','tangent']){const a=g.getAttribute(name);if(!a)continue;const values=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++){values[i*a.itemSize]=a.getX(i);values[i*a.itemSize+1]=a.getY(i);values[i*a.itemSize+2]=a.getZ(i);if(a.itemSize===4)values[i*a.itemSize+3]=a.getW(i);}g.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize));}return g.applyMatrix4(matrix);}
// Merge draw calls per material and part; originals and source identities stay in the recovered package.
function batch(scene,file){scene.updateMatrixWorld(true);const groups=new Map(),originalMaterials=new Set(),originalGeometry=new Set();
 scene.traverse(n=>{if(!n.isMesh)return;let owner=n;while(owner&&!owner.userData.ifcGlobalId)owner=owner.parent;const meta=owner?.userData||{};if(meta.ifcType==='IfcOpeningElement')return;const materials=Array.isArray(n.material)?n.material:[n.material];
  // Multi-material geometry is already grouped in legacy exports; retain it intact.
  if(materials.length>1){const clone=n.clone();clone.geometry=transformedGeometry(n.geometry,n.matrixWorld);clone.material=materials.map(m=>m.clone());clone.position.set(0,0,0);clone.quaternion.identity();clone.scale.set(1,1,1);clone.matrix.identity();clone.userData={...meta};originalGeometry.add(n.geometry);materials.forEach(m=>originalMaterials.add(m));const key='multi-'+n.uuid;groups.set(key,{object:clone});return;}
  const mat=materials[0],g=transformedGeometry(n.geometry,n.matrixWorld);originalMaterials.add(mat);originalGeometry.add(n.geometry);
  const attrs=Object.keys(g.attributes).sort().join(',');const key=mat.uuid+'|'+attrs+'|'+!!g.index;let item=groups.get(key);if(!item){item={mat:mat.clone(),geometries:[],ids:[]};groups.set(key,item);}item.geometries.push(g);if(meta.ifcGlobalId)item.ids.push(meta.ifcGlobalId);
 });
 const result=new THREE.Group();result.userData.source=file.source;
 for(const item of groups.values()){if(item.object){result.add(item.object);continue;}const merged=mergeGeometries(item.geometries,false);if(!merged)throw Error('No se pudo preparar la geometría: '+file.file);for(const g of item.geometries)g.dispose();const mesh=new THREE.Mesh(merged,item.mat);mesh.userData={source:file.source,ifcGlobalIds:item.ids};result.add(mesh);}
 for(const g of originalGeometry)g.dispose();for(const m of originalMaterials)m.dispose();return result;
}
function progress(done,total){const n=Math.floor(done/Math.max(1,total)*100);$('#load-percent').textContent=n+'%';$('#load-progress').value=n;$('#load-parts').textContent=`Partes cargadas: ${done} de ${total}`;$('#resource-status').textContent=`${station.name} · ${done}/${total} partes`;}
function fail(error){document.body.dataset.ready='error';$('#retry-model').hidden=false;$('#resource-status').textContent='Carga incompleta: '+error.message;$('#load-parts').textContent='No se completó la carga. Usa Reintentar modelos.';console.error(error);}
async function loadDetails(){if(loading||detailReady)return;loading=true;const token=++generation;$('#model-detail').disabled=true;$('#retry-model').hidden=true;$('#model-loading').hidden=false;const start=performance.now(),timer=setInterval(()=>$('#load-elapsed').textContent=Math.floor((performance.now()-start)/1000)+' s transcurridos',500);const files=manifest.files.filter(f=>f.role==='detail');let next=0;progress(loaded.size,files.length);
 try{const worker=async()=>{while(next<files.length){const file=files[next++];if(loaded.has(file.file))continue;const gltf=await loader.parseAsync(await binary(file.url),'');if(token!==generation)return;const wrapper=positionModel(gltf.scene,file);const part=batch(wrapper,file);part.visible=sourceVisible.get(file.source)!==false;detailGroup.add(part);loaded.add(file.file);progress(loaded.size,files.length);await new Promise(r=>setTimeout(r,0));}};
 const results=await Promise.allSettled([worker(),worker()]);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 detailReady=true;detailGroup.visible=true;dispose(preview);preview=null;$('#model-loading').hidden=true;$('#model-detail').textContent='Detalle IFC cargado';$('#model-detail').setAttribute('aria-pressed','true');$('#model-quality').textContent=manifest.legacyGrouped?'Geometría agrupada de origen. El paquete del mockup no incluye identificadores IFC individuales.':'Geometría detallada recuperada del mockup; sin reconversión IFC.';document.body.dataset.ready='true';document.body.dataset.modelQuality='detail';$('#resource-status').textContent=`${station.name} · ${manifest.sourceIfcFiles.length} archivos IFC de origen · ${files.length} partes verificadas`;dirty=true;
 }catch(e){fail(e);}finally{loading=false;clearInterval(timer);$('#model-detail').disabled=detailReady;}}
async function start(){if(started)return;started=true;$('#resource-status').textContent='Cargando catálogo de modelos…';
 try{const r=await fetch(station.modelManifest);if(!r.ok)throw Error('Catálogo HTTP '+r.status);manifest=await r.json();const raw=new THREE.Box3(new THREE.Vector3(...manifest.bounds.min),new THREE.Vector3(...manifest.bounds.max));origin=raw.getCenter(new THREE.Vector3());bounds=raw.clone().translate(origin.clone().negate());const size=raw.getSize(new THREE.Vector3());direction.set(...(size.z>size.x?[1,.8,.35]:[.35,.8,1]));
 world=new THREE.Scene();world.background=new THREE.Color('#08141e');world.add(new THREE.HemisphereLight(0xffffff,0x8196a6,2.5));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(80,180,120);world.add(sun);world.add(detailGroup);detailGroup.visible=false;
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));$('#axon-art').prepend(renderer.domElement);camera=new THREE.PerspectiveCamera(42,1,.05,3000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.addEventListener('change',()=>dirty=true);new ResizeObserver(resize).observe($('#axon-art'));renderer.setAnimationLoop(()=>{if(dirty){dirty=false;renderer.render(world,camera);}});applyLevel();
 $('#level-source').textContent=station.levels.length>1?'Niveles conservados del catálogo IFC del mockup.':'El catálogo del mockup no declara niveles IFC para esta estación. Se muestra la estación completa.';
 for(const source of manifest.sourceIfcFiles){const li=document.createElement('li');li.textContent=source;$('#model-sources').append(li);const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;sourceVisible.set(source,true);input.addEventListener('change',async()=>{sourceVisible.set(source,input.checked);await loadDetails();for(const p of detailGroup.children)p.visible=sourceVisible.get(p.userData.source)!==false;dirty=true;});label.append(input,document.createTextNode(source.includes('-ARQ-')?'Arquitectura · '+source.split('-')[1]:'Estructura · '+source.split('-')[1]));$('#model-packages').append(label);}
 const overview=manifest.files.find(f=>f.role==='overview');if(overview){progress(0,1);const t=performance.now(),timer=setInterval(()=>$('#load-elapsed').textContent=Math.floor((performance.now()-t)/1000)+' s transcurridos',500);try{const gltf=await loader.parseAsync(await binary(overview.url),'');preview=positionModel(gltf.scene,overview);world.add(preview);}finally{clearInterval(timer);}progress(1,1);$('#model-loading').hidden=true;$('#model-detail').disabled=false;$('#model-quality').textContent='Vista general simplificada del mockup. Activa Detalle IFC para cargar la geometría detallada.';$('#resource-status').textContent=`${station.name} · ${manifest.sourceIfcFiles.length} modelos IFC · vista general`;document.body.dataset.ready='true';document.body.dataset.modelQuality='overview';dirty=true;}else await loadDetails();
 }catch(e){fail(e);}}
$('#entry-dialog').showModal();
if(new URLSearchParams(location.search).get('start')==='1'){$('#entry-dialog').close();start();}
