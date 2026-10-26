import {RouteVideo} from './study-videotours.js?v=20261026-route-pov-v1';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=s=>document.querySelector(s), ns='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
const option=(value,text)=>{const n=document.createElement('option');n.value=value;n.textContent=text;return n;};
const metres=n=>n.toLocaleString('es-CO',{maximumFractionDigits:1,minimumFractionDigits:1})+' m';
export class RouteStudy{
 constructor({scene,plan,data,setContext,onExit,onEnter}){
  Object.assign(this,{scene,plan,data,setContext,onExit,onEnter});scene.routes=this;plan.routes=this;this.active=false;this.playing=false;this.distance=0;this.speed=2;this.opacity=.22;this.parts=[];this.materials=new Map();
  this.camera=new THREE.PerspectiveCamera(42,1,.1,5000);this.controls=new OrbitControls(this.camera,scene.pov);this.controls.enabled=false;this.controls.addEventListener('change',()=>scene.dirty=true);
  this.povCamera=new THREE.PerspectiveCamera(65,1,.06,5000);this.povMode=false;
  this.video=new RouteVideo();$('#route-view').addEventListener('change',e=>this.setPov(e.target.value==='pov'));
  document.body.append($('#route-live'));this.group=new THREE.Group();scene.scene.add(this.group);this.group.visible=false;this.caches=new Map();
  this.lookup=new Map([...data.routes,...data.links].map(r=>[r.id,r]));
  $('#route-family').replaceChildren(...data.families.map(f=>option(f.id,f.label)));
  $('#route-legend').replaceChildren(...data.families.map(f=>{const p=document.createElement('p'),dot=document.createElement('i');dot.style.background=f.color;p.append(dot,document.createTextNode(f.label));return p;}));
  $('#routes-tab').disabled=false;$('#routes-enter').addEventListener('click',()=>{this.enable(true);$('#routes-drawer .drawer-close').click();$('#route-view').focus();});$('#routes-exit').addEventListener('click',()=>this.enable(false));
  $('#route-family').addEventListener('change',()=>this.chooseFamily());$('#route-path').addEventListener('change',()=>this.choosePath());
  $('#route-play').addEventListener('click',()=>{if(this.distance>=this.total)this.distance=0;this.playing=!this.playing;this.updateText();scene.dirty=true;});
  $('#route-reset').addEventListener('click',()=>{this.distance=0;this.updatePosition(true);});
  $('#route-speed').addEventListener('input',e=>{this.speed=Number(e.target.value);$('#route-speed-value').textContent=this.speed+' m/s';});
  $('#route-opacity').addEventListener('input',e=>{this.opacity=Number(e.target.value)/100;$('#route-opacity-value').textContent=e.target.value+'%';this.setTransparency(true);scene.dirty=true;});
  $('#route-progress').addEventListener('input',e=>{this.distance=this.total*Number(e.target.value)/1000;this.updatePosition(true);});
  $('#route-reverse').addEventListener('change',()=>this.choosePath());$('#route-fit').addEventListener('click',()=>{this.setPov(false);this.fit();});
  $('#route-follow').addEventListener('change',()=>this.updatePosition(true));
  new ResizeObserver(()=>{if(this.active)this.fit();}).observe(scene.pov);
  this.chooseFamily();
 }
 chooseFamily(){
  const family=$('#route-family').value;this.family=this.data.families.find(f=>f.id===family);
  const journeys=this.data.journeys.filter(r=>r.family===family),legs=this.data.routes.filter(r=>r.family===family&&!r.id.endsWith('-reverse'));
  const all=document.createElement('optgroup');all.label='Recorridos entre niveles · enlaces esquemáticos';all.append(...journeys.map(r=>option(r.id,r.label)));
  const parts=document.createElement('optgroup');parts.label='Tramos originales por nivel';parts.append(...legs.map(r=>option(r.id,r.label)));
  $('#route-path').replaceChildren(all,parts);this.choosePath();this.setPov(this.family.id==='r1');
 }
 choosePath(){
  const id=$('#route-path').value,journey=this.data.journeys.find(r=>r.id===id),single=this.lookup.get(id),source=journey||single;if(!source)return;
  $('#route-reverse').disabled=!source.bidirectional;if(!source.bidirectional)$('#route-reverse').checked=false;
  let legs=(journey?journey.legs:[single.id]).map(id=>({...this.lookup.get(id)}));
  if($('#route-reverse').checked)legs=legs.reverse().map(r=>({...r,points:r.points.slice().reverse(),sourcePoints:r.sourcePoints?.slice().reverse(),fromLevel:r.toLevel,toLevel:r.fromLevel}));
  this.group.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();});this.group.clear();this.parts=[];
  let offset=0;this.planLength=0;this.linkLength=0;
  for(const leg of legs){
   const points=leg.points.map(p=>new THREE.Vector3(...p)),lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+points[i].distanceTo(points[i-1]));
   const length=lengths.at(-1);if(!length)continue;
   const group=new THREE.Group();this.group.add(group);const color=this.family.color;
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),leg.schematic?new THREE.LineDashedMaterial({color,dashSize:.9,gapSize:.65,depthTest:false,transparent:true,opacity:.85}):new THREE.LineBasicMaterial({color,depthTest:false}));line.computeLineDistances();line.renderOrder=80;group.add(line);
   if(!leg.schematic)for(let i=1;i<points.length;i++){const d=points[i].clone().sub(points[i-1]),len=d.length();if(len<.01)continue;const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,len,6),new THREE.MeshBasicMaterial({color,depthTest:false}));mesh.position.copy(points[i]).add(points[i-1]).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.renderOrder=79;group.add(mesh);if(this.family.id==='r1'){const halo=new THREE.Mesh(mesh.geometry.clone(),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));halo.position.copy(mesh.position);halo.quaternion.copy(mesh.quaternion);halo.scale.set(1.8,1,1.8);halo.renderOrder=78;group.add(halo);}}
   const part={leg,points,lengths,length,offset,group,arrows:[]};offset+=length;this.parts.push(part);if(leg.schematic)this.linkLength+=length;else this.planLength+=length;
   for(let i=0;i<Math.max(1,Math.ceil(length/14));i++){const arrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),2.4,color,1.15,.85);arrow.traverse(n=>{if(n.material){n.material.depthTest=false;n.material.depthWrite=false;}n.renderOrder=85;});group.add(arrow);part.arrows.push(arrow);}
  }
  this.total=offset;this.distance=0;this.followKey=null;this.playing=this.active&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.leader=new THREE.Group();const ring=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));ring.renderOrder=89;this.leader.add(ring);this.group.add(this.leader);
  $('#route-source').textContent=this.data.measurementNote;$('#route-source-pages').textContent='Fuente: diapositivas '+[...new Set(legs.filter(x=>x.slide).flatMap(x=>x.alsoSlide?[x.alsoSlide,x.slide]:[x.slide]))].sort().join(', ');
  $('#route-measure').textContent=`Plantas: ${metres(this.planLength)} · enlaces estimados: ${metres(this.linkLength)}`;
  this.updatePosition(true);this.scene.dirty=true;
 }
 enable(active){
  if(this.active===active)return;if(active)this.onEnter?.();this.active=active;$('#plan-kind').disabled=active;this.controls.enabled=active&&!this.povMode;this.group.visible=active;document.body.classList.toggle('routes-mode',active);$('#routes-controls').hidden=!active;$('#route-view-control').hidden=!active;$('#route-plan-label').hidden=!active;$('#routes-tab').setAttribute('aria-pressed',String(active));
  $('#pov-panel h2').textContent=active?'Vista 3D · estación completa':'Vista 3D';$('#pov-panel .view-heading p').textContent=active?'Recorridos · todos los modelos en transparencia':'Vista POV solo activa para cámaras Fixed';
  this.setTransparency(active);if(active){this.setPov(this.family.id==='r1');$('#routes-controls').scrollTop=0;this.scene.fullStation=false;this.fit();this.choosePath();}else{this.video.setVisible(false);this.playing=false;this.plan.routeLayer?.remove();delete document.body.dataset.routePose;this.onExit();}
  this.scene.dirty=true;
 }
 setPov(enabled){
  this.povMode=enabled;this.controls.enabled=this.active&&!enabled;$('#route-view').value=enabled?'pov':'3d';
  this.videoMode=this.family?.id==='r1'&&enabled;this.video.setVisible(this.active&&this.videoMode);
  if(this.active){$('#pov-panel h2').textContent=enabled?'POV · '+this.family.label:'Vista 3D · estación completa';$('#pov-panel .view-heading p').textContent=this.videoMode?'Video del recorrido · reproducción independiente del trazado':enabled?'Observador a 1,60 m · posición sincronizada con plantas':'Recorridos · todos los modelos en transparencia';}
  this.scene.dirty=true;
 }
 renderPov(view){
  const s=this.scene;this.povMaterials??=new Map();const originals=[];
  for(const group of [s.staticGroup,s.cameraGroup])group.traverse(n=>{if(!n.material)return;originals.push([n,n.material]);const copy=m=>{if(!this.povMaterials.has(m)){const c=m.clone();Object.assign(c,this.materials.get(m));c.clippingPlanes=[];this.povMaterials.set(m,c);}return this.povMaterials.get(m);};n.material=Array.isArray(n.material)?n.material.map(copy):copy(n.material);});
  for(const p of this.parts){p.group.visible=p.leg.schematic?p===this.current:p.leg.level===this.current?.leg.level;p.group.traverse(n=>{if(n.material)n.material.depthTest=true;});for(const a of p.arrows){a.setLength(1.2,.6,.4);a.visible=a.position.distanceTo(this.povCamera.position)>2.5;}for(const n of p.group.children)if(n.isMesh)n.scale.set(n.renderOrder===78?1.8:1,1,n.renderOrder===78?1.8:1);}
  this.leader.visible=false;view(s.pov,this.povCamera);
  for(const [n,m] of originals)n.material=m;
  for(const p of this.parts){p.group.traverse(n=>{if(n.material)n.material.depthTest=false;});for(const a of p.arrows)a.visible=true;}
 }
 setTransparency(on){for(const group of [this.scene.staticGroup,this.scene.cameraGroup])group.traverse(n=>{if(!n.material)return;for(const m of Array.isArray(n.material)?n.material:[n.material]){if(!this.materials.has(m))this.materials.set(m,{transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite});if(on){m.transparent=true;m.opacity=this.opacity;m.depthWrite=false;}else Object.assign(m,this.materials.get(m));m.needsUpdate=true;}});}
 fit(){
  const box=new THREE.Box3();for(const mesh of this.scene.staticMeshes){const b=mesh.userData.bounds;if(b){box.expandByPoint(new THREE.Vector3(...b.min));box.expandByPoint(new THREE.Vector3(...b.max));}}
  if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),back=new THREE.Vector3(.8,.9,1).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),back).normalize(),up=new THREE.Vector3().crossVectors(back,right),rect=this.scene.pov.getBoundingClientRect(),tv=Math.tan(42*Math.PI/360),th=tv*Math.max(.1,rect.width/rect.height);let distance=40;
  for(const mesh of this.scene.staticMeshes){const b=mesh.userData.bounds;if(!b)continue;for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){const v=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(v.dot(right))/th+v.dot(back),Math.abs(v.dot(up))/tv+v.dot(back));}}
  document.body.dataset.routeFrame=JSON.stringify({min:box.min.toArray(),max:box.max.toArray(),distance,width:rect.width,height:rect.height});this.camera.far=Math.max(5000,distance*4);this.camera.position.copy(center).addScaledVector(back,distance*1.08);this.controls.target.copy(center);this.controls.update();this.scene.dirty=true;
 }
 sample(part,distance){let i=1;while(i<part.lengths.length-1&&part.lengths[i]<distance)i++;const start=part.points[i-1],end=part.points[i],len=part.lengths[i]-part.lengths[i-1],t=len?Math.max(0,Math.min(1,(distance-part.lengths[i-1])/len)):0;return {point:start.clone().lerp(end,t),direction:end.clone().sub(start).normalize(),sourceY:part.leg.sourcePoints?part.leg.sourcePoints[i-1][1]*(1-t)+part.leg.sourcePoints[i][1]*t:null};}
 tick(time){if(!this.active||document.hidden){this.last=time;return;}const dt=Math.min(.1,(time-(this.last??time))/1000);this.last=time;if(this.playing){this.distance=Math.min(this.total,this.distance+dt*this.speed);if(this.distance===this.total)this.playing=false;this.updatePosition();this.scene.dirty=true;}}
 updatePosition(force=false){
  if(!this.parts.length)return;const part=this.parts.find(p=>this.distance<p.offset+p.length)||this.parts.at(-1);this.current=part;this.currentSample=this.sample(part,this.distance-part.offset);this.leader.position.copy(this.currentSample.point);
  const direction=this.currentSample.direction.clone();direction.y=0;if(direction.lengthSq()<.001)direction.set(0,0,-1);direction.normalize();
  this.povCamera.position.copy(this.currentSample.point).add(new THREE.Vector3(0,1.28,0));this.povCamera.lookAt(this.povCamera.position.clone().add(direction));
  if(this.active)document.body.dataset.routePose=JSON.stringify({path:$('#route-path').value,level:part.leg.level||null,schematic:!!part.leg.schematic,distance:this.distance,point:this.currentSample.point.toArray(),eye:this.povCamera.position.toArray(),direction:direction.toArray()});
  for(const p of this.parts)for(let i=0;i<p.arrows.length;i++){const s=this.sample(p,(this.distance+i*14)%p.length);p.arrows[i].position.copy(s.point);p.arrows[i].setDirection(s.direction);}
  if(this.active&&$('#route-follow').checked&&!part.leg.schematic){const page=({A:1,I:3,P:5,B:7}[part.leg.level]);const key=part.leg.level+':'+page;if(force||key!==this.followKey){this.followKey=key;this.setContext(part.leg.level,page);this.focusLevel();}}
  this.updateText();this.updatePlanLeader();this.scene.dirty=true;
 }
 updateText(){
  $('#route-plan-label').textContent=this.family.label;$('#route-plan-label').style.borderColor=this.family.color;
  const text=`${metres(this.distance)} / ${metres(this.total)}`;$('#route-distance').textContent=text;$('#route-live-distance').textContent=text;$('#route-live-label').textContent=this.family.label+(this.current?.leg.schematic?' · enlace esquemático':'');
  $('#route-progress').value=this.total?Math.round(this.distance/this.total*1000):0;$('#route-play').textContent=this.playing?'Ⅱ Pausar trazado':'▶ Reproducir trazado';$('#route-play').setAttribute('aria-pressed',String(this.playing));$('#route-current').textContent=this.current?.leg.schematic?'Enlace esquemático · '+this.current.leg.fromLevel+' → '+this.current.leg.toLevel:this.current?.leg.label||'';
 }
 onSheet(part,y){if(this.plan.page.unified)return true;const boundary={14:480,16:460,17:400}[part.leg.slide];return this.plan.page.part==='A'?y<=boundary:y>=boundary;}
 clippedSegments(part){if(this.plan.page.unified)return part.points.slice(1).map((p,i)=>[part.points[i],p]);
  const result=[],boundary={14:480,16:460,17:400}[part.leg.slide];
  for(let i=1;i<part.points.length;i++){
   let a=part.points[i-1],b=part.points[i];const ya=part.leg.sourcePoints[i-1][1],yb=part.leg.sourcePoints[i][1],insideA=this.onSheet(part,ya),insideB=this.onSheet(part,yb);
   if(!insideA&&!insideB)continue;
   if(insideA!==insideB){const crossing=a.clone().lerp(b,(boundary-ya)/(yb-ya));if(insideA)b=crossing;else a=crossing;}
   result.push([a,b]);
  }return result;
 }
 drawPlan(){
  this.plan.routeLayer?.remove();this.planLeader=null;if(!this.active||!this.plan.layer||this.plan.kind!=='architecture')return;
  const layer=svg('g',{'aria-label':this.family.label+' · recorrido sobre planta','pointer-events':'none'});this.plan.routeLayer=layer;this.plan.layer.append(layer);const m=this.plan.reg.matrix;
  this.project=p=>[m[0][0]*p.x-m[0][1]*p.z+m[0][2],m[1][0]*p.x-m[1][1]*p.z+m[1][2]];
  for(const p of this.parts){if(p.leg.schematic||p.leg.level!==this.plan.level.id)continue;const d=this.clippedSegments(p).map(([a,b])=>'M'+this.project(a).join(',')+'L'+this.project(b).join(',')).join(' ');if(!d)continue;layer.append(svg('path',{d,fill:'none',stroke:'#fff','stroke-width':7,'vector-effect':'non-scaling-stroke'}),svg('path',{d,fill:'none',stroke:this.family.color,'stroke-width':3.5,'vector-effect':'non-scaling-stroke'}));
   for(let dist=0;dist<p.length;dist+=12){const s=this.sample(p,dist);if(!this.onSheet(p,s.sourceY))continue;const a=this.project(s.point),b=this.project(s.point.clone().add(s.direction)),angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;layer.append(svg('path',{d:'M-20,-12 L0,0 L-20,12',transform:`translate(${a}) rotate(${angle})`,fill:'none',stroke:this.family.color,'stroke-width':3,'vector-effect':'non-scaling-stroke'}));}
  }
  this.planLeader=svg('g');this.planLeader.append(svg('path',{d:'M30,0 L-20,-20 L-10,0 L-20,20 Z',fill:this.family.color,stroke:'#fff','stroke-width':2,'vector-effect':'non-scaling-stroke'}));layer.append(this.planLeader);this.updatePlanLeader();
 }
 updatePlanLeader(){if(!this.planLeader||!this.current)return;const visible=!this.current.leg.schematic&&this.current.leg.level===this.plan.level.id&&this.onSheet(this.current,this.currentSample.sourceY);this.planLeader.style.display=visible?'':'none';if(!visible)return;const s=this.currentSample,a=this.project(s.point),b=this.project(s.point.clone().add(s.direction));this.planLeader.setAttribute('transform',`translate(${a}) rotate(${Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI})`);}
 sizeArrows(camera,element){const height=Math.max(1,element.clientHeight),scale=2*Math.tan(camera.fov*Math.PI/360)/height;for(const p of this.parts){for(const arrow of p.arrows){const length=Math.max(1.8,Math.min(9,camera.position.distanceTo(arrow.position)*scale*12));arrow.setLength(length,length*.5,length*.38);}const width=Math.max(1,Math.min(5,camera.position.distanceTo(p.points[0])*scale*1.3/.16));for(const n of p.group.children)if(n.isMesh)n.scale.set(width*(n.renderOrder===78?1.8:1),1,width*(n.renderOrder===78?1.8:1));}this.leader.scale.setScalar(Math.max(1,Math.min(4,camera.position.distanceTo(this.leader.position)*scale*3/.65)));}
 cachedView(view,element,camera,key){
  const s=this.scene,r=s.renderer,rect=element.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
  const w=Math.max(1,Math.round(rect.width*r.getPixelRatio())),h=Math.max(1,Math.round(rect.height*r.getPixelRatio()));
  const state=JSON.stringify([key,w,h,camera.position.toArray(),camera.quaternion.toArray(),this.opacity,s.showMarkers,s.spaces?.filter,s.spaces?.selected,s.spaces?.enabled]);let c=this.caches.get(element);
  if(!c){const target=new THREE.WebGLRenderTarget(w,h);target.texture.colorSpace=THREE.SRGBColorSpace;const scene=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:target.texture,depthTest:false,depthWrite:false})),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);scene.add(quad);c={target,scene,camera};this.caches.set(element,c);}
  if(c.state!==state){
   c.target.setSize(w,h);this.group.visible=false;camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();r.setRenderTarget(c.target);r.setScissorTest(false);r.setViewport(0,0,w,h);r.setClearColor(0x08141e,1);r.clear();r.render(s.scene,camera);r.setRenderTarget(null);r.setScissorTest(true);c.state=state;this.group.visible=true;
  }
  view(element,c.camera,null,null,c.scene);this.sizeArrows(camera,element);
  const spacesVisible=s.spaces?.group.visible,markersVisible=s.markerGroup.visible;s.staticGroup.visible=s.cameraGroup.visible=s.markerGroup.visible=false;if(s.spaces)s.spaces.group.visible=false;
  const bg=s.scene.background;s.scene.background=null;view(element,camera,null,null,s.scene,false);s.scene.background=bg;s.staticGroup.visible=s.cameraGroup.visible=true;s.markerGroup.visible=markersVisible;if(s.spaces)s.spaces.group.visible=spacesVisible;
 }
 focusLevel(){const box=new THREE.Box3();for(const p of this.parts)if(!p.leg.schematic&&p.leg.level===this.scene.level.id)for(const v of p.points)box.expandByPoint(v);if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),rect=this.scene.axon.getBoundingClientRect(),distance=Math.max(55,size.length()*1.4,size.length()/Math.max(.4,rect.width/rect.height));this.scene.controls.target.copy(center);this.scene.axonCamera.position.copy(center).addScaledVector(new THREE.Vector3(.8,1,1).normalize(),distance);this.scene.controls.update();}
 renderViews(view,expanded){
  const rect=this.scene.pov.getBoundingClientRect(),hud=$('#route-live');hud.style.left=(rect.left+10)+'px';hud.style.top=(rect.bottom-hud.offsetHeight-10)+'px';hud.style.maxWidth=Math.max(100,rect.width-20)+'px';hud.style.visibility=this.videoMode||(expanded&&expanded!=='pov-panel')?'hidden':'visible';this.video.layout(rect,expanded);const s=this.scene;s.cone.visible=s.observer.visible=s.activeRing.visible=s.markerGroup.visible=false;s.spaces?.beforePov();s.setModelClipping([]);for(const mesh of s.staticMeshes)mesh.visible=true;for(const node of s.cameraNodes)node.visible=true;
  for(const p of this.parts)p.group.visible=true;this.leader.visible=true;this.group.visible=true;
  if(!expanded||expanded==='pov-panel'){
   if(this.videoMode){/* Native video occupies this viewport. */}
   else if(this.povMode)this.renderPov(view);
   else this.cachedView(view,s.pov,this.camera,'whole');
  }
  s.fullStation=false;const floor=s.level.cutMin-2550,ceiling=s.level.cutMax-2550;s.setModelClipping([new THREE.Plane(new THREE.Vector3(0,-1,0),ceiling),new THREE.Plane(new THREE.Vector3(0,1,0),-floor)]);
  for(const mesh of s.staticMeshes){const b=mesh.userData.bounds;mesh.visible=!b||b.max[1]>=floor&&b.min[1]<=ceiling;}
  for(const p of this.parts)p.group.visible=!p.leg.schematic&&p.leg.level===s.level.id;this.leader.visible=!this.current?.leg.schematic&&this.current?.leg.level===s.level.id;
  s.markerGroup.visible=s.showMarkers!==false;for(const marker of s.markers)marker.visible=marker.userData.record.ifcStorey===s.level.ifc;
  s.spaces?.beforeAxon();if(!expanded||expanded==='axon-panel')this.cachedView(view,s.axon,s.axonCamera,s.level.id);s.spaces?.afterAxon(expanded);s.setModelClipping([]);s.renderer.setScissorTest(false);
 }
}
