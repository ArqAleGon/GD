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

stations.E11.modelManifest="./assets/stations/e11/recovered-models.json?v=20261119-e10-74a";
// E11 uses the existing shared space controls and level-specific original sheets.
for(const key of ['architecture','registration','spaces'])stations.E11.assets[key]='./assets/stations/e11/'+(key==='registration'?'plan-registration':key)+'.json?v=20261119-e10-74a';
stations.E11.description='Modelos, cámaras IFC y videos POV incorporados. Plantas, colores, etiquetas y áreas vinculados al PDF arquitectónico V01. Biciusuarios, PMR y BRT sincronizados con sus videos POV. Cuatro ubicaciones de espacios: En construcción.';

stations.E11.sourceCount=9;

stations.E11.assets.inventory='./assets/stations/e11/inventory.json?v=20261119-e10-74a';

stations.E11.assets.routes='./assets/stations/e11/routes.json?v=20261119-e10-74a';

stations.E12.modelManifest="./assets/stations/e12/recovered-models.json?v=20261119-e10-74a";
stations.E12.sourceCount=9;

// E12 embedded videos; shared manual playback controls.
stations.E12.povVideo={"title": "E12", "manifestUrl": "./assets/stations/e12/videos.json?v=20261119-e10-74a", "videos": [{"id": "e12-brt-v58", "title": "E12 · BRT–EM12", "label": "BRT–EM12"}, {"id": "e12-bici-v58", "title": "E12 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e12-pmr-v59", "title": "E12 · PMR · TM–EM12", "label": "PMR · TM–EM12"}]};

for(const key of ['architecture','inventory','registration'])stations.E12.assets[key]='./assets/stations/e12/'+(key==='registration'?'plan-registration':key)+'.json?v=20261119-e10-74a';

stations.E14.modelManifest="./assets/stations/e14/recovered-models.json?v=20261119-e10-74a";
stations.E14.sourceCount=8;

stations.E15.modelManifest="./assets/stations/e15/recovered-models.json?v=20261119-e10-74a";
stations.E15.sourceCount=6;

stations.E16.modelManifest="./assets/stations/e16/recovered-models.json?v=20261119-e10-74a";
stations.E16.sourceCount=8;

stations.E05.modelManifest="./assets/stations/e05/recovered-models.json?v=20261119-e10-74a";
stations.E05.sourceCount=8;

stations.E07.modelManifest="./assets/stations/e07/recovered-models.json?v=20261119-e10-74a";
stations.E07.sourceCount=8;

stations.E04.assets.spaces='./assets/stations/e04/spaces.json?v=20261119-e10-74a';

stations.E11.modelManifest="./assets/stations/e11/recovered-models.json?v=20261119-e10-74a";
stations.E11.sourceCount=12;

stations.E12.modelManifest="./assets/stations/e12/recovered-models.json?v=20261119-e10-74a";
stations.E12.sourceCount=15;

stations.E13.modelManifest="./assets/stations/e13/recovered-models.json?v=20261119-e10-74a";
stations.E13.sourceCount=8;

stations.E14.modelManifest="./assets/stations/e14/recovered-models.json?v=20261119-e10-74a";
stations.E14.sourceCount=12;

stations.E15.modelManifest="./assets/stations/e15/recovered-models.json?v=20261119-e10-74a";
stations.E15.sourceCount=10;

stations.E16.modelManifest="./assets/stations/e16/recovered-models.json?v=20261119-e10-74a";
stations.E16.sourceCount=11;

for(const id of ['E12','E13','E14','E15','E16'])stations[id].assets.architecture='./assets/stations/'+id.toLowerCase()+'/architecture.json?v=20261119-e10-74a';

for(const id of ['E12','E13','E14','E15','E16'])stations[id].assets.inventory='./assets/stations/'+id.toLowerCase()+'/inventory.json?v=20261119-e10-74a';

