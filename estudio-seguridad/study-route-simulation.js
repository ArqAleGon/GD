import * as THREE from 'three';
export class RouteSimulation {
 constructor(scene,data){this.scene=scene;this.data=data;this.cabins=[];this.open=false;this.group=new THREE.Group();scene.scene.add(this.group);this.group.visible=false;}
 setOpen(enabled){
  if(this.open===enabled)return;this.open=enabled;
  for(const op of this.data.simulation?.gateOpening||[]){const mesh=this.scene.staticMeshes.find(m=>m.userData.file===op.file);if(!mesh)continue;const p=mesh.geometry.attributes.position;for(const i of op.vertices){p.setXYZ(i,p.getX(i)+op.delta[0]*(enabled?1:-1),p.getY(i)+op.delta[1]*(enabled?1:-1),p.getZ(i)+op.delta[2]*(enabled?1:-1));}p.needsUpdate=true;mesh.geometry.computeBoundingSphere();}
 }
 setJourney(parts){
  this.group.traverse(n=>{n.geometry?.dispose();if(n.material){n.material.map?.dispose();n.material.dispose();}});this.group.clear();this.cabins=[];
  for(const part of parts.filter(p=>p.leg.connectionType==='elevator')){
   const cabin=new THREE.Group();cabin.name='Cabina esquemática';const a=part.points[0],b=part.points.at(-1);cabin.position.copy(a);cabin.position.y-=.08;
   const preceding=parts[parts.indexOf(part)-1],v=preceding.points.at(-1).clone().sub(preceding.points.at(-2));cabin.rotation.y=Math.atan2(v.x,v.z);
   const box=(w,h,d,x,y,z,color,opacity=1)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65,transparent:opacity<1,opacity,depthWrite:opacity>=1}));mesh.position.set(x,y,z);cabin.add(mesh);};
   box(1.5,.08,1.8,0,-.04,0,0x7e8c97);box(1.5,.06,1.8,0,2.25,0,0xadb8bf);
   for(const x of [-.72,.72])for(const z of [-.87,.87])box(.04,2.25,.04,x,1.125,z,0x668394);
   box(1.42,1.95,.02,0,1.1,.88,0xb5d8df,.18);
   for(const x of [-.73,.73]){box(.02,1.95,1.72,x,1.1,0,0xb5d8df,.18);box(.035,.035,1.65,x*.95,.95,0,0x668394);}
   const plaque=document.createElement('canvas');plaque.width=512;plaque.height=96;const ctx=plaque.getContext('2d');ctx.fillStyle='#163642';ctx.fillRect(0,0,512,96);ctx.fillStyle='white';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.fillText(this.data.simulation?.cabinLabel||'CABINA ESQUEMÁTICA',256,58);const texture=new THREE.CanvasTexture(plaque);const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.225),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(0,1.85,.865);sign.rotation.y=Math.PI;cabin.add(sign);
   this.group.add(cabin);this.cabins.push({part,cabin,a,b});
  }
 }
 update(distance){for(const {part,cabin,a,b} of this.cabins){const f=THREE.MathUtils.clamp((distance-part.offset)/part.length,0,1);cabin.position.copy(a).lerp(b,f);cabin.position.y-=.08;}}
}
