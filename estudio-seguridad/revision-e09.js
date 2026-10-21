import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
const host=document.querySelector('#scene'),status=document.querySelector('#status');
const scene=new THREE.Scene();scene.background=new THREE.Color('#07121a');
const camera=new THREE.PerspectiveCamera(45,1,.1,2000);camera.position.set(180,155,195);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,12,0);controls.update();
scene.add(new THREE.HemisphereLight(0xe9f6ff,0x506778,2.5));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(100,200,120);scene.add(sun);
const origin=new THREE.Vector3(96310,2550,-100150);
const context=new THREE.Group(),installations=new THREE.Group(),markers=new THREE.Group();
for(const group of [context,installations,markers]){group.position.copy(origin).negate();scene.add(group);}
const grid=new THREE.GridHelper(320,32,0x365567,0x173342);scene.add(grid);
const loader=new GLTFLoader();
const types=await json('./assets/camera-types.json');
const cameraMaterials=Object.fromEntries(Object.entries(types).map(([k,t])=>[k,new THREE.MeshStandardMaterial({color:t.color,roughness:.65,emissive:t.color,emissiveIntensity:.3})]));
const markerMaterials=Object.fromEntries(Object.entries(types).map(([k,t])=>[k,new THREE.MeshBasicMaterial({color:t.color,depthTest:false,transparent:true})]));
function cameraType(record){return Object.keys(types).find(k=>(record.ifcTypeName||record.ifcName||'').includes(types[k].ifcFamilyToken));}
const otherMaterial=new THREE.MeshStandardMaterial({color:0xc8d6dd,roughness:.8});
const contextMaterial=new THREE.MeshBasicMaterial({color:0x7bb0ce,transparent:true,opacity:.12,depthWrite:false});
const markerGeometry=new THREE.SphereGeometry(1.05,10,8);
let records=[];const nodes=[];
async function json(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json();}
async function loadGzip(url){const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);const buf=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return loader.parseAsync(buf,'');}
function filter(){const level=document.querySelector('#level').value,type=document.querySelector('#type').value;let count=0;
 for(const node of nodes)node.visible=(!level||node.userData.ifcStorey===level)&&(node.userData.isCamera?(!type||cameraType(node.userData)===type):document.querySelector('#installations').checked);
 for(const m of markers.children){m.visible=(!level||m.userData.ifcStorey===level)&&(!type||cameraType(m.userData)===type);if(m.visible)count++;}
 context.visible=document.querySelector('#context').checked;
 document.querySelector('#selected').textContent='Selecciona una cámara o una etiqueta del plano.';
 status.textContent=`${count} cámaras visibles · 1.382 elementos convertidos · geometría lista`;
}
for(const id of ['level','type','context','installations'])document.getElementById(id).addEventListener('change',filter);
try{
 const base='./assets/models/e09-ins/';const manifest=await json(base+'manifest.json');records=(await json(base+'cameras.json')).cameras;
 if(records.some(r=>!cameraType(r)))throw Error('Hay cámaras sin tipo reconocido');
 for(const [key,type] of Object.entries(types)){const row=document.createElement('div');row.className='legend-row';const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=type.color;const title=document.createElement('span');title.textContent=`${key} · ${type.label}`;const count=document.createElement('span');count.className='legend-count';count.textContent=records.filter(r=>cameraType(r)===key).length+' IFC';row.append(swatch,title,count);document.querySelector('#legend').append(row);}
 for(const [i,file] of manifest.files.entries()){
  status.textContent=`Cargando instalaciones ${i+1}/${manifest.files.length}…`;
  const gltf=await loadGzip(base+file.file);
  gltf.scene.traverse(n=>{if(n.userData.ifcGlobalId){nodes.push(n);n.traverse(mesh=>{if(mesh.isMesh)mesh.material=n.userData.isCamera?cameraMaterials[cameraType(n.userData)]:otherMaterial;});}});
  installations.add(gltf.scene);
 }
 for(const record of records){const m=new THREE.Mesh(markerGeometry,markerMaterials[cameraType(record)]);m.position.fromArray(record.positionGltfMetres);m.userData=record;m.renderOrder=10;markers.add(m);}
 status.textContent='Cargando contexto de la estación…';
 const overview=await loadGzip('./assets/models/e09/e09-overview.glb.gz');overview.scene.traverse(n=>{if(n.isMesh)n.material=contextMaterial;});context.add(overview.scene);
 filter();document.body.dataset.resources='ready';for(const id of ['level','type'])document.getElementById(id).disabled=false;
}catch(error){status.textContent=`Error al cargar: ${error.message}`;document.body.dataset.resources='error';console.error(error);}
const raycaster=new THREE.Raycaster();let start;
renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
 const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
 const hit=raycaster.intersectObjects(markers.children.filter(m=>m.visible),false)[0];if(!hit)return;
 const r=hit.object.userData;document.querySelector('#selected').textContent=`${types[cameraType(r)].label} · Modelo IFC\n${r.ifcStorey} · ${r.ifcName}\nGlobalId: ${r.ifcGlobalId}\nAltura sobre nivel IFC: ${r.heightAboveStoreyMetres.toFixed(2)} m. Etiqueta del plano: pendiente de vincular.`;
});
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{renderer.render(scene,camera);});
// Same color dictionary is used for the PDF labels and the IFC geometry.
const svg=document.querySelector('#plan'),sheet=document.querySelector('#sheet'),planStatus=document.querySelector('#plan-status');
const levelNames={ARC_PL_00_BASEMENT:'Sótano',ARC_PL_01_ACCESS:'Acceso',ARC_PL_02_INTERMEDIATE:'Intermedio',ARC_PL_03_PLATFORM:'Plataforma'};
let pages=[],zoom=1;
function el(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;}
function drawPlan(){
 const page=pages.find(p=>p.page===Number(sheet.value));if(!page)return;
 const selectedType=document.querySelector('#type').value;svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${page.width} ${page.height}`);svg.style.width=`${zoom*100}%`;
 const image=el('image',{href:`./assets/cctv/${page.image}`,width:page.width,height:page.height});image.addEventListener('error',()=>{planStatus.textContent='No se pudo cargar la imagen del plano.';});svg.append(image);
 let count=0;
 for(const label of page.labels){if(selectedType&&label.type!==selectedType)continue;count++;
  const type=types[label.type],[x0,y0,x1,y1]=label.box,h=Math.max(18,y1-y0+6),w=Math.max(x1-x0+10,label.label.length*7);
  const group=el('g',{class:'camera-label',tabindex:'0',role:'button','aria-label':`${label.label} · ${type.label}`});
  group.append(el('rect',{x:x0-5,y:y0-3,width:w,height:h,rx:3,fill:type.color,stroke:'#fff','stroke-width':1.2}));
  const text=el('text',{x:x0,y:y0-3+h*.73,'font-family':'Arial,sans-serif','font-weight':'bold','font-size':13,fill:'#07121a'});text.textContent=label.label;group.append(text);
  const title=el('title');title.textContent=`${label.label} · ${type.label} · página ${page.page}`;group.append(title);
  const select=()=>{document.querySelector('#selected').textContent=`${type.label} · Plano de inventario\n${label.label} · ${page.level}, parte ${page.part}\nPágina PDF ${page.page}. GlobalId: pendiente de vincular.`;};group.addEventListener('click',select);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});svg.append(group);
 }
 planStatus.textContent=`Página ${page.page} · ${count} ${count===1?'etiqueta resaltada':'etiquetas resaltadas'} · colores por tipo sobre el plano original`;
}
function sheetsForLevel(){const name=levelNames[document.querySelector('#level').value],old=sheet.value;sheet.replaceChildren();for(const page of pages.filter(p=>!name||p.level===name)){const option=document.createElement('option');option.value=page.page;option.textContent=`${page.level} · parte ${page.part} · pág. ${page.page}`;sheet.append(option);}if([...sheet.options].some(o=>o.value===old))sheet.value=old;zoom=1;drawPlan();}
document.querySelector('#level').addEventListener('change',sheetsForLevel);
document.querySelector('#type').addEventListener('change',drawPlan);
sheet.addEventListener('change',()=>{const page=pages.find(p=>p.page===Number(sheet.value));if(page){document.querySelector('#level').value=Object.keys(levelNames).find(k=>levelNames[k]===page.level);filter();}zoom=1;drawPlan();});
for(const [id,action] of [['zoom-in',()=>Math.min(zoom*1.5,8)],['zoom-out',()=>Math.max(zoom/1.5,1)],['zoom-fit',()=>1]])document.getElementById(id).addEventListener('click',()=>{zoom=action();svg.style.width=`${zoom*100}%`;});
try{pages=(await json('./assets/cctv/inventory.json')).pages;sheetsForLevel();sheet.disabled=false;document.body.dataset.plans='ready';}catch(error){planStatus.textContent=`No se pudo cargar el inventario: ${error.message}`;document.body.dataset.plans='error';}
