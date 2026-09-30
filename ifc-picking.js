export function isIfcPickGesture(start,event,tolerance=9){
  if(!start||!event||start.button!==2||event.button!==2)return false;
  return Math.hypot(event.clientX-start.x,event.clientY-start.y)<=tolerance;
}

export function sectionPickCandidates(candidates,focusedSection,maxCandidates=4){
  const ordered=[...candidates].sort((a,b)=>(b.name===focusedSection)-(a.name===focusedSection)||a.distance-b.distance);
  const focused=focusedSection?ordered.filter(candidate=>candidate.name===focusedSection):[];
  return (focused.length?focused:ordered).slice(0,maxCandidates);
}

export function rankedBoundHits(ray,items,intersectionPoint){
  const hits=[];
  for(const item of items){
    const point=ray.intersectBox(item.bounds,intersectionPoint);
    if(point)hits.push({mesh:item.mesh,distance:point.distanceTo(ray.origin)});
  }
  return hits.sort((a,b)=>a.distance-b.distance);
}
