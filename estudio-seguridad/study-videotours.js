// Reuse the published Route 1 video in the route viewport.
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
  if(this.request)return this.request;if(this.video.getAttribute('src')&&!retry)return;
  this.request=(async()=>{try{
   this.message('Cargando video…');this.retry.hidden=true;
   const response=await fetch('./assets/videotours/manifest.json?v=20261022-v11');if(!response.ok)throw Error('Catálogo no disponible');
   const data=await response.json(),item=data.videos?.find(v=>v.id==='e09-ruta-1');if(!item)throw Error('Video no disponible');
   this.video.src=new URL(item.file,new URL('./assets/videotours/',location.href)).href;this.video.load();
  }catch{this.message('No se pudo cargar el video. Usa «Reintentar video».');this.retry.hidden=false;}finally{this.request=null;}})();return this.request;
 }
 setVisible(visible){this.visible=visible;this.panel.hidden=!visible;if(visible){this.layout(document.querySelector('#pov-art').getBoundingClientRect(),document.querySelector('.view.is-expanded')?.id);this.load();}else this.video.pause();}
 layout(rect,expanded){
  const hidden=!this.visible||(expanded&&expanded!=='pov-panel');this.panel.hidden=!!hidden;
  if(hidden){this.video.pause();return;}
  Object.assign(this.panel.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
 }
}
