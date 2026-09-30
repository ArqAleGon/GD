import test from 'node:test';
import assert from 'node:assert/strict';
import {applyActivityAssignments,elementFromMetadata,matchesRegistrationFilters,progressRecordApplies,registrationTarget} from './bim-registration-state.js';

const activities=[{id:'PT1000',ue:'37'},{id:'PT1010',ue:'37'},{id:'PT2000',ue:'38'}];
const element=elementFromMetadata('GUID-1',{i:'4159940',n:'Cubierta norte',t:'IfcRoof',u:'37',l:'ARC_PL_03',f:'modelo.ifc',s:'PT108'},activities);

test('combines ID, ActivityID, UE, type and level filters',()=>{
  applyActivityAssignments([element],[{section:'PT108',elementId:'GUID-1',activityId:'PT1000',date:'2026-09-30',createdAt:'2026-09-30T12:00:00Z'}]);
  assert.equal(matchesRegistrationFilters(element,{id:'cubierta',activityId:'PT1000',executionUnit:'37',ifcType:'IfcRoof',level:'ARC_PL_03'}),true);
  assert.equal(matchesRegistrationFilters(element,{activityId:'PT2000'}),false);
});

test('creates independent element, activity and UE targets',()=>{
  assert.match(registrationTarget(element,'element','GUID-1','PT1000').objectId,/ifc-element:PT108/);
  assert.equal(registrationTarget(element,'activity','PT1000','PT1000').scopeValue,'PT1000');
  assert.equal(registrationTarget(element,'ue','37','PT1000').objectId,'ifc-ue:PT108:37');
  assert.throws(()=>registrationTarget(element,'element','GUID-1','PT2000'),/vigente/);
});

test('group records remain queryable from matching elements',()=>{
  assert.equal(progressRecordApplies({scopeType:'activity',scopeValue:'PT1000'},element),true);
  assert.equal(progressRecordApplies({scopeType:'ue',scopeValue:'38'},element),false);
});
