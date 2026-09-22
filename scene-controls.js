const current=document.body.dataset.scene||'scene';
const fullscreen=document.querySelector('[data-scene-fullscreen]');
const updateFullscreen=()=>{
  if(!fullscreen)return;
  const active=!!document.fullscreenElement;
  fullscreen.setAttribute('aria-pressed',String(active));
  fullscreen.title=active?'Salir de pantalla completa':'Ampliar a página completa';
  const label=fullscreen.querySelector('[data-fullscreen-label]');
  if(label)label.textContent=active?'Salir':'Pantalla completa';
};
if(fullscreen&&!fullscreen.hasAttribute('data-scene-fullscreen-external'))fullscreen.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}
});
document.addEventListener('fullscreenchange',updateFullscreen);updateFullscreen();

const control=document.createElement('aside');
control.className='spatialControls';
control.setAttribute('aria-label','Navegación espacial');
control.innerHTML=`<div class="spatialTitle">ORIENTACIÓN</div><div class="navCube" data-cube="iso" aria-label="Cubo de navegación 3D"><span class="cubeFace cubeTop">PLANTA</span><span class="cubeFace cubeFront">FRENTE</span><span class="cubeFace cubeSide">LADO</span></div><div class="cubeActions" aria-label="Vistas del cubo"><button data-orientation="top">Planta</button><button data-orientation="front">Frente</button><button data-orientation="side">Lado</button><button data-orientation="home" title="Vista inicial">⌂</button></div><div class="compass" aria-label="Brújula, norte arriba"><b>N</b><span class="compassNeedle"></span><i>E</i><i>S</i><i>O</i></div>`;
const mountSelector={bim:'.viewport',predial:'.mapViewport',documentos:'.workspace'}[current];
(mountSelector?document.querySelector(mountSelector):document.body)?.append(control);
const cube=control.querySelector('.navCube');
const compass=control.querySelector('.compass');
control.querySelectorAll('[data-orientation]').forEach(button=>button.addEventListener('click',()=>{
  const view=button.dataset.orientation;
  cube.dataset.cube=view;
  compass.dataset.heading=view;
  const linked=document.querySelector(`[data-camera="${view}"]`);
  if(linked&&!control.contains(linked))linked.click();
  else document.dispatchEvent(new CustomEvent('sceneorientation',{detail:{view,scene:current}}));
}));
