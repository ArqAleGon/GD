const IFC_ELEMENT_LABELS={
  IfcWall:'Muro',IfcWallStandardCase:'Muro',IfcSlab:'Losa / piso',IfcWindow:'Ventana',IfcDoor:'Puerta',IfcColumn:'Columna',IfcBeam:'Viga',IfcMember:'Elemento estructural',IfcPlate:'Placa',IfcRoof:'Cubierta',IfcCovering:'Revestimiento',IfcCurtainWall:'Muro cortina',IfcRailing:'Baranda',IfcStair:'Escalera',IfcStairFlight:'Tramo de escalera',IfcFlowTerminal:'Luminaria / terminal',IfcFlowSegment:'Segmento de instalación',IfcElementAssembly:'Conjunto',IfcBuildingElementProxy:'Elemento arquitectónico'
};

const clean=value=>String(value??'').trim();

export function ifcElementLabel(ifcType){
  const type=clean(ifcType);
  return IFC_ELEMENT_LABELS[type]||type.replace(/^Ifc/,'')||'Elemento IFC';
}

export function createIfcProgressObject({sectionName,definition,ifcType,ifcId,elementName,index,vertexCount}){
  const section=clean(sectionName)||'Sin sección',source=clean(definition?.source)||clean(definition?.file)||'Fuente IFC no identificada';
  const type=clean(ifcType)||'IfcBuildingElementProxy',identifier=clean(ifcId)||clean(elementName)||`Elemento ${String(index||0).padStart(4,'0')}`;
  const label=ifcElementLabel(type);
  return {
    id:`ifc-element:${section}:${source}:${identifier}:${index||0}`,
    title:`${label} · ${identifier}`,
    kind:'Elemento IFC',
    section,
    parameters:{'Tipo de elemento':label,'Clase IFC':type,'Identificador IFC':identifier,'Modelo BIM':section,'Archivo IFC fuente':source,'Malla convertida':clean(definition?.file)||'No identificada','Vértices':Number(vertexCount)||0}
  };
}

