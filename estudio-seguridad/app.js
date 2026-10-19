/* Stage 1: interface prototype. No real model, PDF, optical simulation or video feed. */
const $ = selector => document.querySelector(selector);
const models = [
 {id:'standard',name:'Cámara estándar · referencia',type:'Domo fijo',description:'Perfil ilustrativo por defecto',resolution:'1920 × 1080',fov:'90° H / 59° V',lens:'Referencia · por definir',fps:'30 fps · ejemplo',protection:'Por definir',note:'Perfil de muestra, sin fabricante. Los valores no representan un equipo instalado.'},
 {id:'p3275',name:'AXIS P3275-LVE · 10 mm',type:'Domo varifocal',description:'Referencia para accesos y circulación',resolution:'1920 × 1080',fov:'100–32° H / 52–18° V',lens:'3,4–9,8 mm',fps:'Hasta 50/60 fps',protection:'IP66 / IP67 · IK10',url:'https://www.axis.com/products/axis-p3275-lve/support',note:'Variante 10 mm. Campo visual según distancia focal; datos del fabricante.'},
 {id:'p3268',name:'AXIS P3268-LVE · 4K',type:'Domo varifocal 4K',description:'Referencia de alta resolución',resolution:'3840 × 2160',fov:'100–53° H / 54–30° V',lens:'4,3–8,6 mm',fps:'Hasta 25/30 fps',protection:'IP66 · IK10',url:'https://www.axis.com/en-us/products/axis-p3268-lve/support',note:'Referencia de equipo existente. Modelo sustituido por el fabricante; se conserva para evaluar instalaciones.'},
 {id:'q6355',name:'AXIS Q6355-LE · PTZ',type:'PTZ · zoom óptico 31×',description:'Referencia para grandes recintos',resolution:'1920 × 1080',fov:'60,6–2° H / 36,5–1,1° V',lens:'6,91–214,64 mm',fps:'Hasta 50/60 fps',protection:'IP66 / IP67 · IK10',url:'https://www.axis.com/products/axis-q6355-le/support',note:'Giro continuo 360°. La cobertura futura dependerá del zoom y de la orientación seleccionada.'},
 {id:'m4318',name:'AXIS M4318-PLVE · panorámica',type:'Panorámica · sensor 12 MP',description:'Referencia para vestíbulos',resolution:'2992 × 2992',fov:'182° H / 182° V',lens:'1,2 mm · fija',fps:'Hasta 25/30 fps',protection:'IP66 · IK10',url:'https://www.axis.com/en-gb/products/axis-m4318-plve',note:'Visión panorámica 360° al instalarse en techo. Requiere proyección ojo de pez; el cono de muestra no la representa.'},
 {id:'p3737',name:'AXIS P3737-PLE · multisensor',type:'Multidireccional · 4 × 5 MP',description:'Referencia para espacios amplios',resolution:'2592 × 1944 / sensor',fov:'360° conjunto / 70,3–27° V',lens:'3,18–8,12 mm',fps:'Según modo y resolución',protection:'IP66 / IP67 · IK09',url:'https://www.axis.com/en-us/products/axis-p3737-ple',note:'Cuatro sensores orientables. Cada sensor requerirá su propio volumen visual en la etapa funcional.'}
];
const svg = (body,box='0 0 800 300',label='') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${label}">${body}</svg>`;
const cameraIcon = `<svg viewBox="0 0 70 58" aria-hidden="true"><path d="M12 22q23-15 46 0v6H12Z" fill="#b3c9d4" stroke="#c1d6e0"/><path d="M16 28a19 19 0 0 0 38 0" fill="#477080" stroke="#97b4c2"/><ellipse cx="35" cy="30" rx="19" ry="6" fill="#8eaebd" stroke="#a8c5d2"/><circle cx="35" cy="34" r="9" fill="#152d3d" stroke="#456e83"/><circle cx="35" cy="34" r="4" fill="#68c6b6" stroke="#aadbd1"/><path d="M24 17v-4h22v4" stroke="#7596a6"/></svg>`;
$('#camera-illustration').innerHTML = cameraIcon;
$('#model-select').innerHTML = models.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
function renderSpecs(){
 const m=models.find(m=>m.id===$('#model-select').value);
 $('#model-type').textContent=m.type; $('#model-description').textContent=m.description;
 const entries=[['Resolución',m.resolution],['Campo visual',m.fov],['Distancia focal',m.lens],['Frecuencia',m.fps],['Protección',m.protection],['Alcance útil','Pendiente de cálculo'],['Profundidad de campo','Pendiente de óptica / enfoque']];
 $('#specs').replaceChildren(...entries.map(([k,v])=>{const row=document.createElement('div');const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v;row.append(dt,dd);return row;}));
 $('#source-link').hidden=!m.url;if(m.url)$('#source-link').href=m.url;
 $('#source-note').textContent=m.note;
 // The scene remains conceptual; these labels describe the catalog, not rendered optics.
 $('#fov-summary').textContent=m.fov;$('#resolution-summary').textContent=m.resolution;
}
$('#model-select').addEventListener('change',renderSpecs);renderSpecs();
$('#camera-select').disabled=true;
$('#camera-select').title='Selección por menú y marcadores disponible en la etapa 3, al vincular posiciones reales.';

