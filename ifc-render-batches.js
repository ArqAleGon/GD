import * as THREE from 'three';

export function batchIfcRenderGeometry(model){
    model.updateMatrixWorld(true);
    const groups=new Map(),singles=new Map(),inverse=model.matrixWorld.clone().invert();
    model.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible||Array.isArray(mesh.material))return;
      const key=mesh.geometry.uuid+':'+mesh.material.uuid;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
    });
    for(const meshes of groups.values()){
      if(meshes.length<3){
        for(const mesh of meshes){if(!singles.has(mesh.material.uuid))singles.set(mesh.material.uuid,[]);singles.get(mesh.material.uuid).push(mesh);}
        continue;
      }
      const draw=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
      draw.name='Representación instanciada IFC';draw.userData.ifcRenderBatch=true;
      for(let i=0;i<meshes.length;i++){
        draw.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,meshes[i].matrixWorld));
        meshes[i].visible=false;
      }
      draw.instanceMatrix.needsUpdate=true;model.add(draw);
    }
    // Combine distinct draw geometry by material within each small web part.
    // Original IFC meshes remain independent selection targets with their IDs.
    for(const meshes of singles.values()){
      if(meshes.length<2)continue;
      const center=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inverse,meshes[0].matrixWorld));
      const vertexCount=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
      const indexCount=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count),0);
      const positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),indices=new Uint32Array(indexCount);
      const v=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();let vertexOffset=0,indexOffset=0;
      for(const mesh of meshes){
        const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
        if(!n)geometry.computeVertexNormals();
        const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);normalMatrix.getNormalMatrix(matrix);
        for(let i=0;i<p.count;i++){
          v.fromBufferAttribute(p,i).applyMatrix4(matrix).sub(center).toArray(positions,(vertexOffset+i)*3);
          v.fromBufferAttribute(geometry.attributes.normal,i).applyNormalMatrix(normalMatrix).toArray(normals,(vertexOffset+i)*3);
        }
        const index=geometry.index,count=index?.count??p.count;
        for(let i=0;i<count;i++)indices[indexOffset+i]=vertexOffset+(index?index.getX(i):i);
        vertexOffset+=p.count;indexOffset+=count;mesh.visible=false;
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setIndex(new THREE.BufferAttribute(indices,1));
      const draw=new THREE.Mesh(geometry,meshes[0].material);draw.position.copy(center);draw.name='Representación agrupada IFC';draw.userData.ifcRenderBatch=true;model.add(draw);
    }
  }
