import * as W from './vendor/web-ifc-0.0.78/web-ifc-api.js';
const value=v=>v?.value??v??'';
self.onmessage=async({data:{file}})=>{
  const api=new W.IfcAPI();let model=-1,diagnostics=0,samples=[];
  const log=console.log,err=console.error;
  function capture(...args){const text=args.join(' ');if(text.includes('[WEB-IFC]')){diagnostics++;if(samples.length<5)samples.push(text);return;}log(...args);}
  console.log=capture;console.error=capture;
  const send=(stage,loaded,total)=>postMessage({kind:'progress',stage,loaded,total});
  try{
    send('Inicializando lector IFC');api.SetWasmPath(new URL('./vendor/web-ifc-0.0.78/',import.meta.url).href,true);await api.Init(undefined,true);
    send('Leyendo '+file.name);let bytes=new Uint8Array(await file.arrayBuffer());send('Interpretando IFC original');
    model=api.OpenModel(bytes,{COORDINATE_TO_ORIGIN:false,MEMORY_LIMIT:2147483648,ALLOW_INCOMPATIBLE_SCHEMA_ALIASES:false});
    bytes=null;
    if(model<0)throw new Error('El lector no pudo abrir este IFC.');
    const schema=api.GetModelSchema(model),classes=W[schema]||W[schema.startsWith('IFC4X3')?'IFC4X3':'IFC4'];
    const types=api.GetAllTypesOfModel(model),records=[],byId=new Map(),parent=new Map(),contains=new Map(),storeys=new Map();
    send('Leyendo ObjectType, entidades y relaciones');
    for(const t of types){
      const Class=classes?.[t.typeName];
      if(!Class||!(Class.prototype instanceof classes.IfcElement))continue;
      const ids=api.GetLineIDsWithType(model,t.typeID);
      for(let i=0;i<ids.size();i++){
        const r=api.GetLine(model,ids.get(i));if(!r.GlobalId)continue;
        const e={guid:value(r.GlobalId),expressId:r.expressID,type:t.typeName,name:value(r.Name),description:value(r.Description),objectType:value(r.ObjectType),tag:String(value(r.Tag)),id:String(value(r.Tag)||r.expressID),children:[],level:'Sin nivel',declaredRepresentation:!!r.Representation,void:t.typeName==='IfcOpeningElement',schema};records.push(e);byId.set(e.expressId,e);
      }
    }
    for(const name of ['IfcRelAggregates','IfcRelNests','IfcRelContainedInSpatialStructure','IfcBuildingStorey']){
      const ids=api.GetLineIDsWithType(model,api.GetTypeCodeFromName(name.toUpperCase()));
      for(let i=0;i<ids.size();i++){
        const r=api.GetLine(model,ids.get(i));
        if(name==='IfcBuildingStorey'){storeys.set(r.expressID,value(r.Name)||value(r.LongName));continue;}
        if(name==='IfcRelContainedInSpatialStructure'){for(const x of r.RelatedElements||[])contains.set(x.value,r.RelatingStructure.value);continue;}
        const owner=byId.get(r.RelatingObject?.value);
        for(const x of r.RelatedObjects||[]){parent.set(x.value,r.RelatingObject.value);const child=byId.get(x.value);if(owner&&child)owner.children.push(child.guid);}
      }
    }
    for(const e of records){let p=e.expressId;const seen=new Set();while(p&&!seen.has(p)){seen.add(p);if(storeys.has(p)){e.level=storeys.get(p);break;}p=contains.get(p)||parent.get(p);}}
    postMessage({kind:'metadata',records,schema,source:file.name});
    const sent=new Set(),represented=new Set();let batch=[],transfers=[],processed=0,emptyGeometry=0;
    const flush=()=>{if(batch.length){postMessage({kind:'geometry',batch},transfers);batch=[];transfers=[];}};
    const consume=mesh=>{
      if(!byId.has(mesh.expressID))return;
      const parts=[];
      for(let i=0;i<mesh.geometries.size();i++){
        const p=mesh.geometries.get(i),key=p.geometryExpressID;
        if(!sent.has(key)){
          const g=api.GetGeometry(model,key);
          const vertices=api.GetVertexArray(g.GetVertexData(),g.GetVertexDataSize()).slice(),indices=api.GetIndexArray(g.GetIndexData(),g.GetIndexDataSize()).slice();g.delete();
          if(!indices.length||!vertices.length){emptyGeometry++;continue;}
          batch.push({key,vertices,indices});transfers.push(vertices.buffer,indices.buffer);sent.add(key);
        }
        parts.push({key,matrix:p.flatTransformation});
      }
      if(parts.length){batch.push({expressId:mesh.expressID,parts});represented.add(mesh.expressID);}
      if(++processed%100===0){flush();send('Geometría IFC procesada',processed,records.length);}
    };
    api.StreamAllMeshes(model,consume);
    // Openings are native voids, excluded by the general stream. Keep them
    // inspectable as a separate type, hidden in the initial physical view.
    const voidIds=records.filter(e=>e.void&&!represented.has(e.expressId)).map(e=>e.expressId);
    for(const id of voidIds){const mesh=api.GetFlatMesh(model,id);try{consume(mesh);}finally{mesh.geometries?.delete?.();}}
    flush();postMessage({kind:'done',schema,diagnostics,samples,emptyGeometry,represented:represented.size,total:records.length});
  }catch(error){postMessage({kind:'error',message:error.message});}
  finally{if(model>=0)api.CloseModel(model);console.log=log;console.error=err;}
};
