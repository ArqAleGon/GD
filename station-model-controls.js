import * as THREE from 'three';

// Elevations measured from horizontal IFC geometry, relative to street datum.
const elevations={E15:{vestibule:7.2,platform:14.4,upper:23.2,roof:29.8},E16:{vestibule:5.4,platform:14.2,upper:20.8,roof:27.4}};
export function createStationModelControls(root,entry,code,originalBounds){
 const scale=.06,datum=.24,e=elevations[code],height=m=>datum+m*scale;
 const cuts=[originalBounds.min.y-.01,height(e.vestibule-.5),height(e.platform-.5),height(e.upper-.5),height(e.roof-.5),originalBounds.max.y+.01];
 const keys=['base','upper','lower','high','roof'],bands=[],pickables=[];let selected='all',exploded=false;
 entry.group.updateMatrixWorld(true);
 const sources=[];entry.group.traverse(object=>{if(object.isMesh&&object.visible)sources.push(object);});
 for(let i=0;i<keys.length;i++){
  const group=new THREE.Group();group.name='Nivel IFC · '+keys[i];root.add(group);
  const band={key:keys[i],group,min:cuts[i],max:cuts[i+1],offset:0,planes:[new THREE.Plane(new THREE.Vector3(0,1,0),-cuts[i]),new THREE.Plane(new THREE.Vector3(0,-1,0),cuts[i+1])]};bands.push(band);
  for(const source of sources){
   const bounds=new THREE.Box3().setFromObject(source);if(bounds.max.y<band.min||bounds.min.y>band.max)continue;
   const mesh=new THREE.Mesh(source.geometry,Array.isArray(source.material)?source.material.map(m=>m.clone()):source.material.clone());
   mesh.name=source.name;mesh.matrixAutoUpdate=false;mesh.matrix.copy(source.matrixWorld);mesh.userData={...source.userData,sharedStationGeometry:true,stationBand:band};
   for(const material of [].concat(mesh.material)){material.clippingPlanes=band.planes;material.clipShadows=true;}
   group.add(mesh);pickables.push(mesh);
  }
 }
 sources.forEach(mesh=>mesh.visible=false);
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
 function setLevel(level,explode){selected=level;exploded=explode;for(let i=0;i<bands.length;i++){
  const band=bands[i];band.group.visible=selected==='all'||selected===band.key;band.offset=exploded?i*.9:0;band.group.position.y=band.offset;
  band.planes[0].constant=-(band.min+band.offset);band.planes[1].constant=band.max+band.offset;
 }const band=bands.find(b=>b.key===(selected==='all'?'upper':selected));alarm.position.y=Math.max(height(e.vestibule),band.min+.05)+band.offset;root.updateMatrixWorld(true);}
 function visibleBounds(){const box=new THREE.Box3();for(const band of bands)if(band.group.visible){box.expandByPoint(new THREE.Vector3(originalBounds.min.x,Math.max(originalBounds.min.y,band.min)+band.offset,originalBounds.min.z));box.expandByPoint(new THREE.Vector3(originalBounds.max.x,Math.min(originalBounds.max.y,band.max)+band.offset,originalBounds.max.z));}return box;}
 function cameraPose(index){const band=bands.find(b=>b.key===(selected==='all'?'upper':selected));const y=Math.max(height(e.vestibule),band.min+.1)+band.offset+.1;
  const x=center.x+(index%2?1:-1)*size.x*.28,z=center.z+(index<2?-1:1)*size.z*.28;
  return {position:new THREE.Vector3(x,y,z),target:new THREE.Vector3(center.x,y-.03,center.z)};
 }
 function pick(raycaster){const hits=raycaster.intersectObjects(pickables.filter(mesh=>mesh.parent.visible),false);for(const hit of hits){const band=hit.object.userData.stationBand;if(hit.point.y<band.min+band.offset-.0001||hit.point.y>band.max+band.offset+.0001)continue;return {...hit.object.userData.progressObject,mesh:hit.object};}return null;}
 function tourPose(time){const b=visibleBounds(),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),r=Math.max(s.x,s.z)*.95;return {position:new THREE.Vector3(c.x+Math.cos(time*.12)*r,c.y+s.y*.65+1,c.z+Math.sin(time*.12)*r),target:c};}
 function update(time){if(alarm.visible)alarmMaterial.opacity=.13+.09*(.5+.5*Math.sin(time*5));}
 function dispose(){for(const mesh of pickables)for(const material of [].concat(mesh.material))material.dispose();alarm.traverse(object=>{object.geometry?.dispose();});alarmMaterial.dispose();green.dispose();}
 setLevel('all',false);return {setLevel,visibleBounds,cameraPose,pick,tourPose,update,dispose,setAlarm:active=>{alarm.visible=active;}};
}