// Shared spatial catalogue: original-sheet areas, registered labels and plan colours.
for(const id of ['E12','E13','E14','E15','E16']){
 for(const key of ['architecture','registration','spaces'])stations[id].assets[key]='./assets/stations/'+id.toLowerCase()+'/'+(key==='registration'?'plan-registration':key)+'.json?v=20261119-e10-74a';
}
// Architectural basement datum: PDF E15 NPT -7.15 m relative to 2569.10 m.
const e15Basement=stations.E15.levels.find(l=>l.id==='ins-0');if(e15Basement){e15Basement.elevation=2561.95;e15Basement.cutMin=2561.65;}

for(const [id,floor] of Object.entries({"2SCB_wEvLD9uWO8$uQSWQR": 2580.850000000001, "1ZvOeQwd10lPlZWEpLLxYV": 2586.85, "2SCB_wEvLD9uWO8$uQSW5e": 2596.0, "2SCB_wEvLD9uWO8$uQSW4n": 2604.74})){const level=stations.E12.levels.find(l=>l.id===id);if(level)level.cutMin=Math.min(level.cutMin??floor-.3,floor-.3);}
stations.E12.description='Modelos, plantas arquitectónicas, hojas originales e inventario CCTV disponibles. Etiquetas, colores y áreas vinculados al documento arquitectónico; las correspondencias individuales pendientes se indican en el cuadro de espacios.';

for(const [id,floor] of Object.entries({"2SCB_wEvLD9uWO8$uQSWQR": 2582.1999999999985, "10$eqGDcn23eaT8u_dzCf2": 2588.5, "2SCB_wEvLD9uWO8$uQSW5e": 2597.9, "2SCB_wEvLD9uWO8$uQSW4n": 2606.64})){const level=stations.E13.levels.find(l=>l.id===id);if(level)level.cutMin=Math.min(level.cutMin??floor-.3,floor-.3);}
stations.E13.description='Modelos, plantas arquitectónicas, hojas originales e inventario CCTV disponibles. Etiquetas, colores y áreas vinculados al documento arquitectónico; las correspondencias individuales pendientes se indican en el cuadro de espacios.';

for(const [id,floor] of Object.entries({"2SCB_wEvLD9uWO8$uQSWQR": 2566.449999999999, "1ZvOeQwd10lPlZWEpLLxYV": 2570.55, "2SCB_wEvLD9uWO8$uQSW5e": 2581.03, "2SCB_wEvLD9uWO8$uQSW4n": 2589.77})){const level=stations.E14.levels.find(l=>l.id===id);if(level)level.cutMin=Math.min(level.cutMin??floor-.3,floor-.3);}
stations.E14.description='Modelos, plantas arquitectónicas, hojas originales e inventario CCTV disponibles. Etiquetas, colores y áreas vinculados al documento arquitectónico; las correspondencias individuales pendientes se indican en el cuadro de espacios.';

for(const [id,floor] of Object.entries({"ins-0": 2561.9499999999957, "ins-1": 2566.5, "ins-2": 2575.7, "ins-3": 2584.44})){const level=stations.E15.levels.find(l=>l.id===id);if(level)level.cutMin=Math.min(level.cutMin??floor-.3,floor-.3);}
stations.E15.description='Modelos, plantas arquitectónicas, hojas originales e inventario CCTV disponibles. Etiquetas, colores y áreas vinculados al documento arquitectónico; las correspondencias individuales pendientes se indican en el cuadro de espacios.';

for(const [id,floor] of Object.entries({"ins-0": 2553.600000000002, "ins-1": 2558.75, "ins-2": 2566.8, "ins-3": 2575.54})){const level=stations.E16.levels.find(l=>l.id===id);if(level)level.cutMin=Math.min(level.cutMin??floor-.3,floor-.3);}
stations.E16.description='Modelos, plantas arquitectónicas, hojas originales e inventario CCTV disponibles. Etiquetas, colores y áreas vinculados al documento arquitectónico; las correspondencias individuales pendientes se indican en el cuadro de espacios.';

