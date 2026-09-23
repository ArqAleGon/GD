const STATUS={
  late:{label:'Atrasado',color:'#ef4658'},
  done:{label:'Terminado',color:'#42c889'},
  started:{label:'Iniciado',color:'#f2c94c'},
  pending:{label:'No iniciado y sin atraso',color:'#9eb0bc'}
};

async function loadGzipJSON(url){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`No se pudo cargar ${url}`);
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

export const P6=await loadGzipJSON('./primavera-data.json.gz?v=20260923-dashboard');
export const P6_STATUS=STATUS;
export const taskStatus=task=>task.actual>=99.5?'done':task.actual+.25<task.planned?'late':task.actual>0?'started':'pending';
export const stationOptions=[...new Set(P6.tasks.flatMap(task=>task.stations||[]))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
export const workFrontOptions=[...new Set(P6.tasks.map(task=>task.workFront).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
export const ueOptions=[...new Set(P6.tasks.map(task=>task.ue).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));

export function filterP6({ues=[],ue='',station='',workFront=''}){
  const selectedUEs=Array.isArray(ues)&&ues.length?ues:ue?[ue]:[];
  return P6.tasks.filter(task=>(!selectedUEs.length||selectedUEs.includes(task.ue))&&(!station||(task.stations||[]).includes(station))&&(!workFront||task.workFront===workFront));
}

export function summarizeP6(tasks){
  const counts=Object.fromEntries(Object.keys(STATUS).map(key=>[key,0]));
  const weight=task=>task.hours||1,totalWeight=tasks.reduce((sum,task)=>sum+weight(task),0)||1;
  for(const task of tasks)counts[taskStatus(task)]++;
  return {
    counts,
    planned:tasks.reduce((sum,task)=>sum+task.planned*weight(task),0)/totalWeight,
    actual:tasks.reduce((sum,task)=>sum+task.actual*weight(task),0)/totalWeight
  };
}

export function groupP6(tasks,key){
  const groups=new Map();
  for(const task of tasks){
    const values=key==='station'?(task.stations||[]):task.workFront?[task.workFront]:[];
    for(const value of values){if(!groups.has(value))groups.set(value,[]);groups.get(value).push(task);}
  }
  return [...groups].map(([name,items])=>({name,tasks:items,...summarizeP6(items)})).sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}));
}
