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
const EXPANDED_MIN_X=(MAP_WIDTH-EXPANDED_MAP_WIDTH)/2;
const EXPANDED_MAX_X=MAP_WIDTH-EXPANDED_MIN_X;
const EXPANDED_MIN_Y=(MAP_HEIGHT-EXPANDED_MAP_HEIGHT)/2;
const EXPANDED_MAX_Y=MAP_HEIGHT-EXPANDED_MIN_Y;
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
 const params=new URLSearchParams({SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetMap',LAYERS:NATIVE_ORTHO_LAYER,STYLES:'',CRS:'CRS:84',BBOX:[west,south,east,north].join(','),WIDTH:String(width),HEIGHT:String(height),FORMAT:'image/png',TRANSPARENT:'TRUE'});
 return `${NATIVE_ORTHO_URL}?${params}`;
}

function addCssAerial(group){
 const cssGroup=new THREE.Group();cssGroup.name='Ortoimagen urbana 2025 · detalle WMS adaptable';group.add(cssGroup);
 const context=new THREE.Group();context.name='Contexto SHP ampliado';cssGroup.add(context);
 const {object:contextPlane}=cssImagePlane('./assets/predial-cadastre-expanded.webp?v=20261002-aerial-transparency-v4',2340,2340,EXPANDED_MAP_WIDTH*WORLD_SCALE,EXPANDED_MAP_HEIGHT*WORLD_SCALE,0,0,'nativeAerialTile aerialTerritorialContext');
 contextPlane.position.y=-.495;context.add(contextPlane);
 const detailHost=new THREE.Group();detailHost.name='WMS original · cobertura visible georreferenciada';cssGroup.add(detailHost);
 let pending=null,active=null,activeMeta=null,pendingMeta=null,requestToken=0,lastUpdate=0,enabled=true;
 const removeTileGroup=tileGroup=>{if(!tileGroup)return;tileGroup.traverse(object=>{if(object.isCSS3DObject)object.element.remove();});detailHost.remove(tileGroup);};
 const setVisible=value=>{enabled=Boolean(value);cssGroup.visible=enabled;};
 const projected=new THREE.Vector3(),direction=new THREE.Vector3();
 const visibleMapBounds=(camera,target)=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,hits=0;
  for(const ndcY of [-1,-.66,-.33,0,.33,.66,1])for(const ndcX of [-1,-.66,-.33,0,.33,.66,1]){
   projected.set(ndcX,ndcY,.5).unproject(camera);direction.copy(projected).sub(camera.position).normalize();
   if(direction.y>=-.00001)continue;
   const distance=(-.485-camera.position.y)/direction.y;if(distance<=0||distance>camera.far)continue;
   const mapX=(camera.position.x+direction.x*distance)/WORLD_SCALE+MAP_WIDTH/2;
   const mapY=(camera.position.z+direction.z*distance)/WORLD_SCALE+MAP_HEIGHT/2;
   minX=Math.min(minX,mapX);maxX=Math.max(maxX,mapX);minY=Math.min(minY,mapY);maxY=Math.max(maxY,mapY);hits++;
  }
  const targetX=target.x/WORLD_SCALE+MAP_WIDTH/2,targetY=target.z/WORLD_SCALE+MAP_HEIGHT/2;
  if(!hits){const radius=Math.max(12,camera.position.distanceTo(target)/WORLD_SCALE);minX=targetX-radius;maxX=targetX+radius;minY=targetY-radius;maxY=targetY+radius;}
  minX=THREE.MathUtils.clamp(minX,EXPANDED_MIN_X,EXPANDED_MAX_X);maxX=THREE.MathUtils.clamp(maxX,EXPANDED_MIN_X,EXPANDED_MAX_X);
  minY=THREE.MathUtils.clamp(minY,EXPANDED_MIN_Y,EXPANDED_MAX_Y);maxY=THREE.MathUtils.clamp(maxY,EXPANDED_MIN_Y,EXPANDED_MAX_Y);
  if(maxX-minX<2){minX=Math.max(EXPANDED_MIN_X,targetX-1);maxX=Math.min(EXPANDED_MAX_X,targetX+1);}
  if(maxY-minY<2){minY=Math.max(EXPANDED_MIN_Y,targetY-1);maxY=Math.min(EXPANDED_MAX_Y,targetY+1);}
  const view={minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
  const marginX=Math.max(2,view.width*.16),marginY=Math.max(2,view.height*.16);
  const request={minX:Math.max(EXPANDED_MIN_X,minX-marginX),minY:Math.max(EXPANDED_MIN_Y,minY-marginY),maxX:Math.min(EXPANDED_MAX_X,maxX+marginX),maxY:Math.min(EXPANDED_MAX_Y,maxY+marginY)};
  request.width=request.maxX-request.minX;request.height=request.maxY-request.minY;return {view,request};
 };
 const contains=(outer,inner)=>outer&&outer.minX<=inner.minX&&outer.minY<=inner.minY&&outer.maxX>=inner.maxX&&outer.maxY>=inner.maxY;
 const update=(camera,target)=>{
  if(!enabled||!camera||!target)return;
  const now=performance.now();if(now-lastUpdate<240)return;lastUpdate=now;
  const {view,request}=visibleMapBounds(camera,target),current=pendingMeta||activeMeta;
  if(contains(current,view)&&current.width<=request.width*1.55&&current.height<=request.height*1.55)return;
  const token=++requestToken;if(pending){removeTileGroup(pending);pending=null;}
  const next=new THREE.Group();next.name='WMS · imagen unica del campo visible';next.visible=false;detailHost.add(next);pending=next;
  const ratio=request.width/Math.max(request.height,.001);let pixelWidth,pixelHeight;
  if(ratio>=1){pixelWidth=2048;pixelHeight=Math.max(256,Math.round(2048/ratio));}else{pixelHeight=2048;pixelWidth=Math.max(256,Math.round(2048*ratio));}
  const nextMeta={...request,pixelWidth,pixelHeight};pendingMeta=nextMeta;
  const {minX,minY,maxX,maxY}=request;
  const {object,image}=cssImagePlane(nativeOrthoUrl(minX,minY,maxX,maxY,pixelWidth,pixelHeight),pixelWidth,pixelHeight,request.width*WORLD_SCALE,request.height*WORLD_SCALE,(minX+maxX)/2*WORLD_SCALE-MAP_WIDTH/2*WORLD_SCALE,(minY+maxY)/2*WORLD_SCALE-MAP_HEIGHT/2*WORLD_SCALE,'nativeAerialTile nativeAerialComposite');
  image.style.opacity='0';
  image.onload=()=>{
   if(token!==requestToken)return;
   if(active&&active!==next)removeTileGroup(active);
   active=next;activeMeta=nextMeta;pending=null;pendingMeta=null;next.visible=true;image.style.opacity='1';
   const groundSampleDistanceM=Math.max(request.width*METRES_PER_MAP_UNIT/pixelWidth,request.height*METRES_PER_MAP_UNIT/pixelHeight);
   document.dispatchEvent(new CustomEvent('nativeaerialready',{detail:{groundSampleDistanceM,tileCount:1,bounds:[minX,minY,maxX,maxY]}}));
  };
  image.onerror=()=>{if(token!==requestToken)return;removeTileGroup(next);pending=null;pendingMeta=null;};
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

 const texture=new THREE.TextureLoader().load('./assets/predial-cadastre-expanded.webp?v=20261002-aerial-transparency-v4');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const cadastral=mapPlane(EXPANDED_MAP_WIDTH*WORLD_SCALE,EXPANDED_MAP_HEIGHT*WORLD_SCALE,new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.82,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),-.5);
 cadastral.name='Base catastral · lotes, construcciones, manzanas, vías y curvas';group.add(cadastral);

 const aerial=addCssAerial(group);
 let aerialVisible=true;
 const setAerialVisible=value=>{
  aerialVisible=Boolean(value);aerial.setVisible(aerialVisible);ground.visible=!aerialVisible;cadastral.visible=!aerialVisible;
  const terrain=group.userData.terrain?.group;if(terrain)terrain.visible=!aerialVisible;
 };
 setAerialVisible(true);
 group.userData.aerial={mesh:aerial.group,detail:aerial.group,update:aerial.update,setVisible:setAerialVisible,source:'UAECD / IDECA · Ortofotomosaico urbano Bogotá 2025 · WMS · GSD nativo 5 cm · CC BY 4.0'};
 group.userData.cadastre={mesh:cadastral,ground,bounds:{mapWidth:EXPANDED_MAP_WIDTH,mapHeight:EXPANDED_MAP_HEIGHT,margin:.15}};

 group.userData.buildingsPromise=loadL1Buildings().then(data=>addBuildingVolumes(group,data,addLabel,onInspect)).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('l1buildingserror',{detail:{message:error.message}}));return null;
 });
 group.userData.terrainPromise=loadEasternHills().then(data=>{const terrain=addEasternHills(group,data,addLabel);terrain.visible=!aerialVisible;return terrain;}).catch(error=>{
  console.error(error);document.dispatchEvent(new CustomEvent('terrainerror',{detail:{message:error.message}}));return null;
 });
 return group;
}

