# Integración de estaciones BIM

## E01

Se integraron exclusivamente arquitectura 0000 y estructuras 1150/1200: 58.266, 88 y 7.713 instancias IFC respectivamente. Total: 66.067 identificadores únicos, 154 partes GLB comprimidas (~84 MB). La repetición de primitivas/materiales conserva la identidad de su instancia.

Los modelos mantienen transformaciones originales, EPSG:6247 y elevación de referencia IFC de 2.550 m. La posición horizontal concuerda con la nave central del plano CAD E01 en menos de 0,51 m. Los materiales originales se conservan.

106 instancias solo tienen representación Axis en sus archivos fuente: un muro y 105 vigas. Se preservaron sus ejes, sin fabricar cuerpos sólidos. En 37 vigas los ejes del IFC están fuera del edificio (alrededor de 12 km): se conservan en los archivos convertidos y en el reporte, pero se excluyen de renderizado, selección espacial y encuadre; la consulta general informa esta incidencia. No se corrigieron mediante traslaciones supuestas. Los demás elementos representados fueron recuperados.

Se verificaron los GLB comprimidos, índices, coordenadas finitas, identificación por GlobalId + archivo fuente y conteos. En la prueba visual se validaron la etiqueta, consulta del modelo, vista aislada sin contexto, consulta individual de una losa, registro reservado al elemento y Volver. La geometría se agrupa por material para dibujar; las instancias originales siguen siendo objetivos independientes de selección y registro.

Gestión de E01 usa el mismo IFC, sin contexto urbano ni aerofotografía. Sus cotas nativas definen accesos/cimentación, vestíbulo, andén y cubierta. Se comprobaron separación, alarma, cámaras con spots y recorrido interior con joysticks.

## E02

Se integraron exclusivamente arquitectura 0000 (78.209 instancias) y estructuras 1150 (88) y 1200 (8.020): 86.317 identificadores únicos en 156 partes GLB comprimidas. Se verificaron archivos, índices, coordenadas e identidad por archivo fuente + GlobalId; no quedaron instancias representadas pendientes de conversión.

Los tres archivos usan coordenadas absolutas compartidas y una única referencia de visualización de 2.552,28 m, tomada del sitio de arquitectura. Las referencias de sitio de los archivos estructurales son diferentes y no se restan por separado. El centro del conjunto está a 2,42 m de las huellas CAD; la envolvente incluye la nave y sus accesos asimétricos.

Una viga solo contiene un eje situado fuera del edificio en el IFC original. Se conserva en la conversión y el reporte, pero se excluye de renderizado, selección espacial y encuadre. No se trasladó ni se fabricó un sólido.

Gestión de E02 incorpora accesos/cimentación, vestíbulo, andén, cubierta inferior y cubierta a partir de sus IfcBuildingStorey. Se verificaron separación, alarma, CAM con spots espaciales y recorrido interior con joysticks. E15 conserva sus controles anteriores.

## E03

Se integraron únicamente arquitectura 0000 (85.111 instancias), estructura 1150 (66) y estructura 1200 (3.605): 88.782 identificadores únicos en 176 partes GLB comprimidas (72,76 MB). No quedan instancias representadas pendientes. Los índices, coordenadas finitas y las identidades por fuente + GlobalId se verificaron en todos los archivos.

El cuerpo del muro IFC 3022632, GlobalId `03N8P$SCT3Txk367jg6n_J`, queda completamente eliminado por sus dos vacíos nativos. Se verificó con las entidades originales y se conservó su representación Axis, su ubicación y su identidad; no se fabricó un cuerpo sólido. No hay ejes fuera de la envolvente del edificio.

Las tres disciplinas comparten el datum de arquitectura de 2.550 m. El centro del conjunto queda dentro de las huellas CAD y a 3,52 m del centro de la nave. Gestión usa las cotas nativas de acceso 2.547,75 m, vestíbulo/intermedio 2.555,35 m, TOR 2.562,95 m, plataforma 2.564,09 m y cubiertas. El tren usa el eje de la nave CAD y el TOR nativo; se excluyen señales y barandas al buscar geometría de riel.

Se comprobaron consulta general, selección de una losa individual, formulario de registro reservado a esa instancia, vista aislada y Volver.

Gestión de E03 se verificó con el modelo real sin contexto, niveles y separación, andén, alarma, cámara interior CAM-01, cuatro spots espaciales y recorrido interior con joysticks. La cámara se ubicó sobre el piso real del andén.

## Procedimiento para próximas estaciones

Cada estación debe completar BIM y Gestión antes de publicarse: modelo real, niveles nativos, separación, alarmas, cámaras 360 de posición fija, spots y recorrido interior. La agrupación del render conserva las instancias IFC originales para consulta y registro individual.

E04–E14 pendientes de conversión y publicación individual. En E09/E10 falta 1150; en E11/E12 faltan 1150 y 1200 en la carpeta de origen revisada. Los archivos con códigos distintos de 0000, 1150 y 1200 están fuera del alcance solicitado.
