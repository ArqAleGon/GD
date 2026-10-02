export function arrangeBimLabels(items,viewport,focus){
  const occupied=[];
  return [...items].sort((a,b)=>(b.section===focus)-(a.section===focus)||a.distance-b.distance).map(item=>{
    const scale=Math.max(.72,Math.min(1,1.15-item.distance/700));
    const width=190*scale,height=52*scale;
    const box={left:item.x-width/2,right:item.x+width/2,top:item.y-height,bottom:item.y};
    const visible=item.visible&&box.left>=4&&box.right<=viewport.width-4&&box.top>=viewport.top&&box.bottom<=viewport.bottom&&!occupied.some(b=>box.left<b.right+8&&box.right>b.left-8&&box.top<b.bottom+8&&box.bottom>b.top-8);
    if(visible)occupied.push(box);
    return {...item,visible,scale};
  });
}
