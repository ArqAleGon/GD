import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {STATES,DEMO,metrics,matches,normalizeUE,ueOptions} from './bim-state.js?v=20260916-ue';
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
function fit(list=visibleRecords(),direction=mode){
 const bounds=new THREE.Box3();for(const r of list)if(r.group)bounds.union(new THREE.Box3().setFromObject(r.group));
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(size.length()/2,2),distance=radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*1.28/Math.min(camera.aspect,1);
 controls.target.copy(center);camera.up.set(0,1,0);
 const dir=direction==='top'?new THREE.Vector3(0,1,.001):new THREE.Vector3(.9,.65,1).normalize();
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
function render(){
 for(const r of records)Object.assign(r,metrics(r,$('cutoff').value||'2026-09-16'));
 const f=filters(),base=records.filter(r=>matches(r,{...f,status:''})),list=visibleRecords();
 if(selected&&!list.includes(selected)){selected=null;isolated=false;$('context').setAttribute('aria-pressed','false');}
 $('count').textContent=`${list.length} / ${records.length} paquetes`;
 const missing=list.filter(r=>!r.ue).length;
 $('ueNote').textContent=missing?`${missing} paquetes visibles sin UE asignada. Se necesita la correspondencia oficial UE–modelo.`:list.length?`${ueOptions(list).length} UE en los modelos filtrados.`:'No hay modelos para esta combinación de filtros.';
 $('kpis').innerHTML=Object.entries(STATES).map(([key,s])=>`<button class="kpi" data-state="${key}" aria-pressed="${f.status===key}" style="--state:${s.color}"><span>${s.label}</span><b>${base.filter(r=>r.status===key).length}<small>paquetes</small></b></button>`).join('');
 $('kpis').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('status').value=f.status===b.dataset.state?'':b.dataset.state;render();fit();});
 const avg=key=>list.length?list.reduce((sum,r)=>sum+r[key],0)/list.length:0;
 $('planned').textContent=list.length?percent(avg('planned')):'—';$('actual').textContent=list.length?percent(avg('actual')):'—';
 $('plannedBar').style.width=avg('planned')+'%';$('actualBar').style.width=avg('actual')+'%';
 $('rows').innerHTML=list.map(r=>`<tr class="${selected===r?'selected':''}"><td><button class="modelButton" data-id="${r.id}" aria-pressed="${selected===r}">${r.section} · ${r.code}<small>${r.file}</small></button></td><td>${escapeHTML(r.ue||'Sin asignar')}</td><td>${r.discipline==='ARQ'?'Arquitectura':'Estructura'}</td><td>${r.version}</td><td>${percent(r.planned)}<div class="miniBar"><i style="width:${r.planned}%"></i></div></td><td>${percent(r.actual)}</td><td><span class="statusPill" style="--state:${STATES[r.status].color}">${swatch(r.status)}${STATES[r.status].label}</span></td><td>${r.start} / ${r.end}</td></tr>`).join('');
 $('rows').querySelectorAll('button').forEach(b=>b.onclick=()=>{const r=records.find(x=>x.id===Number(b.dataset.id));select(r);fit([r]);});
 $('empty').hidden=!!list.length;
 $('viewTitle').textContent=(f.sector||'E15 + I16 + E16')+(f.ue?' · '+(f.ue==='__unassigned__'?'Sin UE asignada':f.ue):'');
 $('detail').hidden=!selected;
 if(selected){const r=selected;$('detail').innerHTML=`<b>${r.section} · ${r.discipline} · ${r.code}</b><span class="statusPill" style="--state:${STATES[r.status].color}">${swatch(r.status)}${STATES[r.status].label}</span><p>UE · ${escapeHTML(r.ue||'Sin asignar')}</p><p>Planificado ${percent(r.planned)} / ejecutado ${percent(r.actual)} · demo</p><p>${r.converted.toLocaleString('es')} elementos convertidos en este paquete.</p><p>${r.source}</p>`;}
 $('context').disabled=!selected;$('clearSelection').disabled=!selected;applyMaterials();
}
$('legend').innerHTML=Object.entries(STATES).map(([k,s])=>`<span>${swatch(k)}${s.label}</span>`).join('');
for(const id of ['sector','ue','discipline','status','cutoff'])$(id).onchange=()=>{render();fit();};
$('search').oninput=()=>{render();fit();};
$('appearance').onchange=applyMaterials;
$('reset').onclick=()=>{for(const id of ['sector','ue','discipline','status','search'])$(id).value='';$('cutoff').value='2026-09-16';select(null);fit();};
$('fit').onclick=()=>fit(isolated&&selected?[selected]:visibleRecords());
$('top').onclick=()=>{mode='top';fit(isolated&&selected?[selected]:visibleRecords());};
$('iso').onclick=()=>{mode='iso';fit(isolated&&selected?[selected]:visibleRecords());};
$('context').onclick=()=>{if(!selected)return;isolated=!isolated;$('context').setAttribute('aria-pressed',String(isolated));applyMaterials();fit(isolated?[selected]:visibleRecords());};
$('clearSelection').onclick=()=>{select(null);fit();};
const raycaster=new THREE.Raycaster();let down;
canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const roots=visibleRecords().filter(r=>r.group?.visible).map(r=>r.group);const hit=raycaster.intersectObjects(roots,true)[0];if(hit)select(records.find(r=>r.id===hit.object.userData.recordId));else select(null);});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
async function load(){
 const response=await fetch('./ifc-placement-20260915-i16-e16.json');if(!response.ok)throw new Error('No se pudo leer la lista de modelos');const placement=await response.json();
 const ueResponse=await fetch('./bim-ue.json?v=20260916-ue');if(!ueResponse.ok)throw new Error('No se pudo leer la correspondencia UE');const ueMapping=await ueResponse.json();
 placement.models.forEach((definition,i)=>{const [start,end,actual]=DEMO[i];records.push({...definition,ue:normalizeUE(ueMapping.models[definition.file]),id:i,code:definition.source.split('-')[1],start,end,actual,...metrics({start,end,actual},$('cutoff').value)});});
 for(const ue of ueOptions(records)){const option=document.createElement('option');option.value=ue;option.textContent=ue;$('ue').append(option);}
 $('sector').value='E16';render();
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let complete=0;
 const results=await Promise.allSettled(records.map(async r=>{const gltf=await loader.loadAsync('./'+r.file);const group=gltf.scene;group.position.set(-placement.gisOrigin[0],-placement.streetDatum,placement.gisOrigin[1]);group.traverse(o=>{if(o.isMesh){o.userData.baseMaterial=o.material;o.userData.recordId=r.id;}});r.group=group;scene.add(group);complete++;$('load').textContent=`Cargando modelos… ${complete} / ${records.length}`;applyMaterials();}));
 const failed=results.filter(r=>r.status==='rejected');$('load').hidden=!failed.length;if(failed.length)$('load').textContent=`No se pudieron cargar ${failed.length} modelos. Recarga la página para reintentar.`;
 render();fit();
}
load().catch(error=>{$('load').hidden=false;$('load').textContent='No se pudieron cargar los modelos. Recarga para reintentar.';console.error(error);});
