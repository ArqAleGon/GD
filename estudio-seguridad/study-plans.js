const ns='http://www.w3.org/2000/svg';
const el=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
export class PlanViewer{
 constructor({svg,container,onSelect}){Object.assign(this,{svg,container,onSelect});this.zoom=1;this.markers=[];new ResizeObserver(()=>this.fit()).observe(container);}
 configure(registration,records,types){Object.assign(this,{registration,records,types});}
 setMarkersVisible(visible){this.markersVisible=visible;if(this.coneLayer)this.coneLayer.style.display=visible?'':'none';for(const m of this.markers){m.group.style.display=visible?'':'none';m.group.setAttribute('tabindex',visible?'0':'-1');}}
 project(record,reg){const p=record.positionIfcMetres,o=this.registration.originIfc,m=reg.matrix,x=p[0]-o[0],y=p[1]-o[1];return [m[0][0]*x+m[0][1]*y+m[0][2],m[1][0]*x+m[1][1]*y+m[1][2]];}
 visible(record,reg){if(!record||!reg||(reg.allowedCameraIds&&!reg.allowedCameraIds.includes(record.ifcGlobalId)))return false;const [x,y]=this.project(record,reg),[a,b,w,h]=reg.crop;return x>=a&&x<=a+w&&y>=b&&y<=b+h;}
 choosePage(kind,pages,active,current){const available=pages.filter(p=>this.visible(active,this.registration?.[kind]?.[p.page]));return available.find(p=>p.page===current)||available[0];}
 draw(kind,page,level,active,onLoad,onError){
  this.kind=kind;this.page=page;this.level=level;this.active=active;this.svg.replaceChildren();this.markers=[];this.reg=this.registration?.[kind]?.[page.page];
  const reg=this.reg,[x,y,w,h]=reg?.crop||[0,0,page.width,page.height],rotation=reg?.rotation??90;this.dimensions=rotation===90?[h,w]:[w,h];this.svg.setAttribute('viewBox',`0 0 ${this.dimensions[0]} ${this.dimensions[1]}`);this.svg.setAttribute('data-page',page.page);this.svg.setAttribute('data-kind',kind);
  this.layer=el('g',{transform:rotation===90?`translate(${h} 0) rotate(90) translate(${-x} ${-y})`:`translate(${-x} ${-y})`});this.svg.append(this.layer);
  const layers=page.layers||[page];let loaded=0,failed=false;
  this.layer.append(el('rect',{x,y,width:w,height:h,fill:'#fff'}));
  for(const [i,part] of layers.entries()){
   const group=el('g');if(part.transform){const m=part.transform;group.setAttribute('transform',`matrix(${m[0][0]} ${m[1][0]} ${m[0][1]} ${m[1][1]} ${m[0][2]} ${m[1][2]})`);}
   if(part.crop){const [a,b,c,d]=part.crop,id=`sheet-${kind}-${page.page}-${i}`,clip=el('clipPath',{id});clip.append(el('rect',{x:a,y:b,width:c,height:d}));group.append(clip);group.setAttribute('clip-path',`url(#${id})`);}
   const image=el('image',{href:part.imageUrl||`./assets/${kind==='architecture'?'plants':'cctv'}/${part.image}`,width:part.width,height:part.height});image.addEventListener('load',()=>{if(++loaded===layers.length&&!failed)onLoad();},{once:true});image.addEventListener('error',()=>{failed=true;onError();},{once:true});group.append(image);group.style.mixBlendMode='multiply';this.layer.append(group);
  }
  for(const label of page.buildingLabels||[]){const text=el('text',{class:'building-plan-label',x:label.position[0],y:label.position[1],'text-anchor':'middle','pointer-events':'none'});text.textContent=label.name;this.layer.append(text);}
  this.coneLayer=el('g',{'pointer-events':'none',class:'camera-cone','aria-label':'Cono visual de la cámara activa'});this.layer.append(this.coneLayer);
  const radius=Math.min(w,h)/210;this.radius=radius;
  for(const record of this.records||[]){if(record.ifcStorey!==level.ifc||!this.visible(record,reg))continue;const [cx,cy]=this.project(record,reg),type=Object.keys(this.types).find(k=>record.ifcTypeName.includes(this.types[k].ifcFamilyToken)),color=this.types[type].color;
   const group=el('g',{class:'plan-marker',role:'button',tabindex:0,'data-camera-id':record.ifcGlobalId,'aria-label':`${this.types[type].label} · Marca IFC ${record.mark} · ${kind==='architecture'?'planta arquitectónica':'inventario'}`,transform:`translate(${cx} ${cy}) rotate(${-rotation})`,'aria-pressed':String(record.ifcGlobalId===active?.ifcGlobalId)});
   group.append(el('circle',{class:'marker-hit',r:radius*3,fill:'transparent'}),el('circle',{class:'marker-ring',r:radius*1.5}),el('circle',{class:'marker-dot',r:radius,fill:color}));
   const title=el('title');title.textContent=`${this.types[type].label} · Marca IFC ${record.mark}`;group.append(title);
   const action=()=>this.onSelect(record.ifcGlobalId);group.addEventListener('click',e=>{e.stopPropagation();action();});group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});this.layer.append(group);this.markers.push({group,record});
  }
  this.spaces?.drawPlan();this.routes?.drawPlan();this.setMarkersVisible(this.markersVisible!==false);this.fit();this.container.scrollTo(0,0);this.select(active);
 }
 select(record,pose,settings){this.active=record;for(const m of this.markers){const selected=m.record.ifcGlobalId===record?.ifcGlobalId;m.group.setAttribute('aria-pressed',String(selected));m.group.querySelector('.camera-tag')?.remove();if(selected){this.layer.append(m.group);const tag=el('g',{class:'camera-tag'}),text=`${Object.keys(this.types).find(k=>record.ifcTypeName.includes(this.types[k].ifcFamilyToken))} ${record.mark}`,size=this.radius*2.5;tag.append(el('rect',{x:this.radius*2,y:-size*.8,width:text.length*size*.65+size,height:size*1.4,rx:size*.3,fill:'#0c2330','fill-opacity':.92}));const t=el('text',{x:this.radius*2+size*.5,y:size*.2,'font-size':size});t.textContent=text;tag.append(t);m.group.append(tag);}}
  this.fit();this.coneLayer?.replaceChildren();if(this.routes?.active||!record||!pose||!settings||!this.visible(record,this.reg)||document.querySelector('#show-cone')?.checked===false)return;
  const [x,y]=this.project(record,this.reg),m=this.reg.matrix,d=pose.direction,heading=Math.atan2(-d.z,d.x),range=settings.range;
  const point=angle=>{const dx=Math.cos(angle)*range,dy=Math.sin(angle)*range;return [x+m[0][0]*dx+m[0][1]*dy,y+m[1][0]*dx+m[1][1]*dy];};
  const mode=settings.optics?.mode;for(let sensor=0;sensor<(mode==='multi'?4:1);sensor++){const yaw=heading+sensor*Math.PI/2,half=(settings.fov*Math.PI/180)/2,points=[[x,y]];for(let i=0;i<=32;i++)points.push(point(yaw-half+2*half*i/32));this.coneLayer.append(el('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:'#e59a00','fill-opacity':.22,stroke:'#b66b00','stroke-width':2,'vector-effect':'non-scaling-stroke'}));}
  const [tx,ty]=point(heading);this.coneLayer.append(el('line',{x1:x,y1:y,x2:tx,y2:ty,stroke:'#be340b','stroke-width':2,'vector-effect':'non-scaling-stroke'}));
 }
 fit(){if(!this.dimensions)return;const [w,h]=this.dimensions,box=this.container.getBoundingClientRect(),scale=Math.min((box.width-16)/w,(box.height-16)/h);this.svg.style.width=`${Math.max(40,w*scale)*this.zoom}px`;this.svg.style.height=`${Math.max(40,h*scale)*this.zoom}px`;this.svg.style.minWidth='0';this.svg.style.margin='8px auto';for(const tag of this.svg.querySelectorAll('.camera-tag'))tag.setAttribute('transform',`scale(${9/Math.max(.01,this.radius*2.5*scale*this.zoom)})`);for(const text of this.svg.querySelectorAll('.building-plan-label')){text.setAttribute('font-size',9/Math.max(.01,scale*this.zoom));if(text.textContent==='Nave central')text.setAttribute('dy',14/Math.max(.01,scale*this.zoom));}}
}
