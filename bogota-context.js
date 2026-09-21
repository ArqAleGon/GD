import * as THREE from 'three';
import {networkLines} from './network-data.js';

// The detailed city view shares the reference-image coordinate system with the
// rail network. It is an interpretive urban model, not survey or GIS geometry.
export const cityPoint=([x,y],h=0)=>[(x-955)*.32,h,(y-285)*.32];
export const LANDMARKS=[
 {name:'Torre Atrio',xy:[1118,125],kind:'tower',height:28,description:'Centro Internacional · Caracas / calle 26. Volumen interpretativo con estructura diagonal.',source:'https://www.arpro.com.co/proyectos/en-venta/atrio-torre-norte'},
 {name:'Estadio El Campín',xy:[1012,203],kind:'stadium',height:7,description:'Sector de la NQS entre calles 53 y 63. Representación urbana interpretativa del estadio.',source:'https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?dt=S&i=81382'},
 {name:'Universidad Nacional',xy:[1065,231],kind:'campus',height:5,description:'Ciudad Universitaria · al occidente de la NQS, entre calles 26 y 53.',source:'https://derecho.bogota.unal.edu.co/fileadmin/user_upload/Ciudad_Universitaria_.pdf'},
 {name:'Iglesia de Lourdes',xy:[988,119],kind:'church',height:12,description:'Basílica de Lourdes · carrera 13, calles 63–63A. Volumen inspirado en sus torres neogóticas.',source:'https://www.idartes.gov.co/es/programas/arte-a-la-KY/Chapinero'}
];

