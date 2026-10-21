export const opticsProfiles={
 standard:{mode:'perspective',fov:90,vfov:59,minFov:90,width:1920,height:1080,fps:30},
 p3275:{mode:'perspective',fov:100,vfov:52,minFov:32,minVfov:18,width:1920,height:1080,fps:60},
 p3268:{mode:'perspective',fov:100,vfov:54,minFov:53,minVfov:30,width:3840,height:2160,fps:30},
 q6355:{mode:'perspective',fov:60.6,vfov:36.5,minFov:2,minVfov:1.1,width:1920,height:1080,fps:60},
 m4318:{mode:'fisheye',fov:182,vfov:182,minFov:182,width:2992,height:2992,fps:30},
 p3737:{mode:'multi',fov:99,vfov:70,minFov:37,minVfov:28,width:2592,height:1944,fps:20,sensors:4}
};
export function initDrawers(){
 const shells=[...document.querySelectorAll('.drawer-shell')];
 const set=(s,open,pin=false)=>{s.classList.toggle('is-open',open);s.dataset.pinned=String(pin);s.querySelector('.drawer-tab').setAttribute('aria-expanded',String(open));s.querySelector('.drawer-panel').inert=!open;};
 for(const s of shells){
  s.addEventListener('pointerenter',()=>{for(const other of shells)if(other!==s)set(other,false);set(s,true,s.dataset.pinned==='true');});
  s.addEventListener('pointerleave',()=>{if(s.dataset.pinned!=='true'&&!s.contains(document.activeElement))set(s,false);});
  s.querySelector('.drawer-tab').addEventListener('click',()=>{const pin=s.dataset.pinned!=='true';for(const other of shells)if(other!==s)set(other,false);set(s,pin,pin);});
  s.querySelector('.drawer-close').addEventListener('click',()=>set(s,false));
 }
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.side-tools'))for(const s of shells)set(s,false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const s of shells)set(s,false);});
}
export function initFullscreen(onResize){
 const b=document.querySelector('#fullscreen-button');
 b.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.body.classList.toggle('app-fullscreen');b.textContent=document.body.classList.contains('app-fullscreen')?'Salir de pantalla ampliada':'⛶ Pantalla completa';}onResize();});
 document.addEventListener('fullscreenchange',()=>{b.textContent=document.fullscreenElement?'⛶ Salir de pantalla completa':'⛶ Pantalla completa';b.setAttribute('aria-label',b.textContent);onResize();});
}
