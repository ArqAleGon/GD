// Count IFC instances, not material primitives or GPU draw batches.
export function buildIfcTypeInventory(meshes){
  const instances=new Map();
  for(const mesh of meshes){
    const object=mesh.userData.progressObject;
    if(!object)continue;
    const type=mesh.userData.ifcType||object.parameters['Clase IFC']||'IfcBuildingElementProxy';
    const id=mesh.userData.ifcInstanceKey||object.id;
    if(!instances.has(id))instances.set(id,{id,type,grouped:Boolean(mesh.userData.ifcGroupedGeometry),meshes:[]});
    const instance=instances.get(id);
    if(instance.type!==type)throw new Error('Conflicting IFC class for '+id);
    instance.meshes.push(mesh);
  }
  return [...instances.values()];
}

export function summarizeIfcTypes(instances,enabledTypes=null){
  const types=new Map();let total=0,visible=0,groups=0,visibleGroups=0;
  for(const instance of instances){
    if(!types.has(instance.type))types.set(instance.type,{type:instance.type,total:0,visible:0,grouped:instance.grouped,enabled:!enabledTypes||enabledTypes.has(instance.type)});
    const row=types.get(instance.type);row.total++;
    const shown=(!enabledTypes||enabledTypes.has(instance.type))&&instance.meshes.some(mesh=>!mesh.userData.ifcSourceAxisOutlier);
    if(instance.grouped){groups++;if(shown)visibleGroups++;}else{total++;if(shown)visible++;}
    if(shown)row.visible++;
  }
  return {total,visible,groups,visibleGroups,types:[...types.values()].sort((a,b)=>a.type.localeCompare(b.type))};
}

export function applyIfcTypeFilter(entry,enabledTypes=null){
  entry.enabledIfcTypes=enabledTypes;
  for(const instance of entry.typeInventory){
    const enabled=!enabledTypes||enabledTypes.has(instance.type);
    for(const mesh of instance.meshes){
      mesh.userData.ifcTypeHidden=!enabled;
      mesh.visible=enabled&&!mesh.userData.ifcBatchedOriginal&&!mesh.userData.ifcSourceAxisOutlier;
    }
  }
  entry.group.traverse(draw=>{
    if(draw.userData.ifcRenderBatch)draw.visible=!enabledTypes||enabledTypes.has(draw.userData.ifcType);
  });
  return summarizeIfcTypes(entry.typeInventory,enabledTypes);
}
