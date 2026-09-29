import assert from 'node:assert/strict';
import {createIfcProgressObject,ifcElementLabel} from './ifc-progress.js';
import {appendProgressRecord,summarizeProgress} from './object-progress.js';

assert.equal(ifcElementLabel('IfcWallStandardCase'),'Muro');
assert.equal(ifcElementLabel('IfcSlab'),'Losa / piso');
assert.equal(ifcElementLabel('IfcWindow'),'Ventana');
assert.equal(ifcElementLabel('IfcFlowTerminal'),'Luminaria / terminal');

const wall=createIfcProgressObject({sectionName:'PT108',definition:{source:'modelo-108.ifc',file:'modelo-108.glb'},ifcType:'IfcWallStandardCase',ifcId:'3WeoLR7tfAR947ZHp0xiJT',elementName:'Mesh_12',index:12,vertexCount:240});
const window=createIfcProgressObject({sectionName:'PT108',definition:{source:'modelo-108.ifc',file:'modelo-108.glb'},ifcType:'IfcWindow',ifcId:'2KZkLk_4564BZ7dJqQ6VwA',elementName:'Mesh_13',index:13,vertexCount:96});

assert.match(wall.title,/^Muro · /);
assert.equal(wall.parameters['Archivo IFC fuente'],'modelo-108.ifc');
assert.equal(wall.parameters['Clase IFC'],'IfcWallStandardCase');
assert.equal(wall.parameters.Vértices,240);
assert.notEqual(wall.id,window.id);

const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
const first=appendProgressRecord(storage,{objectId:wall.id,objectTitle:wall.title,kind:wall.kind,section:wall.section,userName:'Control QA',date:'2026-09-29',progress:35},new Date('2026-09-29T15:00:00Z'));
const second=appendProgressRecord(storage,{objectId:window.id,objectTitle:window.title,kind:window.kind,section:window.section,userName:'Control QA',date:'2026-09-29',progress:70},new Date('2026-09-29T15:01:00Z'));
const summary=summarizeProgress(second.records);
assert.equal(first.record.kind,'Elemento IFC');
assert.equal(summary.objects,2);
assert.deepEqual(summary.sections.map(section=>[section.name,section.count,section.progress]),[['PT108',2,52.5]]);
console.log('IFC element labels, identifiers, sources and unique progress keys verified');
