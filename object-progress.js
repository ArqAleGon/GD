export const OBJECT_PROGRESS_STORAGE_KEY='emb-gd-object-progress-v1';

const clean=value=>String(value??'').trim();
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00'));
const recordOrder=(a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||'');

export function createProgressRecord(input,now=new Date()){
  const objectId=clean(input.objectId),objectTitle=clean(input.objectTitle),userName=clean(input.userName),date=clean(input.date),progress=Number(input.progress);
  if(!objectId||!objectTitle)throw new Error('El objeto no tiene un identificador válido.');
  if(!userName)throw new Error('Registra el nombre de usuario.');
  if(!validDate(date))throw new Error('Registra una fecha válida.');
  if(!Number.isFinite(progress)||progress<0||progress>100)throw new Error('El avance debe estar entre 0 y 100 %.');
  const createdAt=now.toISOString();
  return {
    id:`${objectId}:${createdAt}`,
    objectId,
    objectTitle,
    kind:clean(input.kind)||'Objeto 3D',
    section:clean(input.section)||'Sin sección',
    userName,
    date,
    progress:Math.round(progress*100)/100,
    createdAt
  };
}

export function loadProgressRecords(storage=globalThis.localStorage){
  try{
    const parsed=JSON.parse(storage?.getItem(OBJECT_PROGRESS_STORAGE_KEY)||'[]');
    if(!Array.isArray(parsed))return [];
    return parsed.filter(record=>record&&clean(record.objectId)&&clean(record.objectTitle)&&clean(record.userName)&&validDate(clean(record.date))&&Number.isFinite(Number(record.progress))&&Number(record.progress)>=0&&Number(record.progress)<=100).map(record=>({...record,progress:Number(record.progress)}));
  }catch{return [];}
}

export function appendProgressRecord(storage,input,now=new Date()){
  const records=loadProgressRecords(storage),record=createProgressRecord(input,now);
  records.push(record);
  storage.setItem(OBJECT_PROGRESS_STORAGE_KEY,JSON.stringify(records));
  return {record,records};
}

export function recordsForObject(records,objectId){
  return records.filter(record=>record.objectId===objectId).sort((a,b)=>recordOrder(b,a));
}

export function latestObjectRecords(records){
  const latest=new Map();
  for(const record of records){
    const previous=latest.get(record.objectId);
    if(!previous||recordOrder(record,previous)>0)latest.set(record.objectId,record);
  }
  return [...latest.values()];
}

export function summarizeProgress(records){
  const current=latestObjectRecords(records),objects=current.length;
  const average=objects?current.reduce((sum,record)=>sum+record.progress,0)/objects:0;
  const completed=current.filter(record=>record.progress>=100).length;
  const inProgress=current.filter(record=>record.progress>0&&record.progress<100).length;
  const notStarted=current.filter(record=>record.progress<=0).length;
  const sections=[...current.reduce((groups,record)=>{
    const key=record.section||'Sin sección',group=groups.get(key)||{name:key,total:0,count:0};
    group.total+=record.progress;group.count++;groups.set(key,group);return groups;
  },new Map()).values()].map(group=>({name:group.name,count:group.count,progress:group.total/group.count})).sort((a,b)=>b.progress-a.progress||a.name.localeCompare(b.name));
  const recent=[...records].sort((a,b)=>recordOrder(b,a)).slice(0,6);
  return {totalRecords:records.length,objects,average,completed,inProgress,notStarted,sections,recent};
}
