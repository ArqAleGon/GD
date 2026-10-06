import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js?v=r170';

let template,loading;
export function loadMetroTrainModel(){
 if(!loading)loading=(async()=>{
  const response=await fetch('./assets/models/metro-train.glb.gz?v=20261005-train-obj');
  if(!response.ok)throw new Error('No se pudo cargar el modelo Metro de Bogotá');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const data=await new Response(stream).arrayBuffer();
  template=(await new GLTFLoader().parseAsync(data,new URL('./',location.href).href)).scene;
  return template;
 })();
 return loading;
}
export function createMetroTrainCar(length,info,register,doors){
 if(!template)throw new Error('El modelo del tren aún no está listo');
 const car=new THREE.Group();car.name='Metro de Bogotá · Tren.obj';
 const model=template.clone(true);model.scale.setScalar(length);car.add(model);
 model.traverse(object=>{
  if(object.isMesh){object.userData.sharedTrainAsset=true;object.castShadow=true;object.receiveShadow=true;register(object,info);}
  if(object.userData.trainDoor)doors.push({obj:object,base:object.position.x,dir:object.userData.doorDirection,range:.036});
 });
 return car;
}

