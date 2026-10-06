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

## Procedimiento para próximas estaciones

Cada estación debe completar BIM y Gestión antes de publicarse: modelo real, niveles nativos, separación, alarmas, cámaras 360 de posición fija, spots y recorrido interior. La agrupación del render conserva las instancias IFC originales para consulta y registro individual.

E03–E14 pendientes de conversión y publicación individual. En E09/E10 falta 1150; en E11/E12 faltan 1150 y 1200 en la carpeta de origen revisada. Los archivos con códigos distintos de 0000, 1150 y 1200 están fuera del alcance solicitado.
