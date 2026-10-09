const active=new Set();
export function cancelModelLoads(){for(const task of [...active])task.finish();}
export function modelLoading(host,name){
 if(!host)return {progress(){},preparing(){},finish(){},fail(){}};
 const panel=document.createElement('div');panel.className='model-loading';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 panel.innerHTML='<img src="./assets/logo-metro.jpg" alt="Metro de Bogotá" width="64" height="64"><strong>Cargando modelo 3D</strong><span class="loading-model"></span><b class="loading-percent">En curso</b><progress max="100" aria-label="Avance de carga"></progress><span class="loading-stage">Conectando…</span><small class="loading-time" aria-live="off">0 s transcurridos</small>';
 panel.querySelector('.loading-model').textContent=name;host.parentElement.append(panel);host.setAttribute('aria-busy','true');
 let closed=false;
 const started=performance.now(),timer=setInterval(()=>{const seconds=Math.floor((performance.now()-started)/1000);panel.querySelector('.loading-time').textContent=(seconds<60?seconds+' s':Math.floor(seconds/60)+' min '+seconds%60+' s')+' transcurridos';},1000);
 const stop=()=>{clearInterval(timer);active.delete(task);if(![...active].some(t=>t.host===host&&!t.failed))host.setAttribute('aria-busy','false');};
 const task={host,
 progress(text,info){if(closed)return;panel.querySelector('.loading-stage').textContent=text;if(info&&info.total>0){const pct=Math.min(100,Math.floor(info.loaded/info.total*100));panel.querySelector('progress').value=pct;panel.querySelector('.loading-percent').textContent=pct+'%';}},
 preparing(){if(closed)return;panel.querySelector('progress').removeAttribute('value');panel.querySelector('.loading-percent').textContent='Preparando';panel.querySelector('.loading-stage').textContent='Preparando geometría para visualizar…';},
 finish(){if(closed)return;closed=true;stop();panel.remove();},
 fail(error){if(closed||task.failed)return;task.failed=true;stop();active.add(task);panel.querySelector('.loading-percent').textContent='Carga interrumpida';panel.querySelector('.loading-stage').textContent=error.message;panel.querySelector('progress').hidden=true;const retry=document.createElement('button');retry.textContent='Reintentar carga';retry.onclick=()=>location.reload();panel.append(retry);const close=document.createElement('button');close.textContent='Cerrar aviso';close.onclick=()=>task.finish();panel.append(close);}
 };active.add(task);return task;
}
export const loadingFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
