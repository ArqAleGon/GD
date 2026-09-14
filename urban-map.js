import * as THREE from 'three';
import {GLTFLoader} from './GLTFLoader.js';

const scale = 0.06;
const point = (p, height = 0) => new THREE.Vector3(p[0] * scale, height, -p[1] * scale);

export async function loadUrbanMap() {
  const read = async (name, binary = false) => {
    const response = await fetch('./assets/gis/' + name);
    if (!response.ok) throw new Error('No se pudo cargar la cartografía: ' + name);
    return binary ? response.arrayBuffer() : response.json();
  };
  const [data, buildings, roads, volumesData, volumes, volumeFootprints, parcels] = await Promise.all([
    read('map.json'), read('buildings.bin', true), read('roads.bin', true), read('volumes.json'), read('volumes.bin', true), read('volume-footprints.bin', true), read('parcels.bin', true)
  ]);
  const [ifc, placement] = await Promise.all([new GLTFLoader().loadAsync('./e15-1100.glb'), fetch('./e15-placement.json').then(r=>{if(!r.ok)throw new Error('IFC placement unavailable');return r.json()})]);
  return {ifc:ifc.scene, placement, data, volumesData, volumes: new Float32Array(volumes), volumeFootprints: new Float32Array(volumeFootprints), parcels: new Float32Array(parcels), buildings: new Float32Array(buildings), roads: new Float32Array(roads)};
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
  for (const rings of polygonParts(geometry)) {
    const shape = new THREE.Shape(rings[0].map(p => new THREE.Vector2(p[0] * scale, p[1] * scale)));
    shape.holes = rings.slice(1).map(r => new THREE.Path(r.map(p => new THREE.Vector2(p[0] * scale, p[1] * scale))));
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity === 1
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.renderOrder = opacity < 1 ? 1 : 2;
    group.add(mesh);
  }
}

function outline(group, geometry, color, height) {
  const coords = [];
  for (const rings of polygonParts(geometry)) for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) coords.push(...ring[i - 1], ...ring[i]);
  }
  segments(group, coords, color, height);
}

export function buildUrbanMap(root, assets, addLabel, inspectStation, seismicVisible, volumesVisible = true) {
  const {data} = assets;
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
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(100, coords.length * 2), .48, 6, false), new THREE.MeshBasicMaterial({color: '#ff334f'}));
    mesh.renderOrder = 4;
    root.add(mesh);
  }
  for (const station of data.stations) {
    polygons(root, station.geometry, '#fff1bc', .85);
    outline(root, station.geometry, '#ffffff', .9);
    const label = addLabel(point(station.center, 1.5).toArray(), () => station.name,
      () => inspectStation({...station, kind: 'station', line: 0, geographic: true}), 'pilotLabel');
    label.geographic = true;
    label.offsetY = -22;
  }
  for (const road of data.roadLabels) {
    const label = addLabel(point(road.center, .4).toArray(), () => road.name, null, 'roadLabel');
    label.geographic = true;
  }
  // Preserve the IFC asset; apply one reversible placement to the entire model.
  const placement=assets.placement, model=assets.ifc.clone(true);
  model.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});
  model.position.set(-placement.sourceCenterXY[0],-placement.verticalDatumAssumed,placement.sourceCenterXY[1]);
  const ifcGroup=new THREE.Group();ifcGroup.name='IFC E15 1100';ifcGroup.add(model);
  ifcGroup.rotation.y=placement.rotationZRadians;ifcGroup.scale.setScalar(scale);
  ifcGroup.position.copy(point(placement.targetRelativeXY,.24));root.add(ifcGroup);ifcGroup.updateMatrixWorld(true);
  const ifcBounds=new THREE.Box3().setFromObject(ifcGroup,true);
  const ifcLabel=addLabel([ifcGroup.position.x,ifcBounds.max.y+.6,ifcGroup.position.z],()=> 'IFC · E15 · 1100',null,'pilotLabel');ifcLabel.geographic=true;
  const bounds = geometry => {
    const box = new THREE.Box3();
    const visit = c => typeof c[0] === 'number' ? box.expandByPoint(point(c)) : c.forEach(visit);
    visit(geometry.coordinates);
    return box;
  };
  const all = bounds(data.pilot);
  data.zones.forEach(z => all.union(bounds(z.geometry)));
  all.union(bounds(assets.volumesData.corridor));
  return {seismic, volumes, ifcBounds, pilotBounds: bounds(data.pilot).union(bounds(assets.volumesData.corridor)), fullBounds: all};
}
