import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {normalizeUE} from './bim-state.js';
const {models}=JSON.parse(readFileSync(new URL('./bim-ue-elements.json',import.meta.url)));
assert.equal(models.length,8);
for(const m of models){
 assert.equal(m.groups.reduce((n,g)=>n+g.count,0),m.converted);
 for(const g of m.groups){const file=new URL(g.geometry,import.meta.url);assert.ok(statSync(file).size>20);assert.equal(readFileSync(file).readUInt32LE(0),0x46546c67);}
}
for(const [ue,count,nmodels] of [['93',160,3],['202',339,2]]){
 const selected=models.flatMap(m=>m.groups.filter(g=>g.ues.map(normalizeUE).includes(ue)).map(g=>({...g,file:m.file})));
 assert.equal(selected.reduce((n,g)=>n+g.count,0),count);assert.equal(new Set(selected.map(g=>g.file)).size,nmodels);
}
console.log('8 model totals, all geometry files and cross-model UE 93/202 verified');
