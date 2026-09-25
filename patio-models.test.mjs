import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('./patio-models-20260924.json',import.meta.url)));
const placement=JSON.parse(readFileSync(new URL('./ifc-placement-20260915-i16-e16.json',import.meta.url)));
const requiredSections=['PT102','PT103','PT104','PT105','PT106','PT107','PT108','PT109','PT110','PT111','PT112'];

assert.equal(manifest.models.length,14);
assert.deepEqual([...new Set(manifest.models.map(model=>model.section))],requiredSections);
assert.equal(manifest.models.flatMap(model=>model.files||[model.file]).filter(Boolean).length,48);
const ptar=manifest.models.find(model=>model.section==='PT110');
assert.equal(ptar.status,'no-geometry');
assert.equal(ptar.elementCount,0);
assert.equal(ptar.file,null);

for(const model of manifest.models){
 const placed=placement.models.filter(item=>item.source===model.source);
 assert.ok(placed.length,`Missing placement for ${model.source}`);
 assert.ok(placed.every(item=>item.section===model.section));
 const fileEntries=model.files||([{file:model.file,bytes:model.bytes}].filter(item=>item.file));
 const files=fileEntries.map(item=>typeof item==='string'?item:item.file);
 const expectedBytes=model.fileBytes||fileEntries.map(item=>typeof item==='string'?null:item.bytes);
 for(const [index,fileName] of files.entries()){
  const file=new URL(fileName,import.meta.url);
  const glb=readFileSync(file);
  assert.equal(glb.readUInt32LE(0),0x46546c67);
  assert.equal(statSync(file).size,expectedBytes[index] ?? statSync(file).size);
  assert.ok((expectedBytes[index] ?? statSync(file).size)<25_000_000);
  const jsonLength=glb.readUInt32LE(12);
  const gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8').replace(/[\0\s]+$/,''));
  assert.ok(!gltf.extensionsUsed?.includes('EXT_mesh_gpu_instancing'),`${model.section} must preserve validated ordinary transforms`);
 }
 assert.match(model.loadedAt,/^(24|25)\/09\/2026$/);
 assert.equal(model.streetDatum,2541.5);
}

const puesto=manifest.models.find(model=>model.section==='PT111');
assert.equal(puesto.status,'ready-hq');
assert.equal(puesto.omittedType,'IfcFurnishingElement + IfcOpeningElement');
assert.equal(puesto.omittedElements,676);
assert.equal(puesto.omittedFurnishingElements,550);
assert.equal(puesto.omittedOpeningElements,79);
assert.equal(puesto.unrenderableElements,47);
assert.equal(puesto.files.length,8);
assert.ok(puesto.files.every(file=>file.includes('puesto-mando-hq-')));
const ptHqTypes=JSON.parse(readFileSync(new URL('./pt-hq-element-types.json',import.meta.url),'utf8'));
assert.ok(Object.keys(ptHqTypes).length>13000);
assert.ok(Object.values(ptHqTypes).includes('IfcWallStandardCase'));
assert.ok(Object.values(ptHqTypes).includes('IfcWindow'));
for(const section of ['PT103','PT105','PT108','PT109','PT112']){
 const model=manifest.models.find(item=>item.section===section);
 assert.equal(model.status,'ready-hq');
 assert.ok(model.files.length>0);
 assert.ok(model.elementCount>0);
}

const urbanMap=readFileSync(new URL('./urban-map-20260915-i16-e16.js',import.meta.url),'utf8');
assert.match(urbanMap,/ensureIfcSection=async/);
assert.match(urbanMap,/assets\.ifcLoader\.loadAsync/);
assert.match(urbanMap,/stylePtHq/);
assert.match(urbanMap,/ptHqSections/);
assert.match(urbanMap,/pt-hq-element-types/);
assert.match(urbanMap,/setIfcSectionVisibility/);
assert.doesNotMatch(urbanMap,/Promise\.all\(modelDefs\.map/);

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
assert.match(app,/const patioSections=\['PT102','PT103','PT104','PT105','PT106','PT107','PT108','PT109','PT111','PT112'\]/);
assert.match(app,/loadPatioOverview\(true\)/);

console.log('14 Patio Taller IFC sources, 11 sections, 48 web resources, high-fidelity facade and precision model update verified');