// Original vector drawings for layout review, deliberately unrelated to project geometry.
const perspective = `
 <defs><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#1c303b"/><stop offset="1" stop-color="#324650"/></linearGradient><linearGradient id="ceiling" x2="0" y2="1"><stop stop-color="#293d48"/><stop offset="1" stop-color="#10222e"/></linearGradient><linearGradient id="wall"><stop stop-color="#3f5661"/><stop offset="1" stop-color="#152c39"/></linearGradient></defs>
 <rect width="800" height="320" fill="#132732" stroke="none"/>
 <path d="M0 0h800L496 102H303Z" fill="url(#ceiling)" stroke="#4b6370"/>
 <path d="m0 320 304-169h192l304 169" fill="url(#floor)" stroke="#5e7680"/>
 <path d="M0 0 303 102v49L0 320Z" fill="url(#wall)" stroke="#56717d"/><path d="m800 0-304 102v49l304 169Z" fill="#263e4b" stroke="#526c79"/>
 <path d="M303 102h193v49H303Z" fill="#223c49" stroke="#65818e"/>
 <path d="M347 110h35v41h-35Zm65 0h35v41h-35Z" fill="#142935" stroke="#5a8294"/>
 <path d="M0 236h800M110 259h580M196 211h410M259 176h285M81 320l247-169m-150 169 174-169m-45 169 72-169m59 169-30-169m161 169-137-169m269 169L473 151" stroke="#65818a" opacity=".35"/>
 <path d="m70 0 249 102m-97-102 139 102M428 0l-28 102M643 0 446 102M0 41h800M132 80h535" stroke="#76909a" opacity=".3"/>
 <path d="m158 25 150 58m300-58-121 58" stroke="#c0dbe1" stroke-width="4" opacity=".65"/>
 <path d="M47 51 99 68v214l-52 29Z" fill="#58707b" stroke="#8195a0"/><path d="m99 68 12-5v207l-12 12Z" fill="#213d4c"/>
 <path d="m191 91 23 8v106l-23 12Z" fill="#627b86" stroke="#849ca7"/><path d="m214 99 8-3v103l-8 6" fill="#294752"/>
 <path d="m694 51 44-16v279l-44-28Z" fill="#486370" stroke="#6d8897"/><path d="m694 51-15 5v222l15 8Z" fill="#1c3543"/>
 <path d="m584 90 21-7v139l-21-13Z" fill="#506d7a" stroke="#718d99"/>
 <path d="m104 111 75 19v60l-75 39Zm514 19 57-15v112l-57-31Z" fill="#193d51" stroke="#578298"/><path d="m130 118 0 92m24-86v73m480-71v79m22-84v94" stroke="#4c7b91"/>
 <rect x="360" y="88" width="78" height="14" fill="#4c716c" stroke="#7a9891"/><text x="399" y="98" text-anchor="middle" fill="#d1e3de" stroke="none" font-family="Arial" font-size="7">ACCESO · MUESTRA</text>
 <g fill="#b4c5c9" stroke="#a6bcc5" opacity=".7"><circle cx="453" cy="140" r="4"/><path d="m449 147-3 18h14l-3-18Zm1 18-1 15m7-15 2 15"/><circle cx="342" cy="157" r="5"/><path d="m337 165-3 21h17l-4-21Zm1 21-1 21m9-21 2 21"/></g>
 <rect width="800" height="320" fill="#07131d" opacity=".18" stroke="none"/>`;
$('#pov-art').innerHTML=svg(perspective,'0 0 800 320','Perspectiva ilustrativa de un vestíbulo; no es un modelo real ni señal de video');

