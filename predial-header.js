import {localizeInterface} from './interface-language.js';
const dialog=document.createElement('dialog');
dialog.className='predialHeaderDialog';
dialog.setAttribute('aria-label','Información de la escena predial');
document.body.append(dialog);
let language='es';
document.querySelector('#language').addEventListener('click',()=>{
 language=language==='es'?'en':'es';
 document.documentElement.lang=language;
 localizeInterface(language);
 document.querySelector('#language').textContent=language==='es'?'EN':'ES';
});
function showInfo(title,paragraphs){
 dialog.replaceChildren();
 const close=document.createElement('button');close.className='dialogClose';close.textContent=language==='es'?'Cerrar ×':'Close ×';close.onclick=()=>dialog.close();
 const heading=document.createElement('h2');heading.textContent=title;
 dialog.append(close,heading);
 paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;dialog.append(p);});
 dialog.showModal();
 localizeInterface(language);
}
document.querySelector('#reference').addEventListener('click',()=>showInfo(language==='es'?'Fuentes de referencia predial':'Parcel reference sources',[
 document.querySelector('#sourceName').textContent,
 document.querySelector('#mapBaseSummary').textContent,
 language==='es'?'Huellas de estaciones: ESTACIONES.shp. Geometrías de referencia simplificadas para comparar con los predios.':'Station footprints: ESTACIONES.shp. Simplified reference geometries for comparison with parcels.'
]));
document.querySelector('#help').addEventListener('click',()=>showInfo(language==='es'?'Controles de la escena predial':'Parcel scene controls',language==='es'?[
 'Arrastra el mapa para desplazarlo. Usa la rueda o los botones + y − para acercar o alejar; Encuadrar restaura la vista general.',
 'Selecciona un predio para consultar su estado y documentos. Usa los filtros para comparar los predios adquiridos con las huellas de estaciones.',
 'Huellas estaciones permite mostrar u ocultar los polígonos. Ajusta Opacidad para ver los predios debajo. Los menús BIM y Documental permiten cambiar de escena.'
]:[
 'Drag the map to pan. Use the mouse wheel or + and − to zoom; Fit restores the overview.',
 'Select a parcel to consult its status and documents. Use filters to compare acquired parcels with station footprints.',
 'Station footprints shows or hides the polygons. Adjust opacity to view parcels beneath. BIM and Documental menus switch scenes.'
]));
