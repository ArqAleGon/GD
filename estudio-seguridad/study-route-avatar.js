import * as THREE from 'three';

// A pedestrian-sized articulated guide. Its stride follows travelled metres,
// so seeking, pausing and changing video speed do not create a second clock.
export class RouteAvatar {
 constructor(scene){
  this.group=new THREE.Group();this.group.name='Avatar humanoide E01';this.group.visible=false;scene.add(this.group);
  this.material=new THREE.MeshStandardMaterial({color:0x72cbe5,roughness:.65,transparent:true,opacity:.45,depthWrite:false});
  this.joints={};this.bones={};this.up=new THREE.Vector3(0,1,0);
  const sphere=new THREE.SphereGeometry(1,14,10),cylinder=new THREE.CylinderGeometry(1,1,1,12);
  const part=(geometry,scale)=>{const mesh=new THREE.Mesh(geometry,this.material);mesh.scale.set(...scale);mesh.renderOrder=96;this.group.add(mesh);return mesh;};
  this.head=part(sphere,[.105,.135,.105]);this.torso=part(sphere,[.20,.28,.115]);this.hips=part(sphere,[.16,.12,.105]);
  this.nose=part(sphere,[.025,.026,.035]);
  for(const side of ['l','r']){
   for(const joint of ['shoulder','elbow','hip','knee'])this.joints[side+joint]=part(sphere,[.045,.045,.045]);
   for(const [bone,radius] of [['thigh',.065],['calf',.048],['upperArm',.042],['forearm',.035]])this.bones[side+bone]=part(cylinder,[radius,1,radius]);
   this.joints[side+'hand']=part(sphere,[.035,.065,.028]);this.joints[side+'foot']=part(sphere,[.055,.045,.12]);
  }
 }
 bone(id,a,b){const mesh=this.bones[id],delta=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(this.up,delta.normalize());}
 update({point,direction,distance,moving,elevator}){
  this.group.position.copy(point);this.group.position.y-=.08;
  if(direction.x*direction.x+direction.z*direction.z>1e-5)this.group.rotation.y=Math.atan2(direction.x,direction.z);
  const walk=moving&&!elevator,phase=distance/1.4*Math.PI*2,bob=walk?.018*Math.cos(phase*2):0;
  this.hips.position.set(0,.94+bob,0);this.torso.position.set(0,1.24+bob,.015);this.head.position.set(0,1.64+bob,.02);this.nose.position.set(0,1.65+bob,.12);
  this.torso.rotation.z=walk?.025*Math.sin(phase):0;
  for(const [side,sign,shift] of [['l',-1,0],['r',1,Math.PI]]){
   const p=phase+shift,stride=walk?.30*Math.cos(p):0,lift=walk?.12*Math.max(0,Math.sin(p)):0;
   const hip=new THREE.Vector3(sign*.105,.94+bob,0),foot=new THREE.Vector3(sign*.105,.085+lift,stride);
   const axis=foot.clone().sub(hip),span=axis.length(),bend=Math.sqrt(Math.max(0,.445*.445-span*span/4));
   const forward=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z/axis.lengthSq()).normalize();
   const knee=hip.clone().add(foot).multiplyScalar(.5).addScaledVector(forward,bend);
   this.joints[side+'hip'].position.copy(hip);this.joints[side+'knee'].position.copy(knee);this.joints[side+'foot'].position.copy(foot).add(new THREE.Vector3(0,-.035,.05));
   this.joints[side+'foot'].rotation.x=walk?-.12*Math.sin(p):0;
   this.bone(side+'thigh',hip,knee);this.bone(side+'calf',knee,foot);
   const swing=walk?-.32*Math.cos(p):0,shoulder=new THREE.Vector3(sign*.20,1.43+bob,0);
   const elbow=shoulder.clone().add(new THREE.Vector3(sign*.018,-.27*Math.cos(swing),.27*Math.sin(swing)));
   const hand=elbow.clone().add(new THREE.Vector3(0,-.25*Math.cos(swing+.22),.25*Math.sin(swing+.22)));
   for(const [name,pos] of [['shoulder',shoulder],['elbow',elbow],['hand',hand]])this.joints[side+name].position.copy(pos);
   this.bone(side+'upperArm',shoulder,elbow);this.bone(side+'forearm',elbow,hand);
  }
 }
}