function axonDrawing(){
 const p=(x,y,z=0)=>[390+(x-y)*.82,126+(x+y)*.34-z];
 const pts=a=>a.map(c=>p(...c).join(',')).join(' ');
 const poly=(a,fill,stroke='#56778a')=>`<polygon points="${pts(a)}" fill="${fill}" stroke="${stroke}"/>`;
 let s='';
 for(let i=-280;i<=280;i+=40){s+=`<polyline points="${pts([[i,-200],[i,200]])}" stroke="#1c394b"/><polyline points="${pts([[-280,i*.7],[280,i*.7]])}" stroke="#1c394b"/>`;}
 s+=poly([[-235,-130],[235,-130],[235,130],[-235,130]],'#18303e','#5f8399');
 s+=poly([[-235,130],[235,130],[235,130,-10],[-235,130,-10]],'#0c2232');
 const wall=(x1,y1,x2,y2)=>{s+=poly([[x1,y1],[x2,y2],[x2,y2,34],[x1,y1,34]],'#678495','#91aab7');s+=poly([[x1,y1,34],[x2,y2,34],[x2+4,y2+4,34],[x1+4,y1+4,34]],'#acc2cb','#bed0d8');};
 wall(-235,-130,235,-130);wall(-235,-130,-235,130);wall(235,-130,235,130);
 wall(-235,-35,-92,-35);wall(-92,-130,-92,-65);wall(60,-130,60,-50);wall(135,-130,135,-40);wall(60,-40,235,-40);wall(-235,65,-100,65);wall(-100,65,-100,130);
 for(const x of [-60,75,180])for(const y of [-10,95]){s+=poly([[x,y],[x+9,y],[x+9,y+9],[x,y+9]],'#8ea7b5');s+=poly([[x,y],[x+9,y],[x+9,y,32],[x,y,32]],'#a8c0cb');s+=poly([[x+9,y],[x+9,y+9],[x+9,y+9,32],[x+9,y,32]],'#627e91');}
 const cam=[-185,65,36],corners=[[-30,-45,0],[125,35,0],[125,35,70],[-30,-45,70]];
 s+=poly(corners,'#55ddbc15','#58d9bc80');
 for(let i=0;i<4;i++)s+=poly([cam,corners[i],corners[(i+1)%4]],i<2?'#58d9bc19':'#58d9bc09','#58d9bc88');
 s+=`<polyline points="${pts([cam,[47,-5,25]])}" stroke="#8fe5d3" stroke-dasharray="4 4"/>`;
 for(const [id,at] of [['01',cam],['02',[40,-105,37]],['03',[200,90,37]]]){const [x,y]=p(...at);s+=`<circle cx="${x}" cy="${y}" r="${id==='01'?10:8}" fill="${id==='01'?'#58d9bc':'#143347'}" stroke="${id==='01'?'#a8ffe9':'#75a5c4'}"/><path d="m${x-4} ${y-2}h5v4h-5Zm5 1 3-2v4l-3-1" stroke="${id==='01'?'#063c37':'#93c7e3'}" fill="none"/><text x="${x+14}" y="${y-8}" fill="${id==='01'?'#9af0d9':'#77a1ba'}" font-family="Arial" font-size="9" stroke="none">CAM-${id}</text>`;}
 const [ox,oy]=p(50,60,0);s+=`<ellipse cx="${ox}" cy="${oy+5}" rx="12" ry="4" fill="#e9bd6d22" stroke="#dcbd78"/><circle cx="${ox}" cy="${oy-16}" r="3.5" fill="#e9c67c" stroke="none"/><path d="m${ox-3} ${oy-10}h6l3 10h-12Zm1 10v7m4-7v7" fill="#e9c67c" stroke="#e9c67c"/>`;
 return svg(s,'0 0 800 300','Axonometría conceptual con cámara activa verde, volumen visual y observador ámbar; sin escala');
}
const axon=axonDrawing();$('#axon-art').innerHTML=axon;$('#entry-art').innerHTML=axon;

