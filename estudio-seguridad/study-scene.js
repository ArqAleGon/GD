import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
export const ORIGIN=new THREE.Vector3(96310,2550,-100150);
export function fixedPose(record,yaw=0,tilt=0){
 const m=new THREE.Matrix4().fromArray(record.placementMatrixIfcColumnMajor);
 const convert=v=>new THREE.Vector3(v.x,v.z,-v.y);
 const eye=convert(new THREE.Vector3(record.ifcTypeName.includes('FIXED-CAMERA')?-.246:0,0,0).applyMatrix4(m)).sub(ORIGIN);
 const direction=convert(new THREE.Vector3(-1,0,0).transformDirection(m));
 const up=convert(new THREE.Vector3(0,0,1).transformDirection(m));
 direction.applyAxisAngle(up,THREE.MathUtils.degToRad(yaw));
 const right=new THREE.Vector3().crossVectors(direction,up).normalize();
 direction.applyAxisAngle(right,THREE.MathUtils.degToRad(tilt));
 return {eye,direction,up};
}
export class StudyScene{
 constructor({axon,pov,onSelect,onProgress}){
  Object.assign(this,{axon,pov,onSelect,onProgress});this.dirty=true;this.ready=false;this.selected=null;this.generation=0;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#08141e');
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});this.renderer.domElement.className='render-surface';this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);document.body.append(this.renderer.domElement);
  this.renderer.autoClear=false;this.renderer.localClippingEnabled=true;
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x8196a6,2.5));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(80,180,120);this.scene.add(sun);
  this.staticGroup=new THREE.Group();this.cameraGroup=new THREE.Group();this.cameraGroup.position.copy(ORIGIN).negate();this.markerGroup=new THREE.Group();this.scene.add(this.staticGroup,this.cameraGroup,this.markerGroup);
  this.axonCamera=new THREE.PerspectiveCamera(42,1,.1,1500);this.axonCamera.position.set(150,150,170);
  this.povCamera=new THREE.PerspectiveCamera(58.7,16/9,.04,1000);
  this.cubeTarget=new THREE.WebGLCubeRenderTarget(512);this.cubeCamera=new THREE.CubeCamera(.04,1000,this.cubeTarget);this.scene.add(this.cubeCamera);
  this.fishScene=new THREE.Scene();this.fishCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  this.fishMaterial=new THREE.ShaderMaterial({uniforms:{cube:{value:this.cubeTarget.texture},forward:{value:new THREE.Vector3()},right:{value:new THREE.Vector3()},up:{value:new THREE.Vector3()},angle:{value:Math.PI*91/180}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform samplerCube cube;uniform vec3 forward,right,up;uniform float angle;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.){gl_FragColor=vec4(.025,.06,.08,1.);return;}float a=r*angle;vec2 n=r>0.?p/r:vec2(0.);vec3 ray=cos(a)*forward+sin(a)*(n.x*right+n.y*up);gl_FragColor=textureCube(cube,ray);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  this.fishScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.fishMaterial));
  this.controls=new OrbitControls(this.axonCamera,axon);this.controls.target.set(0,15,0);this.controls.update();this.controls.addEventListener('change',()=>this.dirty=true);
  this.raycaster=new THREE.Raycaster();this.cameraNodes=[];this.markers=[];this.staticMeshes=[];
  const markerGeometry=new THREE.SphereGeometry(.8,12,8);
  this.markerGeometry=markerGeometry;
  let start;
  axon.addEventListener('pointerdown',e=>start=[e.clientX,e.clientY]);
  axon.addEventListener('click',e=>{if(e.target.closest('.space-label')||this.showMarkers===false||!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;const r=axon.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;this.raycaster.setFromCamera(new THREE.Vector2(x/r.width*2-1,-y/r.height*2+1),this.axonCamera);const candidates=this.markers.filter(m=>m.visible);let target=this.raycaster.intersectObjects(candidates,false)[0]?.object;
   if(!target){let nearest=11;for(const marker of candidates){const p=marker.getWorldPosition(new THREE.Vector3()).project(this.axonCamera);if(p.z<-1||p.z>1)continue;const distance=Math.hypot((p.x+1)*r.width/2-x,(1-p.y)*r.height/2-y);if(distance<nearest){nearest=distance;target=marker;}}}
   if(target)this.onSelect(target.userData.record.ifcGlobalId);
  });
  this.cone=new THREE.Group();this.scene.add(this.cone);
  this.observer=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:0xf3d189});const head=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),mat);head.position.y=1.55;const body=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.2,10),mat);body.position.y=.8;this.observer.add(head,body);this.scene.add(this.observer);this.observer.visible=false;
  this.activeRing=new THREE.Mesh(new THREE.SphereGeometry(1.15,12,8),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,depthTest:false}));this.activeRing.renderOrder=61;this.scene.add(this.activeRing);this.activeRing.visible=false;
  new ResizeObserver(()=>{this.dirty=true;}).observe(axon);new ResizeObserver(()=>this.dirty=true).observe(pov);
  window.addEventListener('resize',()=>{this.renderer.setSize(innerWidth,innerHeight);this.dirty=true;});window.addEventListener('scroll',()=>this.dirty=true,true);
  this.renderer.setAnimationLoop(()=>{if(this.dirty){this.dirty=false;this.render();}});
 }
 async binary(url){const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
 async load(manifest,records,types){
  const token=++this.generation;this.records=records;this.types=types;this.ready=false;
  const colorFor=r=>types[Object.keys(types).find(k=>(r.ifcTypeName||'').includes(types[k].ifcFamilyToken))].color;
  const loader=new GLTFLoader();const cameraManifest=await (await fetch('./assets/models/e09-ins/manifest.json')).json();
  const cameraMaterials=Object.fromEntries(Object.entries(types).map(([k,t])=>[k,new THREE.MeshStandardMaterial({color:t.color,roughness:.7})]));
  const total=manifest.files.length+cameraManifest.files.length+(manifest.additionalModels||[]).reduce((n,p)=>n+p.files.length,0);
  let cameraDone=0;this.onProgress(0,total);
  for(const file of cameraManifest.files){
   const gltf=await loader.parseAsync(await this.binary('./assets/models/e09-ins/'+file.file),'');
   const keep=[];gltf.scene.traverse(n=>{if(n.userData.ifcGlobalId&&n.userData.isCamera)keep.push(n);});
   for(const n of keep){gltf.scene.attach(n);this.cameraGroup.add(n);this.cameraNodes.push(n);const type=Object.keys(types).find(k=>(n.userData.ifcTypeName||'').includes(types[k].ifcFamilyToken));n.traverse(mesh=>{if(mesh.isMesh)mesh.material=cameraMaterials[type];});}
   // Remaining installation meshes are supplied by the batched static package.
   gltf.scene.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const mat of (Array.isArray(n.material)?n.material:[n.material]))mat.dispose();}});
   this.onProgress(++cameraDone,total);
  }
  for(const record of records){const mat=new THREE.MeshBasicMaterial({color:colorFor(record),transparent:true,depthTest:false});const marker=new THREE.Mesh(this.markerGeometry,mat);marker.position.fromArray(record.positionGltfMetres).sub(ORIGIN);marker.userData.record=record;marker.renderOrder=60;this.markerGroup.add(marker);this.markers.push(marker);}
  let next=0,done=0;
  const worker=async()=>{while(next<manifest.files.length){const file=manifest.files[next++];const buffer=await this.binary('./assets/models/e09-study/'+file.file);if(token!==this.generation)return;
   const header=new Uint32Array(buffer,0,2),nv=header[0],ni=header[1];if(buffer.byteLength!==8+nv*24+ni*4)throw Error('Paquete geométrico incompleto');
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,8,nv*3),3));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(buffer,8+nv*12,nv*3),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,8+nv*24,ni),1));
   let object;
   if(file.mode===1)object=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:file.opacity<1,opacity:file.opacity}));
   else{geometry.computeVertexNormals();object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0,side:THREE.DoubleSide,transparent:file.opacity<1,opacity:file.opacity,depthWrite:file.opacity>=1}));}
   geometry.computeBoundingSphere();object.userData.package=file.package;object.userData.bounds=file.bounds;this.staticGroup.add(object);this.staticMeshes.push(object);done++;this.onProgress(done+cameraDone,total);this.dirty=true;
   await new Promise(resolve=>setTimeout(resolve,0));
  }};
  await Promise.all([worker(),worker(),worker()]);if(token!==this.generation)return;
  this.brtCounts={};
  for(const pkg of manifest.additionalModels||[]){const identities=new Set();
   for(const file of pkg.files){
    const gltf=await loader.parseAsync(await this.binary(`./assets/models/${pkg.package}/${file.file}`),'');if(token!==this.generation)return;
    gltf.scene.updateMatrixWorld(true);const groups=new Map();
    gltf.scene.traverse(mesh=>{if(!mesh.isMesh)return;let owner=mesh;while(owner&&!owner.userData.ifcGlobalId)owner=owner.parent;const metadata=owner?.userData;if(!metadata?.ifcGlobalId)throw Error('Pieza BRT sin identidad IFC');if(metadata.ifcType==='IfcOpeningElement')return;
     identities.add(metadata.ifcGlobalId);const matrix=mesh.matrixWorld.clone();matrix.elements[12]-=ORIGIN.x;matrix.elements[13]-=ORIGIN.y;matrix.elements[14]-=ORIGIN.z;
     const key=mesh.geometry.uuid+':'+mesh.material.uuid+':'+metadata.ifcType;let group=groups.get(key);if(!group){group={geometry:mesh.geometry,material:mesh.material,items:[]};groups.set(key,group);}group.items.push({matrix,metadata});
    });
    for(const group of groups.values()){
     const object=new THREE.InstancedMesh(group.geometry,group.material,group.items.length),bounds=new THREE.Box3();group.geometry.computeBoundingBox();
     group.items.forEach((item,i)=>{object.setMatrixAt(i,item.matrix);bounds.union(group.geometry.boundingBox.clone().applyMatrix4(item.matrix));});object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();
     object.userData={package:pkg.package,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},instanceRecords:group.items.map(item=>({...item.metadata,sourceQualifiedId:pkg.source+'::'+item.metadata.ifcGlobalId}))};this.staticGroup.add(object);this.staticMeshes.push(object);
    }
    done++;this.onProgress(done+cameraDone,total);this.dirty=true;await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(identities.size!==pkg.renderableElements)throw Error(`Cobertura BRT incompleta: ${pkg.package} ${identities.size}/${pkg.renderableElements}`);
   this.brtCounts[pkg.package]=identities.size;
  }
  document.body.dataset.brtElements=String(Object.values(this.brtCounts).reduce((a,b)=>a+b,0));this.ready=true;this.dirty=true;
 }
 setLevel(level){this.level=level;this.filter();this.frame();}
 filter(){if(!this.level)return;for(const m of this.markers)m.visible=m.userData.record.ifcStorey===this.level.ifc;for(const n of this.cameraNodes)n.visible=n.userData.ifcStorey===this.level.ifc;for(const mesh of this.staticMeshes)mesh.visible=(mesh.userData.package!=='e09-ins'||this.installations!==false)&&(!mesh.userData.package.startsWith('e09-brt-')||this.showBrt!==false);this.dirty=true;}
 frame(){const visible=this.records?.filter(r=>r.ifcStorey===this.level?.ifc)||[];if(!visible.length)return;const box=new THREE.Box3();for(const r of visible)box.expandByPoint(new THREE.Vector3().fromArray(r.positionGltfMetres).sub(ORIGIN));
  const floor=this.level.cutMin-ORIGIN.y,ceiling=this.level.cutMax-ORIGIN.y;
  for(const mesh of this.staticMeshes){const b=mesh.userData.bounds;if(!b||!mesh.visible||b.max[1]<floor||b.min[1]>ceiling)continue;box.expandByPoint(new THREE.Vector3(b.min[0],Math.max(b.min[1],floor),b.min[2]));box.expandByPoint(new THREE.Vector3(b.max[0],Math.min(b.max[1],ceiling),b.max[2]));}
  const center=box.getCenter(new THREE.Vector3()),back=new THREE.Vector3(.8,.9,1).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),back).normalize(),up=new THREE.Vector3().crossVectors(back,right),rect=this.axon.getBoundingClientRect(),tanV=Math.tan(THREE.MathUtils.degToRad(this.axonCamera.fov/2)),tanH=tanV*Math.max(.1,rect.width/rect.height);let distance=40;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(back),Math.abs(v.dot(up))/tanV+v.dot(back));}
  this.controls.target.copy(center);this.axonCamera.position.copy(center).addScaledVector(back,distance*1.12);this.controls.update();this.dirty=true;
 }
 focusSelected(){if(!this.selected)return;const center=new THREE.Vector3().fromArray(this.selected.positionGltfMetres).sub(ORIGIN);this.controls.target.copy(center);this.axonCamera.position.copy(center).add(new THREE.Vector3(26,32,34));this.controls.update();this.dirty=true;}
 select(record,settings){this.selected=record;this.settings=settings;this.updateOptics();this.dirty=true;}
 updateOptics(){
  const record=this.selected;this.activeRing.visible=!!record;
  if(record)this.activeRing.position.fromArray(record.positionGltfMetres).sub(ORIGIN);
  this.cone.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});this.cone.clear();this.observer.visible=false;this.isFixed=!!record&&(record.ifcTypeName.includes('FIXED-CAMERA')||!!this.settings.profile);
  if(!this.isFixed)return;
  const {eye,direction,up}=fixedPose(record,this.settings.yaw,this.settings.tilt);this.pose={eye,direction,up};this.povCamera.position.copy(eye);this.povCamera.up.copy(up);this.povCamera.lookAt(eye.clone().add(direction));
  const o=this.settings.optics;this.mode=o?.mode||'perspective';this.imageAspect=o?o.width/o.height:16/9;
  const t=o&&o.fov!==o.minFov?(this.settings.fov-o.minFov)/(o.fov-o.minFov):1;
  this.verticalFov=o?(o.minVfov??o.vfov)+(o.vfov-(o.minVfov??o.vfov))*t:THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(this.settings.fov/2))/(16/9)));
  this.povCamera.fov=this.verticalFov;this.povCamera.updateProjectionMatrix();
  const d=this.settings.range;this.sensorCameras=[];
  for(let sensor=0;sensor<(this.mode==='multi'?4:1);sensor++){
   const dir=direction.clone().applyAxisAngle(up,sensor*Math.PI/2),right=new THREE.Vector3().crossVectors(dir,up).normalize(),vertical=new THREE.Vector3().crossVectors(right,dir).normalize();
   const camera=this.povCamera.clone();camera.lookAt(eye.clone().add(dir));this.sensorCameras.push(camera);
   const faces=[],rim=[],center=eye.clone().addScaledVector(dir,d),halfW=d*Math.tan(THREE.MathUtils.degToRad(this.settings.fov/2)),halfH=d*Math.tan(THREE.MathUtils.degToRad(this.verticalFov/2));
   if(this.mode==='fisheye'){
    // Spherical sector is necessary above 180 degrees: an ordinary cone cannot represent it.
    const point=(r,a)=>eye.clone().addScaledVector(dir,d*Math.cos(r)).addScaledVector(right,d*Math.sin(r)*Math.cos(a)).addScaledVector(vertical,d*Math.sin(r)*Math.sin(a));
    const limit=THREE.MathUtils.degToRad(91);for(let j=0;j<16;j++)for(let i=0;i<64;i++){const a=i*2*Math.PI/64,b=(i+1)*2*Math.PI/64,r=j*limit/16,s=(j+1)*limit/16;for(const v of [point(r,a),point(s,a),point(s,b),point(r,a),point(s,b),point(r,b)])faces.push(...v.toArray());}
    for(let i=0;i<64;i++){const a=point(limit,i*2*Math.PI/64),b=point(limit,(i+1)*2*Math.PI/64);faces.push(...eye.toArray(),...a.toArray(),...b.toArray());rim.push(a,b);}
   }else{for(let i=0;i<64;i++){const a=i*2*Math.PI/64,b=(i+1)*2*Math.PI/64,p=center.clone().addScaledVector(right,halfW*Math.cos(a)).addScaledVector(vertical,halfH*Math.sin(a)),q=center.clone().addScaledVector(right,halfW*Math.cos(b)).addScaledVector(vertical,halfH*Math.sin(b));faces.push(...eye.toArray(),...p.toArray(),...q.toArray(),...center.toArray(),...q.toArray(),...p.toArray());rim.push(p,q);}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(faces,3));const material=new THREE.MeshBasicMaterial({color:0xe59a00,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false});material.forceSinglePass=true;this.cone.add(new THREE.Mesh(geo,material));this.cone.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rim),new THREE.LineBasicMaterial({color:0xffd36c,transparent:true,opacity:.8})));
  }
  const right=new THREE.Vector3().crossVectors(direction,up).normalize();this.fishMaterial.uniforms.forward.value.copy(direction);this.fishMaterial.uniforms.right.value.copy(right);this.fishMaterial.uniforms.up.value.crossVectors(right,direction).normalize();this.cubeCamera.position.copy(eye);
  const target=eye.clone().addScaledVector(direction,8);target.y=record.storeyGlobalElevationMetres-ORIGIN.y;this.observer.position.copy(target);this.observer.visible=true;this.dirty=true;
 }
 setModelClipping(planes){for(const group of [this.staticGroup,this.cameraGroup])group.traverse(n=>{if(n.material)for(const m of (Array.isArray(n.material)?n.material:[n.material]))m.clippingPlanes=planes;});}
 render(){
  const r=this.renderer;r.setScissorTest(false);r.setClearColor(0x000000,0);r.clear();if(document.querySelector('#entry-dialog').open)return;
  const expanded=document.querySelector('.view.is-expanded')?.id;
  r.domElement.style.zIndex=expanded&&expanded!=='plan-panel'?'6':'2';if(expanded==='plan-panel'){this.spaces?.beforePov();return;}r.setScissorTest(true);
  const view=(element,camera,aspect,sub=null,renderScene=this.scene)=>{let box=element.getBoundingClientRect();if(sub){box={left:box.left+sub[0]*box.width,top:box.top+sub[1]*box.height,width:box.width*sub[2],height:box.height*sub[3],bottom:box.bottom};}if(box.width<=0||box.height<=0||box.bottom<0||box.top>innerHeight)return;let w=box.width,h=box.height,x=box.left,y=box.top;if(aspect){if(w/h>aspect){const nw=h*aspect;x+=(w-nw)/2;w=nw;}else{const nh=w/aspect;y+=(h-nh)/2;h=nh;}}camera.aspect=w/h;camera.updateProjectionMatrix();if(camera!==this.axonCamera&&camera.isPerspectiveCamera){camera.projectionMatrix.elements[0]=1/Math.tan(THREE.MathUtils.degToRad(this.settings.fov/2));camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}r.setViewport(x,innerHeight-y-h,w,h);r.setScissor(Math.max(0,x),Math.max(0,innerHeight-y-h),Math.min(w,innerWidth-x),Math.min(h,innerHeight-y));r.setClearColor(0x08141e,1);r.clear();r.render(renderScene,camera);};
  this.filter();this.dirty=false;
  this.cone.visible=false;this.markerGroup.visible=false;this.activeRing.visible=false;this.observer.visible=false;this.spaces?.beforePov();
  r.clippingPlanes=[];this.setModelClipping([]);for(const n of this.cameraNodes)n.visible=n.userData.ifcGlobalId!==this.selected?.ifcGlobalId;
  if(this.ready&&this.isFixed&&(!expanded||expanded==='pov-panel')){
   if(this.mode==='fisheye'){r.setScissorTest(false);r.autoClear=true;this.cubeCamera.update(r,this.scene);r.autoClear=false;r.setScissorTest(true);view(this.pov,this.fishCamera,1,null,this.fishScene);}
   else if(this.mode==='multi')for(let i=0;i<4;i++)view(this.pov,this.sensorCameras[i],this.imageAspect,[(i%2)/2,Math.floor(i/2)/2,.5,.5]);
   else view(this.pov,this.povCamera,this.imageAspect);
  }
  this.filter();this.dirty=false;this.markerGroup.visible=this.showMarkers!==false;this.activeRing.visible=!!this.selected&&this.showMarkers!==false;this.cone.visible=this.isFixed&&this.showCone!==false;this.observer.visible=this.isFixed;
  if(this.level){this.setModelClipping([new THREE.Plane(new THREE.Vector3(0,-1,0),this.level.cutMax-ORIGIN.y),new THREE.Plane(new THREE.Vector3(0,1,0),-(this.level.cutMin-ORIGIN.y))]);for(const mesh of this.staticMeshes){const b=mesh.userData.bounds;mesh.visible=mesh.visible&&b.max[1]>=this.level.cutMin-ORIGIN.y&&b.min[1]<=this.level.cutMax-ORIGIN.y;}}
  this.spaces?.beforeAxon();if(!expanded||expanded==='axon-panel')view(this.axon,this.axonCamera);this.spaces?.afterAxon(expanded);r.clippingPlanes=[];r.setScissorTest(false);
 }
}
