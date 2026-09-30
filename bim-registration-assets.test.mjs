import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'bim-registration-models.json'),'utf8'));
const ready=Object.values(manifest.sections).filter(entry=>entry.status==='ready');
assert.equal(ready.length,10);
assert.equal(manifest.sections.PT110.status,'no-geometry');

for(const entry of ready){
  assert.ok(entry.files.length>0,`${entry.section} necesita geometría`);
  const payload=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,entry.data))));
  assert.equal(payload.section,entry.section);
  assert.ok(Object.keys(payload.elements).length>0,`${entry.section} necesita metadatos`);
  let namedNodes=0,matchedNodes=0;
  for(const relative of entry.files){
    const file=path.join(root,relative);assert.ok(fs.existsSync(file),relative);
    const data=fs.readFileSync(file),jsonLength=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+jsonLength).toString('utf8').replace(/\0+$/,''));
    for(const node of gltf.nodes||[])if(node.name){namedNodes++;if(payload.elements[node.name])matchedNodes++;}
  }
  assert.ok(namedNodes>0,`${entry.section} necesita nodos seleccionables`);
  assert.ok(matchedNodes/namedNodes>.8,`${entry.section} debe relacionar los nodos con sus propiedades IFC`);
}
console.log(`${ready.length} modelos de registro, geometría aislada y metadatos IFC verificados`);

