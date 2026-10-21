import {identity,normalize,levelName} from './ifc-audit-core.mjs?v=20261021-native-v1';

// ObjectType is free text. Only explicit class names, descriptive words and
// observed project family codes provide evidence; absent/ambiguous text is unknown.
const rules=[
 ['IfcCurtainWall',/curtain\s*wall|muro cortina|(?:^|_)cuw(?:_|$)/],
 ['IfcStairFlight',/stair\s*flight|tramo de escalera|non.monolithic run|(?:^|_)sta_run(?:_|$)/],
 ['IfcBeam',/\bbeam\b|\bviga\b|(?:^|_)sfr(?:_|$)|\bjoist\b|(?:^|-)joist|(?:^|-)omega/],
 ['IfcColumn',/\bcolumn\b|\bcolumna\b|(?:^|_)(?:col|sco)(?:_|$)/],
 ['IfcMember',/\bmember\b|\bmontante\b|\bmullion\b|(?:^|_)cwa(?:_|$)/],
 ['IfcPlate',/\bplate\b|system panel|(?:^|_)cpa(?:_|$)/],
 ['IfcSlab',/\bslab\b|\blosa\b|\bfloor\b|(?:^|_)flo(?:_|$)/],
 ['IfcWall',/\bwall\b|\bmuro\b|(?:^|_)wal(?:_|$)/],
 ['IfcWindow',/\bwindow\b|\bventana\b|(?:^|_)win(?:_|$)/],
 ['IfcDoor',/\bdoor\b|\bpuerta\b|(?:^|_)(?:drs|dor)(?:_|$)/],
 ['IfcRoof',/\broof\b|\bcubierta\b|sloped glazing|(?:^|_)rof(?:_|$)/],
 ['IfcCovering',/\bcovering\b|\bceiling\b|\brevestimiento\b|(?:^|_)cis(?:_|$)/],
 ['IfcRailing',/\brailing\b|\bbaranda\b|\bhandrail\b|(?:^|_)rai(?:_|$)/],
 ['IfcStair',/\bstair\b|\bescalera\b|(?:^|_)sta(?:_|$)/],
 ['IfcFlowSegment',/\bpipe\b|\bduct\b|\bgutter\b|\btuberia\b|(?:^|_)gut(?:_|$)/],
 ['IfcFlowTerminal',/\bterminal\b|(?:^|_)pfx(?:_|$)|water.closet|washbasin|faucet|\bsanitary\b/],
 ['IfcFurnishingElement',/\bfurniture\b|\bmobiliario\b|(?:^|_)fur(?:_|$)/],
 ['IfcOpeningElement',/\bopening\b|\brecess\b|\bhueco\b/],
 ['IfcFooting',/\bfooting\b|\bzapata\b|\bfoundation\b|\bcimiento\b/],
 ['IfcElementAssembly',/\bassembly\b|\bconjunto\b|\btruss\b|\bcercha\b/]
];
export function objectTypeCheck(e){
 const text=normalize(e.objectType).replace(/ifc([a-z]+)/g,'ifc$1');
 if(!text.trim())return {state:'unknown',reason:'ObjectType no disponible'};
 if(e.grouped||e.type==='IfcBuildingElementProxy'||e.type==='UnknownIfcType')return {state:'unknown',reason:'Clase genérica o sin identidad; requiere revisión'};
 const canon=t=>t==='IfcWallStandardCase'?'IfcWall':t;
 if(!rules.some(([t])=>t===canon(e.type)))return {state:'unknown',reason:'Clase sin regla explícita de ObjectType; requiere revisión'};
 let candidates=rules.filter(([type,re])=>re.test(text)||re.test(text.replaceAll('_',' '))||text.includes(type.toLowerCase())).map(([t])=>t);
 if(candidates.includes('IfcCurtainWall'))candidates=candidates.filter(t=>t!=='IfcWall');
 if(candidates.includes('IfcStairFlight'))candidates=candidates.filter(t=>t!=='IfcStair');
 if(candidates.includes('IfcBeam')&&/joist|omega/.test(text))candidates=candidates.filter(t=>t!=='IfcCovering');
 if(/^(basic roof|sloped glazing)\b/.test(text))candidates=candidates.filter(t=>t!=='IfcSlab');
 // Family codes are not exclusive: e.g. a ceiling joist or roof slab.
 const type=canon(e.type);
 if(type==='IfcSlab'&&candidates.includes('IfcRoof')&&e.ancestorTypes?.includes('IfcRoof'))return {state:'compatible',reason:'Losa componente de IfcRoof; ObjectType describe el conjunto',candidates};
 if(!candidates.length||candidates.length>1)return {state:'unknown',reason:'ObjectType libre o ambiguo; sin regla concluyente',candidates};
 if(candidates.includes(type))return {state:'compatible',reason:'ObjectType contiene una denominación compatible con '+e.type,candidates};
 return {state:'review',reason:'ObjectType sugiere '+candidates[0]+'; contrastar con '+e.type,candidates};
}
export function enrichNative(elements,payload){
 for(const e of elements){const source=payload?.sources?.[e.source],r=source?.elements?.[e.guid];if(!r)continue;
  Object.assign(e,{objectType:r.o||'',description:r.d||'',name:r.n||e.name,tag:r.i||'',level:levelName(r.l),children:r.c||[],declaredRepresentation:r.h,expressId:r.x,schema:source.schema,nativeMetadata:true});
 }
 return elements;
}
export function linkAssemblies(elements){
 const byKey=new Map(elements.map(e=>[e.key,e])),parents=new Map();
 for(const e of elements){e.ownMeshes??=[...e.meshes];e.ancestorTypes=[];for(const g of e.children||[]){const k=identity(e.section,e.source,g);if(!parents.has(k))parents.set(k,[]);parents.get(k).push(e);}}
 for(const e of elements){const seen=new Set([e.key]),queue=[...(parents.get(e.key)||[])];while(queue.length){const p=queue.pop();if(seen.has(p.key))continue;seen.add(p.key);e.ancestorTypes.push(p.type);queue.push(...(parents.get(p.key)||[]));}}
 const completed=new Map();
 function visit(e,stack=new Set()){
  if(completed.has(e.key))return completed.get(e.key);
  if(stack.has(e.key))return {meshes:[],missing:1};
  const next=new Set(stack);next.add(e.key);const meshes=new Set(e.ownMeshes);let missing=0;
  for(const guid of e.children||[]){const child=byKey.get(identity(e.section,e.source,guid));if(!child){missing++;continue;}const r=visit(child,next);r.meshes.forEach(m=>meshes.add(m));missing+=r.missing;if(!r.meshes.length)missing++;}
  const result={meshes:[...meshes],missing};completed.set(e.key,result);return result;
 }
 for(const e of elements){const r=visit(e);e.meshes=r.meshes;e.aggregate=!!e.children?.length;e.componentGaps=r.missing;e.geometryAssociation=e.aggregate?'components':e.meshes.length?'own':'none';}
 return elements;
}
// One physical mesh may represent both a part and its IFC assembly. Assign it
// once: prefer the actual owner when visible, otherwise the selected assembly.
export function displayOwners(elements,visible){
 const owners=new Map();for(const e of visible)if(!e.suppressed)for(const m of e.meshes)if(!owners.has(m))owners.set(m,e);
 for(const e of visible)if(!e.suppressed)for(const m of e.ownMeshes||e.meshes)owners.set(m,e);
 return owners;
}
export function classificationSummary(items){let known=0,yes=0,review=0;for(const e of items.filter(e=>!e.grouped)){const r=objectTypeCheck(e);if(r.state!=='unknown')known++;if(r.state==='compatible')yes++;if(r.state==='review')review++;}return {known,yes,review,unknown:items.filter(e=>!e.grouped).length-known};}
