const clean=value=>String(value??'').trim();

export function elementFromMetadata(guid,raw={},activities=[]){
  const executionUnit=clean(raw.u)||'Sin UE';
  const activityIds=executionUnit==='Sin UE'?[]:activities.filter(task=>clean(task.ue)===executionUnit).map(task=>clean(task.id)).filter(Boolean);
  return {
    guid:clean(guid),
    id:clean(raw.i)||clean(guid),
    name:clean(raw.n)||clean(guid),
    ifcType:clean(raw.t)||'IfcBuildingElementProxy',
    executionUnit,
    level:clean(raw.l)||'Sin nivel',
    source:clean(raw.f),
    section:clean(raw.s),
    activityIds:[...new Set(activityIds)]
  };
}

export function matchesRegistrationFilters(element,filters={}){
  const query=clean(filters.id).toLocaleLowerCase('es');
  if(query&&!`${element.id} ${element.guid} ${element.name}`.toLocaleLowerCase('es').includes(query))return false;
  if(clean(filters.activityId)&&!element.activityIds.includes(clean(filters.activityId)))return false;
  if(clean(filters.executionUnit)&&element.executionUnit!==clean(filters.executionUnit))return false;
  if(clean(filters.ifcType)&&element.ifcType!==clean(filters.ifcType))return false;
  if(clean(filters.level)&&element.level!==clean(filters.level))return false;
  return true;
}

export function progressRecordApplies(record,element){
  if(!record||!element)return false;
  const directPrefix=`ifc-element:${element.section}:${element.source}:${element.guid}`;
  if(record.objectId===directPrefix||String(record.objectId||'').startsWith(directPrefix+':')||(element.progressObjectId&&record.objectId===element.progressObjectId))return true;
  if(record.scopeType==='activity')return element.activityIds.includes(clean(record.scopeValue));
  if(record.scopeType==='ue')return element.executionUnit===clean(record.scopeValue);
  return false;
}

export function recordsForRegistrationElement(records,element){
  return records.filter(record=>progressRecordApplies(record,element)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
}

export function registrationTarget(element,scopeType,scopeValue=''){
  const scope=clean(scopeType)||'element',value=clean(scopeValue);
  if(scope==='activity'){
    if(!value||!element.activityIds.includes(value))throw new Error('Selecciona un ActivityID vinculado al elemento.');
    return {objectId:`ifc-activity:${element.section}:${value}`,objectTitle:`ActivityID ${value}`,kind:'Grupo por ActivityID',section:element.section,scopeType:'activity',scopeValue:value,activityId:value,executionUnit:element.executionUnit,elementId:element.guid};
  }
  if(scope==='ue'){
    if(!value||value==='Sin UE'||value!==element.executionUnit)throw new Error('El elemento no tiene una UE válida para registrar.');
    return {objectId:`ifc-ue:${element.section}:${value}`,objectTitle:`UE ${value}`,kind:'Grupo por UE',section:element.section,scopeType:'ue',scopeValue:value,executionUnit:value,elementId:element.guid};
  }
  return {objectId:`ifc-element:${element.section}:${element.source}:${element.guid}`,objectTitle:`${element.ifcType} · ${element.guid}`,kind:'Elemento IFC',section:element.section,scopeType:'element',scopeValue:element.guid,executionUnit:element.executionUnit,elementId:element.guid};
}

