import * as THREE from 'three';

export const MAP_WIDTH=1200;
export const MAP_HEIGHT=613.39;
export const WORLD_SCALE=.32;
export const cityPoint=([x,y],height=0)=>[(x-MAP_WIDTH/2)*WORLD_SCALE,height,(y-MAP_HEIGHT/2)*WORLD_SCALE];

// Referencias planas ubicadas en el marco geográfico de la base catastral.
// Sustituyen los antiguos volúmenes 3D interpretativos.
export const LANDMARKS=[
 {name:'Torre Atrio',xy:[1125.25,409.45],description:'Referencia urbana plana · Centro Internacional, entorno de la avenida Caracas y calle 26.'},
 {name:'Estadio El Campín',xy:[1053.16,158.34],description:'Referencia urbana plana · sector de la NQS entre calles 53 y 63.'},
 {name:'Universidad Nacional',xy:[1018.99,220.02],description:'Referencia urbana plana · Ciudad Universitaria.'},
 {name:'Iglesia de Lourdes',xy:[1182.34,136.68],description:'Referencia urbana plana · Chapinero, entorno de la carrera 13 y calle 63.'}
];

function mapPlane(width,height,material,y){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.renderOrder=0;return mesh;
}

export function buildBogotaContext(root,addLabel,onInspect){
 const group=new THREE.Group();group.name='Bogotá · base catastral MapaBaseBogota';root.add(group);
 const worldWidth=MAP_WIDTH*WORLD_SCALE,worldHeight=MAP_HEIGHT*WORLD_SCALE;

 const ground=mapPlane(worldWidth+8,worldHeight+8,new THREE.MeshStandardMaterial({color:'#09141c',roughness:1,metalness:0}),-.72);
 group.add(ground);

 const texture=new THREE.TextureLoader().load('./predial-cadastre.webp?v=20260922-mapbase');
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const cadastral=mapPlane(worldWidth,worldHeight,new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.82,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),-.5);
 cadastral.name='Base catastral · lotes, construcciones, manzanas, vías y curvas';
 group.add(cadastral);

 const borderPoints=[[0,0],[MAP_WIDTH,0],[MAP_WIDTH,MAP_HEIGHT],[0,MAP_HEIGHT],[0,0]].map(point=>new THREE.Vector3(...cityPoint(point,-.38)));
 group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints),new THREE.LineBasicMaterial({color:'#5b8190',transparent:true,opacity:.75})));

 for(const item of LANDMARKS){
  const [x,y,z]=cityPoint(item.xy,.16);
  const marker=new THREE.Mesh(new THREE.RingGeometry(1.05,1.75,28),new THREE.MeshBasicMaterial({color:'#86d7de',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.position.set(x,y,z);marker.renderOrder=2;group.add(marker);
  const label=addLabel(cityPoint(item.xy,1.8),()=>item.name,()=>onInspect?.(item),'bogotaLandmark');
  label.landmark=true;label.offsetY=-18;
 }

 const areas=[
  ['BOSA',[180,430]],['KENNEDY',[430,390]],['PUENTE ARANDA',[760,430]],['CENTRO',[1050,420]],['CHAPINERO',[1130,175]],['TEUSAQUILLO',[1010,275]],['BOGOTÁ · BASE CATASTRAL',[590,28]]
 ];
 for(const [name,xy] of areas){
  const label=addLabel(cityPoint(xy,.9),()=>name,null,'cityStreetLabel');label.landmark=true;label.cityMinor=!name.includes('BASE CATASTRAL');
 }
 return group;
}

