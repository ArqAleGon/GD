// A shared, piecewise clock for the two plan views. Equal-distance keys preserve stops.
export function planAnimationStarted(profile,time,legId){return time >= Math.max(profile?.animationStartSeconds||0,profile?.legAnimationStartSeconds?.[legId]||0)&&!(profile?.hiddenWindows||[]).some(([a,b])=>time>=a&&time<b);}
export function distanceAtTime(keys,time){
 if(!keys.length)return 0;
 if(time<=keys[0].time)return keys[0].distance;
 const b=keys.find(k=>k.time>time);if(!b)return keys.at(-1).distance;
 const a=keys[keys.indexOf(b)-1],t=(time-a.time)/(b.time-a.time);
 return a.distance+(b.distance-a.distance)*t;
}
export function timeAtDistance(keys,distance){
 if(!keys.length)return 0;
 const first=keys.find(k=>k.distance>=distance);if(!first)return keys.at(-1).time;
 const i=keys.indexOf(first);if(!i)return first.time;
 const a=keys[i-1],b=first;return a.time+(b.time-a.time)*(distance-a.distance)/(b.distance-a.distance||1);
}
export function speedAtTime(keys,time){
 const i=keys.findIndex(k=>k.time>time);if(i<1)return 0;
 const a=keys[i-1],b=keys[i];return (b.distance-a.distance)/(b.time-a.time);
}
// Optional filmed facing directions. Interpolate the shortest horizontal turn,
// including stationary turns; routes without heading keys retain their tangent.
export function headingAtTime(keys,time){
 if(!keys?.length||!Number.isFinite(time))return null;
 const next=keys.findIndex(k=>k.time>time);
 const a=next===0?keys[0]:next<0?keys.at(-1):keys[next-1],b=next<=0?a:keys[next];
 const angle=k=>Math.atan2(k.direction[2],k.direction[0]);
 const start=angle(a),end=angle(b),delta=Math.atan2(Math.sin(end-start),Math.cos(end-start));
 const t=a===b?0:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
 const theta=start+delta*t;return [Math.cos(theta),0,Math.sin(theta)];
}
