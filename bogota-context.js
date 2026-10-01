import * as THREE from 'three';
import {CSS3DObject} from './vendor/CSS3DRenderer.js';

export const MAP_WIDTH=1200;
export const MAP_HEIGHT=613.39;
export const WORLD_SCALE=.32;
const METRES_PER_MAP_UNIT=13.32;
export const METRES_TO_WORLD=WORLD_SCALE/METRES_PER_MAP_UNIT;
const HEIGHT_WORLD_PER_METRE=METRES_TO_WORLD;
const BASE_Y=-.38;
const VIEW_BBOX=[-74.204367469,4.591299523,-74.06038065,4.664899642];
const EXPANDED_MAP_WIDTH=1560;
const EXPANDED_MAP_HEIGHT=1560;
const NATIVE_ORTHO_URL='https://serviciosgis.catastrobogota.gov.co/image/services/imagenesfunciones/orthourbana2025funcion/ImageServer/WMSServer';
const NATIVE_ORTHO_LAYER='orthourbana2025funcion:ColorBalance';
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

function cssImagePlane(source,pixelWidth,pixelHeight,worldWidth,worldHeight,x,z,className=''){
 const image=document.createElement('img');image.src=source;image.alt='';image.draggable=false;image.decoding='async';
 image.width=pixelWidth;image.height=pixelHeight;image.className=className;
 image.style.cssText=`display:block;width:${pixelWidth}px;height:${pixelHeight}px;object-fit:fill;pointer-events:none;user-select:none`;
 const object=new CSS3DObject(image);object.position.set(x,-.485,z);object.rotation.x=Math.PI/2;
 object.scale.set(worldWidth/pixelWidth,worldHeight/pixelHeight,1);return {object,image};
}

function mapToLonLat(x,y){
 const lon=VIEW_BBOX[0]+x/MAP_WIDTH*(VIEW_BBOX[2]-VIEW_BBOX[0]);
 const lat=VIEW_BBOX[3]-y/MAP_HEIGHT*(VIEW_BBOX[3]-VIEW_BBOX[1]);
 return [lon,lat];
}