for(const key of ['architecture','inventory','registration','spaces'])stations.E10.assets[key]='./assets/stations/e10/'+(key==='registration'?'plan-registration':key)+'.json?v=20261119-e10-74a';
stations.E10.description='Modelos, cuatro plantas arquitectónicas, hojas originales, inventario CCTV y espacios con etiquetas, colores y áreas documentales. Correspondencias individuales pendientes indicadas en el cuadro de espacios.';
stations.E10.modelManifest='./assets/stations/e10/recovered-models.json?v=20261119-e10-74a';
for(const [id,floor] of Object.entries({"2SCB_wEvLD9uWO8$uQSWQR": 2560.2999999999993, "1ZvOeQwd10lPlZWEpLLxYV": 2566.6, "2SCB_wEvLD9uWO8$uQSW5e": 2573.7, "2SCB_wEvLD9uWO8$uQSW4n": 2582.44})){const l=stations.E10.levels.find(l=>l.id===id);if(l)l.cutMin=Math.min(l.cutMin,floor-.3);}

for(const key of ['architecture','inventory','registration','spaces'])stations.E06.assets[key]='./assets/stations/e06/'+(key==='registration'?'plan-registration':key)+'.json?v=20261119-e10-74a';
stations.E06.povVideo={"title": "E06", "manifestUrl": "./assets/videotours/manifest.json?v=20261119-e10-74a", "videos": [{"id": "e06-bici-v73", "title": "E06 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e06-pmr-v73", "title": "E06 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};
stations.E06.description='Modelos, cuatro plantas arquitectónicas, PDF originales por nivel, inventario CCTV, espacios con etiquetas, colores y áreas documentales. Videos Biciusuarios y PMR integrados; trazados en construcción.';

stations.E10.povVideo={"title": "E10", "manifestUrl": "./assets/stations/e10/videos.json?v=20261119-e10-videos75", "videos": [{"id": "e10-bici-v75", "title": "E10 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e10-pmr-v75", "title": "E10 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};

stations.E06.assets.routes='./assets/stations/e06/routes.json?v=20261119-e06color78';
stations.E06.description='Plantas, espacios, cámaras IFC y recorridos Biciusuarios y PMR sincronizados con sus videos POV.';

stations.E10.assets.routes='./assets/stations/e10/routes.json?v=20261119-e10routes77';
stations.E10.description='Plantas, espacios, cámaras IFC y recorridos Biciusuarios y PMR sincronizados con sus videos POV.';

stations.E13.povVideo={"title": "E13", "manifestUrl": "./assets/stations/e13/videos.json?v=20261119-e13-videos79", "videos": [{"id": "e13-bici-v79", "title": "E13 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e13-pmr-v79", "title": "E13 · PMR (Personas con movilidad reducida)", "label": "PMR (Personas con movilidad reducida)"}]};

stations.E14.povVideo={"title": "E14", "manifestUrl": "./assets/stations/e14/videos.json?v=20261120-e141516-videos80", "videos": [{"id": "e14-bici-v80", "title": "E14 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e14-brt-v80", "title": "E14 · Metro–BRT", "label": "Metro–BRT"}, {"id": "e14-pmr-v80", "title": "E14 · PMR", "label": "PMR"}]};
stations.E15.povVideo={"title": "E15", "manifestUrl": "./assets/stations/e15/videos.json?v=20261120-e141516-videos80", "videos": [{"id": "e15-bici-v80", "title": "E15 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e15-brt-pmr-v80", "title": "E15 · BRT–Metro / PMR", "label": "BRT–Metro / PMR"}]};
stations.E16.povVideo={"title": "E16", "manifestUrl": "./assets/stations/e16/videos.json?v=20261120-e141516-videos80", "videos": [{"id": "e16-bici-v80", "title": "E16 · Biciusuarios", "label": "Biciusuarios"}, {"id": "e16-brt-v80", "title": "E16 · BRT–Metro", "label": "BRT–Metro"}, {"id": "e16-pmr-v80", "title": "E16 · PMR", "label": "PMR"}]};

stations.E12.assets.routes='./assets/stations/e12/routes.json?v=20261120-e12routes81';

stations.E12.assets.registration='./assets/stations/e12/plan-registration.json?v=20261120-e12routes81';

stations.E12.assets.spaces='./assets/stations/e12/spaces.json?v=20261120-e12routes81';
