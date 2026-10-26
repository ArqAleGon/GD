import {displayName} from './study-dashboard.js?v=20261021-integrated-v10';
import * as THREE from 'three';
const $=s=>document.querySelector(s),ns='http://www.w3.org/2000/svg';
const svg=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const area=n=>n.toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2});
export class SpaceStudy{
 constructor({scene,plan,data,onSelectPlan}){
  Object.assign(this,{scene,plan,data,onSelectPlan});this.filter='all';this.selected=null;this.enabled=false;this.labelsEnabled=false;this.group=new THREE.Group();this.group.visible=false;scene.scene.add(this.group);scene.spaces=this;this.items=[];document.body.append($('#space-labels'));
  for(const record of data.records){
   const vertices=record.points.flatMap(p=>[p[0],record.floor-2550+.14,-p[1]]),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(record.triangles.flat());geometry.computeVertexNormals();
   // Analytical footprint overlay remains legible below ceilings and tall partitions.
   const material=new THREE.MeshBasicMaterial({color:record.color,side:THREE.DoubleSide,transparent:true,opacity:.60,depthTest:false,depthWrite:false});
   const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=40;mesh.userData.spaceId=record.id;
   const lines=record.edges.flatMap(edge=>edge.flatMap(i=>[record.points[i][0],record.floor-2550+.16,-record.points[i][1]]));
   const outline=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3)),new THREE.LineBasicMaterial({color:record.color,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));outline.renderOrder=41;this.group.add(mesh,outline);
   const label=document.createElement('button');label.className='space-label';label.style.setProperty('--space-color',record.color);label.textContent=record.code;label.title=`${record.code} · ${record.name} · ${area(record.area)} m²`;label.setAttribute('aria-label',label.title);label.hidden=true;label.addEventListener('click',()=>this.select(record.id));$('#space-labels').append(label);
   this.items.push({record,mesh,outline,label,anchor:new THREE.Vector3(record.center[0],record.floor-2550+.35,-record.center[1])});
  }
  const control=document.createElement('label');control.textContent='Tipo de espacio';this.quick=document.createElement('select');this.quick.id='space-type';this.quick.setAttribute('aria-label','Tipo de espacio a resaltar');control.append(this.quick);$('#spaces-summary').before(control);this.quick.addEventListener('change',()=>this.setFilter(this.quick.value));
  for(const b of document.querySelectorAll('[data-open-spaces],#open-spaces'))b.addEventListener('click',()=>{$('#spaces-dialog').showModal();});$('#close-spaces').addEventListener('click',()=>$('#spaces-dialog').close());
  $('#toggle-space-colors').addEventListener('click',()=>this.setColors(!this.enabled));
  $('#toggle-space-labels').addEventListener('click',()=>this.setLabels(!this.labelsEnabled));
  $('#show-spaces').addEventListener('change',e=>this.setColors(e.target.checked));
  $('#show-space-labels').addEventListener('change',e=>this.setLabels(e.target.checked));
  this.syncVisibilityControls();
  this.plan.spaces=this;
 }
 syncVisibilityControls(){
  for(const [id,checkbox,on,name] of [['toggle-space-colors','show-spaces',this.enabled,'colores'],['toggle-space-labels','show-space-labels',this.labelsEnabled,'etiquetas']]){
   const button=$('#'+id);button.disabled=false;button.setAttribute('aria-pressed',String(on));button.title=(on?'Ocultar ':'Mostrar ')+name+' de espacios';$('#'+checkbox).checked=on;
  }
 }
 setColors(on){this.enabled=on;this.syncVisibilityControls();this.scene.dirty=true;}
 setLabels(on){this.labelsEnabled=on;this.syncVisibilityControls();this.scene.dirty=true;}
 matches(record){return this.filter==='all'||(this.filter==='administrative'?record.administrative:record.type===this.filter);}
 setLevel(level){this.level=level;this.selected=null;const options=[['all','Todos los tipos'],...this.data.categories.map(c=>[c.name,c.name]),['administrative','Administrativas · oficinas y reuniones']];this.quick.replaceChildren(...options.map(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;return option;}));this.quick.value=this.filter;this.refresh();}
 setFilter(value){this.filter=value;this.quick.value=value;this.selected=null;this.refresh();}
 select(id){const item=this.items.find(x=>x.record.id===id);if(!item)return;this.selected=id;const r=item.record;if(!this.matches(r)){this.filter='all';this.quick.value='all';}this.onSelectPlan?.(r);this.scene.controls.target.copy(item.anchor);this.scene.axonCamera.position.copy(item.anchor).add(new THREE.Vector3(24,30,30));this.scene.controls.update();this.refresh();if($('#spaces-dialog').open)$('#spaces-dialog').close();}
 refresh(){
  if(!this.level)return;const levelItems=this.items.filter(x=>x.record.level===this.level.id),pending=(this.data.unmappedPdfSpaces||[]).filter(r=>r.level===this.level.id).map(record=>({record})),matching=[...levelItems,...pending].filter(x=>this.matches(x.record)),nativeMatches=matching.filter(x=>x.record.points);
  for(const item of this.items){const visible=item.record.level===this.level.id,match=this.matches(item.record),selected=item.record.id===this.selected;item.mesh.visible=item.outline.visible=visible;item.mesh.material.opacity=selected?.90:match?.60:.04;item.outline.material.opacity=selected?1:match?.95:.08;item.outline.material.color.set(selected?'#ffffff':item.record.color);item.label.classList.toggle('is-selected',selected);item.label.textContent=selected?`${item.record.code} · ${item.record.name}`:item.record.code;}
  $('#spaces-summary').textContent=`${this.level.name} · ${nativeMatches.length}/${levelItems.length} espacios 3D · ${matching.length-nativeMatches.length} pendientes de ubicación${this.filter==='administrative'?' · oficinas y sala de reuniones':''}`;
  $('#spaces-source').textContent=`${this.level.name}. Áreas verificadas de E9-PL-0001_V01; valor IFC identificado cuando falta el área en PDF. Nombres y categorías vinculados por código, nivel y edificio. ${pending.length} registros del plano sin geometría IFC correspondiente. Colores tomados de los planos; alineación visual conservada. ${this.level.id==='B'?'Sótano: se usa el PDF original; no se aportó una planta nueva.':''}`;
  const buttons=[{name:'Todos los tipos',value:'all',color:'#ffffff'},...this.data.categories.map(c=>({...c,value:c.name})),{name:'Administrativas · oficinas y reuniones',value:'administrative',color:this.data.categories.find(c=>c.name==='ÁREA OPERATIVA')?.color||'#68b7f4'}];
  $('#space-filters').replaceChildren(...buttons.map(c=>{const b=document.createElement('button'),dot=document.createElement('i');dot.className='space-swatch';dot.style.background=c.color;b.append(dot,document.createTextNode(c.name));b.setAttribute('aria-pressed',String(this.filter===c.value));b.addEventListener('click',()=>this.setFilter(c.value));return b;}));
  $('#space-rows').replaceChildren(...matching.sort((a,b)=>a.record.code.localeCompare(b.record.code,undefined,{numeric:true})).map(({record:r})=>{
   const tr=document.createElement('tr');tr.classList.toggle('is-selected',r.id===this.selected);const cells=Array.from({length:4},()=>document.createElement('td')),button=document.createElement('button'),dot=document.createElement('i');dot.className='space-swatch';dot.style.background=r.color;button.append(dot,document.createTextNode(r.code));button.disabled=!r.points;button.setAttribute('aria-label',`${r.points?'Ubicar':'Ubicación pendiente'} ${r.code} · ${r.name}`);button.addEventListener('click',()=>this.select(r.id));cells[0].append(button);cells[1].textContent=r.name;
   const source=document.createElement('small');source.textContent=displayName(r.building)+(r.status?' · '+r.status:'');cells[1].append(document.createElement('br'),source);cells[2].textContent=area(r.area);cells[2].title=r.areaSource;const areaSource=document.createElement('small');areaSource.textContent=r.pdfPage?'PDF · pág. '+r.pdfPage:'IFC · sin área PDF';cells[2].append(document.createElement('br'),areaSource);
   if(r.ifcArea&&Math.abs(r.ifcArea-r.area)>=.015){const diff=document.createElement('small');diff.textContent='IFC: '+area(r.ifcArea);cells[2].append(document.createElement('br'),diff);}if(r.areaNote){const note=document.createElement('small');note.textContent=r.areaNote;cells[1].append(document.createElement('br'),note);}cells[3].textContent=r.type;tr.append(...cells);return tr;
  }));
  if(!matching.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.textContent='No hay espacios de este tipo en el nivel activo.';row.append(cell);$('#space-rows').append(row);}
  this.drawPlan();this.scene.dirty=true;
 }
 drawPlan(){
  this.plan.spaceLayer?.remove();if(!this.plan.layer||this.plan.kind!=='architecture'||!this.level)return;
  const reg=this.plan.reg,m=reg.matrix,layer=svg('g',{'aria-label':'Espacios arquitectónicos'});this.plan.spaceLayer=layer;this.plan.layer.insertBefore(layer,this.plan.coneLayer);
  // Architectural plan conventions remain independent of the 3D display toggles.
  for(const {record:r} of this.items){if(r.level!==this.level.id)continue;const points=r.points.map(([x,y])=>[m[0][0]*x+m[0][1]*y+m[0][2],m[1][0]*x+m[1][1]*y+m[1][2]]),[cx,cy]=[m[0][0]*r.center[0]+m[0][1]*r.center[1]+m[0][2],m[1][0]*r.center[0]+m[1][1]*r.center[1]+m[1][2]];
   if(cx<0||cy<0||cx>this.plan.page.width||cy>this.plan.page.height)continue;
   const selected=r.id===this.selected,match=this.matches(r),d=r.triangles.map(t=>'M'+t.map(i=>points[i].join(',')).join('L')+'Z').join(' '),path=svg('path',{d,fill:r.color,'fill-opacity':selected?.7:this.filter!=='all'&&match?.45:0,stroke:'none',class:'space-region',role:'button',tabindex:'0','aria-label':`${r.code} · ${r.name} · ${area(r.area)} m²`});
   const title=svg('title',{});title.textContent=`${r.code} · ${r.name} · ${area(r.area)} m²`;path.append(title);path.addEventListener('click',()=>this.select(r.id));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.select(r.id);}});layer.append(path);
   if(selected||(this.filter!=='all'&&match)){const outline=svg('path',{d:r.edges.map(([a,b])=>'M'+points[a].join(',')+'L'+points[b].join(',')).join(' '),fill:'none',stroke:selected?'#e83e21':'#283c45','stroke-width':selected?3:1.5,'vector-effect':'non-scaling-stroke','pointer-events':'none'});layer.append(outline);}
  }
 }
 beforePov(){this.group.visible=false;$('#space-labels').hidden=true;}
 beforeAxon(){this.group.visible=this.enabled&&!this.scene.fullStation;}
 afterAxon(expanded){
  const container=$('#space-labels');container.hidden=!this.labelsEnabled||!this.scene.ready||this.scene.fullStation||(!!expanded&&expanded!=='axon-panel');if(container.hidden)return;
  const box=this.scene.axon.getBoundingClientRect(),occupied=[];Object.assign(container.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});this.scene.axonCamera.updateMatrixWorld();
  const sorted=[...this.items].sort((a,b)=>Number(b.record.id===this.selected)-Number(a.record.id===this.selected)||b.record.area-a.record.area);
  for(const item of sorted){const r=item.record,p=item.anchor.clone().project(this.scene.axonCamera);let visible=this.labelsEnabled&&r.level===this.level?.id&&this.matches(r)&&p.z>=-1&&p.z<=1&&Math.abs(p.x)<.97&&Math.abs(p.y)<.95;const x=(p.x+1)*box.width/2,y=(1-p.y)*box.height/2,selected=r.id===this.selected;
   if(visible&&!selected&&occupied.some(q=>Math.abs(q[0]-x)<56&&Math.abs(q[1]-y)<23))visible=false;
   item.label.hidden=!visible;if(visible){occupied.push([x,y]);item.label.style.left=x+'px';item.label.style.top=y+'px';}
  }
 }
}
