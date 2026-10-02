export function arrangeBimLabels(items,viewport,focus){
  const occupied=[...(viewport.obstacles||[])];
  // Stable priority prevents labels exchanging places at small zoom changes.
  return [...items].sort((a,b)=>(b.section===focus)-(a.section===focus)||String(a.section).localeCompare(String(b.section))).map(item=>{
    const scale=Math.max(.7,Math.min(1,Math.sqrt(65/Math.max(1,item.distance))));
    const width=(item.width||190)*scale,height=(item.height||52)*scale;
    const box={left:item.x-width/2,right:item.x+width/2,top:item.y-height,bottom:item.y};
    const gap=30;
    const visible=item.visible&&box.left>=8&&box.right<=viewport.width-8&&box.top>=viewport.top&&box.bottom<=viewport.bottom&&!occupied.some(b=>box.left<b.right+gap&&box.right>b.left-gap&&box.top<b.bottom+gap&&box.bottom>b.top-gap);
    if(visible)occupied.push(box);
    return {...item,visible,scale};
  });
}
