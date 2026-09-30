const clean=value=>String(value??'').trim();
const recordOrder=(a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||'');

function average(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;}
function latest(records){return records.reduce((current,record)=>!current||recordOrder(record,current)>0?record:current,null);}
function latestPerTarget(records){
  const targets=new Map();
  for(const record of records){const key=clean(record.objectId)||`${record.scopeType}:${record.scopeValue}`;const current=targets.get(key);if(!current||recordOrder(record,current)>0)targets.set(key,record);}
  return [...targets.values()];
}
function directRecordForElement(records,element){
  const prefix=`ifc-element:${element.section}:${element.source}:${element.guid}`;
  return latest(records.filter(record=>record.objectId===prefix||String(record.objectId||'').startsWith(prefix+':')||record.elementId===element.guid&&(!record.scopeType||record.scopeType==='element')));
}

export function elementRegisteredProgress(element,records){
  const scoped=records.filter(record=>record.section===element.section);
  const direct=directRecordForElement(scoped,element);if(direct)return direct.progress;
  const activity=latestPerTarget(scoped.filter(record=>record.scopeType==='activity'&&element.activityIds.includes(clean(record.scopeValue))));
  if(activity.length)return average(activity.map(record=>Number(record.progress)));
  const ue=latest(scoped.filter(record=>record.scopeType==='ue'&&clean(record.scopeValue)===element.executionUnit));
  return ue?Number(ue.progress):null;
}

export function linkedTasks(elements,tasks){
  const units=new Set(elements.map(element=>element.executionUnit).filter(value=>value&&value!=='Sin UE'));
  return tasks.filter(task=>units.has(clean(task.ue)));
}

export function weightedTaskActual(tasks){
  if(!tasks.length)return null;const total=tasks.reduce((sum,task)=>sum+(Number(task.hours)||1),0)||1;
  return tasks.reduce((sum,task)=>sum+(Number(task.actual)||0)*(Number(task.hours)||1),0)/total;
}

export function weightedElementProgress(elements,records){
  let registered=0,total=0;
  for(const element of elements){const progress=elementRegisteredProgress(element,records);if(progress!=null){registered++;total+=Number(progress)||0;}}
  return {count:elements.length,registered,progress:registered&&elements.length?total/elements.length:null};
}

export function buildingSummary(section,elements,records,tasks){
  const scoped=records.filter(record=>record.section===section),elementProgress=weightedElementProgress(elements,scoped),registered=elementProgress.progress;
  const primavera=weightedTaskActual(linkedTasks(elements,tasks));
  return {registered,primavera,deviation:registered==null||primavera==null?null:registered-primavera,records:scoped.length,targets:elementProgress.registered,totalElements:elements.length};
}

export function activitySummaries(section,elements,records,tasks){
  const scoped=records.filter(record=>record.section===section),result=[];
  for(const task of linkedTasks(elements,tasks)){
    const taskId=clean(task.id),taskElements=elements.filter(element=>element.activityIds.includes(taskId));
    const elementProgress=weightedElementProgress(taskElements,scoped),registered=elementProgress.progress,primavera=Number(task.actual)||0;
    result.push({id:taskId,name:clean(task.name),ue:clean(task.ue),registered,primavera,deviation:registered==null?null:registered-primavera,planned:Number(task.planned)||0,hours:Number(task.hours)||0,elementCount:taskElements.length,registeredElements:elementProgress.registered});
  }
  return result.sort((a,b)=>{
    const aMissing=a.deviation==null,bMissing=b.deviation==null;if(aMissing!==bMissing)return aMissing?1:-1;
    return Math.abs(b.deviation||0)-Math.abs(a.deviation||0)||a.id.localeCompare(b.id,'es',{numeric:true});
  });
}

export function groupElementProgress(elements,records,key){
  const groups=new Map();
  for(const element of elements){const raw=key==='activityId'?element.assignedActivityId:element[key],name=clean(raw)||(key==='activityId'?'Sin ActivityID asignada':'Sin dato');const group=groups.get(name)||{name,count:0,registered:0,total:0};const progress=elementRegisteredProgress(element,records);group.count++;if(progress!=null){group.registered++;group.total+=progress;}groups.set(name,group);}
  return [...groups.values()].map(group=>({...group,progress:group.registered?group.total/group.count:null})).sort((a,b)=>(b.registered>0)-(a.registered>0)||(b.progress||0)-(a.progress||0)||a.name.localeCompare(b.name,'es',{numeric:true}));
}

export function deviationTone(value){if(value==null)return'none';if(value<=-5)return'negative';if(value>=5)return'positive';return'aligned';}
export function formatDeviation(value){return value==null?'Sin registro':`${value>0?'+':''}${Math.round(value)} pp`;}
