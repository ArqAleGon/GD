// A shared, piecewise clock for the two plan views. Equal-distance keys preserve stops.
export function planAnimationStarted(profile,time){return time >= (profile?.animationStartSeconds||0);}
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