let plan=`<defs><pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#335569" stroke-width=".35"/></pattern></defs><rect x="25" y="50" width="270" height="420" fill="url(#plan-grid)" stroke="none"/>
 <g fill="#16303f" stroke="#7a99ac" stroke-width="3"><path d="M48 84h224v336H48Z"/><path d="M48 84h90v100H48Zm154 0h70v100h-70ZM48 300h90v120H48Zm154 30h70v90h-70Z"/></g>
 <g fill="none" stroke="#829cad"><path d="M138 125v33m64-33v33M90 184h25m110 0h25M138 340v35M201 350v26" stroke="#16303f" stroke-width="5"/><path d="m90 184 0-26q26 0 26 26m22 157h28q0 28-28 28M202 350h-26q0 26 26 26"/><path d="M57 94h69v9H57Zm0 15h69v9H57Zm0 15h69v9H57Zm0 15h69v9H57Zm0 15h69v9H57Z" stroke="#4d728a"/><path d="M215 100h42v60h-42Zm-156 220h52v67H59Zm155 26h46v55h-46Z" stroke="#496c80"/></g>
 <g fill="#8ca7b7" stroke="none" font-size="8" font-family="Arial" text-anchor="middle"><text x="93" y="176">ESCALERA</text><text x="235" y="175">SERVICIOS</text><text x="85" y="405">OFICINA</text><text x="235" y="412">CONTROL</text><text x="163" y="285">VESTÍBULO</text><text x="163" y="438">ACCESO</text></g>
 <path d="m90 333 37-147 130 92Z" fill="#58d9bc21" stroke="#58d9bc" stroke-width="1"/><path d="m90 333 102-104" stroke="#98eed8" stroke-dasharray="4 4"/><path d="M111 251q43 8 53 35" stroke="#58d9bc77" fill="none"/><path d="M101 290q23 4 37 19" stroke="#58d9bc77" fill="none"/>
 <g fill="#324f60" stroke="#87a8bb"><rect x="145" y="198" width="9" height="9"/><rect x="218" y="198" width="9" height="9"/><rect x="145" y="305" width="9" height="9"/><rect x="218" y="305" width="9" height="9"/></g>
 <g fill="none" stroke="#486579" stroke-width=".6"><path d="M36 84H27m9 336h-9M31 84v336m17 16v13m224-13v13M48 444h224"/><path d="m28 87 6-6m-6 342 6-6"/></g>`;
for(const [id,x,y] of [['01',90,333],['02',180,108],['03',250,315]]){plan+=`<circle cx="${x}" cy="${y}" r="11" fill="${id==='01'?'#58d9bc':'#0f2b3f'}" stroke="${id==='01'?'#a6f9e2':'#81b1cd'}"/><path d="m${x-5} ${y-3}h6v6h-6Zm6 2 4-3v6l-4-2" fill="none" stroke="${id==='01'?'#083b36':'#96bed7'}"/><text x="${x-17}" y="${y+23}" fill="${id==='01'?'#91e8d1':'#87afc7'}" stroke="none" font-family="Arial" font-size="8">CAM-${id}</text>`;}
plan+='<circle cx="176" cy="260" r="5" fill="#edc578" stroke="#ffe7b9"/><circle cx="176" cy="260" r="10" fill="none" stroke="#edc57866"/>';
$('#plan-art').innerHTML=svg(plan,'0 0 320 530','Plano esquemático, cámara CAM-01 activa, orientación diagonal y cono visual conceptual; PDF pendiente');

const entry=$('#entry-dialog');let loadTimer;
function showLoading(){
 clearTimeout(loadTimer);
 document.querySelectorAll('.load-overlay').forEach(el=>el.hidden=false);
 document.querySelectorAll('.scene').forEach(el=>el.setAttribute('aria-busy','true'));
 $('#loading-preview').disabled=true;
 loadTimer=setTimeout(()=>{document.querySelectorAll('.load-overlay').forEach(el=>el.hidden=true);document.querySelectorAll('.scene').forEach(el=>el.setAttribute('aria-busy','false'));$('#loading-preview').disabled=false;},1400);
}
$('#entry-building').addEventListener('change',()=>{
 const ready=!!$('#entry-building').value;$('#entry-level').disabled=!ready;
 $('#entry-level').innerHTML=ready?'<option value="">Seleccionar nivel</option><option value="01">Nivel 01 · Planta baja (muestra)</option>':'<option value="">Primero selecciona una edificación</option>';
 $('#enter-button').disabled=true;
});
$('#entry-level').addEventListener('change',()=>$('#enter-button').disabled=!$('#entry-level').value);
$('#entry-form').addEventListener('submit',event=>{event.preventDefault();if(!$('#entry-building').value||!$('#entry-level').value)return;entry.close();showLoading();$('#change-context').focus();});
$('#change-context').addEventListener('click',()=>entry.showModal());
$('#loading-preview').addEventListener('click',showLoading);
$('#help-button').addEventListener('click',()=>$('#help-dialog').showModal());
document.querySelectorAll('.expand').forEach(button=>button.addEventListener('click',()=>{
 const panel=document.getElementById(button.dataset.panel);const expanding=!panel.classList.contains('is-expanded');
 document.querySelectorAll('.view.is-expanded').forEach(el=>el.classList.remove('is-expanded'));
 panel.classList.toggle('is-expanded',expanding);button.setAttribute('aria-pressed',String(expanding));
}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('.view.is-expanded').forEach(el=>{el.classList.remove('is-expanded');el.querySelector('.expand').setAttribute('aria-pressed','false');});}});
entry.showModal();
