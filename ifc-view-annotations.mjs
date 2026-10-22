import {observationLines} from './ifc-report-options.mjs?v=20261022-annotations-v2';

export function annotationPoint(x,y,rect){return {x:Math.max(0,Math.min(1,(x-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(y-rect.top)/rect.height))};}
export function drawAnnotations(ctx,items,width,height){
 for(const item of items){
  ctx.save();ctx.strokeStyle=item.color;ctx.fillStyle=item.color;ctx.lineWidth=Math.max(2,height*.004);ctx.lineCap='round';ctx.lineJoin='round';
  const x=item.a.x*width,y=item.a.y*height;
  if(item.kind==='text'){
   const size=height*.034,pad=size*.4,boxWidth=Math.min(width*.42,width-x),lineHeight=size*1.3;
   ctx.font=`500 ${size}px Gotham`;const lines=observationLines(item.text,s=>ctx.measureText(s).width,Math.max(10,boxWidth-2*pad));
   const boxHeight=lines.length*lineHeight+2*pad,top=Math.max(0,Math.min(y,height-boxHeight));
   ctx.fillStyle='#0b1725ee';ctx.fillRect(x,top,boxWidth,boxHeight);ctx.strokeRect(x,top,boxWidth,boxHeight);ctx.fillStyle=item.color;ctx.textBaseline='top';
   lines.forEach((line,i)=>ctx.fillText(line,x+pad,top+pad+i*lineHeight));
  }else{
   const endX=item.b.x*width,endY=item.b.y*height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(endX,endY);ctx.stroke();
   if(item.kind==='arrow'){
    const angle=Math.atan2(endY-y,endX-x),head=height*.025;
    ctx.beginPath();ctx.moveTo(endX-head*Math.cos(angle-.45),endY-head*Math.sin(angle-.45));ctx.lineTo(endX,endY);ctx.lineTo(endX-head*Math.cos(angle+.45),endY-head*Math.sin(angle+.45));ctx.stroke();
   }
  }
  ctx.restore();
 }
}

export function installAnnotations({canvas,overlay,controls,onChange}){
 const $=id=>document.getElementById(id),panel=$('annotationTools');let items=[],pending=null,mode='navigate';
 const redraw=()=>{overlay.width=canvas.width;overlay.height=canvas.height;const c=overlay.getContext('2d');drawAnnotations(c,pending?[...items,pending]:items,overlay.width,overlay.height);};
 const status=message=>{$('annotationStatus').textContent=message||`${items.length} anotaciones. Pulsa Vista para informe para incorporarlas al PDF.`;};
 const setMode=value=>{mode=value;overlay.style.pointerEvents=value==='navigate'?'none':'auto';controls.enabled=value==='navigate';$('annotationTextField').hidden=value!=='text';panel.querySelectorAll('[data-annotation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.annotation===value)));status();};
 const changed=()=>{redraw();status();onChange();};
 const close=()=>{panel.hidden=true;$('annotationToggle').setAttribute('aria-expanded','false');setMode('navigate');};
 $('annotationToggle').onclick=()=>{if(panel.hidden){panel.hidden=false;$('annotationToggle').setAttribute('aria-expanded','true');setMode('arrow');}else close();};
 $('annotationClose').onclick=close;
 panel.querySelectorAll('[data-annotation]').forEach(b=>b.onclick=()=>setMode(b.dataset.annotation));
 $('annotationUndo').onclick=()=>{items.pop();pending=null;changed();};
 $('annotationClear').onclick=()=>{items=[];pending=null;changed();};
 overlay.onpointerdown=event=>{
  if(event.button!==0||mode==='navigate')return;event.preventDefault();event.stopPropagation();
  const a=annotationPoint(event.clientX,event.clientY,overlay.getBoundingClientRect()),color=$('annotationColor').value;
  if(mode==='text'){
   const text=$('annotationText').value.trim();if(!text){status('Escribe el texto y luego haz clic en la vista para colocarlo.');return;}
   if(text.split(/\r?\n/).length>6){status('Usa un máximo de seis líneas en el cuadro de texto.');return;}
   a.x=Math.min(a.x,.58);items.push({kind:'text',a,text,color});changed();return;
  }
  pending={kind:mode,a,b:a,color};overlay.setPointerCapture(event.pointerId);redraw();
 };
 overlay.onpointermove=event=>{if(!pending)return;pending.b=annotationPoint(event.clientX,event.clientY,overlay.getBoundingClientRect());redraw();};
 overlay.onpointerup=event=>{if(!pending)return;pending.b=annotationPoint(event.clientX,event.clientY,overlay.getBoundingClientRect());if(Math.hypot(pending.b.x-pending.a.x,pending.b.y-pending.a.y)>.005)items.push(pending);pending=null;changed();};
 overlay.onpointercancel=()=>{pending=null;redraw();};
 return {
  redraw,
  drawTo(ctx,width,height){drawAnnotations(ctx,items,width,height);},
  clearForViewChange(){if(!items.length&&!pending)return;items=[];pending=null;redraw();status('Cambió la vista. Las marcas de trabajo se limpiaron; las capturas ya guardadas se conservan.');},
  reset(){items=[];pending=null;close();redraw();status();},
  get count(){return items.length;}
 };
}
