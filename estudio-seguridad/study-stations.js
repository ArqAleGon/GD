import {e02Study} from './study-e02.js?v=20261106-e02pmr53';
import {cameraIntegration} from './study-camera-config.js?v=20261104-integrity45';
import {recoveredStations} from './study-model-stations.js?v=20261110-e08models59';
const commonLevels=[['B','Sótano','BASEMENT'],['A','Acceso','ACCESS'],['I','Intermedio','INTERMEDIATE'],['P','Plataforma','PLATFORM']];
const makeLevels=cuts=>commonLevels.map(([id,name,suffix],i)=>({id,name,ifc:`ARC_PL_0${i}_${suffix}`,cutMin:cuts[i][0],cutMax:cuts[i][1]}));
export const stations={
 ...recoveredStations,
 E02:e02Study,
 E09:{id:'E09',name:'E09 · NQS',summary:'E09 + BRT NQS',origin:[96310,2550,-100150],cameras:250,fixed:26,levels:makeLevels([[2552.8,2558.8],[2559.2,2566.2],[2568.2,2574.5],[2577,2583.3]]),assets:{cameras:'./assets/models/e09-ins/cameras.json',models:'./assets/models/e09-study/manifest.json',architecture:'./assets/plants/manifest.json',inventory:'./assets/cctv/inventory.json',registration:'./assets/plan-registration.json',spaces:'./assets/spaces.json',locations:'./assets/camera-locations.json',routes:'./assets/routes.json'},modelBase:'./assets/models/e09-study/',cameraBase:'./assets/models/e09-ins/',description:'Modelos E09 y BRT NQS de arquitectura, estructura e instalaciones. Plantas, inventario y propiedades IFC en un mismo espacio.'},
 E01:{id:'E01',name:'E01 · Carrera 96',summary:'E01 · Carrera 96',origin:[88900,2550,-104900],cameras:157,fixed:18,levels:makeLevels([[2534,2538.3],[2540.5,2543.8],[2548,2551.4],[2557.7,2560.6]]),assets:{cameras:'./assets/stations/e01/cameras.json',models:'./assets/stations/e01/models/manifest.json',architecture:'./assets/stations/e01/architecture.json',inventory:'./assets/stations/e01/inventory.json',registration:'./assets/stations/e01/plan-registration.json',spaces:'./assets/stations/e01/spaces.json',locations:'./assets/stations/e01/camera-locations.json',routes:'./assets/stations/e01/routes.json'},modelBase:'./assets/stations/e01/models/',cameraBase:null,description:'Arquitectura, estructuras e instalaciones de E01. Cuatro plantas arquitectónicas e inventario CCTV. Recorridos Biciusuarios, Acceso Peatonal y PMR registrados desde E1_Recorridos.pptx.',spaceNote:'El IFC de arquitectura recibido no contiene IfcSpace. Los colores y códigos se conservan en los planos; las huellas, áreas y etiquetas 3D de espacios están pendientes de una fuente correspondiente.',packages:[['e01-0000','Arquitectura · 0002 VB1'],['e01-1100','Estructura · 1100 V03'],['e01-1150','Estructura · 1150 V00 · recuperada'],['e01-1200','Estructura · 1200 V03 · recuperada'],['e01-ins','Instalaciones · 5400 V00']]}
};
// Recovered stations use the same study shell; unavailable resources stay explicit.
for(const config of Object.values(stations))if(config.modelOnly){
 config.summary=config.name;config.assets={};config.cameraInventoryPending=true;config.cameraBase=null;config.packages=[];
 config.levels=config.levels.map(level=>{
  if(level.id==='all')return {...level,cutMin:-1e9,cutMax:1e9};
  const label=/_00_/.test(level.name)?'Sótano':/_01_/.test(level.name)?'Acceso':/_02_/.test(level.name)?'Intermedio':/_03_/.test(level.name)?'Plataforma':level.name;
  // A display cut, not a change to source elevations, exposes the occupied floor.
  return {...level,name:label,sourceName:level.name,cutMax:label!==level.name?Math.min(level.cutMax,level.elevation+3.5):level.cutMax};
 });
}
stations.E03.povVideo={id:'e03-biciusuario-v38',title:'E03 · Biciusuarios'};
stations.E04.povVideo={title:'E04',videos:[
 {id:'e04-bici-v50',title:'E04 · Biciusuarios',label:'Biciusuarios'},
 {id:'e04-pmr-v50',title:'E04 · PMR',label:'PMR (Personas con movilidad reducida)'}
]};
for(const id of ['E03','E04'])stations[id].assets.architecture='./assets/stations/'+id.toLowerCase()+'/architecture.json';
stations.E03.assets.routes='./assets/stations/e03/routes.json?v=20261104-pmr44';
stations.E04.assets.routes='./assets/stations/e04/routes.json?v=20261109-e04platform56';
for(const id of ['E03','E04']){
 stations[id].assets.registration='./assets/stations/'+id.toLowerCase()+'/plan-registration.json?v=20261104-integrity45';
 stations[id].assets.inventory='./assets/stations/'+id.toLowerCase()+'/inventory.json?v=20261104-integrity45';
}
stations.E03.assets.spaces='./assets/stations/e03/spaces.json?v=20261104-spaces43';
for(const [id,meta] of Object.entries(cameraIntegration)){
 const config=stations[id];if(!config)continue;
 Object.assign(config,{cameras:meta.count,fixed:meta.fixed,cameraInventoryPending:false});
 config.assets.cameras=meta.url;
 for(const storey of meta.storeys){
  let level=config.levels.find(l=>l.sourceName?.match(/_PL_(\d+)/)?.[1]===String(storey.index).padStart(2,'0'));
  if(!level){level={id:'ins-'+storey.index,name:['Sótano','Acceso','Intermedio','Plataforma'][storey.index]||'Nivel IFC '+storey.index,cutMin:storey.elevation-.3,cutMax:storey.elevation+3.5,elevation:storey.elevation};config.levels.push(level);}
  level.ifc=storey.name;
 }
}

