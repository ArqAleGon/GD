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

if(current!=='documentos'){
  const control=document.createElement('aside');
  control.className='compassControl';
  control.setAttribute('aria-label','Brújula de orientación, norte al frente');
  control.innerHTML=`<div class="compassTitle">ORIENTACIÓN</div><div class="compass" aria-hidden="true"><b>N</b><span class="compassNeedle"></span><i>E</i><i>S</i><i>O</i></div><output class="compassHeading">000°</output>`;
  const mountSelector={bim:'.viewport',predial:'.mapViewport'}[current];
  (mountSelector?document.querySelector(mountSelector):document.body)?.append(control);
  const needle=control.querySelector('.compassNeedle');
  const output=control.querySelector('.compassHeading');
  const setHeading=value=>{
    const degrees=((Number(value)||0)%360+360)%360;
    needle.style.transform=`rotate(${degrees.toFixed(2)}deg)`;
    output.value=`${String(Math.round(degrees)%360).padStart(3,'0')}°`;
    control.setAttribute('aria-label',`Brújula de orientación, norte a ${Math.round(degrees)} grados respecto de la vista`);
  };
  document.addEventListener('sceneheading',event=>setHeading(event.detail?.degrees));
  setHeading(0);
}
