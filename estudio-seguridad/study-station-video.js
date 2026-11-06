import {RouteVideo} from './study-videotours.js?v=20261103-e03video38';
const $=s=>document.querySelector(s);
const clock=t=>Number.isFinite(t)?`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`:'—';
// Video-first stations keep their plans independent until a spatial route is registered.
export class StationVideo{
 constructor({config,getScene,onEnter}){
  Object.assign(this,{config,getScene,onEnter});this.active=false;
  this.choices=config.videos||[config];this.selected=this.choices[0];this.playTicket=0;
  this.media=new RouteVideo({manifestUrl:config.manifestUrl||'./assets/videotours/manifest.json?v=20261106-e04delivery52'});
  this.video=this.media.video;
  $('#routes-drawer > p').textContent=`${config.title} · selecciona un video POV para reproducirlo dentro del estudio.`;
  $('#routes-drawer .micro-note').textContent='Trazado y sincronización con las plantas: En construcción.';
  $('#routes-enter').disabled=false;$('#routes-enter').textContent='Abrir vista de recorridos';
  $('#routes-enter').addEventListener('click',()=>{this.enable(true);$('#routes-drawer .drawer-close').click();$('#route-view').focus();});
  $('#routes-exit').textContent='← Volver al estudio';$('#routes-exit').addEventListener('click',()=>this.enable(false));
  $('#route-view').addEventListener('change',e=>this.setPov(e.target.value==='pov'));
  $('#route-family').replaceChildren(...this.choices.map(v=>new Option(v.label||v.title,v.id)));
  $('#route-path').replaceChildren(...this.choices.map(v=>new Option(v.title,v.id)));
  for(const id of ['route-family','route-path'])$('#'+id).addEventListener('change',e=>this.select(e.target.value));
  $('#route-legend').replaceChildren(...this.choices.map(v=>{const p=document.createElement('p');p.textContent=v.label||v.title;return p;}));
  $('#route-current').textContent='Trazado en plantas 2D y 3D: En construcción.';
  for(const id of ['route-opacity','route-follow','route-reverse'])$('#'+id).closest('label').style.display='none';
  for(const id of ['route-fit','route-measure','route-source-pages'])$('#'+id).hidden=true;
  $('#route-source').closest('details').hidden=true;
  $('#route-live').style.display='none';
  $('#route-progress').setAttribute('aria-label','Avance del video POV');
  Object.assign($('#route-speed'),{min:'.5',max:'2',step:'.25',value:'1'});
  $('#route-play').addEventListener('click',async()=>{
   if(!this.active)return;this.setPov(true);
   if(!this.video.paused){this.video.pause();return;}
   const ticket=++this.playTicket;await this.media.load();if(!this.active||ticket!==this.playTicket||$('#route-view').value!=='pov')return;
   if(this.video.ended)this.video.currentTime=0;
   try{await this.video.play();}catch{this.media.message('Pulsa Play en el reproductor para iniciar el video.');}
  });
  $('#route-reset').addEventListener('click',()=>{this.playTicket++;this.video.pause();if(this.video.readyState)this.video.currentTime=0;this.update();});
  $('#route-progress').addEventListener('input',e=>{if(Number.isFinite(this.video.duration))this.video.currentTime=this.video.duration*Number(e.target.value)/1000;});
  $('#route-speed').addEventListener('input',e=>{this.video.playbackRate=Number(e.target.value);this.update();});
  for(const event of ['loadedmetadata','timeupdate','play','pause','ended','ratechange'])this.video.addEventListener(event,()=>this.update());
  this.update();
 }
 select(id){
  const choice=this.choices.find(v=>v.id===id);if(!choice)return;
  this.playTicket++;this.video.pause();this.selected=choice;
  $('#route-family').value=id;$('#route-path').value=id;
  this.setPov(true);this.update();
 }
 update(){
  $('#route-distance').textContent=`${clock(this.video.currentTime)} / ${clock(this.video.duration)}`;
  $('#route-progress').value=Number.isFinite(this.video.duration)?Math.round(this.video.currentTime/this.video.duration*1000):0;
  $('#route-play').textContent=this.video.paused?'▶ Reproducir':'Ⅱ Pausar';
  $('#route-speed-value').textContent=this.video.playbackRate.toLocaleString('es-CO')+'× · video';
  $('#route-speed').value=this.video.playbackRate;
 }
 enable(active){
  this.playTicket++;
  if(active){this.onEnter?.();this.video.pause();if(this.video.readyState)this.video.currentTime=0;}
  this.active=active;document.body.classList.toggle('routes-mode',active);
  $('#routes-controls').hidden=!active;$('#route-view-control').hidden=!active;$('#routes-tab').setAttribute('aria-pressed',String(active));
  if(active)this.setPov(true);
  else{this.media.setVisible(false);$('#pov-panel h2').textContent='Vista 3D · estación completa';$('#pov-panel .view-heading p').textContent='Modelo completo · video POV disponible en Recorridos';}
  const scene=this.getScene();if(scene)scene.dirty=true;
 }
 setPov(enabled){
  if(!enabled)this.playTicket++;
  $('#route-view').value=enabled?'pov':'3d';this.media.setVisible(this.active&&enabled,this.selected.id,this.selected.title);
  if(this.active){$('#pov-panel h2').textContent=enabled?'POV · '+this.selected.title:'Vista 3D · estación completa';$('#pov-panel .view-heading p').textContent=enabled?'Video original · inicia con Play':'Trazado del recorrido · En construcción';}
  const scene=this.getScene();if(scene)scene.dirty=true;
 }
}
