import {e02Study} from './study-e02.js?v=20261104-structures41';
import {recoveredStations} from './study-model-stations.js?v=20261104-structures41';
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
for(const id of ['E03','E04'])stations[id].assets.architecture='./assets/stations/'+id.toLowerCase()+'/architecture.json';
stations.E03.assets.routes='./assets/stations/e03/routes.json?v=20261104-pmr44';
stations.E03.assets.registration='./assets/stations/e03/route-registration.json?v=20261104-structures41';
stations.E03.assets.spaces='./assets/stations/e03/spaces.json?v=20261104-spaces43';
export const station=stations[new URLSearchParams(location.search).get('station')]||stations.E09;
