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

const sourceFile=(file,detail,loaded)=>({file,detail,loaded});
const p6=sourceFile('Archivo Base Corte 31082026.xlsx','Programa Primavera P6 · corte 31/08/2026','21/09/2026');
const predialBook=sourceFile('20260918_Plantilla_Tabla_Final_PREDIOS.xlsx','Información de gestión y estaciones/tramos','21/09/2026');
const predialShape=sourceFile('PREDIOS_L1MB_ABRIL2026.shp','Geometría predial de la Línea 1','21/09/2026');
const mapBase=sourceFile('MapaBaseBogota/*.shp','Base catastral y referencia territorial de Bogotá','22/09/2026');
const buildings=sourceFile('CONSTRUC.shp','Edificaciones hasta 100 m a cada lado de la L1 · CONNPISOS × 3 m','22/09/2026');
const hills=sourceFile('CNiv.shp','Curvas de nivel de los Cerros Orientales','22/09/2026');
const roads=sourceFile('Malla_Vial_Integral_Bogota_D_C.shp','Nombres y códigos de las vías principales','22/09/2026');
const aerial=sourceFile('bogota-ortho-2025-[mosaicos].webp','Fuente: IDECA/UAECD · Ortoimagen urbana Bogotá 2025 · fecha de imagen 31/08/2025 · CC BY 4.0','23/09/2026');
const e15Ifc=sourceFile('e15-architecture-web.glb / e15-1100.glb','Conversión web de modelos IFC E15 · ARQ + EST','16/09/2026');
const i16Ifc=sourceFile('i16-est-1100-web.glb / i16-est-1150-web.glb','Conversión web de modelos IFC I16 · EST','16/09/2026');
const e16Ifc=sourceFile('e16-arq-0000-web.glb / e16-est-*.glb','Conversión web de modelos IFC E16 · ARQ + EST','16/09/2026');
const patio102=sourceFile('L1T1-1542-102-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 102 Administración · ARQ V00','24/09/2026');
const patio103a=sourceFile('L1T1-1542-103-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 103 Caseta de Control · ARQ V00','24/09/2026');
const patio103b=sourceFile('L1T1-1542-103-CON-ED-ARQ-MO-0002_V00.ifc','Patio Taller · 103 Caseta de Control · ARQ V00','24/09/2026');
const patio104=sourceFile('L1T1-1542-104-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 104 Cocheras · ARQ V00','24/09/2026');
const patio105=sourceFile('L1T1-1542-105-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 105 Locales Técnicos · ARQ V00','24/09/2026');
const patio106a=sourceFile('L1T1-1542-106-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 106 Máquina de Lavado · ARQ V00','24/09/2026');
const patio106b=sourceFile('L1T1-1542-106-CON-ED-ARQ-MO-0002_V00.ifc','Patio Taller · 106 Máquina de Lavado · ARQ V00','24/09/2026');
const patio107=sourceFile('L1T1-1542-107-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 107 Edificio de Mantenimiento · ARQ V00','25/09/2026');
const patio108=sourceFile('L1T1-1542-108-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 108 Mantenimiento Mayor · ARQ V00','25/09/2026');
const patio109a=sourceFile('L1T1-1542-109-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 109 Tanque · ARQ V00','25/09/2026');
const patio109b=sourceFile('L1T1-1542-109-CON-ED-ARQ-MO-0002_V00.ifc','Patio Taller · 109 Tanque · ARQ V00','25/09/2026');
const patio110=sourceFile('L1T1-1542-110-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 110 PTAR · IFC fuente sin elementos geométricos','25/09/2026');
const patio111=sourceFile('L1T1-1542-111-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 111 Puesto de Mando · conversión de alta fidelidad por tipo IFC; se excluyen mobiliario y sólidos de apertura','25/09/2026');
const patio112=sourceFile('L1T1-1542-112-CON-ED-ARQ-MO-0001_V00.ifc','Patio Taller · 112 Torno en Foso · ARQ V00','25/09/2026');
const patioIfc=[patio102,patio103a,patio103b,patio104,patio105,patio106a,patio106b,patio107,patio108,patio109a,patio109b,patio110,patio111,patio112];
const renderE15=sourceFile('render-e15-20260917.png','Render hiperrealista suministrado para E15','17/09/2026');
const progressE15=sourceFile('e15-obra-20260831.png','Estado real de la obra al 31/08/2026','17/09/2026');
const documentSources=[
 sourceFile('E15-2_08_2026.png','Registro visual de la estación E15','17/09/2026'),
 sourceFile('E15_08_2026.png','Registro visual de la estación E15','17/09/2026'),
 sourceFile('L1T1-0000-315-CON-ED-ARQ-EV-0001_V01.xlsx','Libro de arquitectura · revisión V01','17/09/2026'),
 sourceFile('L1T1-0000-315-CON-ED-ARQ-IN-0008_VBB.pdf','Documento técnico de arquitectura · revisión VBB','17/09/2026'),
 sourceFile('L1T1-PMO-DPY-VD-0355.MP4','Registro de obra · versión web · fecha del registro 31/08/2026','17/09/2026'),
 sourceFile('VCAD_Base_Original.pbix','Informe Power BI · acceso sujeto a permisos del informe','17/09/2026')
];
const sourceProfiles={
 predial:{title:'Predial L1',note:'Cruce LotCodigo = LOTCODIGO y capas territoriales de referencia.',items:[predialBook,predialShape,mapBase]},
 bim:{title:'Avance BIM',note:'Geometría IFC vinculada por UE con el programa Primavera P6.',items:[e15Ifc,i16Ifc,e16Ifc,p6]},
 documentos:{title:'Visor documental',note:'Catálogo público incorporado desde la carpeta Documental.',items:documentSources}
};
const viewTitles={network:'Inicio · Red ferroviaria',events:'Inicio · Operación',traffic:'Inicio · Flujo de pasajeros',dispatch:'Inicio · Trenes en circulación',station:'Estación 3D',indoor:'Recorrido interior',security:'Cámaras y seguridad',evacuation:'Emergencias',platform:'Andén y puertas',equipment:'Sala técnica',railway:'Seguimiento del tren',maintenance:'Sistemas ferroviarios',urban:'Datos Integrados'};
function inicioProfile(view){
 if(view==='urban')return{title:viewTitles[view],note:'Integración geográfica e IFC de E15–E16 y del Patio Taller 102–112. El conjunto completo se carga al entrar en Datos Integrados y queda disponible durante la sesión; 110 PTAR no contiene geometría y 111 usa clasificación gráfica por tipo IFC.',items:[e15Ifc,i16Ifc,e16Ifc,...patioIfc,mapBase,renderE15,progressE15]};
 if(['station','indoor','security','evacuation','platform','equipment'].includes(view))return{title:viewTitles[view],note:'La geometría procede de los modelos IFC; equipos, personas, alarmas y cámaras representan funciones de demostración.',items:[e15Ifc,i16Ifc,e16Ifc,p6]};
 if(['railway','maintenance'].includes(view))return{title:viewTitles[view],note:'La geometría ferroviaria se apoya en el contexto L1; movimiento, operación y mantenimiento son simulados.',items:[p6,mapBase,buildings]};
 return{title:viewTitles[view]||viewTitles.network,note:'Fuentes activas de la escena territorial y de los indicadores Primavera P6.',items:[p6,mapBase,buildings,hills,roads,aerial]};
}
let activeSourceView='network';
const sourceToggle=document.createElement('button');
sourceToggle.type='button';sourceToggle.className='dataSourceToggle';sourceToggle.innerHTML='<span aria-hidden="true">▤</span><b>Fuente de datos</b>';sourceToggle.setAttribute('aria-expanded','false');
const sourcePanel=document.createElement('aside');
sourcePanel.className='dataSourcePanel';sourcePanel.hidden=true;sourcePanel.setAttribute('aria-label','Fuentes de datos de la escena');
sourcePanel.innerHTML='<header><div><small>TRAZABILIDAD</small><h2></h2></div><button type="button" aria-label="Cerrar fuentes de datos">×</button></header><p class="dataSourceNote"></p><ul></ul><footer>Fecha de carga = incorporación del archivo a la publicación del mockup.</footer>';
document.body.append(sourceToggle,sourcePanel);
function renderSourcePanel(){
 const profile=current==='inicio'?inicioProfile(activeSourceView):sourceProfiles[current];
 if(!profile)return;
 sourcePanel.querySelector('h2').textContent=profile.title;
 sourcePanel.querySelector('.dataSourceNote').textContent=profile.note;
 sourcePanel.querySelector('ul').innerHTML=profile.items.map(item=>`<li><div><b>${item.file}</b><span>${item.detail}</span></div><time datetime="${item.loaded.split('/').reverse().join('-')}">Carga al mockup · ${item.loaded}</time></li>`).join('');
}
function setSourcePanel(open){
 sourcePanel.hidden=!open;sourceToggle.setAttribute('aria-expanded',String(open));sourceToggle.classList.toggle('active',open);
 if(open)renderSourcePanel();
}
sourceToggle.addEventListener('click',()=>setSourcePanel(sourcePanel.hidden));
sourcePanel.querySelector('header button').addEventListener('click',()=>setSourcePanel(false));
document.addEventListener('mockupscenechange',event=>{activeSourceView=event.detail?.view||activeSourceView;if(!sourcePanel.hidden)renderSourcePanel();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!sourcePanel.hidden)setSourcePanel(false);});
renderSourcePanel();
