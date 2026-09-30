import assert from 'node:assert/strict';
import {isIfcPickGesture,rankedBoundHits,sectionPickCandidates} from './ifc-picking.js';

assert.equal(isIfcPickGesture({x:100,y:100,button:2},{clientX:106,clientY:105,button:2}),true);
assert.equal(isIfcPickGesture({x:100,y:100,button:0},{clientX:100,clientY:100,button:0}),false);
assert.equal(isIfcPickGesture({x:100,y:100,button:2},{clientX:120,clientY:100,button:2}),false);

const candidates=[{name:'PT107',distance:2},{name:'PT108',distance:9},{name:'PT109',distance:1}];
assert.deepEqual(sectionPickCandidates(candidates,'PT108').map(candidate=>candidate.name),['PT108']);
assert.deepEqual(sectionPickCandidates(candidates,null,2).map(candidate=>candidate.name),['PT109','PT107']);

const point={distance:0,distanceTo(){return this.distance;}};
const ray={origin:{},intersectBox(bounds,target){if(bounds.distance==null)return null;target.distance=bounds.distance;return target;}};
const hits=rankedBoundHits(ray,[{mesh:'far',bounds:{distance:8}},{mesh:'miss',bounds:{}},{mesh:'near',bounds:{distance:2}}],point);
assert.deepEqual(hits.map(hit=>hit.mesh),['near','far']);

console.log('IFC pointer gesture, focused section priority and spatial fallback verified');
