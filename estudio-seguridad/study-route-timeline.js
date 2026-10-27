// Pauses at disconnected scene cuts contribute time, never walked distance.
export function createRouteTimeline(parts,transitions=[]){
 let time=0;const keys=[{time:0,distance:0}],pauses=[];
 for(let i=0;i<parts.length;i++){
  const part=parts[i];time+=part.length;keys.push({time,distance:part.offset+part.length});
  const cut=transitions.find(t=>t.afterLeg===part.leg.id&&t.beforeLeg===parts[i+1]?.leg.id);
  if(cut){const start=time;time+=cut.duration;pauses.push({...cut,start,end:time,from:part.leg.id,to:parts[i+1].leg.id});keys.push({time,distance:part.offset+part.length});}
 }
 return {keys,pauses,duration:time};
}
export function routeTransitionAt(timeline,time){
 const cut=timeline?.pauses.find(t=>time>=t.start&&time<t.end);
 return cut?{...cut,leg:time<(cut.start+cut.end)/2?cut.from:cut.to,atEnd:time<(cut.start+cut.end)/2}:null;
}
