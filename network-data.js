// Red ferroviaria ajustada al mismo marco WGS 84 de la base catastral Predial.
// La L1 y sus estaciones provienen de MapaBaseBogota. Las líneas futuras se
// mantienen como referencias de planeación ubicadas sobre corredores reales.
const BBOX={minLon:-74.204367469,minLat:4.591299523,maxLon:-74.06038065,maxLat:4.664899642};
const MAP_WIDTH=1200,MAP_HEIGHT=613.39;
const geo=(lon,lat)=>[
 (lon-BBOX.minLon)/(BBOX.maxLon-BBOX.minLon)*MAP_WIDTH,
 (BBOX.maxLat-lat)/(BBOX.maxLat-BBOX.minLat)*MAP_HEIGHT
];

async function loadMapBase(){
 const response=await fetch('./predial-map-base.json.gz?v=20260922-mapbase');
 if(!response.ok)throw new Error('No se pudo cargar la geometría L1');
 const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
 return JSON.parse(await new Response(stream).text());
}

function parseSvgPath(value){
 return [...value.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(match=>[Number(match[1]),Number(match[2])]);
}

function pointSegmentDistance(point,start,end){
 const [px,py]=point,[x1,y1]=start,[x2,y2]=end,dx=x2-x1,dy=y2-y1;
 if(!dx&&!dy)return Math.hypot(px-x1,py-y1);
 const t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/(dx*dx+dy*dy)));
 return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}

function simplify(points,tolerance=1.15){
 if(points.length<4)return points;
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
 while(stack.length){
  const [start,end]=stack.pop();let maximum=0,index=-1;
  for(let candidate=start+1;candidate<end;candidate++){
   const distance=pointSegmentDistance(points[candidate],points[start],points[end]);
   if(distance>maximum){maximum=distance;index=candidate;}
  }
  if(index>0&&maximum>tolerance){keep.add(index);stack.push([start,index],[index,end]);}
 }
 return [...keep].sort((a,b)=>a-b).map(index=>points[index]);
}

function pointAt(path,progress){
 const lengths=[],total=path.slice(1).reduce((sum,point,index)=>{const length=Math.hypot(point[0]-path[index][0],point[1]-path[index][1]);lengths.push(length);return sum+length;},0);
 let target=total*progress;
 for(let index=0;index<lengths.length;index++){
  if(target<=lengths[index]){const ratio=target/Math.max(lengths[index],.0001),a=path[index],b=path[index+1];return [a[0]+(b[0]-a[0])*ratio,a[1]+(b[1]-a[1])*ratio];}
  target-=lengths[index];
 }
 return [...path.at(-1)];
}

const stationsAlong=(path,codes)=>codes.map((code,index)=>({code,xy:pointAt(path,index/Math.max(1,codes.length-1))}));
const asGeo=coordinates=>coordinates.map(point=>geo(...point));

let mapBase=null;
try{mapBase=await loadMapBase();}catch(error){console.warn(error.message);}

const fallbackStations=[
 ['E01','Cra 96',[223.55,201.84]],['E02','Portal de las Américas',[270.21,289.79]],['E03','Carrera 80',[314.48,356.35]],['E04','Calle 42 Sur',[365.15,409.8]],
 ['E05','Kennedy',[438.72,396.79]],['E06','Av Boyacá',[534.7,388.18]],['E07','Av 68',[633.02,468.68]],['E08','Cra 50',[693.03,519.56]],
 ['E09','NQS',[778.79,563.95]],['E10','Nariño',[893.88,587.88]],['E11','Calle 1ra',[978.55,589.28]],['E12','Calle 10',[1032.82,516.99]],
 ['E13','Calle 26',[1088.45,427.93]],['E14','Calle 45',[1137.05,282.56]],['E15','Calle 63',[1163.22,133.55]],['E16','Calle 72',[1189.1,37.44]]
].map(([code,name,xy])=>({code,name:`${code} · ${name}`,xy}));
const fallbackL1=[[89.86,144.73],...fallbackStations.map(station=>station.xy)];
const l1Path=mapBase?simplify(parseSvgPath(mapBase.l1.alignment.paths.join('')),1.15):fallbackL1;
const l1Stations=(mapBase?.l1.stations.items||fallbackStations)
 .map(item=>({code:item.code,name:`${item.code} · ${item.name.replace(/^E\d+\s*·?\s*/,'')}`,xy:item.center}))
 .sort((a,b)=>Number(a.code.slice(1))-Number(b.code.slice(1)));

