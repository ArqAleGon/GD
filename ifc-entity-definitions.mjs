// Editorial Spanish summaries, not an official translation of the standard.
// Sources: buildingSMART, IFC 4.3.2.0 (IFC4X3_ADD2), semantic definitions.
// This official release corresponds to ISO 16739-1:2024. Consulted 2026-10-21.
const entries = {
  IfcBeam: ['6.1.3.1', 'Elemento normalmente horizontal que resiste cargas principalmente por flexi�n. Tambi�n puede representar una viga arquitect�nica sin funci�n portante.'],
  IfcBuildingElementProxy: ['6.1.3.5', 'Elemento constructivo gen�rico que conserva las funciones de un elemento IFC, pero no tiene un significado espec�fico de tipolog�a predefinido.'],
  IfcColumn: ['6.1.3.10', 'Elemento normalmente vertical que transmite cargas por compresi�n. Tambi�n puede representar una columna arquitect�nica sin funci�n portante.'],
  IfcCovering: ['6.1.3.12', 'Capa que recubre parte de otro elemento y depende de �l. Incluye acabados de pisos, revestimientos, cielos rasos y molduras.'],
  IfcCurtainWall: ['6.1.3.14', 'Cerramiento compuesto por piezas suspendidas del borde de la estructura de pisos o cubierta, en lugar de apoyarse sobre un piso.'],
  IfcDoor: ['6.1.3.16', 'Elemento que controla el acceso de personas, bienes, animales o veh�culos. Puede tener apertura abatible, pivotante, corredera, giratoria o plegable.'],
  IfcMember: ['6.1.3.18', 'Elemento lineal de cualquier orientaci�n, utilizado cuando no corresponde clasificarlo m�s espec�ficamente como viga o columna. No exige funci�n portante.'],
  IfcPlate: ['6.1.3.20', 'Pieza laminar, normalmente plana y de espesor constante, que puede soportar cargas o aportar rigidez. Su orientaci�n y material no determinan la clase.'],
  IfcRailing: ['6.1.3.22', 'Conjunto de protecci�n junto a zonas de circulaci�n o l�mites espaciales. Sirve de apoyo o previene da�os por ca�das y colisiones.'],
  IfcRoof: ['6.1.3.31', 'Cierre superior que protege el edificio de la intemperie. Puede representarse como un elemento �nico o como un conjunto de componentes.'],
  IfcSlab: ['6.1.3.35', 'Parte constructiva de un piso, losa de cubierta o descansillo. Delimita espacios por abajo o por arriba; los acabados se clasifican aparte.'],
  IfcStair: ['6.1.3.37', 'Circulaci�n mediante pelda�os que conecta pisos a distintas cotas. Puede incorporar descansillos y representarse como un conjunto de componentes.'],
  IfcStairFlight: ['6.1.3.38', 'Tramo continuo de pelda�os sin descansillo intermedio. Comprende los escalones, sus zancas y los pelda�os compensados que formen parte del tramo.'],
  IfcWall: ['6.1.3.41', 'Construcci�n generalmente vertical que delimita o subdivide espacios. Puede soportar cargas, aunque la clase tambi�n admite muros sin funci�n portante.'],
  IfcWallStandardCase: ['6.1.3.42', 'Muro de extrusi�n vertical, eje recto o circular y capas de espesor constante a lo largo del eje. Clase obsoleta en IFC 4.3.'],
  IfcWindow: ['6.1.3.44', 'Elemento para iluminaci�n natural y ventilaci�n, compuesto por marco y paneles fijos o m�viles. Incluye ventanas verticales y lucernarios.'],
  IfcFlowSegment: ['6.2.3.18', 'Tramo de un sistema de distribuci�n de flujos, situado en el proyecto. Su tipo asociado define las caracter�sticas del segmento y su forma.'],
  IfcFlowTerminal: ['6.2.3.22', 'Componente fijo donde comienza o termina un sistema de distribuci�n y se conecta con el entorno, como una salida de aire o un lavamanos.'],
  IfcElementAssembly: ['5.4.3.19', 'Conjunto complejo formado por varios elementos relacionados como partes de una unidad, por ejemplo una cercha, un p�rtico o un conjunto prefabricado.'],
  IfcFooting: ['7.11.3.5', 'Componente de cimentaci�n superficial que reparte las cargas de la estructura y las transmite al terreno pr�ximo a la superficie.'],
  IfcFurnishingElement: ['5.4.3.31', 'Categor�a general de objetos de mobiliario, fabricados previamente o en obra. Incluye elementos m�viles y elementos fijos integrados.'],
  IfcOpeningElement: ['5.4.3.40', 'Vac�o, hueco o rebaje en un elemento f�sico. Puede atravesar todo su espesor o formar una cavidad parcial, como un nicho.'],
};
export const definitions = Object.freeze(Object.fromEntries(Object.entries(entries).map(([type,[clause,text]])=>[type,Object.freeze({text,clause:clause+'.1',standard:'ISO 16739-1:2024',schema:'IFC 4.3.2.0',url:'https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/lexical/'+type+'.htm'})])));
export function definitionFor(type) {
  return definitions[type] || {text:type==='GroupedGeometry'?'Geometr�a publicada sin identidades IFC individuales. Esta agrupaci�n de visualizaci�n no es una clase definida por ISO 16739.':'No se dispone de una definici�n verificada para esta clase. Es necesario consultar el esquema IFC del archivo fuente.',standard:'Sin referencia normativa',schema:'',clause:'',url:''};
}
export function fitLines(ctx,text,width,height,{size=18,minSize=16,leading=1.2}={}) {
  for(let fontSize=size;fontSize>=minSize;fontSize--){
    ctx.font=fontSize+'px Arial';const lines=[];let line='';
    for(const word of text.split(/\s+/)){
      if(ctx.measureText(word).width>width)throw new Error('Palabra demasiado larga: '+word);
      const next=line?line+' '+word:word;
      if(ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    const lineHeight=fontSize*leading;
    if(lines.length*lineHeight<=height)return {lines,fontSize,lineHeight};
  }
  throw new Error('La definici�n IFC excede el espacio disponible.');
}
export function drawDefinition(ctx,type){
  const d=definitionFor(type),x=1485,width=209;
  ctx.strokeStyle='#344758';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(1465,173);ctx.lineTo(1465,389);ctx.stroke();
  ctx.fillStyle='#54d4c7';ctx.font='bold 16px Arial';ctx.fillText(d.url?'DEFINICI�N IFC':'CLASIFICACI�N',x,181);
  ctx.fillStyle='#e6eef5';const layout=fitLines(ctx,d.text,width,158);
  layout.lines.forEach((line,i)=>ctx.fillText(line,x,211+i*layout.lineHeight));
  ctx.fillStyle='#aebfcd';ctx.font='13px Arial';ctx.fillText(d.standard,x,377);ctx.font='12px Arial';ctx.fillText(d.schema+(d.clause?' � � '+d.clause:''),x,395);
}
