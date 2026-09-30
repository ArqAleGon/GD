import test from 'node:test';
import assert from 'node:assert/strict';
import {activitySummaries,buildingSummary,deviationTone,elementRegisteredProgress,groupElementProgress} from './bim-progress-dashboard.js';

const elements=[
  {guid:'A',section:'PT102',source:'a.ifc',executionUnit:'31',activityIds:['ACT-1'],level:'L1',ifcType:'IfcWall'},
  {guid:'B',section:'PT102',source:'a.ifc',executionUnit:'31',activityIds:['ACT-1'],level:'L2',ifcType:'IfcDoor'},
  {guid:'C',section:'PT999',source:'c.ifc',executionUnit:'99',activityIds:['OTHER'],level:'L9',ifcType:'IfcWall'}
];
const tasks=[{id:'ACT-1',name:'Actividad',ue:'31',actual:60,planned:70,hours:10},{id:'OTHER',name:'Otra',ue:'99',actual:90,planned:90,hours:5}];
const records=[
  {objectId:'ifc-element:PT102:a.ifc:A',section:'PT102',scopeType:'element',elementId:'A',progress:40,date:'2026-09-29',createdAt:'2026-09-29T12:00:00Z'},
  {objectId:'ifc-activity:PT102:ACT-1',section:'PT102',scopeType:'activity',scopeValue:'ACT-1',progress:50,date:'2026-09-30',createdAt:'2026-09-30T12:00:00Z'},
  {objectId:'ifc-element:PT999:c.ifc:C',section:'PT999',scopeType:'element',elementId:'C',progress:100,date:'2026-09-30',createdAt:'2026-09-30T12:00:00Z'}
];

test('keeps element progress and groups inside the active building',()=>{
  assert.equal(elementRegisteredProgress(elements[0],records),40);
  assert.equal(elementRegisteredProgress(elements[1],records),50);
  const levels=groupElementProgress(elements.slice(0,2),records,'level');
  assert.deepEqual(levels.map(level=>[level.name,level.progress]),[['L2',50],['L1',40]]);
});

test('compares model records with the linked Primavera activity',()=>{
  const activity=activitySummaries('PT102',elements.slice(0,2),records,tasks)[0];
  assert.equal(activity.id,'ACT-1');
  assert.equal(activity.registered,50);
  assert.equal(activity.primavera,60);
  assert.equal(activity.deviation,-10);
  assert.equal(deviationTone(activity.deviation),'negative');
});

test('building summary excludes records and P6 tasks from other buildings',()=>{
  const summary=buildingSummary('PT102',elements.slice(0,2),records,tasks);
  assert.equal(summary.registered,45);
  assert.equal(summary.primavera,60);
  assert.equal(summary.deviation,-15);
  assert.equal(summary.records,2);
});
