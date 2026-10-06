# Integración de estaciones BIM

## E01

Se integraron exclusivamente arquitectura 0000 y estructuras 1150/1200: 58.266, 88 y 7.713 instancias IFC respectivamente. Total: 66.067 identificadores únicos, 154 partes GLB comprimidas (~84 MB). La repetición de primitivas/materiales conserva la identidad de su instancia.

Los modelos mantienen transformaciones originales, EPSG:6247 y elevación de referencia IFC de 2.550 m. La posición horizontal concuerda con la nave central del plano CAD E01 en menos de 0,51 m. Los materiales originales se conservan.

106 instancias solo tienen representación Axis en sus archivos fuente: un muro y 105 vigas. Se preservaron sus ejes, sin fabricar cuerpos sólidos. En 37 vigas los ejes del IFC están fuera del edificio (alrededor de 12 km): se conservan en los archivos convertidos y en el reporte, pero se excluyen de renderizado, selección espacial y encuadre; la consulta general informa esta incidencia. No se corrigieron mediante traslaciones supuestas. Los demás elementos representados fueron recuperados.

Se verificaron los GLB comprimidos, índices, coordenadas finitas, identificación por GlobalId + archivo fuente y conteos. En la prueba visual se validaron la etiqueta, consulta del modelo, vista aislada sin contexto, consulta individual de una losa, registro reservado al elemento y Volver. La geometría se agrupa por material para dibujar; las instancias originales siguen siendo objetivos independientes de selección y registro.

E02–E14 pendientes de conversión y publicación individual. Los archivos con códigos distintos de 0000, 1150 y 1200 están fuera del alcance solicitado.
