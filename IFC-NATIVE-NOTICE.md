# Lectura IFC original y correspondencia

El botón «Abrir IFC original» lee archivos locales en el navegador, mediante un worker. No sube el archivo a un servidor ni requiere convertirlo previamente a GLB. La representación en pantalla se tesela a triángulos en memoria. Los modelos grandes dependen de la memoria disponible; los mensajes del lector se conservan como avisos y no equivalen a una validación geométrica.

Las relaciones IfcRelAggregates e IfcRelNests permiten representar un conjunto por sus componentes. Los elementos mantienen su identidad por ubicación, fuente y GlobalId. Aislar el conjunto no duplica las mallas físicas ni modifica el IFC.

ObjectType se cruza con IfcEntity mediante reglas explícitas de denominación y códigos de familia del proyecto. Resultado: compatible, revisar o no evaluable. No es una comprobación de forma, volumen o correspondencia espacial. Los huecos IfcOpeningElement son volúmenes de sustracción y se ocultan inicialmente.

El visor de control utiliza exclusivamente los IFC originales abiertos por el usuario. Inicia sin modelos; cada apertura sustituye la selección anterior y cambiar de ubicación limpia la vista. El catálogo contiene solo códigos y nombres de ubicaciones. No se cargan geometrías WebGLB ni sus metadatos de conversión. Los derivados que utilizan otros módulos del mockup se conservan.

## Informe y vistas

Las páginas con observación no vacía se incluyen automáticamente en el informe y no pueden desmarcarse mientras mantengan esa observación. El nombre de salida es `L1T1-0000-NúmeroEdificio-EMB-BIM-NúmeroInforme-IN.pdf`; por ejemplo, `L1T1-0000-102-EMB-BIM-0001-IN.pdf`.

«Vista para informe» conserva una captura de la vista actual para la página IFC seleccionada en el panel de observaciones (o aislada mediante «Solo»). Incluye encuadre, zoom, colores y filtros visibles; se ajusta al espacio del PDF sin recortarla ni deformarla. Los conteos del dashboard siguen correspondiendo al alcance completo de la página. Cada tipología y alcance de archivos tiene su captura independiente durante la carga actual de modelos; al recargar los modelos se descartan las capturas. «Usar vista automática» restaura el encuadre isométrico de esa página.

El resto de elementos físicos del archivo fuente activo se muestra como contexto transparente, sin incluirlo en los conteos, la tabla, el CSV o los indicadores del filtro. Los huecos no seleccionados siguen ocultos. Los filtros no reencuadran la cámara; los controles de vista permiten hacerlo explícitamente. «Vaciar modelos IFC» cancela la carga en curso y limpia la escena conservando la ubicación y los borradores de observaciones.

«Anotar vista» abre herramientas para líneas, flechas y cuadros de texto, con color, deshacer y borrar. Las marcas se incorporan a la captura con «Vista para informe». Son anotaciones 2D: mover la cámara, redimensionar la vista o cambiar el filtro limpia las marcas de trabajo; las capturas guardadas permanecen intactas. El PDF comienza con una portada Modo Metro, equipo BIM-OTI-EMB e identificación del informe. Se usan los archivos Gotham del proyecto para la interfaz y el PDF: Thin, ExtraLight, Light, Book, Medium, Bold, Black, Ultra y cursivas disponibles. La generación espera la carga de fuentes.

## Componente de terceros

Se distribuyen sin modificación `web-ifc-api.js`, `web-ifc.wasm` y `LICENSE.md` del paquete npm `web-ifc@0.0.78`, verificado contra la integridad SHA-512 del registro npm. Licencia: Mozilla Public License 2.0 (consultar el archivo de licencia del paquete).

Código fuente y compilación: https://github.com/ThatOpen/engine_web-ifc/tree/0.0.78

Paquete original: https://registry.npmjs.org/web-ifc/-/web-ifc-0.0.78.tgz

Documentación del lector: https://thatopen.github.io/engine_web-ifc/docs/classes/web-ifc.IfcAPI.html

Definición de ObjectType: https://buildingsmart.or.kr/newsfile/ifc4_3/HTML/lexical/IfcObject.htm

Las definiciones de cada hoja son síntesis editoriales en español de buildingSMART IFC 4.3.2.0 / ISO 16739-1:2024, no traducciones oficiales. El esquema del archivo leído se conserva independientemente de esa referencia.
