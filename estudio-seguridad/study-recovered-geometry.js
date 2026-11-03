import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';

// Keep the original tessellation and material shading. Work in station-local
// coordinates before uploading positions to the GPU to avoid precision loss.
function transformedGeometry(source,matrix){
 const geometry=source.clone();
 for(const name of ['position','normal','tangent']){
  const attribute=geometry.getAttribute(name);if(!attribute)continue;
  const values=new Float32Array(attribute.count*attribute.itemSize);
  for(let i=0;i<attribute.count;i++)for(let c=0;c<attribute.itemSize;c++)values[i*attribute.itemSize+c]=attribute.getComponent(i,c);
  geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));
 }
 return geometry.applyMatrix4(matrix);
}

export async function loadRecoveredGeometry(view,manifest,origin){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const files=manifest.files.filter(file=>file.role==='detail');
 if(!files.length)throw Error('No hay geometría detallada disponible');
 let next=0,done=0,triangles=0,primitives=0;const identities=new Set();view.onProgress(0,files.length);
 const worker=async()=>{while(next<files.length){
  const file=files[next++],gltf=await loader.parseAsync(await view.binary(file.url),'');
  const wrapper=new THREE.Group();wrapper.position.copy(origin).negate();wrapper.add(gltf.scene);
  if(file.displayTransform)gltf.scene.applyMatrix4(new THREE.Matrix4().fromArray(file.displayTransform));
  wrapper.updateMatrixWorld(true);
  const groups=new Map(),originalGeometries=new Set(),originalMaterials=new Set();
  wrapper.traverse(mesh=>{
   if(!mesh.isMesh&&!mesh.isLine)return;
   let owner=mesh;while(owner&&!owner.userData.ifcGlobalId)owner=owner.parent;
   const metadata=owner?.userData||{};
   originalGeometries.add(mesh.geometry);
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(m=>originalMaterials.add(m));
   if(metadata.ifcType==='IfcOpeningElement')return;
   primitives++;if(mesh.isMesh)triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;
   if(metadata.ifcGlobalId)identities.add(file.source+'::'+metadata.ifcGlobalId);
   const geometry=transformedGeometry(mesh.geometry,mesh.matrixWorld);
   const key=mesh.type+'|'+materials.map(m=>m.uuid).join(':')+'|'+Object.keys(geometry.attributes).sort().join(',')+'|'+!!geometry.index+(materials.length>1?'|'+mesh.uuid:'');
   if(!groups.has(key))groups.set(key,{kind:mesh.isLine?THREE.LineSegments:THREE.Mesh,materials:materials.map(m=>m.clone()),geometries:[],ids:[]});
   const group=groups.get(key);group.geometries.push(geometry);if(metadata.ifcGlobalId)group.ids.push(metadata.ifcGlobalId);
  });
  for(const group of groups.values()){
   const geometry=group.materials.length>1?group.geometries[0]:mergeGeometries(group.geometries,false);
   if(!geometry)throw Error('No se pudo preparar '+file.file);
   if(group.materials.length===1)for(const g of group.geometries)g.dispose();
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const object=new group.kind(geometry,group.materials.length>1?group.materials:group.materials[0]),b=geometry.boundingBox;
   object.userData={file:file.file,package:file.source,source:file.source,ifcGlobalIds:group.ids,bounds:{min:b.min.toArray(),max:b.max.toArray()}};
   view.staticGroup.add(object);view.staticMeshes.push(object);
  }
  for(const geometry of originalGeometries)geometry.dispose();for(const material of originalMaterials)material.dispose();
  view.onProgress(++done,files.length);view.dirty=true;
  await new Promise(resolve=>setTimeout(resolve,0));
 }};
 const results=await Promise.allSettled([worker(),worker()]);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 document.body.dataset.modelQuality='detail';document.body.dataset.modelParts=String(done);
 document.body.dataset.geometryAudit=JSON.stringify({parts:done,triangles,primitives,identities:identities.size,sources:manifest.sourceIfcFiles.length});
}
