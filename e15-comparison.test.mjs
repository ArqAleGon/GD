import assert from 'node:assert/strict';
import {comparisonLayers} from './e15-comparison.js';
for(const t of [0,.5,1]){
 assert.deepEqual(comparisonLayers('render-progress',t),{render:1,progress:t});
 assert.deepEqual(comparisonLayers('ifc-progress',t),{render:0,progress:t});
 assert.deepEqual(comparisonLayers('ifc-render',t),{render:t,progress:0});
}
assert.deepEqual(comparisonLayers('ifc-progress',-1),{render:0,progress:0});
assert.deepEqual(comparisonLayers('ifc-progress',2),{render:0,progress:1});
console.log('All three comparison pairs verified at 0%, 50%, 100%; opacity bounds verified');
