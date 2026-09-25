import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const manifest=JSON.parse(readFileSync(new URL('./patio-models-20260924.json',import.meta.url)));
const placement=JSON.parse(readFileSync(new URL('./ifc-placement-20260915-i16-e16.json',import.meta.url)));
const requiredSections=['PT102','PT103','PT104','PT105','PT106'];

assert.equal(manifest.models.length,7);
assert.deepEqual([...new Set(manifest.models.map(model=>model.section))],requiredSections);
assert.equal(manifest.models.reduce((sum,model)=>sum+model.converted,0),34022);

for(const model of manifest.models){
 const file=new URL(model.file,import.meta.url);
 assert.equal(readFileSync(file).readUInt32LE(0),0x46546c67);
 assert.equal(statSync(file).size,model.bytes);
 assert.ok(model.bytes<100_000_000);
 assert.equal(model.loadedAt,'24/09/2026');
 assert.equal(model.streetDatum,2541.5);
 const placed=placement.models.find(item=>item.source===model.source);
 assert.ok(placed,`Missing placement for ${model.source}`);
 assert.equal(placed.section,model.section);
}

console.log('7 Patio Taller IFC files, 5 sections, geometry and placement verified');
