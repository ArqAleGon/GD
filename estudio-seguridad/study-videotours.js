// Route-specific media shares the POV viewport with the simulated camera.
export class RouteVideo{
 constructor(){
  this.panel=document.querySelector('#route-video-panel');this.video=document.querySelector('#route-video');this.status=document.querySelector('#route-video-status');this.retry=document.querySelector('#route-video-retry');this.visible=false;
  document.body.append(this.panel);
  this.retry.addEventListener('click',()=>{this.retry.hidden=true;this.load(true);});
  for(const event of ['loadedmetadata','canplay','playing'])this.video.addEventListener(event,()=>this.message(''));
  this.video.addEventListener('waiting',()=>this.message('Cargando video…'));
  this.video.addEventListener('error',()=>{this.message('No se pudo reproducir el video. Reintenta la carga.');this.retry.hidden=false;});
  const position=()=>this.layout(document.querySelector('#pov-art').getBoundingClientRect(),document.querySelector('.view.is-expanded')?.id);
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);new ResizeObserver(position).observe(document.querySelector('#pov-art'));
 }
 message(text){this.status.textContent=text;this.status.hidden=!text;}
 async load(retry=false){
  const id=this.videoId;if(!id)return;if(this.loadedId===id&&!retry)return;
  const ticket=this.ticket=(this.ticket||0)+1;
  try{
   this.message('Cargando video…');this.retry.hidden=true;
   if(!this.manifest)this.manifest=fetch('./assets/videotours/manifest.json?v=20261026-routes-v13').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json();}).catch(error=>{this.manifest=null;throw error;});
   const data=await this.manifest;if(ticket!==this.ticket||id!==this.videoId)return;
   const item=data.videos?.find(v=>v.id===id);if(!item)throw Error('Video no disponible');
   this.video.src=new URL(item.file,new URL('./assets/videotours/',location.href)).href;this.loadedId=id;this.video.load();
  }catch{if(ticket!==this.ticket)return;this.message('No se pudo cargar el video. Usa «Reintentar video».');this.retry.hidden=false;}
 }
 setVisible(visible,id=this.videoId,label='Recorrido'){
  if(id!==this.videoId){this.ticket=(this.ticket||0)+1;this.video.pause();this.video.removeAttribute('src');this.video.load();this.loadedId=null;this.videoId=id;}
  this.panel.setAttribute('aria-label','Video POV · '+label);this.video.setAttribute('aria-label','Video POV · '+label);
  this.visible=visible;this.panel.hidden=!visible;if(visible){this.layout(document.querySelector('#pov-art').getBoundingClientRect(),document.querySelector('.view.is-expanded')?.id);this.load();}else this.video.pause();
 }
 layout(rect,expanded){
  const hidden=!this.visible||(expanded&&expanded!=='pov-panel');this.panel.hidden=!!hidden;
  if(hidden){this.video.pause();return;}
  Object.assign(this.panel.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
 }
}