const l2=asGeo([
 [-74.0617,4.6604],[-74.072,4.6584],[-74.084,4.6582],[-74.096,4.659],[-74.109,4.661],[-74.123,4.663],[-74.139,4.6647]
]);
const l3=asGeo([
 [-74.198,4.5914],[-74.187,4.596],[-74.176,4.602],[-74.164,4.606],[-74.151,4.609],[-74.138,4.613],[-74.124,4.616],[-74.109,4.618],[-74.094,4.6185],[-74.081,4.618],[-74.073,4.617]
]);
const l4=asGeo([
 [-74.139,4.5913],[-74.138,4.603],[-74.137,4.615],[-74.136,4.628],[-74.135,4.641],[-74.134,4.651]
]);
const l5=asGeo([
 [-74.134,4.651],[-74.133,4.656],[-74.131,4.661],[-74.128,4.6648]
]);
const l6=asGeo([
 [-74.202,4.621],[-74.185,4.622],[-74.168,4.624],[-74.151,4.626],[-74.134,4.628],[-74.117,4.63],[-74.1,4.632],[-74.083,4.634],[-74.067,4.636]
]);
const regioOccidente=asGeo([
 [-74.204,4.662],[-74.188,4.66],[-74.171,4.653],[-74.154,4.646],[-74.137,4.636],[-74.121,4.627],[-74.105,4.62],[-74.092,4.614],[-74.082,4.611],[-74.0735,4.614]
]);
const regioNorte=asGeo([
 [-74.082,4.611],[-74.088,4.621],[-74.09,4.633],[-74.087,4.645],[-74.083,4.656],[-74.079,4.6648]
]);
const ramalAeropuerto=asGeo([
 [-74.156,4.645],[-74.157,4.652],[-74.156,4.659],[-74.154,4.6648]
]);

export const networkLines=[
 {id:'L1',name:'Línea 1 · SHP',color:'#ed1400',path:l1Path,stations:l1Stations,geographic:true},
 {id:'L2',name:'Línea 2 · corredor Calle 72',color:'#ffcd00',path:l2,stations:stationsAlong(l2,['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11']),reference:true},
 {id:'L3',name:'Línea 3 · corredor sur',color:'#b5de16',path:l3,stations:stationsAlong(l3,Array.from({length:18},(_,i)=>`E${i+1}`)),reference:true},
 {id:'L4',name:'Línea 4 · Av. Boyacá sur',color:'#9763c5',path:l4,stations:stationsAlong(l4,Array.from({length:10},(_,i)=>`E${i+20}`)),reference:true},
 {id:'L5',name:'Línea 5 · Av. Boyacá norte',color:'#32bfcb',path:l5,stations:stationsAlong(l5,Array.from({length:8},(_,i)=>`E${i+1}`)),reference:true},
 {id:'L6',name:'Línea 6 · corredor transversal',color:'#ff9400',path:l6,stations:stationsAlong(l6,Array.from({length:14},(_,i)=>`E${i+1}`)),reference:true},
 {id:'RF-A',name:'Regiotram · corredor occidental',color:'#008cd1',path:regioOccidente,stations:[],reference:true},
 {id:'RF-B',name:'Regiotram · corredor norte',color:'#008cd1',path:regioNorte,stations:[],reference:true},
 {id:'RF-C',name:'Regiotram · ramal aeropuerto',color:'#39a9df',path:ramalAeropuerto,stations:[],reference:true}
];

export const networkReference={
 bbox:BBOX,mapWidth:MAP_WIDTH,mapHeight:MAP_HEIGHT,
 l1Source:mapBase?.l1?.alignment?.source||'TRAZADO_PLMB.shp',
 stationSource:mapBase?.l1?.stations?.source||'ESTACIONES.shp',
 futureNote:'Corredores futuros de referencia ajustados a la base catastral; no sustituyen cartografía oficial de diseño.'
};
