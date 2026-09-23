import * as THREE from 'three';

export const MAP_WIDTH=1200;
export const MAP_HEIGHT=613.39;
export const WORLD_SCALE=.32;
const METRES_PER_MAP_UNIT=13.32;
export const METRES_TO_WORLD=WORLD_SCALE/METRES_PER_MAP_UNIT;
const HEIGHT_WORLD_PER_METRE=METRES_TO_WORLD;
const BASE_Y=-.38;
export const cityPoint=([x,y],height=0)=>[(x-MAP_WIDTH/2)*WORLD_SCALE,height,(y-MAP_HEIGHT/2)*WORLD_SCALE];

async function loadCompressedJson(url,message){
 const response=await fetch(url);
 if(!response.ok)throw new Error(message);
 const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
 return JSON.parse(await new Response(stream).text());
}

async function loadL1Buildings(){
 const urls=[1,2,3].map(part=>`./l1-buildings-${part}.json.gz?v=20260922-l1-100m-b`);
 const parts=await Promise.all(urls.map(url=>loadCompressedJson(url,'No se pudo cargar la edificación 3D de la L1')));
 return {...parts[0],buildings:parts.flatMap(part=>part.buildings)};
}

const loadEasternHills=()=>loadCompressedJson('./eastern-hills.json.gz?v=20260922-cniv-1to1','No se pudo cargar el relieve de los Cerros Orientales');

function mapPlane(width,height,material,y){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
 mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.renderOrder=0;return mesh;
}

function geometryBucket(){return {positions:[],indices:[]};}

function addFootprint(bucket,flat,heightM){
 const points=[];
 for(let index=0;index<flat.length;index+=2){
  const x=(flat[index]-MAP_WIDTH/2)*WORLD_SCALE;
  const z=(flat[index+1]-MAP_HEIGHT/2)*WORLD_SCALE;
  points.push(new THREE.Vector2(x,z));
 }
 if(points.length<3)return;
 const top=BASE_Y+Math.max(METRES_TO_WORLD*.25,heightM*HEIGHT_WORLD_PER_METRE);
 const offset=bucket.positions.length/3;
 points.forEach(point=>bucket.positions.push(point.x,BASE_Y,point.y));
 points.forEach(point=>bucket.positions.push(point.x,top,point.y));
 const count=points.length;
 for(const triangle of THREE.ShapeUtils.triangulateShape(points,[])){
  bucket.indices.push(offset+count+triangle[0],offset+count+triangle[1],offset+count+triangle[2]);
 }
 for(let index=0;index<count;index++){
  const next=(index+1)%count;
  bucket.indices.push(offset+index,offset+next,offset+count+next,offset+index,offset+count+next,offset+count+index);
 }
}

function meshFromBucket(bucket,material,name){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
 geometry.setIndex(bucket.indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=true;return mesh;
}

function addBuildingVolumes(group,data,addLabel,onInspect){
 const regular=geometryBucket(),landmarks=geometryBucket();
 for(const record of data.buildings){
  const heightM=record[1],landmarkIndex=record[2],rings=record[4];
  const bucket=landmarkIndex>=0?landmarks:regular;
  for(const ring of rings)addFootprint(bucket,ring,heightM);
 }
 const regularMaterial=new THREE.MeshStandardMaterial({color:'#7293a0',roughness:.82,metalness:.04,transparent:true,opacity:.68,side:THREE.DoubleSide});
 const landmarkMaterial=new THREE.MeshStandardMaterial({color:'#e1b94f',emissive:'#5a3d08',emissiveIntensity:.34,roughness:.58,metalness:.12,transparent:true,opacity:.94,side:THREE.DoubleSide});
 const volumeMesh=meshFromBucket(regular,regularMaterial,'Construcciones L1 · corredor 100 m');
 const landmarkMesh=meshFromBucket(landmarks,landmarkMaterial,'Hitos urbanos · CONNPISOS × 3 m');
 group.add(volumeMesh,landmarkMesh);
 for(const item of data.landmarks){
  const top=Math.max(.45,BASE_Y+item.heightM*HEIGHT_WORLD_PER_METRE+.38);
  const marker=new THREE.Mesh(new THREE.RingGeometry(1.05,1.7,28),new THREE.MeshBasicMaterial({color:'#ffe59a',transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.position.fromArray(cityPoint(item.anchor,BASE_Y+.08));marker.renderOrder=3;group.add(marker);
  const detail={...item,description:`${item.count.toLocaleString('es')} construcciones asociadas · máximo ${item.maxFloors.toLocaleString('es')} pisos · ${item.heightM.toLocaleString('es')} m según CONNPISOS × 3 m.`};
  const label=addLabel(cityPoint(item.anchor,top),()=>item.name,()=>onInspect?.(detail),'bogotaLandmark');
  label.landmark=true;label.offsetY=-18;
 }
 group.userData.buildingMeta=data.meta;
 group.userData.buildingMeshes={volumes:volumeMesh,landmarks:landmarkMesh};
 document.dispatchEvent(new CustomEvent('l1buildingsready',{detail:{meta:data.meta,landmarks:data.landmarks}}));
 return {volumeMesh,landmarkMesh};
}

function addEasternHills(group,data,addLabel){
 const terrain=new THREE.Group();terrain.name='Cerros Orientales · CNiv.shp';group.add(terrain);
 const {gridWidth:width,gridHeight:height,mapBounds,baseElevationM}=data.meta;
 const [minX,minY,maxX,maxY]=mapBounds;
 const positions=[],indices=[],colors=[];
 const low=new THREE.Color('#0d242d'),middle=new THREE.Color('#263f36'),high=new THREE.Color('#566749');
 const maxRelative=Math.max(1,data.meta.maxElevationM-baseElevationM);
 for(let row=0;row<height;row++)for(let column=0;column<width;column++){
  const mapX=minX+(maxX-minX)*column/(width-1),mapY=minY+(maxY-minY)*row/(height-1);
  const elevation=data.heights[row*width+column],relative=Math.max(0,elevation-baseElevationM);
  const point=cityPoint([mapX,mapY],BASE_Y+relative*METRES_TO_WORLD);
  positions.push(...point);
  const ratio=THREE.MathUtils.clamp(relative/maxRelative,0,1),color=ratio<.52?low.clone().lerp(middle,ratio/.52):middle.clone().lerp(high,(ratio-.52)/.48);
  colors.push(color.r,color.g,color.b);
 }
 for(let row=0;row<height-1;row++)for(let column=0;column<width-1;column++){
  const a=row*width+column,b=a+1,c=a+width,d=c+1;
  indices.push(a,c,b,b,c,d);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,transparent:true,opacity:.86,side:THREE.DoubleSide}));
 surface.name='Relieve 1:1 · Cerros Orientales';surface.receiveShadow=true;terrain.add(surface);
 const contourMaterial=new THREE.LineBasicMaterial({color:'#a5bc8b',transparent:true,opacity:.18,depthWrite:false});
 for(const [elevation,flat] of data.contours){
  const points=[];
  for(let index=0;index<flat.length;index+=2)points.push(new THREE.Vector3(...cityPoint([flat[index],flat[index+1]],BASE_Y+Math.max(0,elevation-baseElevationM)*METRES_TO_WORLD+.025)));
  if(points.length>1){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),contourMaterial);line.renderOrder=2;terrain.add(line);}
 }
 const labelX=minX+(maxX-minX)*.12,centerY=(minY+maxY)/2;
 const label=addLabel(cityPoint([labelX,centerY],BASE_Y+maxRelative*METRES_TO_WORLD+1),()=>`CERROS ORIENTALES · ${data.meta.minElevationM.toLocaleString('es')}–${data.meta.maxElevationM.toLocaleString('es')} m`,null,'cityStreetLabel hillsLabel');
 label.landmark=true;label.offsetY=-10;
 group.userData.terrain={group:terrain,surface,meta:data.meta};
 document.dispatchEvent(new CustomEvent('terrainready',{detail:data.meta}));
 return terrain;
}

