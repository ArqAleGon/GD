import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildIfcTypeInventory,applyIfcTypeFilter} from './ifc-type-filters.js';
import {rankedBoundHits} from './ifc-picking.js';
import * as THREE from './vendor/three.module.js';
// Resolve the browser's import-map dependency to the same vendored Three.js in Node.
const source=(await fs.readFile(new URL('./ifc-render-batches.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('./vendor/three.module.js',import.meta.url).href}'`);
const {batchIfcRenderGeometry}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const group=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial();
function add(id,type,instanceKey=id,geo=geometry){
 const mesh=new THREE.Mesh(geo,material);mesh.userData={ifcType:type,ifcInstanceKey:instanceKey,progressObject:{id,parameters:{'Clase IFC':type}}};group.add(mesh);return mesh;
}
const wall1=add('legacy-key:1','IfcWall','source-a:guid-1'),wallPrimitive=add('legacy-key:2','IfcWall','source-a:guid-1');
const wall2=add('source-a:guid-2','IfcWall'),wall3=add('source-b:guid-1','IfcWall');
const slab1=add('slab-1','IfcSlab'),slab2=add('slab-2','IfcSlab');
// A source Axis reference remains in the count but must never be made visible again.
const axis=add('axis-1','IfcBeam',undefined,new THREE.BoxGeometry());axis.userData.ifcSourceAxisOutlier=true;axis.visible=false;
const originals=[wall1,wallPrimitive,wall2,wall3,slab1,slab2,axis];
batchIfcRenderGeometry(group);
const batches=group.children.filter(x=>x.userData.ifcRenderBatch);
assert.equal(batches.length,2);assert.deepEqual(new Set(batches.map(x=>x.userData.ifcType)),new Set(['IfcWall','IfcSlab']));
const entry={group,typeInventory:buildIfcTypeInventory(originals)};
assert.equal(entry.typeInventory.length,6);assert.equal(wall1.userData.progressObject.id,'legacy-key:1');
let summary=applyIfcTypeFilter(entry,new Set(['IfcSlab']));
assert.equal(summary.total,6);assert.equal(summary.visible,2);
assert.equal(batches.find(x=>x.userData.ifcType==='IfcWall').visible,false);
assert.equal(batches.find(x=>x.userData.ifcType==='IfcSlab').visible,true);
assert(originals.filter(x=>x.userData.ifcType==='IfcWall').every(x=>x.userData.ifcTypeHidden));
assert(slab1.userData.ifcBatchedOriginal&&!slab1.visible);
const point={distanceTo(){return 1;}},ray={origin:{},intersectBox(){return point;}};
assert.equal(rankedBoundHits(ray,originals.filter(x=>!x.userData.ifcTypeHidden&&!x.userData.ifcSourceAxisOutlier).map(mesh=>({mesh,bounds:{}})),point).length,2);
summary=applyIfcTypeFilter(entry,new Set());assert.equal(summary.visible,0);assert(batches.every(x=>!x.visible));
summary=applyIfcTypeFilter(entry);assert.equal(summary.visible,5);assert.equal(summary.total,6);assert.equal(axis.visible,false);assert(batches.every(x=>x.visible));
assert.equal(summary.types.find(x=>x.type==='IfcWall').total,3);
assert.equal(summary.types.find(x=>x.type==='IfcBeam').enabled,true);
const legacyGroup=add('old-material-group','GroupedGeometry');legacyGroup.userData.ifcGroupedGeometry=true;
entry.typeInventory=buildIfcTypeInventory([...originals,legacyGroup]);
summary=applyIfcTypeFilter(entry);assert.equal(summary.total,6);assert.equal(summary.groups,1);assert.equal(summary.visibleGroups,1);
assert.equal(summary.types.find(x=>x.type==='GroupedGeometry').total,1);
summary=applyIfcTypeFilter(entry,new Set(['IfcSlab']));assert.equal(summary.visible,2);assert.equal(summary.visibleGroups,0);assert.equal(legacyGroup.visible,false);
assert.throws(()=>buildIfcTypeInventory([wall1,{userData:{ifcInstanceKey:'source-a:guid-1',ifcType:'IfcSlab',progressObject:{id:'conflict',parameters:{}}}}]),/Conflicting IFC class/);
console.log('IFC filters: source identities, material deduplication, typed GPU batches, hidden picking, quantities and Axis suppression PASS');
