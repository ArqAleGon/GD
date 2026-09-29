import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {createIfcProgressObject} from './ifc-progress.js?v=20260929-element-progress-v1';

const scale = 0.06;
const assetRevision = '20260925-patio-hq-facade-113a';
const point = (p, height = 0) => new THREE.Vector3(p[0] * scale, height, -p[1] * scale);

export async function loadUrbanMap() {
  const read = async (name, binary = false) => {
    const response = await fetch('./assets/gis/' + name);
    if (!response.ok) throw new Error('No se pudo cargar la cartografía: ' + name);
    return binary ? response.arrayBuffer() : response.json();
  };
  const [data, buildings, roads, volumesData, volumes, volumeFootprints, parcels, placement, ptHqTypes] = await Promise.all([
    read('map.json'), read('buildings.bin', true), read('roads.bin', true), read('volumes.json'), read('volumes.bin', true), read('volume-footprints.bin', true), read('parcels.bin', true),
    fetch('./ifc-placement-20260915-i16-e16.json?v='+assetRevision).then(r=>{if(!r.ok)throw new Error('IFC placement unavailable');return r.json()}),
    fetch('./pt-hq-element-types.json?v='+assetRevision).then(r=>{if(!r.ok)throw new Error('Patio high-fidelity type map unavailable');return r.json()})
  ]);
  const ifcLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ifcModelDefs=placement.models||[
    {file:'e15-architecture-web.glb',section:'E15',label:'IFC · E15 · ARQ + EST'},
    {file:'e15-1100.glb',section:'E15',label:'IFC · E15 · ARQ + EST'}
  ];
  return {ifcLoader, ifcModelDefs, placement, ptHqTypes, data, volumesData, volumes: new Float32Array(volumes), volumeFootprints: new Float32Array(volumeFootprints), parcels: new Float32Array(parcels), buildings: new Float32Array(buildings), roads: new Float32Array(roads)};
}

function segments(group, coords, color, height) {
  const positions = new Float32Array(coords.length / 2 * 3);
  for (let i = 0, j = 0; i < coords.length; i += 2) {
    positions[j++] = coords[i] * scale;
    positions[j++] = height;
    positions[j++] = -coords[i + 1] * scale;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color}));
  mesh.renderOrder = 3;
  group.add(mesh);
}

function polygonParts(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function polygons(group, geometry, color, height, opacity = 1) {
  const meshes=[];
  for (const rings of polygonParts(geometry)) {
    const shape = new THREE.Shape(rings[0].map(p => new THREE.Vector2(p[0] * scale, p[1] * scale)));
    shape.holes = rings.slice(1).map(r => new THREE.Path(r.map(p => new THREE.Vector2(p[0] * scale, p[1] * scale))));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity === 1
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.renderOrder = opacity < 1 ? 1 : 2;
    group.add(mesh);meshes.push(mesh);
  }
  return meshes;
}

function outline(group, geometry, color, height) {
  const coords = [];
  for (const rings of polygonParts(geometry)) for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) coords.push(...ring[i - 1], ...ring[i]);
  }
  segments(group, coords, color, height);
}

