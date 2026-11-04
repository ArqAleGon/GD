// Shared by the public dashboard and the Excel refresh. Counts capabilities, not construction progress.
export const activities = [
 ['mockup',5,'Modelos IFC del mockup','Alejo','Modelo incorporado en el catálogo activo.'],
 ['ins',6,'Instalaciones 5400','Alejo','Modelo INS 5400 incorporado. No implica inventario de cámaras calibrado.'],
 ['structures',7,'Estructuras complementarias','Alejo','Fuentes EST distintas de 1100 incorporadas, incluidas 1150 y 1200.'],
 ['foundation',8,'Estructuras / cimentación 1100','Alejo','Fuente 1100 incorporada en el modelo activo.'],
 ['inventory',9,'Inventario de cámaras 5445','Alejo','Cámaras IFC mapeadas en plantas arquitectónicas y CCTV; selección, visibilidad y recorte verificados. Un PDF disponible por sí solo no completa esta actividad.'],
 ['labels',10,'Etiquetas de espacios','Alejo','Catálogo de espacios con posiciones vinculado al visor.'],
 ['colors',11,'Colores de espacios','Alejo','Colores de espacios asociados a geometría o capas registradas en el visor.'],
 ['routes',12,'Trazado de recorridos','Alejo','Al menos un recorrido con geometría conectado a las vistas.'],
 ['areas',13,'Áreas conectadas a etiquetas','Alejo','Áreas con fuente y ubicación asociadas a etiquetas. Se informa la cobertura.'],
 ['plans',14,'Planos arquitectónicos limpios','Steven','Plantas arquitectónicas vinculadas en el catálogo activo.'],
 ['videos',15,'Videorrecorridos','Julián','Al menos un video POV asociado a la estación y registrado en el catálogo.']
].map(([id,row,label,owner,criterion])=>({id,row,label,owner,criterion}));
const array=v=>Array.isArray(v)?v:[];
export async function resourceDigest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function videoIds(value,out=new Set()){
 if(value&&typeof value==='object')for(const [key,v] of Object.entries(value)){
  if((key==='videoId'||key==='video')&&typeof v==='string')out.add(v);
  else if(v&&typeof v==='object')videoIds(v,out);
 }return out;
}
export async function inspectProgress(config,read,context={}){
 const assets=config.assets||{}, modelPath=assets.models||config.modelManifest;
 if(!modelPath)throw Error('No hay catálogo de modelos para '+config.id);
 const [model,spaces,plans,inventory,documents,routes,cameras]=await Promise.all([
  read(modelPath),assets.spaces?read(assets.spaces):null,assets.architecture?read(assets.architecture):null,
  assets.inventory?read(assets.inventory):null,config.insDocuments?read(config.insDocuments):null,
  assets.routes?read(assets.routes):null,assets.cameras?read(assets.cameras):null
 ]);
 const sources=[...new Set([...array(model.sourceIfcFiles),...array(model.sources),...array(model.additionalModels).map(m=>m.source)].filter(s=>typeof s==='string'))];
 const packages=array(model.files).map(f=>String(f.package||''));
 const records=array(spaces?.records),located=records.filter(r=>array(r.center).length>=2||array(r.points).length>0);
 const linkedAreas=located.filter(r=>Number.isFinite(r.area)&&r.areaSource);
 const linkedSchedule=array(spaces?.areaRecords).filter(r=>array(r.locationIds).length||r.locationId);
 const areaCount=array(spaces?.areaRecords).length||records.length;
 const ids=videoIds(routes);if(config.povVideo?.id)ids.add(config.povVideo.id);
 const videoManifest=await read('./assets/videotours/manifest.json');
 const videos=array(videoManifest.videos).filter(v=>ids.has(v.id));
 const documentList=array(documents?.documents).filter(d=>/5445/.test(d.name||d.pdf||''));
 const hasInventory=!!(inventory&&array(inventory.pages).length&&/5445/.test(inventory.source||inventory.sourcePdf||''))||documentList.length>0;
 let validation;try{validation=(await read('./assets/operational-validation.json')).stations?.[config.id];}catch{}
 const cameraCount=array(cameras?.cameras).length;
 let inventoryVerified=!!(hasInventory&&cameraCount&&validation?.interactiveVerified&&validation.cameras===cameraCount&&validation.inventoryMapped===cameraCount&&validation.architectureMapped===cameraCount);
 if(inventoryVerified){const registration=assets.registration?await read(assets.registration):null;for(const [key,value] of Object.entries({cameras,inventory,architecture:plans,registration}))if(!value||await resourceDigest(value)!==validation.resourceDigests?.[key])inventoryVerified=false;}
 const colors=located.filter(r=>r.color&&(array(r.points).length||array(spaces?.rasterLayers).length));
 const hasIns=sources.some(s=>/5400/.test(s)&&/INS/.test(s))||packages.some(s=>/-ins$/.test(s))&&!!cameras;
 const conditions={mockup:array(model.files).length>0,ins:hasIns,structures:sources.some(s=>/-(EST|STR)-/.test(s)&&!/-1100-/.test(s))||packages.some(s=>/-(1150|1200)$/.test(s)),foundation:sources.some(s=>/-1100-/.test(s)),inventory:inventoryVerified,labels:located.length>0,colors:colors.length>0,routes:array(routes?.routes).some(r=>array(r.points).length>1),areas:linkedAreas.length>0,plans:array(plans?.pages).length>0,videos:videos.length>0};
 const reserved=context.reservedAreas?.[config.id];
 const notes={
  mockup:config.modelOnly?'Modelo visible. Recursos de seguridad pendientes según el detalle.':'Modelo incorporado en el Estudio de Seguridad.',
  ins:hasIns?'Geometría de instalaciones incorporada.':'En construcción.',
  structures:sources.filter(s=>/-(EST|STR)-/.test(s)&&!/-1100-/.test(s)).join(' · ')||'En construcción.',
  foundation:sources.filter(s=>/-1100-/.test(s)).join(' · ')||'En construcción.',
  inventory:inventoryVerified?`${cameraCount} cámaras IFC mapeadas en ambas plantas. Selección, switch de visibilidad y recorte comprobados.`:`En construcción. ${cameraCount} cámaras IFC disponibles en 3D. ${hasInventory?'Planos 5445 disponibles; falta completar o revalidar la operación y el registro espacial.':'Inventario 2D sin vincular.'}`,
  labels:located.length?`${located.length} etiquetas con posición. La disponibilidad no certifica que todos los espacios estén completos.`:'En construcción. El cuadro de áreas por sí solo no crea etiquetas.',
  colors:colors.length?`${colors.length} espacios con color y posición.`:'En construcción. Los colores impresos del PDF no cuentan como colores interactivos 3D.',
  routes:conditions.routes?`${array(routes.routes).length} tramos registrados. ${routes.measurementNote||'Consultar las convenciones y enlaces del recorrido.'}`:'En construcción.',
  areas:linkedAreas.length?`${linkedAreas.length} etiquetas con área. ${spaces?.areaRecords?`${linkedSchedule.length} de ${areaCount} registros PDF con ubicación.`:`${records.length} espacios en el catálogo.`}`:(reserved?`${reserved.records} registros de áreas reservados. Vinculación espacial: En construcción.`:'En construcción.'),
  plans:conditions.plans?`${plans.pages.length} plantas incorporadas.`:'En construcción.',
  videos:videos.length?videos.map(v=>v.title).join(' · '):'En construcción.'
 };
 const evidence={mockup:modelPath,ins:modelPath,structures:modelPath,foundation:modelPath,inventory:assets.inventory||config.insDocuments,labels:assets.spaces,colors:assets.spaces,routes:assets.routes,areas:assets.spaces,plans:assets.architecture,videos:'./assets/videotours/manifest.json'};
 return {id:config.id,name:config.name,week:context.weeks?.[config.id]||null,activities:activities.map(a=>({...a,complete:!!conditions[a.id],note:notes[a.id],evidence:evidence[a.id]||null})),reservedAreas:reserved||null};
}
export function summarize(stations,owner='all'){
 const cells=stations.flatMap(s=>s.activities).filter(a=>owner==='all'||a.owner===owner),done=cells.filter(a=>a.complete).length;
 return {stations:stations.length,done,total:cells.length,pending:cells.length-done,ratio:cells.length?done/cells.length:null};
}
