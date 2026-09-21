// Localizes supplementary interface text without changing source place names or GIS categories.
const phrases = {
  'Integración ferroviaria · Fuente suministrada':'Rail integration · Supplied source',
  'Esquema de seis líneas de Metro y corredores regionales':'Diagram of six Metro lines and regional corridors',
  'Trazados y ubicación de estaciones nuevas referenciales. Códigos no legibles omitidos; no se asignan nombres no documentados.':'New routes and station locations are indicative. Illegible codes are omitted; undocumented names are not assigned.',
  'Bogotá · Integración ferroviaria':'Bogotá · Rail integration',
  'Bogotá · Sector E15–E16':'Bogotá · E15–E16 sector',
  'Metro · red del esquema':'Metro · schematic network',
  'Cifras del documento suministrado. No indican red operativa ni cantidad de marcadores verificados.':'Figures from the supplied document. They do not describe the operating network or the number of verified markers.',
  'Selecciona una línea para ver sus códigos de estación. El esquema no aporta nombres propios para todas las estaciones.':'Select a line to see its station codes. The diagram does not provide names for every station.',
  'Regiotram · corredor occidental':'Regiotram · western corridor',
  'Regiotram · corredor central':'Regiotram · central corridor',
  'Regiotram · ramal aeropuerto':'Regiotram · airport branch',
  'Huellas de construcciones y ejes viales del proyecto QGIS, sin alturas.':'Building footprints and street centerlines from the QGIS project, without heights.',
  'Las estaciones y el trazado usan la misma referencia espacial.':'Stations and route use the same spatial reference.',
  '12 geometrías inválidas de construcción excluidas.':'12 invalid building geometries excluded.',
  'La capa sísmica se transformó de EPSG:3857 a EPSG:6247. Se conserva su extensión completa.':'The seismic layer was transformed from EPSG:3857 to EPSG:6247. Its full extent is retained.',
  'El fondo urbano cubre el sector E15–E16; fuera de ese ámbito no hay cartografía urbana incorporada.':'The urban base covers the E15–E16 sector; no urban mapping is included outside that area.',
  'El archivo de L1 contiene un tramo, no la línea completa.':'The L1 file contains a section, not the entire line.',
  'Huellas sin altura y ejes viales.':'Flat footprints and street centerlines.',
  '45.257 polígonos · 2.103 tramos.':'45,257 polygons · 2,103 street segments.',
  '12 geometrías inválidas excluidas.':'12 invalid geometries excluded.',
  'Polígono de 15 minutos':'15-minute polygon',
  'L1 · tramo disponible: 3,51 km':'L1 · available section: 3.51 km',
  'Fuente: SHP suministrado · IDIGER':'Source: supplied SHP · IDIGER',
  'Fecha del atributo: 25/10/2010':'Attribute date: 25 October 2010',
  'Colores por categoría, no por nivel de riesgo.':'Colors indicate categories, not risk levels.',
  'Respuesta sísmica oculta.':'Seismic response hidden.',
  'Respuesta sísmica':'Seismic response',
  'Datos integrados · EPSG:6247':'Integrated data · EPSG:6247',
  'Contexto urbano interpretativo, no georreferenciado':'Interpretive urban context, not georeferenced',
  'Tren simulado · 6 coches':'Simulated train · 6 cars',
  'Red futura referencial':'Indicative future network',
  'Datos geográficos':'Geographic data',
  'Cargando cartografía adicional…':'Loading additional cartography…',
  'No se pudo cargar la cartografía. La simulación sigue disponible.':'Cartography could not be loaded. The simulation remains available.',
  'Referencia visual:':'Visual reference:',
  'Cambiar idioma':'Switch language',
  'Mostrar / ocultar paneles':'Show / hide panels',
  'Rotación automática':'Automatic rotation',
  'Pantalla completa':'Fullscreen',
  'Escena 3D interactiva':'Interactive 3D scene',
  'Navegación principal':'Main navigation',
  'Leyenda cartográfica':'Map legend',
  'Tiempo de simulación':'Simulation time',
  'Gráfico de barras':'Bar chart',
  'Serie temporal':'Time series',
  'Vista inicial':'Initial view',
  'Tren Regional':'Regional rail',
  'Tren regional':'Regional rail',
  'Extensión':'Length',
  'Estaciones':'Stations',
  'Línea ':'Line ',
  'líneas':'lines',
  'Sector E15–E16':'E15–E16 sector',
  'km de L1 disponibles':'km of L1 available',
  'Acercar':'Zoom in',
  'Alejar':'Zoom out',
  'Ayuda':'Help',
  'Cerrar':'Close'
};
const entries = Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length);
const sourceText = new WeakMap();
const sourceAttrs = new WeakMap();
let language = 'es';
const translated = value => entries.reduce((text,[es,en])=>text.split(es).join(en),value);
function apply() {
  observer.disconnect();
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest('script,style')) continue;
    let saved = sourceText.get(node);
    if (!saved || node.nodeValue !== saved.display) saved = {source:node.nodeValue};
    saved.display = language === 'en' ? translated(saved.source) : saved.source;
    if (node.nodeValue !== saved.display) node.nodeValue = saved.display;
    sourceText.set(node,saved);
  }
  document.querySelectorAll('[title],[aria-label],[alt]').forEach(el=>{
    const saved = sourceAttrs.get(el) || {};
    for (const attr of ['title','aria-label','alt']) {
      if (!el.hasAttribute(attr)) continue;
      const value = el.getAttribute(attr);
      if (!saved[attr] || value !== saved[attr].display) saved[attr] = {source:value};
      saved[attr].display = language === 'en' ? translated(saved[attr].source) : saved[attr].source;
      if(value !== saved[attr].display) el.setAttribute(attr,saved[attr].display);
    }
    sourceAttrs.set(el,saved);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
const observer = new MutationObserver(apply);
export function localizeInterface(lang) {language=lang;apply();}