export function buildUrbanMap(root, assets, addLabel, inspectStation, activateProgressObject, seismicVisible, volumesVisible = true) {
  const {data} = assets;
  const progressPickables=[];
  const seismic = new THREE.Group();
  seismic.name = 'Respuesta sísmica';
  seismic.visible = seismicVisible;
  root.add(seismic);
  for (const zone of data.zones) polygons(seismic, zone.geometry, zone.color, 0.08, 0.68);
  segments(root, assets.buildings, '#344c60', 0.18);
  segments(root, assets.roads, '#839eaf', 0.24);
  const volumes = new THREE.Group(); volumes.visible = volumesVisible; root.add(volumes);
  const volumeGeometry = new THREE.BufferGeometry();
  volumeGeometry.setAttribute('position', new THREE.BufferAttribute(assets.volumes, 3));
  volumeGeometry.computeVertexNormals(); volumeGeometry.computeBoundingSphere();
  volumes.add(new THREE.Mesh(volumeGeometry, new THREE.MeshStandardMaterial({color:'#567c90',roughness:.9,side:THREE.DoubleSide})));
  segments(root, assets.volumeFootprints, '#527b8c', .21);
  segments(root, assets.parcels, '#d4ad74', .28);
  outline(root, assets.volumesData.corridor, '#ffcb66', .36);

  outline(root, data.pilot, '#32d4bd', 0.32);
  const routePoints = data.route.type === 'LineString' ? [data.route.coordinates] : data.route.coordinates;
  for (const coords of routePoints) {
    const curve = new THREE.CurvePath();
    for (let i = 1; i < coords.length; i++) curve.add(new THREE.LineCurve3(point(coords[i - 1], .65), point(coords[i], .65)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(100, coords.length * 2), .48, 6, false), new THREE.MeshBasicMaterial({color: '#ed1400'}));
    mesh.renderOrder = 4; mesh.userData.renderComparisonHidden=true;
    root.add(mesh);
  }
  for (const station of data.stations) {
    const stationMeshes=polygons(root, station.geometry, '#fff1bc', .85);
    outline(root, station.geometry, '#ffffff', .9);
    for(const mesh of stationMeshes){
      mesh.userData.progressObject={id:`station:${station.code}`,title:station.name,kind:'Estación',section:'Línea 1',parameters:{'Código':station.code,'Nombre':station.name,'Sistema de referencia':'EPSG:6247'}};
      progressPickables.push(mesh);
    }
    const label = addLabel(point(station.center, 1.5).toArray(), () => station.name,
      () => inspectStation({...station, kind: 'station', line: 0, geographic: true}), 'pilotLabel');
    label.geographic = true;
    label.offsetY = -22;
  }
  for (const road of data.roadLabels) {
    const label = addLabel(point(road.center, .4).toArray(), () => road.name, null, 'roadLabel');
    label.geographic = true;
  }
  // IFC-derived GLBs are loaded only when the user asks for a section. This
  // keeps the territorial scene light while preserving the validated ordinary
  // transforms and the shared project coordinates of every source model.
  const placement=assets.placement;
  const ifcGroup=new THREE.Group();ifcGroup.name='IFC E15–I16–E16 · Patio Taller 102–112';root.add(ifcGroup);
  const sections=new Map(),ifcSections={};
  for(const definition of assets.ifcModelDefs){
    if(!sections.has(definition.section)){
      const section=new THREE.Group();section.name='IFC '+definition.section;section.scale.setScalar(scale);section.position.y=placement.streetHeightInScene??.24;ifcGroup.add(section);sections.set(definition.section,{group:section,label:definition.label||('IFC · '+definition.section),definitions:[],bounds:null,promise:null,labelObject:null,elementCount:0,elementPickables:[],elementBounds:[],progressProxy:null});
    }
    sections.get(definition.section).definitions.push(definition);
  }
  const ptHqSections=new Set(['PT103','PT105','PT108','PT109','PT111','PT112']);
  const ptHqMaterialSpecs={
    IfcMember:['#445767',.72,.24,1],IfcBeam:['#687b89',.68,.18,1],IfcPlate:['#aeb9bf',.74,.08,1],
    IfcWallStandardCase:['#dce4e5',.82,.04,1],IfcWall:['#d5dfe1',.82,.04,1],IfcSlab:['#c7d1d3',.86,.03,1],
    IfcRoof:['#c1ccd0',.72,.08,1],IfcWindow:['#76abc0',.28,.16,.38],IfcCurtainWall:['#5f93a6',.32,.15,.44],
    IfcDoor:['#715743',.72,.06,1],IfcRailing:['#465b69',.58,.28,1],IfcStairFlight:['#9ba9af',.76,.08,1],
    IfcStair:['#9ba9af',.76,.08,1],IfcCovering:['#bbc6c8',.82,.03,1],IfcBuildingElementProxy:['#87969b',.76,.08,1],
    IfcFlowTerminal:['#697b83',.64,.18,1]
  };
  const ptHqMaterials=new Map();
  const materialForType=type=>{
    if(!ptHqMaterialSpecs[type])return null;
    if(!ptHqMaterials.has(type)){
      const [color,roughness,metalness,opacity]=ptHqMaterialSpecs[type];
      ptHqMaterials.set(type,new THREE.MeshBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:opacity>=1,side:THREE.DoubleSide,toneMapped:false}));
    }
    return ptHqMaterials.get(type);
  };
  const stylePtHq=model=>model.traverse(object=>{
    if(!object.isMesh)return;
    let node=object,type=null;
    while(node&&node!==model){if(node.name&&assets.ptHqTypes[node.name]){type=assets.ptHqTypes[node.name];break;}node=node.parent;}
    object.userData.ifcType=type||'IfcBuildingElementProxy';
    if(type==='IfcOpeningElement'){object.visible=false;return;}
    const material=materialForType(type)||materialForType('IfcBuildingElementProxy');object.material=material;if(material.transparent)object.renderOrder=4;
  });
  const markIfcProgressObjects=(model,definition,sectionName,entry)=>{
    let index=0;
    model.traverse(object=>{
      if(!object.isMesh||!object.visible)return;
      index++;
      let node=object,ifcType=object.userData.ifcType||'',ifcId='';
      while(node&&node!==model){if(node.name&&assets.ptHqTypes[node.name]){ifcType=ifcType||assets.ptHqTypes[node.name];ifcId=ifcId||node.name;}node=node.parent;}
      const elementName=object.name||`Elemento ${String(index).padStart(4,'0')}`;
      object.userData.progressObject=createIfcProgressObject({sectionName,definition,ifcType,ifcId,elementName,index,vertexCount:object.geometry?.getAttribute('position')?.count||0});
      entry.elementCount++;entry.elementPickables.push(object);
    });
  };
  const ifcBounds=new THREE.Box3();
  const ensureIfcSection=async sectionName=>{
    const entry=sections.get(sectionName);
    if(!entry){const error=new Error('Modelo no disponible');error.code='unavailable';throw error;}
    if(entry.bounds)return entry.bounds;
    if(entry.promise)return entry.promise;
    const available=entry.definitions.filter(definition=>definition.file&&definition.status!=='no-geometry');
    if(!available.length){const error=new Error('El IFC fuente no contiene geometría');error.code='no-geometry';throw error;}
    entry.promise=(async()=>{
      const loaded=await Promise.all(available.map(async definition=>({definition,scene:(await assets.ifcLoader.loadAsync('./'+definition.file+'?v='+assetRevision)).scene})));
      for(const asset of loaded){
        const model=asset.scene;
        if(ptHqSections.has(sectionName))stylePtHq(model);
        model.position.set(-placement.gisOrigin[0],-(asset.definition.streetDatum??placement.streetDatum),placement.gisOrigin[1]);
        markIfcProgressObjects(model,asset.definition,sectionName,entry);
        entry.group.add(model);
      }
      entry.group.updateMatrixWorld(true);
      entry.elementBounds=entry.elementPickables.map(mesh=>{
        if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
        return {mesh,bounds:mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)};
      });
      const sectionBounds=new THREE.Box3().setFromObject(entry.group,true);
      if(sectionBounds.isEmpty()){const error=new Error('El modelo convertido no contiene geometría visible');error.code='no-geometry';throw error;}
      entry.bounds=sectionBounds;ifcSections[sectionName]=sectionBounds;ifcBounds.union(sectionBounds);
      const sectionCenter=sectionBounds.getCenter(new THREE.Vector3());
      const sectionSize=sectionBounds.getSize(new THREE.Vector3());
      const proxy=new THREE.Mesh(new THREE.BoxGeometry(Math.max(sectionSize.x,.1),Math.max(sectionSize.y,.1),Math.max(sectionSize.z,.1)),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
      proxy.position.copy(sectionCenter);proxy.name='Selección '+sectionName;proxy.userData.progressObject={id:`ifc-section:${sectionName}`,title:entry.label,kind:'Modelo IFC',section:sectionName,parameters:{'Sección BIM':sectionName,'Archivos fuente':available.map(definition=>definition.file).join(', '),'Elementos 3D':entry.elementCount,'Sistema de referencia':'EPSG:6247','Ancho aproximado':`${sectionSize.x.toFixed(1)} m`,'Largo aproximado':`${sectionSize.z.toFixed(1)} m`,'Altura aproximada':`${sectionSize.y.toFixed(1)} m`}};root.add(proxy);entry.progressProxy=proxy;progressPickables.push(proxy);
      entry.labelObject=addLabel([sectionCenter.x,sectionBounds.max.y+.6,sectionCenter.z],()=>`<span class="bimSpotDot" aria-hidden="true">◎</span>${entry.label}`,event=>activateProgressObject?.({...proxy.userData.progressObject,mesh:proxy},event),'pilotLabel bimProgressSpot');entry.labelObject.geographic=true;entry.labelObject.ifcSection=sectionName;entry.labelObject.el.title='Consultar o registrar avance del edificio';applySectionAppearance(sectionName,entry);
      return sectionBounds;
    })().catch(error=>{entry.promise=null;throw error;});
    return entry.promise;
  };
  const ghostMaterial=new THREE.MeshBasicMaterial({color:'#a8cfdd',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,wireframe:true});
  let focusedSection=null;
  const applySectionAppearance=(name,entry)=>{
    const ghosted=Boolean(focusedSection&&name!==focusedSection);entry.group.visible=true;
    entry.group.traverse(object=>{
      if(!object.isMesh)return;
      if(!Object.prototype.hasOwnProperty.call(object.userData,'bimOriginalMaterial')){
        object.userData.bimOriginalMaterial=object.material;
        object.userData.bimOriginalRenderOrder=object.renderOrder;
      }
      object.material=ghosted?ghostMaterial:object.userData.bimOriginalMaterial;
      object.renderOrder=ghosted?1:object.userData.bimOriginalRenderOrder;
    });
    if(entry.labelObject){entry.labelObject.filterVisible=true;entry.labelObject.el?.classList.toggle('ifcGhostLabel',ghosted);}
  };
  const setIfcSectionVisibility=sectionName=>{focusedSection=sectionName||null;for(const [name,entry] of sections)applySectionAppearance(name,entry);};
  const pickProgressElement=raycaster=>{
    const candidates=[],intersectionPoint=new THREE.Vector3();
    for(const [name,entry] of sections){
      if(!entry.bounds||!entry.group.visible||!entry.elementBounds.length)continue;
      const point=raycaster.ray.intersectBox(entry.bounds,intersectionPoint);
      if(point)candidates.push({name,entry,distance:point.distanceTo(raycaster.ray.origin)});
    }
    candidates.sort((a,b)=>(b.name===focusedSection)-(a.name===focusedSection)||a.distance-b.distance);
    let nearest=null;
    for(const candidate of candidates.slice(0,4)){
      if(nearest&&candidate.distance>nearest.distance)break;
      const boxHits=[];
      for(const item of candidate.entry.elementBounds){
        const point=raycaster.ray.intersectBox(item.bounds,intersectionPoint);
        if(point)boxHits.push({mesh:item.mesh,distance:point.distanceTo(raycaster.ray.origin)});
      }
      boxHits.sort((a,b)=>a.distance-b.distance);
      for(const boxHit of boxHits){
        if(nearest&&boxHit.distance>nearest.distance)break;
        const hit=raycaster.intersectObject(boxHit.mesh,false)[0];
        if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;
      }
    }
    return nearest?{...nearest.object.userData.progressObject,mesh:nearest.object}:null;
  };
  const bounds = geometry => {
    const box = new THREE.Box3();
    const visit = c => typeof c[0] === 'number' ? box.expandByPoint(point(c)) : c.forEach(visit);
    visit(geometry.coordinates);
    return box;
  };
  const all = bounds(data.pilot);
  data.zones.forEach(z => all.union(bounds(z.geometry)));
  all.union(bounds(assets.volumesData.corridor));
  return {seismic, volumes, ifcBounds, ifcSections, progressPickables, pickProgressElement, ensureIfcSection, setIfcSectionVisibility, sectionDefinitions:sections, pilotBounds: bounds(data.pilot).union(bounds(assets.volumesData.corridor)), fullBounds: all};
}
