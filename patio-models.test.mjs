import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('./patio-models-20260924.json',import.meta.url)));
const placement=JSON.parse(readFileSync(new URL('./ifc-placement-20260915-i16-e16.json',import.meta.url)));
const requiredSections=['PT102','PT103','PT104','PT105','PT106','PT107','PT108','PT109','PT110','PT111','PT112'];

assert.equal(manifest.models.length,14);
assert.deepEqual([...new Set(manifest.models.map(model=>model.section))],requiredSections);
assert.equal(manifest.models.flatMap(model=>model.files||[model.file]).filter(Boolean).length,17);
const ptar=manifest.models.find(model=>model.section==='PT110');
assert.equal(ptar.status,'no-geometry');
assert.equal(ptar.elementCount,0);
assert.equal(ptar.file,null);

for(const model of manifest.models){
 const placed=placement.models.filter(item=>item.source===model.source);
 assert.ok(placed.length,`Missing placement for ${model.source}`);
 assert.ok(placed.every(item=>item.section===model.section));
 const files=model.files||[model.file].filter(Boolean);
 const expectedBytes=model.fileBytes||[model.bytes];
 for(const [index,fileName] of files.entries()){
  const file=new URL(fileName,import.meta.url);
  const glb=readFileSync(file);
  assert.equal(glb.readUInt32LE(0),0x46546c67);
  assert.equal(statSync(file).size,expectedBytes[index]);
  assert.ok(expectedBytes[index]<25_000_000);
  const jsonLength=glb.readUInt32LE(12);
  const gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8').replace(/[\0\s]+$/,''));
  assert.ok(!gltf.extensionsUsed?.includes('EXT_mesh_gpu_instancing'),`${model.section} must preserve validated ordinary transforms`);
 }
 assert.match(model.loadedAt,/^(24|25)\/09\/2026$/);
 assert.equal(model.streetDatum,2541.5);
}

const puesto=manifest.models.find(model=>model.section==='PT111');
assert.equal(puesto.status,'ready-shell');
assert.equal(puesto.omittedType,'IfcFurnishingElement');
assert.equal(puesto.omittedElements,598);

const urbanMap=readFileSync(new URL('./urban-map-20260915-i16-e16.js',import.meta.url),'utf8');
assert.match(urbanMap,/ensureIfcSection=async/);
assert.match(urbanMap,/assets\.ifcLoader\.loadAsync/);
assert.doesNotMatch(urbanMap,/Promise\.all\(modelDefs\.map/);

console.log('14 Patio Taller IFC sources, 11 sections, 17 lazy web resources, geometry and placement verified');
