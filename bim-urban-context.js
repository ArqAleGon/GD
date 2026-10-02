import * as THREE from 'three';
import {mapToBim} from './bim-context-projection.js';
let cached;
export function loadBimUrbanContext(){
  return cached??=Promise.all([1,2,3].map(async part=>{
    const r=await fetch(`./l1-buildings-${part}.json.gz?v=20260922-l1-100m-b`);
    if(!r.ok)throw new Error('No se pudo cargar el corredor urbano L1');
    return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
  })).then(parts=>({meta:parts[0].meta,landmarks:parts[0].landmarks,buildings:parts.flatMap(p=>p.buildings)})).catch(error=>{cached=null;throw error;});
}
export function buildBimUrbanContext(group,data,origin){
  const positions=[],indices=[];
  let count=0;
  for(const [floors,height,landmarkIndex,code,rings] of data.buildings){
    const landmark=data.landmarks[landmarkIndex];
    if(landmark&&['Universidad Nacional','Estadio El Campín'].includes(landmark.name))continue;
    for(const ring of rings){
      const pts=[];
      for(let i=0;i<ring.length;i+=2)pts.push(new THREE.Vector2(...mapToBim(ring[i],ring[i+1],data.meta,origin)));
      if(pts.length>1&&pts[0].equals(pts.at(-1)))pts.pop();
      if(pts.length<3)continue;
      const offset=positions.length/3,n=pts.length,roof=.24+height*.06;
      for(const p of pts)positions.push(p.x,.24,p.y);
      for(const p of pts)positions.push(p.x,roof,p.y);
      for(const face of THREE.ShapeUtils.triangulateShape(pts,[]))indices.push(...face.map(i=>offset+n+i));
      for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(offset+i,offset+j,offset+n+i,offset+j,offset+n+j,offset+n+i);}
    }
    count++;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#7293a0',roughness:.82,metalness:.04,transparent:true,opacity:.68,side:THREE.DoubleSide}));
  mesh.name='CONSTRUC · L1 · 100 m a cada lado';group.add(mesh);
  group.userData.buildingMeta={...data.meta,renderedRecords:count};
  return geometry.boundingBox;
}