// E05 uses the shared camera, plan and space controls.
for(const key of ['architecture','registration','inventory','spaces','locations'])stations.E05.assets[key]='./assets/stations/e05/'+({registration:'plan-registration',locations:'camera-locations'}[key]||key)+'.json?v=20261109-e05integration55';
stations.E05.description='Arquitectura, estructura e instalaciones; cuatro plantas, espacios y cámaras IFC vinculados. Videorrecorridos: En construcción.';

// E07 and E08 use the same architectural, camera and space controls.
for(const id of ['E07','E08']){
 for(const key of ['architecture','registration','inventory','spaces','locations'])stations[id].assets[key]='./assets/stations/'+id.toLowerCase()+'/'+({registration:'plan-registration',locations:'camera-locations'}[key]||key)+'.json?v=20261109-e0708integration57';
 stations[id].description='Arquitectura, estructura e instalaciones; cuatro plantas, espacios y cámaras IFC vinculados. Videorrecorridos: En construcción.';
}
// E05 and E07 embedded POV videos (58).
stations.E05.povVideo={"title": "E05", "manifestUrl": "./assets/videotours/manifest.json?v=20261109-e0507videos58", "videos": [{"id": "e05-bici-v58", "title": "E05 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e05-pmr-v58", "title": "E05 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};
stations.E05.description='Arquitectura, estructura e instalaciones; cuatro plantas, espacios y cámaras IFC vinculados. Videos POV integrados. Trazados: En construcción.';
stations.E07.povVideo={"title": "E07", "manifestUrl": "./assets/videotours/manifest.json?v=20261109-e0507videos58", "videos": [{"id": "e07-brt-v58", "title": "E07 · BRT–Metro", "label": "BRT–Metro"}, {"id": "e07-usuario-v58", "title": "E07 · Usuarios", "label": "Usuarios"}, {"id": "e07-pmr-v58", "title": "E07 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};
stations.E07.description='Arquitectura, estructura e instalaciones; cuatro plantas, espacios y cámaras IFC vinculados. Recorridos BRT, Usuarios y PMR sincronizados con sus videos POV.';
stations.E05.assets.routes='./assets/stations/e05/routes.json?v=20261110-e08plans63';
stations.E05.description='Arquitectura, estructura e instalaciones; plantas, espacios, cámaras IFC y recorridos Biciusuarios y PMR sincronizados con sus videos POV.';
export const station=stations[new URLSearchParams(location.search).get('station')]||stations.E09;
stations.E07.assets.routes='./assets/stations/e07/routes.json?v=20261110-e08plans63';

for(const key of ['architecture','registration','spaces'])stations.E08.assets[key]=stations.E08.assets[key].split('?')[0]+'?v=20261110-e08plans63';

// E08 embedded POV videos (64).
stations.E08.povVideo={"title": "E08", "manifestUrl": "./assets/videotours/manifest.json?v=20261111-e08videos64", "videos": [{"id": "e08-bici-v64", "title": "E08 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e08-pmr-v64", "title": "E08 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};
stations.E08.description='Arquitectura, estructura e instalaciones; plantas, espacios y cámaras IFC vinculados. Videos Biciusuarios y PMR integrados. Trazados: En construcción.';

stations.E08.assets.routes='./assets/stations/e08/routes.json?v=20261111-e08pmr68';
stations.E08.description='Plantas, espacios y cámaras IFC vinculados. Biciusuarios y PMR sincronizados con sus videos POV, plantas 2D y vistas 3D.';

// E11 original POV media; spatial routes remain pending.
stations.E11.povVideo={"title": "E11", "manifestUrl": "./assets/stations/e11/videos.json?v=20261112-e11-v51", "videos": [{"id": "e11-brt-original", "title": "E11 · BRT–EM11", "label": "BRT–EM11"}, {"id": "e11-bici-original", "title": "E11 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e11-pmr-original", "title": "E11 · PMR", "label": "PMR"}]};

stations.E11.modelManifest="./assets/stations/e11/recovered-models.json?v=20261113-e11cctv54";
// E11 uses the existing shared space controls and level-specific original sheets.
for(const key of ['architecture','registration','spaces'])stations.E11.assets[key]='./assets/stations/e11/'+(key==='registration'?'plan-registration':key)+'.json?v=20261113-e11cctv54';
stations.E11.description='Modelos, cámaras IFC y videos POV incorporados. Plantas, colores, etiquetas y áreas vinculados al PDF arquitectónico V01. Cuatro ubicaciones de espacios y trazados de videorrecorridos: En construcción.';

stations.E11.sourceCount=9;

stations.E11.assets.inventory='./assets/stations/e11/inventory.json?v=20261113-e11cctv54';
