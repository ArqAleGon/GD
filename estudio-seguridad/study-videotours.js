export function initVideoTours(){
 const button=document.querySelector('#videotours-tab'),dialog=document.querySelector('#videotours-dialog'),video=document.querySelector('#videotours-video'),select=document.querySelector('#videotours-select'),status=document.querySelector('#videotours-status');
 let videos=[],loaded=false,request=null,previousFocus=null;
 const message=text=>{status.textContent=text;status.hidden=!text;};
 function choose(){
  video.pause();const item=videos.find(v=>v.id===select.value);if(!item){video.hidden=true;return;}
  document.querySelector('#videotours-name').textContent=item.title;video.hidden=false;message('Cargando video…');video.src=new URL(item.file,new URL('./assets/videotours/',location.href)).href;video.load();
 }
 async function load(){
  if(loaded)return;if(request)return request;
  request=(async()=>{try{message('Cargando videorecorridos…');const response=await fetch('./assets/videotours/manifest.json?v=20261022-v11');if(!response.ok)throw Error('Catálogo no disponible');const data=await response.json();videos=data.videos||[];select.replaceChildren(...videos.map(item=>new Option(item.title,item.id)));select.parentElement.hidden=videos.length<2;loaded=true;if(!videos.length){video.hidden=true;message('El video está pendiente de completar su descarga e incorporación.');return;}if(dialog.open)choose();}catch{message('No se pudo cargar el video. Usa «Reintentar».');document.querySelector('#videotours-retry').hidden=false;}finally{request=null;}})();return request;
 }
 button.addEventListener('click',()=>{previousFocus=document.activeElement;for(const shell of document.querySelectorAll('.drawer-shell')){shell.classList.remove('is-open');shell.dataset.pinned='false';shell.querySelector('.drawer-tab').setAttribute('aria-expanded','false');shell.querySelector('.drawer-panel').inert=true;}dialog.showModal();button.setAttribute('aria-expanded','true');if(loaded&&videos.length&&!video.getAttribute('src'))choose();else load();});
 document.querySelector('#videotours-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{video.pause();button.setAttribute('aria-expanded','false');previousFocus?.focus();});
 select.addEventListener('change',choose);
 document.querySelector('#videotours-retry').addEventListener('click',()=>{document.querySelector('#videotours-retry').hidden=true;if(videos.length)choose();else{loaded=false;load();}});
 video.addEventListener('loadedmetadata',()=>{message('');document.querySelector('#videotours-retry').hidden=true;});
 video.addEventListener('playing',()=>message(''));
 video.addEventListener('waiting',()=>message('Cargando video…'));
 video.addEventListener('canplay',()=>message(''));
 video.addEventListener('error',()=>{message('No se pudo reproducir este video. Comprueba la conexión y vuelve a intentarlo.');document.querySelector('#videotours-retry').hidden=false;});
}
