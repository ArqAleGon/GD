import {batchIfcRenderGeometry} from './ifc-render-batches.js?v=20261006-isolated-types';
import {buildIfcTypeInventory,applyIfcTypeFilter,summarizeIfcTypes} from './ifc-type-filters.js?v=20261006-isolated-types';
import {loadBimUrbanContext,buildBimUrbanContext} from './bim-urban-context.js';
import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';
import {MeshoptDecoder} from './meshopt_decoder.module.js';
import {createIfcProgressObject} from './ifc-progress.js?v=20260929-element-progress-v1';
import {rankedBoundHits,sectionPickCandidates} from './ifc-picking.js?v=20260930-element-picking-v1';

const scale = 0.06;
const assetRevision = '20261005-stations-i10';
const point = (p, height = 0) => new THREE.Vector3(p[0] * scale, height, -p[1] * scale);

export async function loadUrbanMap() {
  const read = async (name, binary = false) => {
    const response = await fetch('./assets/gis/' + name);
    if (!response.ok) throw new Error('No se pudo cargar la cartografía: ' + name);
    return binary ? response.arrayBuffer() : response.json();
  };
  const [data, buildings, roads, volumesData, volumes, volumeFootprints, parcels, placement, ptHqTypes, urbanContext, overviews, legacyTypes] = await Promise.all([
    read('map.json'), read('buildings.bin', true), read('roads.bin', true), read('volumes.json'), read('volumes.bin', true), read('volume-footprints.bin', true), read('parcels.bin', true),
    fetch('./ifc-placement-20260915-i16-e16.json?v='+assetRevision).then(r=>{if(!r.ok)throw new Error('IFC placement unavailable');return r.json()}),
    fetch('./pt-hq-element-types.json?v='+assetRevision).then(r=>{if(!r.ok)throw new Error('Patio high-fidelity type map unavailable');return r.json()}),
    loadBimUrbanContext(),
    fetch('./bim-overviews.json?v='+assetRevision).then(r=>r.ok?r.json():{}).catch(()=>({})),
    fetch('./ifc-legacy-types.json?v='+assetRevision).then(r=>{if(!r.ok)throw new Error('IFC source types unavailable');return r.json()})
  ]);
  const ifcLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ifcModelDefs=placement.models||[
    {file:'e15-architecture-web.glb',section:'E15',label:'IFC · E15 · ARQ + EST'},
    {file:'e15-1100.glb',section:'E15',label:'IFC · E15 · ARQ + EST'}
  ];
  return {legacyTypes, overviews, urbanContext, ifcLoader, ifcModelDefs, placement, ptHqTypes, data, volumesData, volumes: new Float32Array(volumes), volumeFootprints: new Float32Array(volumeFootprints), parcels: new Float32Array(parcels), buildings: new Float32Array(buildings), roads: new Float32Array(roads)};
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

export function buildUrbanMap(root, assets, addLabel, inspectStation, activateProgressObject, seismicVisible, volumesVisible = true, modelOnlySection = null) {
  const {data} = assets;
  const progressPickables=[];
  const seismic = new THREE.Group();
  seismic.name = 'Respuesta sísmica';
  seismic.visible = seismicVisible;
  root.add(seismic);
  const volumes=new THREE.Group();root.add(volumes);
  let urbanBounds=new THREE.Box3();
  if(!modelOnlySection){
  for (const zone of data.zones) polygons(seismic, zone.geometry, zone.color, 0.08, 0.68);
  segments(root, assets.buildings, '#344c60', 0.18);
  segments(root, assets.roads, '#839eaf', 0.24);
  volumes.visible = volumesVisible;
  urbanBounds=buildBimUrbanContext(volumes,assets.urbanContext,assets.placement.gisOrigin);
  segments(root, assets.parcels, '#d4ad74', .28);


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

  }
  for (const road of data.roadLabels) {
    const label = addLabel(point(road.center, .4).toArray(), () => road.name, null, 'roadLabel');
    label.geographic = true;
  }
  }
  // IFC-derived GLBs are loaded only when the user asks for a section. This
  // keeps the territorial scene light while preserving the validated ordinary
  // transforms and the shared project coordinates of every source model.
  const placement=assets.placement;
  const ifcGroup=new THREE.Group();ifcGroup.name='IFC E15–I16–E16 · Patio Taller 102–112';root.add(ifcGroup);
  const sections=new Map(),ifcSections={};let disposed=false;
  const disposeObject=object=>object.traverse(node=>{node.geometry?.dispose();for(const material of [node.material].flat())material?.dispose();});
  for(const definition of assets.ifcModelDefs){
    if(modelOnlySection&&definition.section!==modelOnlySection)continue;
    if(!sections.has(definition.section)){
      const section=new THREE.Group();section.name='IFC '+definition.section;section.scale.setScalar(scale);section.position.y=placement.streetHeightInScene??.24;ifcGroup.add(section);sections.set(definition.section,{group:section,label:definition.label||('IFC · '+definition.section),definitions:[],levelDefinitions:placement.stationLevels?.[definition.section]||[],streetDatum:definition.streetDatum??placement.streetDatum,bounds:null,promise:null,labelObject:null,elementCount:0,elementPickables:[],elementBounds:[],progressProxy:null});
    }
    sections.get(definition.section).definitions.push(definition);
  }
  const stationSections=new Set([...sections.keys()].filter(name=>/^[EI]\d{2}$/.test(name)));
  function createSectionLabel(sectionName,entry,position){
    const station=data.stations.find(item=>item.code===sectionName);
    const rail=stationSections.has(sectionName),name=rail?({E15:'Estación 15 · Calle 63',E16:'Estación 16 · Calle 72',I16:'Interestación E15–E16'}[sectionName]||station?.name||`${sectionName.startsWith('I')?'Interestación':'Estación'} ${sectionName.slice(1)}`):entry.label.replace(/^IFC\s*·\s*/, '');
    entry.labelObject=addLabel(position,()=>`<button class="bimBuildingName" data-model-action="consult" title="Consultar ${name}">${name}</button>`,async event=>{
      const action=event.target.closest('[data-model-action]')?.dataset.modelAction||'consult';
      document.dispatchEvent(new CustomEvent('bimmodelaction',{detail:{section:sectionName,action}}));
    },'pilotLabel bimProgressSpot'+(rail?' bimStationSpot':''));
    entry.labelObject.geographic=true;entry.labelObject.ifcSection=sectionName;
  }
  for(const station of data.stations){const entry=sections.get(station.code);if(entry)createSectionLabel(station.code,entry,point(station.center,2).toArray());}
  for(const [name,entry] of sections){
    const anchor=entry.definitions.find(definition=>definition.labelAnchor)?.labelAnchor;
    if(!entry.labelObject&&anchor)createSectionLabel(name,entry,point([anchor[0]-placement.gisOrigin[0],anchor[1]-placement.gisOrigin[1]],2).toArray());
  }
  const stationCenters=data.stations.filter(s=>['E15','E16'].includes(s.code)).map(s=>s.center);
  if(sections.has('I16')&&stationCenters.length===2)createSectionLabel('I16',sections.get('I16'),point([(stationCenters[0][0]+stationCenters[1][0])/2,(stationCenters[0][1]+stationCenters[1][1])/2],2).toArray());
  const savedVisibility=new Map();let isolatedSection=null;
  function isolateSection(name){
    if(isolatedSection){const previous=sections.get(isolatedSection);if(previous?.typeInventory)applyIfcTypeFilter(previous);}
    for(const [object,visible] of savedVisibility)object.visible=visible;savedVisibility.clear();isolatedSection=name||null;
    if(name){
      for(const object of root.children){if(object===ifcGroup)continue;savedVisibility.set(object,object.visible);object.visible=false;}
      for(const [key,entry] of sections){savedVisibility.set(entry.group,entry.group.visible);entry.group.visible=key===name;}
    }
    for(const [key,entry] of sections)if(entry.labelObject)entry.labelObject.filterVisible=!name||key===name;
    return isolatedSection;
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
    const instances=entry.ifcInstanceKeys||(entry.ifcInstanceKeys=new Set());
    model.traverse(object=>{
      if((!object.isMesh&&!object.isLine)||!object.visible)return;
      index++;
      let node=object,ifcType=object.userData.ifcType||'',ifcId='';
      while(node&&node!==model){if(node.name&&assets.ptHqTypes[node.name]){ifcType=ifcType||assets.ptHqTypes[node.name];ifcId=ifcId||node.name;}else if(/^[0-3][A-Za-z0-9_$]{21}$/.test(node.name||'')){ifcId=ifcId||node.name;ifcType=ifcType||assets.legacyTypes[definition.source+':'+node.name]?.type||'UnknownIfcType';}node=node.parent;}
      const elementName=object.name||`Elemento ${String(index).padStart(4,'0')}`;
      let metadata=object;
      while(metadata&&metadata!==model&&!metadata.userData.ifcGlobalId)metadata=metadata.parent;
      const instance=metadata?.userData.ifcGlobalId?metadata.userData:null;
      if(instance){ifcId=instance.ifcGlobalId;ifcType=instance.ifcType;object.userData.ifcType=ifcType;}
      object.userData.ifcGroupedGeometry=!instance&&!ifcId;
      object.userData.ifcType=object.userData.ifcGroupedGeometry?'GroupedGeometry':ifcType||'IfcBuildingElementProxy';
      object.userData.progressObject=createIfcProgressObject({sectionName,definition,ifcType,ifcId,elementName,index,vertexCount:object.geometry?.getAttribute('position')?.count||0});
      if(instance){
        object.userData.progressObject.id=`ifc-element:${sectionName}:${definition.source}:${ifcId}`;
        object.userData.progressObject.parameters['Nombre IFC']=instance.ifcName;
        object.userData.progressObject.parameters['ID numérico IFC']=instance.ifcExpressId;
        if(instance.ifcRepresentation==='Axis')object.userData.progressObject.parameters['Representación fuente']='Eje de referencia; el IFC no contiene un sólido Body para esta instancia';
        const instanceKey=definition.source+':'+ifcId;
        object.userData.ifcInstanceKey=instanceKey;
        if(!instances.has(instanceKey)){instances.add(instanceKey);entry.elementCount++;}
      }else{
        const instanceKey=ifcId?`${definition.source||definition.file}:${ifcId}`:object.userData.progressObject.id;
        object.userData.ifcInstanceKey=instanceKey;
        if(!object.userData.ifcGroupedGeometry&&!instances.has(instanceKey)){instances.add(instanceKey);entry.elementCount++;}
      }
      entry.elementPickables.push(object);
    });
  };
  const ifcBounds=new THREE.Box3();
  // Draw repeated geometry in one GPU call; retain original meshes for
  // source-qualified instance picking and per-element bounds.
  const ensureIfcSection=async sectionName=>{
    const entry=sections.get(sectionName);
    if(!entry){const error=new Error('Modelo no disponible');error.code='unavailable';throw error;}
    if(entry.bounds)return entry.bounds;
    if(entry.promise)return entry.promise;
    const available=entry.definitions.filter(definition=>definition.file&&definition.status!=='no-geometry');
    if(!available.length){const error=new Error('El IFC fuente no contiene geometría');error.code='no-geometry';throw error;}
    entry.promise=(async()=>{
      const loaded=new Array(available.length);let nextAsset=0;
      await Promise.all(Array.from({length:Math.min(4,available.length)},async()=>{
        while(nextAsset<available.length&&!disposed){
          const index=nextAsset++,definition=available[index];
          const url='./'+definition.file+'?v='+assetRevision;
          let asset;
          if(definition.file.endsWith('.gz')){
            const response=await fetch(url);if(!response.ok)throw new Error('No se pudo cargar '+definition.file);
            const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
            asset=await assets.ifcLoader.parseAsync(await new Response(stream).arrayBuffer(),'./');
          }else asset=await assets.ifcLoader.loadAsync(url);
          loaded[index]={definition,scene:asset.scene};
        }
      }));
      if(disposed){for(const asset of loaded)if(asset)disposeObject(asset.scene);throw new Error('Scene closed');}
      for(const asset of loaded){
        const model=asset.scene;
        if(ptHqSections.has(sectionName))stylePtHq(model);
        if(asset.definition.displayTransform)model.applyMatrix4(new THREE.Matrix4().fromArray(asset.definition.displayTransform));
        model.position.add(new THREE.Vector3(-placement.gisOrigin[0],-(asset.definition.streetDatum??placement.streetDatum),placement.gisOrigin[1]));
        markIfcProgressObjects(model,asset.definition,sectionName,entry);
        if(!modelOnlySection)batchIfcRenderGeometry(model);
        entry.group.add(model);
      }
      if(disposed){for(const asset of loaded)disposeObject(asset.scene);throw new Error('Scene closed');}
      if(entry.overview){entry.group.remove(entry.overview);disposeObject(entry.overview);entry.overview=null;}
      entry.group.updateMatrixWorld(true);
      entry.typeInventory=buildIfcTypeInventory(entry.elementPickables);
      entry.elementBounds=entry.elementPickables.map(mesh=>{
        if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
        const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        if(mesh.isLine)bounds.expandByScalar(.02);
        return {mesh,bounds};
      });
      // Axis-only source references can be incorrectly positioned in the IFC.
      // Keep their source coordinates, but fit the real building bodies and
      // suppress disconnected axes instead of inventing replacement solids.
      const sectionBounds=new THREE.Box3();
      const instanceSources=available.some(definition=>definition.instanceIdentity==='ifc-globalid');
      if(instanceSources){
        for(const item of entry.elementBounds)if(!item.mesh.isLine)sectionBounds.union(item.bounds);
        const referenceEnvelope=sectionBounds.clone().expandByScalar(scale);
        entry.excludedAxisCount=0;
        entry.elementBounds=entry.elementBounds.filter(item=>{
          if(!item.mesh.isLine||referenceEnvelope.intersectsBox(item.bounds))return true;
          item.mesh.visible=false;item.mesh.userData.ifcSourceAxisOutlier=true;entry.excludedAxisCount++;return false;
        });
        entry.elementPickables=entry.elementBounds.map(item=>item.mesh);
      }else sectionBounds.setFromObject(entry.group,true);
      if(sectionBounds.isEmpty()){const error=new Error('El modelo convertido no contiene geometría visible');error.code='no-geometry';throw error;}
      if(!modelOnlySection)entry.group.traverse(object=>{object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;});
      entry.bounds=sectionBounds;ifcSections[sectionName]=sectionBounds;ifcBounds.union(sectionBounds);
      const sectionCenter=sectionBounds.getCenter(new THREE.Vector3());
      const sectionSize=sectionBounds.getSize(new THREE.Vector3());
      const proxy=new THREE.Mesh(new THREE.BoxGeometry(Math.max(sectionSize.x,.1),Math.max(sectionSize.y,.1),Math.max(sectionSize.z,.1)),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
      proxy.position.copy(sectionCenter);proxy.name='Selección '+sectionName;proxy.userData.progressObject={id:`ifc-section:${sectionName}`,title:entry.label,kind:'Modelo IFC',section:sectionName,parameters:{'Sección BIM':sectionName,'Archivos fuente':[...new Set(available.map(definition=>definition.source||definition.file))].join(', '),'Partes web':available.length,'Instancias IFC':entry.elementCount,...(entry.typeInventory.some(instance=>instance.grouped)?{'Geometría agrupada':'Contiene grupos sin identidad IFC individual; no se cuentan como instancias ni permiten registro'}:{}),...(entry.excludedAxisCount?{'Ejes fuera del edificio':`${entry.excludedAxisCount} referencias del IFC fuente excluidas de la vista`}:{}),'Sistema de referencia':'EPSG:6247','Ancho aproximado':`${(sectionSize.x/scale).toFixed(1)} m`,'Largo aproximado':`${(sectionSize.z/scale).toFixed(1)} m`,'Altura aproximada':`${(sectionSize.y/scale).toFixed(1)} m`}};root.add(proxy);entry.progressProxy=proxy;progressPickables.push(proxy);
      if(entry.labelObject)entry.labelObject.pos.set(sectionCenter.x,sectionBounds.max.y+.6,sectionCenter.z);
      else createSectionLabel(sectionName,entry,[sectionCenter.x,sectionBounds.max.y+.6,sectionCenter.z]);
      applySectionAppearance(sectionName,entry);
      return sectionBounds;
    })().catch(error=>{entry.promise=null;throw error;});
    return entry.promise;
  };
  const ensureOverview=async sectionName=>{
    const entry=sections.get(sectionName),definition=assets.overviews?.[sectionName];
    if(disposed)throw new Error('Scene closed');
    if(entry.bounds||entry.overview)return;
    if(!definition?.file)return ensureIfcSection(sectionName);
    const response=await fetch('./'+definition.file+'?v='+assetRevision);
    if(!response.ok)throw new Error('No se pudo cargar '+sectionName);
    const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const asset=await assets.ifcLoader.parseAsync(bytes,'./');
    if(disposed||entry.bounds){disposeObject(asset.scene);return;}
    asset.scene.position.set(-placement.gisOrigin[0],-entry.streetDatum,placement.gisOrigin[1]);
    entry.overview=asset.scene;entry.group.add(asset.scene);applySectionAppearance(sectionName,entry);
  };
  const ghostMaterial=new THREE.MeshBasicMaterial({color:'#a8cfdd',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,wireframe:true});
  let focusedSection=null;
  const applySectionAppearance=(name,entry)=>{
    const ghosted=Boolean(focusedSection&&name!==focusedSection);entry.group.visible=!isolatedSection||name===isolatedSection;
    entry.group.traverse(object=>{
      if(!object.isMesh)return;
      if(!Object.prototype.hasOwnProperty.call(object.userData,'bimOriginalMaterial')){
        object.userData.bimOriginalMaterial=object.material;
        object.userData.bimOriginalRenderOrder=object.renderOrder;
      }
      object.material=ghosted?ghostMaterial:object.userData.bimOriginalMaterial;
      object.renderOrder=ghosted?1:object.userData.bimOriginalRenderOrder;
    });
    if(entry.labelObject){entry.labelObject.filterVisible=!isolatedSection||name===isolatedSection;entry.labelObject.el?.classList.toggle('ifcGhostLabel',ghosted);}
  };
  const setIfcSectionVisibility=sectionName=>{focusedSection=sectionName||null;for(const [name,entry] of sections)applySectionAppearance(name,entry);};
  const pickProgressElement=raycaster=>{
    raycaster.params.Line.threshold=.02;
    const candidates=[],intersectionPoint=new THREE.Vector3();
    for(const [name,entry] of sections){
      if(!entry.bounds||!entry.group.visible||!entry.elementBounds.length)continue;
      const point=raycaster.ray.intersectBox(entry.bounds,intersectionPoint);
      if(point)candidates.push({name,entry,distance:point.distanceTo(raycaster.ray.origin)});
    }
    let nearest=null,nearestBox=null;
    for(const candidate of sectionPickCandidates(candidates,focusedSection)){
      if(nearest&&candidate.distance>nearest.distance)break;
      const boxHits=rankedBoundHits(raycaster.ray,candidate.entry.elementBounds.filter(item=>!item.mesh.userData.ifcTypeHidden&&!item.mesh.userData.ifcGroupedGeometry),intersectionPoint);
      if(boxHits[0]&&(!nearestBox||boxHits[0].distance<nearestBox.distance))nearestBox=boxHits[0];
      for(const boxHit of boxHits){
        if(nearest&&boxHit.distance>nearest.distance)break;
        const hit=raycaster.intersectObject(boxHit.mesh,false)[0];
        if(hit&&(!nearest||hit.distance<nearest.distance))nearest=hit;
      }
    }
    const mesh=nearest?.object||nearestBox?.mesh;
    return mesh?{...mesh.userData.progressObject,mesh}:null;
  };
  const bounds = geometry => {
    const box = new THREE.Box3();
    const visit = c => typeof c[0] === 'number' ? box.expandByPoint(point(c)) : c.forEach(visit);
    visit(geometry.coordinates);
    return box;
  };
  const all = bounds(data.pilot);
  data.zones.forEach(z => all.union(bounds(z.geometry)));
  all.union(urbanBounds);
  const overviewBounds=new THREE.Box3();
  for(const [name,entry] of sections){
    if(entry.labelObject)overviewBounds.expandByPoint(entry.labelObject.pos);
    const preview=assets.overviews?.[name];
    if(preview)for(const corner of [preview.bounds.min,preview.bounds.max])overviewBounds.expandByPoint(new THREE.Vector3((corner[0]-placement.gisOrigin[0])*scale,(corner[1]-entry.streetDatum)*scale+.24,(corner[2]+placement.gisOrigin[1])*scale));
  }
  if(overviewBounds.isEmpty())overviewBounds.copy(all);else overviewBounds.expandByScalar(12);
  const getIfcTypeSummary=name=>{const entry=sections.get(name);return entry?.typeInventory?summarizeIfcTypes(entry.typeInventory,entry.enabledIfcTypes):null;};
  const filterIfcTypes=(name,types)=>{const entry=sections.get(name);if(name!==isolatedSection||!entry?.typeInventory)return null;return applyIfcTypeFilter(entry,types===null?null:new Set(types));};
  return {disposePending:()=>{disposed=true;},getIfcTypeSummary,filterIfcTypes,ensureOverview,overviewBounds,isolateSection, seismic, volumes, ifcBounds, ifcSections, progressPickables, pickProgressElement, ensureIfcSection, setIfcSectionVisibility, sectionDefinitions:sections, pilotBounds: bounds(data.pilot).union(bounds(assets.volumesData.corridor)), fullBounds: all};
}

