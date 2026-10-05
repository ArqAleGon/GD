import {localizeInterface} from './interface-language.js';
const scene=document.body.dataset.scene;
const header=document.querySelector('body > header, #app > header');
if(header){
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./scene-header.css?v=20261005-shared-header-v1',import.meta.url).href;document.head.append(css);
 if(scene!=='inicio'){
  let nav=header.querySelector('nav,.headActions');
  if(!nav){nav=document.createElement('nav');header.append(nav);}
  const fullscreen=nav.querySelector('[data-scene-fullscreen]');
  nav.className='headActions';nav.setAttribute('aria-label','Navegación de módulos');
  nav.innerHTML="<a class=\"moduleLink\" href=\"./index.html\">Inicio</a><details class=\"headerModuleMenu\"><summary>BIM</summary><div class=\"headerModulePanel\"><a href=\"./index.html?view=urban\">Modelos</a><a href=\"./bim.html\">Avance</a></div></details><details class=\"headerModuleMenu\"><summary>Documental</summary><div class=\"headerModulePanel\"><a href=\"./predial.html\">Predial</a><a href=\"./documents.html\">Documentos</a></div></details><button id=\"language\" title=\"Cambiar idioma\">EN</button><button id=\"reference\" data-i18n=\"reference\">Referencia</button><button id=\"help\" title=\"Ayuda\" aria-label=\"Ayuda\">?</button><button id=\"fullscreen\" data-scene-fullscreen title=\"Ampliar a página completa\" aria-label=\"Ampliar a página completa\">⛶</button>";
  if(fullscreen){fullscreen.textContent='⛶';nav.querySelector('[data-scene-fullscreen]').replaceWith(fullscreen);}
  const activeHref={bim:'./bim.html',predial:'./predial.html',documentos:'./documents.html',registro:'./index.html?view=urban'}[scene];
  const active=Array.from(nav.querySelectorAll('a')).find(a=>a.getAttribute('href')===activeHref);
  active?.classList.add('active');if(scene!=='registro')active?.setAttribute('aria-current','page');
  let language='es';
  nav.querySelector('#language').onclick=()=>{language=language==='es'?'en':'es';document.documentElement.lang=language;localizeInterface(language);nav.querySelector('#language').textContent=language==='es'?'EN':'ES';};
  nav.querySelector('#reference').onclick=()=>{const button=document.querySelector('.dataSourceToggle');if(button?.getAttribute('aria-expanded')!=='true')button?.click();};
  const dialog=document.createElement('dialog');dialog.className='sceneHeaderDialog';dialog.setAttribute('aria-label','Ayuda de la escena');document.body.append(dialog);
  const help={
   predial:['Arrastra el mapa para desplazarlo y usa la rueda o + y − para acercar o alejar. Encuadrar restaura la vista general.','Selecciona un predio para consultar su estado y documentos. Compara los predios adquiridos con Huellas estaciones y ajusta su opacidad.'],
   bim:['Arrastra para orbitar el modelo y usa la rueda para acercar o alejar. Encuadrar restaura la vista de los modelos filtrados.','Filtra por sector, unidad de ejecución, disciplina o estado. Selecciona geometrías o filas para consultar el avance y su relación con el cronograma.'],
   documentos:['Selecciona un documento del catálogo o abre un archivo local. Usa los filtros para buscar por formato, sector o predio.','Los controles de hoja y página dependen del formato seleccionado. Los vínculos prediales se habilitan con el Excel en esta sesión.'],
   registro:['Selecciona un elemento del edificio para consultar sus parámetros o registrar avance.','Usa los filtros para aislar elementos y los controles del visor para encuadrar, orbitar y cambiar de vista.']
  };
  nav.querySelector('#help').onclick=()=>{
   dialog.replaceChildren();
   const close=document.createElement('button');close.className='dialogClose';close.textContent='Cerrar ×';close.onclick=()=>dialog.close();
   const title=document.createElement('h2');title.textContent='Ayuda';
   dialog.append(close,title);
   for(const text of help[scene]||['Usa los menús BIM y Documental para navegar entre escenas. Consulta Referencia para ver las fuentes de datos.']){const p=document.createElement('p');p.textContent=text;dialog.append(p);}
   dialog.showModal();localizeInterface(language);
  };
 }
}
