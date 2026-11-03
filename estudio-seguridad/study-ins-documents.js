// Original INS documents, kept separate from calibrated camera overlays.
export async function mountInsDocuments(station,onLevel){
 const panel=document.createElement('article');panel.className='view ins-documents';panel.id='ins-documents';
 panel.innerHTML=`<header class="view-heading"><div><h2>Planos INS · CCTV</h2><p>Disposición y cobertura de cámaras</p></div><button id="ins-expand" aria-label="Ampliar planos INS">⛶</button></header><div class="plan-controls"><label>Documento<select id="ins-document"></select></label><label>Lámina<select id="ins-sheet"></select></label><div class="zoom-controls"><button id="ins-out" aria-label="Alejar plano INS">−</button><button id="ins-fit">Ajustar</button><button id="ins-in" aria-label="Acercar plano INS">+</button><button id="ins-rotate">Girar</button><a id="ins-pdf" target="_blank" rel="noopener">Abrir PDF ↗</a></div></div><div class="ins-viewport"><svg id="ins-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Plano INS de la estación"></svg><p id="ins-loading" role="status">Cargando planos INS…</p></div><footer class="view-footer"><span id="ins-status"></span></footer><p class="ins-source-note"></p>`;
 document.querySelector('.model-information').before(panel);document.body.classList.add('with-ins-plans');
 const $=s=>panel.querySelector(s),svg=$('#ins-svg'),viewport=$('.ins-viewport');
 let data,doc,page,currentLevel,rotation=0,zoom=1,center=[0,0],width=1,height=1,baseWidth=1,baseHeight=1,request=0,drag;
 const options=(select,rows)=>select.replaceChildren(...rows.map(([value,label])=>new Option(label,value)));
 function box(){const r=viewport.getBoundingClientRect(),aspect=Math.max(r.width,1)/Math.max(r.height,1);baseWidth=Math.max(width,height*aspect);baseHeight=baseWidth/aspect;svg.setAttribute('viewBox',`${center[0]-baseWidth/zoom/2} ${center[1]-baseHeight/zoom/2} ${baseWidth/zoom} ${baseHeight/zoom}`);}
 function fit(){zoom=1;center=[width/2,height/2];box();}
 async function show(n,follow=false){
  page=doc.pages.find(p=>p.page===Number(n))||doc.pages[0];$('#ins-sheet').value=String(page.page);const token=++request;$('#ins-loading').hidden=false;$('#ins-loading').textContent='Cargando lámina…';svg.replaceChildren();
  $('#ins-pdf').href=doc.pdf+(doc.pdfDownload?'':'#page='+page.page);$('#ins-pdf').textContent=doc.pdfDownload?'Descargar PDF completo ↗':'Abrir PDF ↗';$('#ins-status').textContent=`${doc.stage} · ${doc.revision} · Página ${page.page}/${doc.pages.length}`;
  if(follow&&page.level)onLevel(page.level);
  try{const im=new Image();im.src=page.image;await im.decode();if(token!==request)return;
   const w=im.naturalWidth,h=im.naturalHeight;[width,height]=rotation%2?[h,w]:[w,h];
   const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',page.image);image.setAttribute('width',w);image.setAttribute('height',h);image.setAttribute('transform',[``, `translate(${h},0) rotate(90)`,`translate(${w},${h}) rotate(180)`,`translate(0,${w}) rotate(270)`][rotation]);svg.replaceChildren(image);$('#ins-loading').hidden=true;svg.dataset.page=page.page;svg.dataset.document=doc.id;fit();
  }catch(error){if(token!==request)return;$('#ins-loading').textContent='No se pudo cargar la lámina. Usa Abrir PDF o selecciona la lámina de nuevo.';console.error(error);}
 }
 function choose(id,level){doc=data.documents.find(d=>d.id===id)||data.documents[0];$('#ins-document').value=doc.id;options($('#ins-sheet'),doc.pages.map(p=>[String(p.page),`${p.page}. ${p.label}`]));show((doc.pages.find(p=>p.level===level)||doc.pages.find(p=>p.level==='A')||doc.pages[0]).page);}
 $('#ins-document').addEventListener('change',()=>choose($('#ins-document').value,currentLevel));$('#ins-sheet').addEventListener('change',()=>show($('#ins-sheet').value,true));
 $('#ins-fit').addEventListener('click',fit);for(const [id,factor] of [['#ins-in',1.4],['#ins-out',1/1.4]])$(id).addEventListener('click',()=>{zoom=Math.max(.5,Math.min(zoom*factor,24));box();});
 $('#ins-rotate').addEventListener('click',()=>{rotation=(rotation+1)%4;show(page.page);});
 $('#ins-expand').addEventListener('click',()=>{panel.classList.toggle('is-expanded');fit();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.classList.remove('is-expanded');fit();}});
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(zoom*Math.exp(-e.deltaY*.001),24));box();},{passive:false});
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag=[e.clientX,e.clientY,...center];svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();center=[drag[2]-(e.clientX-drag[0])*baseWidth/zoom/r.width,drag[3]-(e.clientY-drag[1])*baseHeight/zoom/r.height];box();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>drag=null);
 new ResizeObserver(box).observe(viewport);
 try{const response=await fetch(station.insDocuments);if(!response.ok)throw Error('Planos INS HTTP '+response.status);data=await response.json();options($('#ins-document'),data.documents.map(d=>[d.id,`${d.name} · ${d.stage}`]));$('.ins-source-note').textContent=data.sourceNote;choose(data.defaultDocument);}
 catch(error){$('#ins-loading').textContent='No se pudo cargar el catálogo de planos INS.';throw error;}
 return {setLevel(level){currentLevel=level;if(!level)return;const target=doc.pages.find(p=>p.level===level);if(target&&page.level!==level)show(target.page);}};
}
