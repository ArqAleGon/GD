# Lectura IFC original y correspondencia

El botón «Abrir IFC original» lee archivos locales en el navegador, mediante un worker. No sube el archivo a un servidor ni requiere convertirlo previamente a GLB. La representación en pantalla se tesela a triángulos en memoria. Los modelos grandes dependen de la memoria disponible; los mensajes del lector se conservan como avisos y no equivalen a una validación geométrica.

Las relaciones IfcRelAggregates e IfcRelNests permiten representar un conjunto por sus componentes. Los elementos mantienen su identidad por ubicación, fuente y GlobalId. Aislar el conjunto no duplica las mallas físicas ni modifica el IFC.

ObjectType se cruza con IfcEntity mediante reglas explícitas de denominación y códigos de familia del proyecto. Resultado: compatible, revisar o no evaluable. No es una comprobación de forma, volumen o correspondencia espacial. Los huecos IfcOpeningElement son volúmenes de sustracción y se ocultan inicialmente.

El modo publicado carga metadatos complementarios extraídos de los originales del catálogo: ObjectType, niveles nativos y descomposición. El SHA-256 y el esquema de cada fuente se incluyen en cada paquete. La recuperación de jerarquía no añade los tipos que el conversor excluyó; para inventario completo se debe abrir el IFC original.

## Componente de terceros

Se distribuyen sin modificación `web-ifc-api.js`, `web-ifc.wasm` y `LICENSE.md` del paquete npm `web-ifc@0.0.78`, verificado contra la integridad SHA-512 del registro npm. Licencia: Mozilla Public License 2.0 (consultar el archivo de licencia del paquete).

Código fuente y compilación: https://github.com/ThatOpen/engine_web-ifc/tree/0.0.78

Paquete original: https://registry.npmjs.org/web-ifc/-/web-ifc-0.0.78.tgz

Documentación del lector: https://thatopen.github.io/engine_web-ifc/docs/classes/web-ifc.IfcAPI.html

Definición de ObjectType: https://buildingsmart.or.kr/newsfile/ifc4_3/HTML/lexical/IfcObject.htm

Las definiciones de cada hoja son síntesis editoriales en español de buildingSMART IFC 4.3.2.0 / ISO 16739-1:2024, no traducciones oficiales. El esquema del archivo leído se conserva independientemente de esa referencia.
