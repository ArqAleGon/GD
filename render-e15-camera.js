// Calibrated to Render_E15.png (1672 x 941) using E15 IFC roof landmarks.
// The supplied illustration has differences in facade/roof proportions;
// this is a visual registration, not a surveyed camera solution.
export const RENDER_E15_CAMERA = Object.freeze({"position": [-15.054850032009867, 5.863037411782528, 55.967946349300824], "target": [-6.504152532380762, 0.75, 46.574969888072225], "fov": 29.856416628167867});
export const RENDER_E15_ASPECT = 1672 / 941;
// Match CSS object-fit: cover, including the vertical crop on wide screens.
export function renderE15Fov(aspect) {
 const crop=Math.min(1,RENDER_E15_ASPECT/aspect);
 return 2*Math.atan(Math.tan(RENDER_E15_CAMERA.fov*Math.PI/360)*crop)*180/Math.PI;
}