export function buildBogotaContext(root,addLabel,onInspect){
 const g=new THREE.Group();g.name='Bogotá · contexto urbano detallado';root.add(g);
 const materials=new Map();
 const mat=(c,opts={})=>{const key=c+JSON.stringify(opts);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:c,roughness:.82,metalness:.06,...opts}));return materials.get(key);};
 const cube=new THREE.BoxGeometry();
 function box(parent,x,y,z,w,h,d,c,opts={}){const m=new THREE.Mesh(cube,mat(c,opts));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
 function route(points,color,width=.15,y=.12,opacity=1){const pts=points.map(p=>new THREE.Vector3(...cityPoint(p,y)));const curve=new THREE.CurvePath();for(let i=1;i<pts.length;i++)curve.add(new THREE.LineCurve3(pts[i-1],pts[i]));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*10),width,5,false),mat(color,{transparent:opacity<1,opacity,depthWrite:opacity===1}));g.add(mesh);return mesh;}
 function area(points,color,y=0,opacity=1){const shape=new THREE.Shape(points.map(p=>{const [x,,z]=cityPoint(p);return new THREE.Vector2(x,-z);}));const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat(color,{transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1}));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;g.add(mesh);return mesh;}

 // Metropolitan ground, borough tones and the city's natural edges.
 area([[325,95],[425,75],[1170,70],[1280,125],[1570,140],[1580,355],[1480,495],[1150,535],[380,515]],'#16252c',-.72);
 area([[430,110],[820,105],[850,470],[390,485]],'#172b31',-.58);
 area([[820,105],[1130,95],[1145,475],[850,470]],'#1a3036',-.57);
 area([[1130,95],[1510,135],[1515,450],[1145,475]],'#1b2d34',-.56);
 area([[430,72],[850,58],[1110,63],[1250,88],[1490,116],[1510,139],[1230,111],[1070,91],[830,83],[430,94]],'#285047',-.15);
 for(let i=0;i<28;i++){const [x,,z]=cityPoint([440+i*39,70+Math.max(0,i-17)*4]);const ridge=new THREE.Mesh(new THREE.ConeGeometry(6+i%4,7+i%6,6),mat(i%2?'#315a4e':'#23473f'));ridge.position.set(x,2.5,z);ridge.scale.x=1.9;g.add(ridge);}
 route([[420,490],[640,492],[780,477],[930,495],[1100,505],[1270,493],[1450,479]],'#397c96',1.25,-.08);
 route([[420,486],[640,488],[780,473],[930,491],[1100,501],[1270,489],[1450,475]],'#71a9b7',.12,.04,.8);

 // Parks and large civic areas make the urban fabric legible at a glance.
 area([[785,244],[925,242],[925,322],[790,330]],'#274d40',-.05);
 area([[1018,207],[1114,205],[1120,274],[1020,278]],'#2b5143',-.04);
 area([[1084,112],[1176,110],[1180,166],[1088,168]],'#24463b',-.04);
 area([[960,173],[1048,172],[1048,224],[958,225]],'#315645',-.04);

 // Arterial corridors include pavement, medians and lane markings.
 const avenues=[
  {name:'Av. Caracas',points:[[820,145],[1240,145],[1259,213],[1259,318]],width:1.65,color:'#526b75'},
  {name:'NQS',points:[[790,197],[980,208],[1110,210],[1215,266],[1320,315]],width:1.25,color:'#455f69'},
  {name:'Calle 26',points:[[1123,102],[1123,330]],width:.92,color:'#4d6871'},
  {name:'Calle 45',points:[[1054,103],[1054,334]],width:.72,color:'#405b65'},
  {name:'Calle 63',points:[[993,103],[993,334]],width:.86,color:'#4b6670'},
  {name:'Calle 72',points:[[940,103],[940,334]],width:.86,color:'#4b6670'}
 ];
 for(const avenue of avenues){route(avenue.points,avenue.color,avenue.width,.13);route(avenue.points,'#d9c77f',.07,.25,.82);}
 for(let x=470;x<1510;x+=31)route([[x,155],[x,460]],x%62?'#253c45':'#2c4650',x%62?.13:.2,.02,.82);
 for(let y=172;y<470;y+=23)route([[430,y],[1510,y]],y%46?'#253c45':'#2c4650',y%46?.13:.2,.02,.82);
 for(const avenue of avenues){const anchor=avenue.points[Math.floor(avenue.points.length/2)];const l=addLabel(cityPoint([anchor[0]+8,anchor[1]+8],.55),()=>avenue.name,null,'cityStreetLabel');l.landmark=true;l.cityMinor=true;}

 const segments=networkLines.flatMap(line=>line.path.slice(1).map((p,i)=>[line.path[i],p]));
 function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
 const inside=(p,b)=>p[0]>b[0]&&p[0]<b[2]&&p[1]>b[1]&&p[1]<b[3];
 const openAreas=[[780,235,930,334],[1008,197,1128,284],[1075,103,1185,176],[947,165,1060,232]];
 const palette=['#4b6069','#596b70','#617278','#3d555f','#6a7373','#465c66'];
 const sites=[];
 for(let x=445;x<1515;x+=17)for(let y=158;y<470;y+=13){
  if(segments.some(([a,b])=>distance([x,y],a,b)<8.5)||LANDMARKS.some(l=>Math.hypot((x-l.xy[0])*.76,y-l.xy[1])<30)||openAreas.some(b=>inside([x,y],b)))continue;
  const [wx,,wz]=cityPoint([x+2,y+2]);
  const core=x>1060&&x<1270&&y<220?4.8:0,chapinero=x>930&&x<1050&&y<240?2.1:0;
  const h=1.5+((x*17+y*11)%13)*.28+core+chapinero;
  sites.push({x:wx,z:wz,h,w:3.0+((x+y)%4)*.38,d:2.25+((x*3+y)%5)*.24,color:palette[(x+y)%palette.length]});
 }
 const buildingMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,metalness:.1});
 const blocks=new THREE.InstancedMesh(cube,buildingMaterial,sites.length),dummy=new THREE.Object3D(),tone=new THREE.Color();
 sites.forEach((site,i)=>{dummy.position.set(site.x,site.h/2-.38,site.z);dummy.scale.set(site.w,site.h,site.d);dummy.updateMatrix();blocks.setMatrixAt(i,dummy.matrix);blocks.setColorAt(i,tone.set(site.color));});
 blocks.instanceMatrix.needsUpdate=true;if(blocks.instanceColor)blocks.instanceColor.needsUpdate=true;g.add(blocks);
 const roofs=sites.filter((_,i)=>i%7===0),roofMesh=new THREE.InstancedMesh(cube,mat('#91a4a7',{metalness:.18,roughness:.58}),roofs.length);
 roofs.forEach((site,i)=>{dummy.position.set(site.x,site.h+.03,site.z);dummy.scale.set(site.w*.42,.18,site.d*.42);dummy.updateMatrix();roofMesh.setMatrixAt(i,dummy.matrix);});roofMesh.instanceMatrix.needsUpdate=true;g.add(roofMesh);

 // Tree canopies line parks and selected avenues without obscuring the railway.
 const trees=[];
 for(let x=790;x<925;x+=14)for(const y of [246,324])trees.push(cityPoint([x,y],1.15));
 for(let x=1024;x<1118;x+=13)for(const y of [211,272])trees.push(cityPoint([x,y],1.15));
 for(let x=470;x<1480;x+=38)trees.push(cityPoint([x,452+(x%3)*3],1.15));
 const canopyGeometry=new THREE.IcosahedronGeometry(1.25,1),canopies=new THREE.InstancedMesh(canopyGeometry,mat('#4d765c',{roughness:1}),trees.length);
 trees.forEach((p,i)=>{dummy.position.set(...p);const scale=.75+(i%4)*.1;dummy.scale.setScalar(scale);dummy.updateMatrix();canopies.setMatrixAt(i,dummy.matrix);});canopies.instanceMatrix.needsUpdate=true;g.add(canopies);

 for(const item of LANDMARKS){
  const parent=new THREE.Group();parent.position.fromArray(cityPoint(item.xy,.3));g.add(parent);box(parent,0,0,0,12,.3,10,'#526368');
  if(item.kind==='tower'){
   box(parent,-2.2,12,0,4.2,24,4.4,'#568495',{metalness:.28,roughness:.28});box(parent,2.1,9,1.1,3.1,18,3.5,'#496f80',{metalness:.28,roughness:.28});box(parent,0,1,0,8.4,2,7.2,'#60767e');
   for(const z of [-2.25,2.25])for(let y=2;y<24;y+=4){const brace=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.1,y,z),new THREE.Vector3(0,y+4,z)]),new THREE.LineBasicMaterial({color:'#e5a663'}));parent.add(brace);}
   for(let y=3;y<24;y+=2)box(parent,-2.2,y,0,4.35,.1,4.55,'#bdd5d9');
  }else if(item.kind==='stadium'){
   box(parent,0,.5,0,13,.6,9,'#39775a');
   for(let i=0;i<44;i++){const a=i/44*Math.PI*2,m=box(parent,Math.cos(a)*7.7,2.0,Math.sin(a)*5.3,1.8,3.4,2.2,i%2?'#c7cec3':'#aab4ad');m.rotation.y=-a;}
   const pitch=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-4.4,.85,-2.8],[4.4,.85,-2.8],[4.4,.85,2.8],[-4.4,.85,2.8],[-4.4,.85,-2.8]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:'#e9f2df'}));parent.add(pitch);
  }else if(item.kind==='campus'){
   box(parent,0,.3,0,18,.4,15,'#3a664f');
   for(let i=0;i<9;i++){const a=i/9*Math.PI*2,m=box(parent,Math.cos(a)*6.2,1.25,Math.sin(a)*5.1,3,2.1,1.6,i%2?'#d0d4c9':'#aebbb3');m.rotation.y=-a;}
   box(parent,0,1.1,0,5.4,1.8,3.4,'#d8ddd4');box(parent,-5,1.6,-3,3.5,2.8,2.2,'#a8bbb3');
  }else{
   box(parent,0,2.4,0,4.4,4.7,7.5,'#b8a58a');
   for(const x of [-2.15,2.15]){box(parent,x,3.5,-3.1,1.9,7,1.9,'#c9b696');const spire=new THREE.Mesh(new THREE.ConeGeometry(1.3,4.4,4),mat('#607f7d'));spire.position.set(x,9.2,-3.1);spire.rotation.y=Math.PI/4;parent.add(spire);}
   const roof=new THREE.Mesh(new THREE.ConeGeometry(3.3,2.2,4),mat('#607878'));roof.scale.z=1.7;roof.rotation.y=Math.PI/4;roof.position.y=5.8;parent.add(roof);box(parent,0,4.3,-3.8,1.2,1.8,.12,'#77a9b0',{emissive:'#4d777e',emissiveIntensity:.5});
  }
  const l=addLabel(cityPoint(item.xy,item.height+2),()=>item.name,()=>onInspect(item),'bogotaLandmark');l.landmark=true;l.offsetY={tower:-32,stadium:24,campus:50,church:-62}[item.kind];
 }
 for(const [name,xy] of [['CERROS ORIENTALES',[780,72]],['RÍO BOGOTÁ',[900,492]],['BOGOTÁ · CONTEXTO URBANO',[620,116]],['CENTRO INTERNACIONAL',[1155,182]],['CHAPINERO',[970,154]],['TEUSAQUILLO',[1030,286]]]){const l=addLabel(cityPoint(xy,3),()=>name,null,'cityStreetLabel');l.landmark=true;l.cityMinor=!name.includes('BOGOTÁ');}
 return g;
}