function nativeOrthoUrl(minX,minY,maxX,maxY,width=1024,height=1024){
 const [west,north]=mapToLonLat(minX,minY),[east,south]=mapToLonLat(maxX,maxY);
 const params=new URLSearchParams({SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetMap',LAYERS:NATIVE_ORTHO_LAYER,STYLES:'',CRS:'CRS:84',BBOX:[west,south,east,north].join(','),WIDTH:String(width),HEIGHT:String(height),FORMAT:'image/jpeg',BGCOLOR:'0x020406'});
 return `${NATIVE_ORTHO_URL}?${params}`;
}

function addCssAerial(group){
 const cssGroup=new THREE.Group();cssGroup.name='Ortoimagen urbana 2025 · detalle WMS adaptable';group.add(cssGroup);
 const context=new THREE.Group();context.name='Contexto SHP ampliado';cssGroup.add(context);
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const {object}=cssImagePlane(`./assets/predial-cadastre-${row}-${col}.webp?v=20261001-expanded-mapbase`,1170,1170,EXPANDED_MAP_WIDTH*WORLD_SCALE/2,EXPANDED_MAP_HEIGHT*WORLD_SCALE/2,(col-.5)*EXPANDED_MAP_WIDTH*WORLD_SCALE/2,(row-.5)*EXPANDED_MAP_HEIGHT*WORLD_SCALE/2,'nativeAerialTile aerialTerritorialContext');
  object.position.y=-.495;context.add(object);
 }
 const fallback=new THREE.Group();fallback.name='Respaldo ortofotografico local';cssGroup.add(fallback);
 const worldWidth=MAP_WIDTH*WORLD_SCALE,worldHeight=MAP_HEIGHT*WORLD_SCALE;
 for(let row=0;row<2;row++)for(let col=0;col<3;col++){
  const pixelHeight=row?613:614;
  const {object}=cssImagePlane(`./assets/bogota-ortho-2025-${row}-${col}.webp?v=20260923-ideca`,800,pixelHeight,worldWidth/3,worldHeight/2,(col-1)*worldWidth/3,(row-.5)*worldHeight/2,'nativeAerialTile fallbackAerialTile');
  fallback.add(object);
 }
 const corridor=new THREE.Group();corridor.name='Franja L1 · respaldo local de alta resolucion';cssGroup.add(corridor);
 fetch('./bogota-ortho-2025-l1.json?v=20261001-l1-hires-v2').then(response=>response.ok?response.json():Promise.reject(new Error('No se pudo cargar el manifiesto de ortoimagen L1'))).then(manifest=>{
  for(const item of manifest.tiles){
   const {object}=cssImagePlane(`${item.file}?v=20261001-l1-hires-v2`,1024,1024,item.width*WORLD_SCALE,item.height*WORLD_SCALE,(item.x+item.width/2-MAP_WIDTH/2)*WORLD_SCALE,(item.y+item.height/2-MAP_HEIGHT/2)*WORLD_SCALE,'nativeAerialTile corridorAerialTile');
   corridor.add(object);
  }
 }).catch(error=>console.error(error));
 corridor.visible=false;
 const detailHost=new THREE.Group();detailHost.name='WMS original · LOD dinamico';cssGroup.add(detailHost);
 let pending=null,active=null,activeMeta=null,pendingMeta=null,requestToken=0,lastUpdate=0,enabled=true;
 const removeTileGroup=tileGroup=>{if(!tileGroup)return;tileGroup.traverse(object=>{if(object.isCSS3DObject)object.element.remove();});detailHost.remove(tileGroup);};
 const showLocalBackdrop=()=>{fallback.visible=true;corridor.visible=false;};
 const showNativeDetail=()=>{fallback.visible=true;corridor.visible=false;};
 const setVisible=value=>{enabled=Boolean(value);cssGroup.visible=enabled;};
 const update=(camera,target)=>{
  if(!enabled||!camera||!target)return;
  const now=performance.now();if(now-lastUpdate<240)return;lastUpdate=now;
  const distance=Math.max(.2,camera.position.distanceTo(target));
  const visibleHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
  const visibleWidth=visibleHeight*camera.aspect;
  const wantedMetres=Math.max(102.4,Math.max(visibleHeight,visibleWidth)*METRES_PER_MAP_UNIT/WORLD_SCALE*1.4);
  const level=THREE.MathUtils.clamp(Math.ceil(Math.log2(wantedMetres/102.4)),0,8);
  const spanMetres=102.4*2**level,spanMap=spanMetres/METRES_PER_MAP_UNIT;
  const targetMapX=target.x/WORLD_SCALE+MAP_WIDTH/2,targetMapY=target.z/WORLD_SCALE+MAP_HEIGHT/2;
  const current=activeMeta?.level===level?activeMeta:(pendingMeta?.level===level?pendingMeta:null);
  if(current&&Math.hypot(targetMapX-current.x,targetMapY-current.y)<spanMap*.12)return;
  const token=++requestToken;if(pending){removeTileGroup(pending);pending=null;}
  const next=new THREE.Group();next.name=`WMS LOD ${level} · imagen unica`;next.visible=false;detailHost.add(next);pending=next;
  pendingMeta={level,x:targetMapX,y:targetMapY,spanMap};
  const minX=targetMapX-spanMap/2,minY=targetMapY-spanMap/2,maxX=minX+spanMap,maxY=minY+spanMap;
  const {object,image}=cssImagePlane(nativeOrthoUrl(minX,minY,maxX,maxY,2048,2048),2048,2048,spanMap*WORLD_SCALE,spanMap*WORLD_SCALE,(minX+maxX)/2*WORLD_SCALE-MAP_WIDTH/2*WORLD_SCALE,(minY+maxY)/2*WORLD_SCALE-MAP_HEIGHT/2*WORLD_SCALE,'nativeAerialTile nativeAerialComposite');
  image.style.opacity='0';
  image.onload=()=>{
   if(token!==requestToken)return;
   if(active&&active!==next)removeTileGroup(active);
   active=next;activeMeta=pendingMeta;pending=null;pendingMeta=null;next.visible=true;image.style.opacity='1';showNativeDetail();
   document.dispatchEvent(new CustomEvent('nativeaerialready',{detail:{level,groundSampleDistanceM:spanMetres/2048,tileCount:1}}));
  };
  image.onerror=()=>{if(token!==requestToken)return;removeTileGroup(next);pending=null;pendingMeta=null;if(!active)showLocalBackdrop();};
  next.add(object);
 };
 return {group:cssGroup,setVisible,update};
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
 const regular=geometryBucket();
 const omittedLandmarks=new Set(['Universidad Nacional','Estadio El Campín','Estadio El Camp�n']);
 for(const record of data.buildings){
  const heightM=record[1],landmarkIndex=record[2],rings=record[4];
  const landmark=landmarkIndex>=0?data.landmarks[landmarkIndex]:null;
  if(landmark&&omittedLandmarks.has(landmark.name))continue;
  for(const ring of rings)addFootprint(regular,ring,heightM);
 }
 const regularMaterial=new THREE.MeshStandardMaterial({color:'#7293a0',roughness:.82,metalness:.04,transparent:true,opacity:.68,side:THREE.DoubleSide});
 const volumeMesh=meshFromBucket(regular,regularMaterial,'Construcciones L1 · corredor 100 m');
 group.add(volumeMesh);
 group.userData.buildingMeta=data.meta;
 group.userData.buildingMeshes={volumes:volumeMesh,landmarks:null};
 document.dispatchEvent(new CustomEvent('l1buildingsready',{detail:{meta:data.meta,landmarks:data.landmarks}}));
 return {volumeMesh,landmarkMesh:null};
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
 group.userData.terrain={group:terrain,surface,meta:data.meta};
 document.dispatchEvent(new CustomEvent('terrainready',{detail:data.meta}));
 return terrain;
}

export function buildBogotaContext(root,addLabel,onInspect){
 const group=new THREE.Group();group.name='Bogotá · base catastral y corredor 3D L1';root.add(group);
 const worldWidth=MAP_WIDTH*WORLD_SCALE,worldHeight=MAP_HEIGHT*WORLD_SCALE;

 const ground=mapPlane(EXPANDED_MAP_WIDTH*WORLD_SCALE,EXPANDED_MAP_HEIGHT*WORLD_SCALE,new THREE.MeshStandardMaterial({color:'#09141c',roughness:1,metalness:0}),-.72);group.add(ground);

 const cadastral=new THREE.Group();cadastral.name='Base catastral · lotes, construcciones, manzanas, vías y curvas';group.add(cadastral);
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const texture=new THREE.TextureLoader().load(`./assets/predial-cadastre-${row}-${col}.webp?v=20261001-expanded-mapbase`);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const tile=mapPlane(EXPANDED_MAP_WIDTH*WORLD_SCALE/2,EXPANDED_MAP_HEIGHT*WORLD_SCALE/2,new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.82,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),-.5);
  tile.position.x=(col-.5)*EXPANDED_MAP_WIDTH*WORLD_SCALE/2;tile.position.z=(row-.5)*EXPANDED_MAP_HEIGHT*WORLD_SCALE/2;cadastral.add(tile);
 }

 const aerial=addCssAerial(group);
 const setAerialVisible=value=>{aerial.setVisible(value);ground.visible=!value;cadastral.visible=!value;};
 setAerialVisible(true);
 group.userData.aerial={mesh:aerial.group,detail:aerial.group,update:aerial.update,setVisible:setAerialVisible,source:'UAECD / IDECA · Ortofotomosaico urbano Bogotá 2025 · WMS · GSD nativo 5 cm · CC BY 4.0'};
 group.userData.cadastre={mesh:cadastral,ground,bounds:{mapWidth:EXPANDED_MAP_WIDTH,mapHeight:EXPANDED_MAP_HEIGHT,margin:.15}};

 group.userData.buildingsPromise=loadL1Buildings().then(data=>addBuildingVolumes(group,data,addLabel,onInspect)).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('l1buildingserror',{detail:{message:error.message}}));return null;
 });
 group.userData.terrainPromise=loadEasternHills().then(data=>addEasternHills(group,data,addLabel)).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('terrainerror',{detail:{message:error.message}}));return null;
 });
 return group;
}
