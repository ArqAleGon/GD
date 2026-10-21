import * as THREE from 'three';
import {metadata} from './ifc-audit-core.mjs?v=20261021-native-v1';
export function loadNativeFile(file,section,group,onProgress,signal){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./ifc-native-worker.mjs?v=20261021-native-v1',import.meta.url),{type:'module'}),elements=[],byId=new Map(),geometries=new Map(),pendingMaterial=new THREE.MeshBasicMaterial();
    const dispose=()=>{worker.terminate();pendingMaterial.dispose();signal?.removeEventListener('abort',abort);};
    const abort=()=>{dispose();reject(new DOMException('Carga cancelada','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
    worker.onerror=e=>{dispose();reject(new Error(e.message||'Fallo del lector IFC.'));};
    worker.onmessage=({data:d})=>{
      if(d.kind==='progress')onProgress(d.stage,d.total?{loaded:d.loaded,total:d.total}:undefined);
      if(d.kind==='metadata')for(const raw of d.records){
        const e=metadata(raw.guid,{t:raw.type,n:raw.name,d:raw.description,o:raw.objectType,i:raw.id,l:raw.level,f:file.name},section,file.name);
        Object.assign(e,{tag:raw.tag,children:raw.children,expressId:raw.expressId,declaredRepresentation:raw.declaredRepresentation,void:raw.void,schema:raw.schema,native:true});elements.push(e);byId.set(raw.expressId,e);
      }
      if(d.kind==='geometry')for(const item of d.batch){
        if(item.vertices){const geometry=new THREE.BufferGeometry(),buffer=new THREE.InterleavedBuffer(item.vertices,6);geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));geometry.setIndex(new THREE.BufferAttribute(item.indices,1));geometry.computeBoundingBox();geometries.set(item.key,geometry);}
        else {const e=byId.get(item.expressId);for(const part of item.parts){const geometry=geometries.get(part.key);if(!geometry||!e)continue;const mesh=new THREE.Mesh(geometry,pendingMaterial);mesh.visible=false;mesh.matrix.fromArray(part.matrix);mesh.matrixAutoUpdate=false;mesh.userData.auditElement=e;group.add(mesh);e.meshes.push(mesh);}}
      }
      if(d.kind==='error'){dispose();reject(new Error(d.message));}
      if(d.kind==='done'){dispose();resolve({elements,diagnostics:d});}
    };
    worker.postMessage({file});
  });
}
