import assert from 'node:assert/strict';
import {RENDER_E15_CAMERA,RENDER_E15_ASPECT,renderE15Fov} from './render-e15-camera.js';
const sourceHeight=941,sourceWidth=1672;
const baseFocal=sourceHeight/2/Math.tan(RENDER_E15_CAMERA.fov*Math.PI/360);
for(const [width,height] of [[1280,720],[1600,700],[390,844],[941,941]]) {
 const imageScale=Math.max(width/sourceWidth,height/sourceHeight);
 const cameraFocal=height/2/Math.tan(renderE15Fov(width/height)*Math.PI/360);
 assert.ok(Math.abs(cameraFocal-baseFocal*imageScale)<1e-8,'Image cover and model projection must have the same pixel scale');
}
assert.equal(renderE15Fov(RENDER_E15_ASPECT),RENDER_E15_CAMERA.fov);
console.log('Matching render/IFC crop verified for landscape, ultrawide, portrait and square views');
