import assert from 'node:assert/strict';
import {OBJECT_PROGRESS_STORAGE_KEY,appendProgressRecord,loadProgressRecords,recordsForObject,summarizeProgress} from './object-progress.js';

class MemoryStorage{
  constructor(){this.values=new Map();}
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){this.values.set(key,String(value));}
}

const storage=new MemoryStorage();
appendProgressRecord(storage,{objectId:'ifc:PT102:1',objectTitle:'PT102 · Muro',kind:'IFC',section:'PT102',userName:'Usuario A',date:'2026-09-20',progress:25},new Date('2026-09-20T15:00:00Z'));
appendProgressRecord(storage,{objectId:'ifc:PT102:1',objectTitle:'PT102 · Muro',kind:'IFC',section:'PT102',userName:'Usuario B',date:'2026-09-21',progress:60},new Date('2026-09-21T15:00:00Z'));
appendProgressRecord(storage,{objectId:'ifc:PT104:1',objectTitle:'PT104 · Cubierta',kind:'IFC',section:'PT104',userName:'Usuario A',date:'2026-09-21',progress:100},new Date('2026-09-21T16:00:00Z'));

const records=loadProgressRecords(storage),summary=summarizeProgress(records);
assert.equal(records.length,3);
assert.equal(recordsForObject(records,'ifc:PT102:1')[0].progress,60);
assert.equal(summary.objects,2);
assert.equal(summary.totalRecords,3);
assert.equal(summary.average,80);
assert.equal(summary.completed,1);
assert.equal(summary.inProgress,1);
assert.equal(summary.sections.find(section=>section.name==='PT102').progress,60);
assert.ok(storage.getItem(OBJECT_PROGRESS_STORAGE_KEY));
assert.throws(()=>appendProgressRecord(storage,{objectId:'x',objectTitle:'X',userName:'',date:'2026-09-21',progress:20}),/nombre de usuario/);
assert.throws(()=>appendProgressRecord(storage,{objectId:'x',objectTitle:'X',userName:'A',date:'2026-09-21',progress:120}),/entre 0 y 100/);
console.log('Object progress persistence, history and execution summaries verified');
