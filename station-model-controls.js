import * as THREE from 'three';
import {batchIfcRenderGeometry} from './ifc-render-batches.js?v=20261005-station-management';
import {stationLevelProfile} from './station-levels.js?v=20261005-station-management';

export function createStationModelControls(root,entry,code,originalBounds){
 const scale=.06,datum=.24,height=m=>datum+m*scale,profile=stationLevelProfile(code,entry,originalBounds),{e,keys,cuts}=profile;
 const bands=[],pickables=[],ownedMaterials=new Set();let selected='all',exploded=false;
 entry.group.updateMatrixWorld(true);
 const sources=[];entry.group.traverse(object=>{if((object.isMesh||object.isLine)&&object.visible)sources.push(object);});
 const sourceBounds=new Map(sources.map(mesh=>{if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();return [mesh,mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)];}));
 for(let i=0;i<keys.length;i++){
  const group=new THREE.Group();group.name='Nivel IFC · '+keys[i];root.add(group);
  const band={key:keys[i],group,min:cuts[i],max:cuts[i+1],offset:0,planes:[new THREE.Plane(new THREE.Vector3(0,1,0),-cuts[i]),new THREE.Plane(new THREE.Vector3(0,-1,0),cuts[i+1])]};bands.push(band);
  const materialCache=new Map();
  const bandMaterial=material=>{if(!materialCache.has(material.uuid)){const clone=material.clone();clone.clippingPlanes=band.planes;clone.clipShadows=true;materialCache.set(material.uuid,clone);ownedMaterials.add(clone);}return materialCache.get(material.uuid);};
  for(const source of sources){
   const bounds=sourceBounds.get(source);if(bounds.max.y<band.min||bounds.min.y>band.max)continue;
   const material=Array.isArray(source.material)?source.material.map(bandMaterial):bandMaterial(source.material);
   const mesh=source.isLine?new THREE.LineSegments(source.geometry,material):new THREE.Mesh(source.geometry,material);
   mesh.name=source.name;mesh.matrixAutoUpdate=false;mesh.matrix.copy(source.matrixWorld);mesh.userData={...source.userData,sharedStationGeometry:true,stationBand:band};
   group.add(mesh);pickables.push(mesh);
  }
  if(profile.native.length)batchIfcRenderGeometry(group);
 }
 sources.forEach(mesh=>mesh.visible=false);
 const archivedPickables=[];
 if(profile.native.length){
  // Keep IFC picking identity outside the per-frame render tree. Rendering
  // batches remain in their floor group and follow its separation offset.
  entry.group.traverse(object=>{object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;});entry.group.removeFromParent();
  for(const mesh of pickables)if(!mesh.visible){
   mesh.userData.stationBaseWorldMatrix=mesh.matrixWorld.clone();mesh.matrixWorldAutoUpdate=false;mesh.removeFromParent();archivedPickables.push(mesh);
  }
 }

 const alarm=new THREE.Group();alarm.name='Alarma y evacuación simuladas · '+code;alarm.visible=false;root.add(alarm);
 const center=originalBounds.getCenter(new THREE.Vector3()),size=originalBounds.getSize(new THREE.Vector3()),longZ=size.z>=size.x;
 const alarmMaterial=new THREE.MeshBasicMaterial({color:'#ff2343',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(size.x,size.z),alarmMaterial);plane.rotation.x=-Math.PI/2;plane.position.set(center.x,0,center.z);alarm.add(plane);
 const green=new THREE.MeshBasicMaterial({color:'#60ffaa',toneMapped:false});
 for(let i=0;i<8;i++){
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.025,.09,3),green);const side=i<4?-1:1,step=(i%4+1)*.1;
  cone.position.set(center.x+(longZ?0:side*size.x*step),.035,center.z+(longZ?side*size.z*step:0));
  if(longZ)cone.rotation.x=side*Math.PI/2;else cone.rotation.z=-side*Math.PI/2;alarm.add(cone);
 }
 function setLevel(level,explode){selected=level==='all'||keys.includes(level)?level:'all';exploded=explode;for(let i=0;i<bands.length;i++){
  const band=bands[i];band.group.visible=selected==='all'||selected===band.key;band.offset=exploded?i*.9:0;band.group.position.y=band.offset;
  band.planes[0].constant=-(band.min+band.offset);band.planes[1].constant=band.max+band.offset;
 }for(const mesh of archivedPickables){mesh.matrixWorld.copy(mesh.userData.stationBaseWorldMatrix);mesh.matrixWorld.elements[13]+=mesh.userData.stationBand.offset;}const band=bands.find(b=>b.key===(selected==='all'?'upper':selected));alarm.position.y=Math.max(height(e.vestibule),band.min+.05)+band.offset;root.updateMatrixWorld(true);if(cameraMarkers.visible)refreshCameras();}
 function visibleBounds(){const box=new THREE.Box3();for(const band of bands)if(band.group.visible){box.expandByPoint(new THREE.Vector3(originalBounds.min.x,Math.max(originalBounds.min.y,band.min)+band.offset,originalBounds.min.z));box.expandByPoint(new THREE.Vector3(originalBounds.max.x,Math.min(originalBounds.max.y,band.max)+band.offset,originalBounds.max.z));}return box;}
 const floorLayouts=new Map();
 function floorCameraPosition(band,index,floor){
  if(!profile.native.length)return null;
  if(!floorLayouts.has(band.key)){
   const floorY=height(floor),candidates=sources.filter(mesh=>{
    const type=mesh.userData.progressObject?.parameters?.['Clase IFC'],b=sourceBounds.get(mesh);
    return ['IfcSlab','IfcCovering','IfcRoof'].includes(type)&&Math.abs(b.max.y-floorY)<.065&&b.max.y-b.min.y<.09;
   }).sort((a,b)=>{const x=sourceBounds.get(a),y=sourceBounds.get(b);return (y.max.x-y.min.x)*(y.max.z-y.min.z)-(x.max.x-x.min.x)*(x.max.z-x.min.z);});
   const source=candidates[0];let layout=null;
   if(source){
    const b=sourceBounds.get(source),position=source.geometry.attributes.position,points=[],v=new THREE.Vector3();let mx=0,mz=0;
    for(let i=0;i<position.count;i++){v.fromBufferAttribute(position,i).applyMatrix4(source.matrixWorld);if(v.y<b.max.y-.012)continue;points.push([v.x,v.z]);mx+=v.x;mz+=v.z;}
    if(points.length>=3){
     mx/=points.length;mz/=points.length;let xx=0,zz=0,xz=0;
     for(const [x,z] of points){xx+=(x-mx)**2;zz+=(z-mz)**2;xz+=(x-mx)*(z-mz);}
     const angle=.5*Math.atan2(2*xz,xx-zz),u=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),w=new THREE.Vector3(-u.z,0,u.x);let u0=Infinity,u1=-Infinity,w0=Infinity,w1=-Infinity;
     for(const [x,z] of points){const a=x*u.x+z*u.z,c=x*w.x+z*w.z;u0=Math.min(u0,a);u1=Math.max(u1,a);w0=Math.min(w0,c);w1=Math.max(w1,c);}
     layout={source,u,w,u0,u1,w0,w1,y:b.max.y};
    }
   }
   floorLayouts.set(band.key,layout);
  }
  const layout=floorLayouts.get(band.key);if(!layout)return null;
  const {source,u,w,u0,u1,w0,w1,y}=layout;
  const a=(u0+u1)/2+(index<2?-1:1)*(u1-u0)*.28,c=(w0+w1)/2+(index%2?-1:1)*(w1-w0)*.18;
  const pos=u.clone().multiplyScalar(a).addScaledVector(w,c);pos.y=y+.2;
  const down=new THREE.Raycaster(pos,new THREE.Vector3(0,-1,0));let hit=down.intersectObject(source,false)[0];
  if(!hit){
   const geometry=source.geometry,indices=geometry.index,p=geometry.attributes.position,count=indices?.count??p.count,v=new THREE.Vector3(),v2=new THREE.Vector3();
   for(let j=0;j<count;j+=3){
    const i=(Math.floor(index*count/12)*3+j)%count;if(i+2>=count)continue;v.set(0,0,0);
    for(let n=0;n<3;n++)v.add(v2.fromBufferAttribute(p,indices?indices.getX(i+n):i+n).applyMatrix4(source.matrixWorld));v.multiplyScalar(1/3);
    if(Math.abs(v.y-y)>.012)continue;down.ray.origin.copy(v).add(new THREE.Vector3(0,.2,0));hit=down.intersectObject(source,false)[0];if(hit)break;
   }
  }
  return hit?hit.point.clone().add(new THREE.Vector3(0,1.6*scale+band.offset,0)):null;
 }
 function defaultCameraPose(index){const band=bands.find(b=>b.key===(selected==='all'?'upper':selected));const floor={upper:e.vestibule,lower:e.platform,high:e.upper,roof:e.roof,base:e.access}[band.key],y=height(floor+1.6)+band.offset;
  const narrow=selected==='lower',x=center.x+(index%2?1:-1)*size.x*(narrow&&longZ?.035:.28),z=center.z+(index<2?-1:1)*size.z*(narrow&&!longZ?.035:.28);
  const position=floorCameraPosition(band,index,floor)||new THREE.Vector3(x,y,z);
  return {position,target:new THREE.Vector3(center.x,position.y-.03,center.z)};
 }

 const cameraOverrides=new Map(),cameraMarkers=new THREE.Group();cameraMarkers.name='Posición espacial de cámaras';cameraMarkers.visible=false;root.add(cameraMarkers);
 const markerItems=Array.from({length:4},(_,index)=>{
  const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:'#45d8ff',depthTest:false,toneMapped:false});
  const spot=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),material);spot.renderOrder=40;group.add(spot);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.1,.012,6,24),material);ring.rotation.x=Math.PI/2;ring.renderOrder=40;group.add(ring);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,.45)]),new THREE.LineBasicMaterial({color:'#45d8ff',depthTest:false}));line.renderOrder=40;group.add(line);
  cameraMarkers.add(group);return {group,material,line,index};
 });
 let activeCamera=0;
 const levelKey=()=>selected==='all'?'upper':selected;
 function cameraPose(index){const band=bands.find(b=>b.key===levelKey()),saved=cameraOverrides.get(levelKey()+':'+index);return saved?{position:saved.position.clone().add(new THREE.Vector3(0,band.offset,0)),target:saved.target.clone().add(new THREE.Vector3(0,band.offset,0))}:defaultCameraPose(index);}
 function refreshCameras(){for(const item of markerItems){const pose=cameraPose(item.index);item.group.position.copy(pose.position);item.material.color.set(item.index===activeCamera?'#ffd36c':'#45d8ff');const direction=pose.target.clone().sub(pose.position).normalize().multiplyScalar(.45),position=item.line.geometry.attributes.position;position.setXYZ(1,direction.x,direction.y,direction.z);position.needsUpdate=true;}}
 function activateCamera(index){activeCamera=index;cameraMarkers.visible=true;refreshCameras();}
 function setCameraPose(index,position,target){const offset=bands.find(b=>b.key===levelKey()).offset;cameraOverrides.set(levelKey()+':'+index,{position:position.clone().sub(new THREE.Vector3(0,offset,0)),target:target.clone().sub(new THREE.Vector3(0,offset,0))});refreshCameras();}
 function resetCamera(index){cameraOverrides.delete(levelKey()+':'+index);refreshCameras();return cameraPose(index);}
 function pick(raycaster){const hits=raycaster.intersectObjects(pickables.filter(mesh=>mesh.userData.stationBand.group.visible),false);for(const hit of hits){const band=hit.object.userData.stationBand;if(hit.point.y<band.min+band.offset-.0001||hit.point.y>band.max+band.offset+.0001)continue;return {...hit.object.userData.progressObject,mesh:hit.object};}return null;}
 function tourPose(time){const b=visibleBounds(),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),r=Math.max(s.x,s.z)*.95;return {position:new THREE.Vector3(c.x+Math.cos(time*.12)*r,c.y+s.y*.65+1,c.z+Math.sin(time*.12)*r),target:c};}
 // Weighted schematic flow marks on the displayed concourse band. Source IFC
 // meshes, native identity, camera poses and level clipping stay untouched.
 const flowGroup=new THREE.Group();flowGroup.name='Flujos teóricos · trayectorias esquemáticas';flowGroup.visible=false;root.add(flowGroup);
 const flowGeometry=new THREE.SphereGeometry(.045,6,4),flowMaterials=['#45d8ff','#ffd36c'].map(color=>new THREE.MeshBasicMaterial({color,depthTest:false,toneMapped:false}));
 const flowMeshes=flowMaterials.map(material=>{const mesh=new THREE.InstancedMesh(flowGeometry,material,96);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=35;mesh.userData.schematicFlow=true;flowGroup.add(mesh);return mesh;});
 const flowMatrix=new THREE.Matrix4();
 function setFlow(rates,time){
  const band=bands.find(b=>b.key==='upper');flowGroup.visible=Boolean(rates&&rates.total>0&&band.group.visible);if(!flowGroup.visible)return;
  const y=height(e.vestibule+.9)+band.offset,length=(longZ?size.z:size.x)*.7;
  flowMeshes.forEach((mesh,lane)=>{
   const rate=lane?rates.exits:rates.entries;mesh.count=rate>0?Math.min(96,Math.max(1,Math.round(rate/30))):0;
   for(let i=0;i<mesh.count;i++){
    const travel=((i/Math.max(1,mesh.count)+time*.08)%1-.5)*length*(lane?-1:1),side=(lane?1:-1)*.12;
    flowMatrix.makeTranslation(center.x+(longZ?side:travel),y,center.z+(longZ?travel:side));mesh.setMatrixAt(i,flowMatrix);
   }mesh.instanceMatrix.needsUpdate=true;
  });
 }
 function update(time){if(alarm.visible)alarmMaterial.opacity=.13+.09*(.5+.5*Math.sin(time*5));}
 function dispose(){flowGeometry.dispose();flowMaterials.forEach(material=>material.dispose());cameraMarkers.traverse(object=>{object.geometry?.dispose();if(object.material)object.material.dispose();});for(const material of ownedMaterials)material.dispose();if(profile.native.length)for(const geometry of new Set(sources.map(mesh=>mesh.geometry)))geometry.dispose();alarm.traverse(object=>{object.geometry?.dispose();});alarmMaterial.dispose();green.dispose();}
 setLevel('all',false);return {levelKeys:keys,levelLabels:profile.levelLabels,nativeLevels:profile.native,setLevel,visibleBounds,cameraPose,activateCamera,setCameraPose,resetCamera,pick,tourPose,update,dispose,setFlow,setAlarm:active=>{alarm.visible=active;}};
}

