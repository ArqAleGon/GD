import * as THREE from 'three';
import {networkLines} from './network-data.js';
// Same reference-image coordinates as the schematic rail network. North is left;
// east (Cerros Orientales) is up. Distances/heights are illustrative, not GIS.
export const cityPoint=([x,y],h=0)=>[(x-955)*.32,h,(y-285)*.32];
export const LANDMARKS=[
 {name:'Torre Atrio',xy:[1118,125],kind:'tower',height:19,description:'Centro Internacional · Caracas / calle 26. Volumen interpretativo con estructura diagonal.',source:'https://www.arpro.com.co/proyectos/en-venta/atrio-torre-norte'},
 {name:'Estadio El Campín',xy:[1012,203],kind:'stadium',height:5,description:'Sector de la NQS entre calles 53 y 63. Representación esquemática del estadio.',source:'https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?dt=S&i=81382'},
 {name:'Universidad Nacional',xy:[1065,231],kind:'campus',height:4,description:'Ciudad Universitaria · al occidente de la NQS, entre calles 26 y 53.',source:'https://derecho.bogota.unal.edu.co/fileadmin/user_upload/Ciudad_Universitaria_.pdf'},
 {name:'Iglesia de Lourdes',xy:[988,119],kind:'church',height:10,description:'Basílica de Lourdes · carrera 13, calles 63–63A. Volumen inspirado en sus torres neogóticas.',source:'https://www.idartes.gov.co/es/programas/arte-a-la-KY/Chapinero'}
];
export function buildBogotaContext(root,addLabel,onInspect){
 const g=new THREE.Group();g.name='Bogotá · contexto esquemático';root.add(g);
 const materials=new Map();const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.9}));return materials.get(c);};
 const cube=new THREE.BoxGeometry();
 function box(parent,x,y,z,w,h,d,c){const m=new THREE.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
 function route(points,color,width=.15,y=.12){const pts=points.map(p=>new THREE.Vector3(...cityPoint(p,y)));const curve=new THREE.CurvePath();for(let i=1;i<pts.length;i++)curve.add(new THREE.LineCurve3(pts[i-1],pts[i]));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*10),width,4,false),mat(color));g.add(mesh);}
 function area(points,color,y=0){const shape=new THREE.Shape(points.map(p=>{const [x,,z]=cityPoint(p);return new THREE.Vector2(x,-z);}));const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat(color));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;g.add(mesh);}
 area([[325,95],[425,75],[1170,70],[1280,125],[1570,140],[1580,355],[1480,495],[1150,535],[380,515]],'#10202a',-.7);
 // Eastern ridge and western river frame the city instead of crossing it arbitrarily.
 area([[430,72],[850,58],[1110,63],[1250,88],[1490,116],[1510,139],[1230,111],[1070,91],[830,83],[430,94]],'#1a3b39',-.15);
 for(let i=0;i<20;i++){const [x,,z]=cityPoint([470+i*49,72+Math.max(0,i-13)*5]);const m=new THREE.Mesh(new THREE.ConeGeometry(6+i%3,6+i%5,5),mat(i%2?'#244944':'#1a3635'));m.position.set(x,2,z);m.scale.x=1.8;g.add(m);}
 route([[420,490],[640,492],[780,477],[930,495],[1100,505],[1270,493],[1450,479]],'#28566b',1,-.1);
 // Civic corridors share anchors with E13/14/15/16 on the Caracas schematic.
 route([[820,145],[1240,145],[1259,213],[1259,318]],'#52717d',1,.15);
 route([[790,197],[980,208],[1110,210],[1215,266],[1320,315]],'#3c5967',.65,.12);
 const streets=[['Calle 26',1123],['Calle 45',1054],['Calle 63',993],['Calle 72',940]];
 for(const [name,x] of streets){route([[x,103],[x,320]],'#36515e',.36,.1);const l=addLabel(cityPoint([x+9,325],.5),()=>name,null,'cityStreetLabel');l.landmark=true;l.cityMinor=true;}
 for(let x=500;x<1500;x+=38)route([[x,155],[x,450]],'#1b303b',.10,0);
 for(let y=180;y<460;y+=28)route([[440,y],[1500,y]],'#1b303b',.10,0);
 const segments=networkLines.flatMap(l=>l.path.slice(1).map((p,i)=>[l.path[i],p]));
 function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
 const sites=[];
 for(let x=450;x<1500;x+=19)for(let y=168;y<463;y+=14){
  if(segments.some(([a,b])=>distance([x,y],a,b)<9)||LANDMARKS.some(l=>Math.hypot((x-l.xy[0])*.75,y-l.xy[1])<32))continue;
  const [wx,,wz]=cityPoint([x+3,y+3]);const h=1+((x*13+y*7)%9)*.22;sites.push([wx,wz,h]);
 }
 const blocks=new THREE.InstancedMesh(cube,mat('#263c49'),sites.length);const dummy=new THREE.Object3D();sites.forEach(([x,z,h],i)=>{dummy.position.set(x,h/2-.4,z);dummy.scale.set(3.6,h,2.6);dummy.updateMatrix();blocks.setMatrixAt(i,dummy.matrix);});g.add(blocks);
 for(const item of LANDMARKS){const parent=new THREE.Group();parent.position.fromArray(cityPoint(item.xy,.3));g.add(parent);box(parent,0,0,0,12,.3,10,'#3c5358');
  if(item.kind==='tower'){
   box(parent,0,9,0,4.5,18,4.5,'#548293');box(parent,0,1,0,7,2,7,'#536d78');
   for(const z of [-2.3,2.3])for(let y=2;y<18;y+=4){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.3,y,z),new THREE.Vector3(2.3,y+4,z)]),new THREE.LineBasicMaterial({color:'#e4a465'}));parent.add(line);}
   for(let y=3;y<18;y+=2)box(parent,0,y,0,4.7,.12,4.7,'#a2bdc6');
  }else if(item.kind==='stadium'){
   box(parent,0,.5,0,12,.5,8,'#3e755c');
   for(let i=0;i<36;i++){const a=i/36*Math.PI*2;const m=box(parent,Math.cos(a)*7,1.6,Math.sin(a)*5,1.9,2.7,2.5,'#b1b9ad');m.rotation.y=-a;}
   const pitch=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-4,.85,-2.7],[4,.85,-2.7],[4,.85,2.7],[-4,.85,2.7],[-4,.85,-2.7]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#d1e5cf'}));parent.add(pitch);
  }else if(item.kind==='campus'){
   box(parent,0,.3,0,17,.4,14,'#315b4c');
   for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const m=box(parent,Math.cos(a)*5.5,1.2,Math.sin(a)*4.7,3,2,1.7,'#c2c7bb');m.rotation.y=-a;}
   box(parent,0,.8,0,5,1.2,3,'#d0d5cc');
  }else{
   box(parent,0,2.1,0,4,4,7,'#ad9e85');
   for(const x of [-2,2]){box(parent,x,3,-3,1.8,6,1.8,'#c1b092');const spire=new THREE.Mesh(new THREE.ConeGeometry(1.25,4,4),mat('#658889'));spire.position.set(x,8,-3);spire.rotation.y=Math.PI/4;parent.add(spire);}
   const roof=new THREE.Mesh(new THREE.ConeGeometry(3.2,2,4),mat('#627a79'));roof.scale.z=1.6;roof.rotation.y=Math.PI/4;roof.position.y=5;parent.add(roof);
  }
  const l=addLabel(cityPoint(item.xy,item.height+2),()=>item.name,()=>onInspect(item),'bogotaLandmark');l.landmark=true;l.offsetY={tower:-32,stadium:24,campus:52,church:-65}[item.kind];
 }
 for(const [name,xy] of [['CERROS ORIENTALES',[780,72]],['RÍO BOGOTÁ · ESQUEMA',[900,492]],['N ←  BOGOTÁ · TRAZA ESQUEMÁTICA',[630,116]]]){const l=addLabel(cityPoint(xy,3),()=>name,null,'cityStreetLabel');l.landmark=true;}
 return g;
}