export function buildBogotaContext(root,addLabel,onInspect){
 const group=new THREE.Group();group.name='Bogotá · base catastral y corredor 3D L1';root.add(group);
 const worldWidth=MAP_WIDTH*WORLD_SCALE,worldHeight=MAP_HEIGHT*WORLD_SCALE;

 const ground=mapPlane(worldWidth+155,worldHeight+72,new THREE.MeshStandardMaterial({color:'#09141c',roughness:1,metalness:0}),-.72);
 ground.position.x=71;ground.position.z=-3;group.add(ground);

 const texture=new THREE.TextureLoader().load('./predial-cadastre.webp?v=20260922-mapbase');
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const cadastral=mapPlane(worldWidth,worldHeight,new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),-.5);
 cadastral.name='Base catastral · lotes, construcciones, manzanas, vías y curvas';group.add(cadastral);

 const aerial=new THREE.Group();aerial.name='Ortoimagen urbana Bogotá 2025 · IDECA';
 for(let row=0;row<2;row++)for(let col=0;col<3;col++){
  const aerialTexture=new THREE.TextureLoader().load(`./assets/bogota-ortho-2025-${row}-${col}.webp?v=20260923-ideca`);
  aerialTexture.colorSpace=THREE.SRGBColorSpace;aerialTexture.anisotropy=8;
  const tile=mapPlane(worldWidth/3,worldHeight/2,new THREE.MeshBasicMaterial({map:aerialTexture,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),-.475);
  tile.position.x=(col-1)*worldWidth/3;tile.position.z=(row-.5)*worldHeight/2;tile.renderOrder=1;aerial.add(tile);
 }
 group.add(aerial);group.userData.aerial={mesh:aerial,source:'IDECA · Ortoimagen urbana Bogotá 2025 · CC BY 4.0'};

 const borderPoints=[[0,0],[MAP_WIDTH,0],[MAP_WIDTH,MAP_HEIGHT],[0,MAP_HEIGHT],[0,0]].map(point=>new THREE.Vector3(...cityPoint(point,-.38)));
 group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints),new THREE.LineBasicMaterial({color:'#5b8190',transparent:true,opacity:.75})));

 const areas=[
  ['BOSA',[180,430]],['KENNEDY',[430,390]],['PUENTE ARANDA',[760,430]],['CENTRO',[1050,420]],['CHAPINERO',[1130,175]],['TEUSAQUILLO',[1010,275]],['BOGOTÁ · BASE CATASTRAL',[590,28]]
 ];
 for(const [name,xy] of areas){
  const label=addLabel(cityPoint(xy,.9),()=>name,null,'cityStreetLabel');label.landmark=true;label.cityMinor=!name.includes('BASE CATASTRAL');
 }
 group.userData.buildingsPromise=loadL1Buildings().then(data=>addBuildingVolumes(group,data,addLabel,onInspect)).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('l1buildingserror',{detail:{message:error.message}}));return null;
 });
 group.userData.terrainPromise=loadEasternHills().then(data=>addEasternHills(group,data,addLabel)).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('terrainerror',{detail:{message:error.message}}));return null;
 });
 return group;
}
