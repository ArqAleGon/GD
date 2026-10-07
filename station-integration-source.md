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

## E04

Se integraron exclusivamente 0000 (90.726 instancias), 1150 (66) y 1200 (4.061): 94.853 instancias en 154 partes comprimidas. No quedan instancias representadas pendientes ni ejes fuera del edificio. Se verificaron GLB, índices, coordenadas e identidad por fuente + GlobalId.

Las disciplinas comparten datum de 2.550 m. El centro del conjunto está dentro de las huellas CAD, a 1,25 m del centro de la nave. Gestión toma las cotas IFC de acceso 2.555 m, vestíbulo/intermedio 2.561,60 m, TOR 2.569,20 m, andén 2.570,34 m y cubiertas nativas. El tren usa el eje de la nave CAD y el TOR.

Se verificaron consulta del modelo, selección y consulta individual de un muro, registro reservado al elemento y Volver. En Gestión se probaron separación, nivel de andén, alarma, cámara fija sobre el piso real, cuatro spots y recorrido interior con joysticks.

## E05

Se integraron 0000 (93.640 instancias), 1150 (66) y 1200 (4.325): 98.031 instancias en 161 partes. Los archivos, índices, coordenadas e identidad por fuente + GlobalId pasaron validación; no quedan instancias representadas pendientes ni ejes fuera del edificio.

El muro 4175924, GlobalId `3CYIH4IO1B2hVlBDo4GIs$`, tiene el Body vacío después de sus cortes nativos. Se preservó su Axis original, sin restaurar un sólido eliminado por el IFC. El centro del conjunto queda dentro de las huellas CAD y a 2,05 m del centro de la nave.

Las disciplinas comparten datum de 2.550 m. Gestión usa niveles nativos, con acceso 2.554,55 m, vestíbulo/intermedio 2.561,15 m, TOR 2.568,75 m, plataforma 2.569,89 m y cubiertas. El tren usa la nave CAD y el TOR nativo.

Se verificaron consulta general, selección y consulta individual de una losa, registro exclusivo por elemento y Volver. En Gestión se probaron niveles separados, andén, alarma, cámara fija dentro del modelo, cuatro spots y recorrido interior con joysticks.

## E06

Se integraron únicamente 0000 (49.168 instancias), 1150 (99) y 1200 (8.349): 57.616 instancias en 112 partes. Se validaron archivos, índices, coordenadas e identidad por fuente + GlobalId; no quedan instancias representadas pendientes ni ejes fuera del edificio.

El datum común de las disciplinas es 2.550,36 m, tomado de arquitectura. El centro del conjunto está dentro de las huellas CAD y a 0,10 m del centro de la nave. Gestión utiliza las cotas nativas de acceso 2.555,50 m, vestíbulo/intermedio 2.563,10 m, TOR 2.571,45 m, andén 2.572,59 m y cubiertas. El tren usa el eje CAD propio y el TOR.

Se verificaron consulta general, selección de un muro cortina individual (GlobalId 1omjeC5Zr10fXjAwHK$ZYw), formulario de registro exclusivo para esa instancia y Volver. Gestión pasó pruebas de separación, andén, alarma, cámara fija sobre el piso nativo, cuatro spots y recorrido interior con joysticks. El encuadre compartido usa las ocho esquinas de la envolvente y el campo de visión para evitar recortes, incluida la separación de niveles.

## E07

Se integraron únicamente 0000 (72.399 instancias), 1150 (66) y 1200 (6.317): 78.782 instancias en 166 partes. Pasaron validación los archivos, índices, coordenadas e identidad por fuente + GlobalId; no quedan instancias representadas pendientes ni ejes fuera del edificio.

El muro 17624123, GlobalId `0CDVmelMH9W8jAOftP2Iko`, tiene Body vacío después de sus cortes nativos; se preservó su Axis original. Las disciplinas comparten datum de 2.550 m. El centro del conjunto está a 4,87 m de las huellas CAD y a 26,47 m del centro de la nave, con accesos asimétricos.

Gestión usa los niveles nativos de acceso, vestíbulo/intermedio 2.564,40 m, TOR 2.572,30 m, andén 2.573,44 m y cubiertas. El tren usa el eje CAD propio y el TOR.

Se verificaron consulta general, losa individual GlobalId `130pGJbR1A78zGjkuITwhY`, registro reservado a esa instancia, aislamiento y Volver. Gestión pasó separación, andén, alarma, cámara fija sobre el piso real, cuatro spots y recorrido interior con joysticks.

## E08

Se integraron únicamente 0000 (46.978 instancias), 1150 (77) y 1200 (8.235): 55.290 instancias en 105 partes. Se verificaron los archivos, índices, coordenadas e identidad por fuente + GlobalId; no quedaron instancias pendientes ni ejes fuera de la envolvente.

El centro queda dentro de las huellas CAD y a 0,03 m del centro de la nave. Las disciplinas comparten datum de arquitectura de 2.550,30 m. Gestión usa las cotas nativas de acceso 2.555,65 m, intermedio 2.563,25 m, TOR 2.571,60 m, andén 2.572,74 m y la única cubierta 2.582,066 m. No se añade un nivel de cubierta inferior inexistente.

Se encontraron dos cuerpos de riel IFC cuya cota superior 2.571,593 m concuerda con el TOR; el tren usa el eje CAD de esta estación y esa altura medida.

Se verificaron consulta general, muro cortina individual GlobalId `3Xu$Dzph5Fw94mJ3JROJys`, registro reservado a esa instancia, aislamiento y Volver. Gestión pasó separación, andén, alarma, cámaras fijas con giro de encuadre, cuatro spots y recorrido interior con joysticks. CAM-01 inicia frente a un volumen interior del modelo; el giro permite inspeccionar el entorno desde la misma posición.

## E14

Se integraron únicamente 0000 (103.845 instancias), 1150 (55) y 1200 (4.531): 108.431 instancias en 214 partes. Se validaron archivos, índices, coordenadas e identidad por fuente + GlobalId; no quedan instancias representadas pendientes ni ejes fuera del edificio. Los demás códigos de la carpeta se excluyeron.

El muro 2683845, GlobalId `2Cs0kuim95iAClkdktzzz2`, conserva su Axis porque los cortes nativos eliminan el Body. El centro del conjunto queda dentro de las huellas CAD y a 2,17 m del centro de la nave.

Las disciplinas usan datum común 2.550 m. Gestión conserva las numerosas cotas de acceso originales y usa intermedio 2.581,03 m, TOR 2.588,63 m, plataforma 2.589,77 m y cubiertas nativas. El tren usa el eje CAD y el TOR de esta estación.

Se verificaron consulta general, losa individual GlobalId `20eiKWweHANBTswzz1DrOw`, registro reservado a la instancia, aislamiento y Volver. Gestión pasó separación, andén, alarma, cámara fija sobre el piso real, cuatro spots y recorrido interior con joysticks.

## Procedimiento para próximas estaciones

Cada estación debe completar BIM y Gestión antes de publicarse: modelo real, niveles nativos, separación, alarmas, cámaras 360 de posición fija, spots y recorrido interior. La agrupación del render conserva las instancias IFC originales para consulta y registro individual.

E09–E13 pendientes de conversión y publicación individual. E13: arquitectura no legible localmente porque el proveedor de archivos de nube no se está ejecutando. En E09/E10 falta 1150; en E11/E12 faltan 1150 y 1200 en la carpeta de origen revisada. Los archivos con códigos distintos de 0000, 1150 y 1200 están fuera del alcance solicitado.


## I11

Dos fuentes estructurales 1100 y 1150: 1100 (1393 instancias), 1150 (3843 instancias). Total 5.236 instancias IFC en 32 partes. Sin omisiones de representaciones nativas. Se verificaron IDs, GlobalIds, clase, nombres, unidades métricas y cada matriz de colocación contra los IFC originales. Ambas fuentes ya usan coordenadas compartidas; no requieren corrección de referencia espacial.

La vista general dispone de una representación contextual derivada de los cuerpos reales; consulta y aislamiento cargan las partes originales. Se conservan filtros por tipología, conteos únicos por fuente, registro individual, Volver y POV. No se incorpora como estación a Gestión de estaciones.

## I12 native integration

Both structural sources (1100 and 1150) converted with original IFC identities, names, classes, metre units and every native element placement verified.
- L1T1-1100-212-CON-ED-EST-MO-0001_VB2.ifc: 1,247 unique instances; 4 compressed geometry parts; zero represented omissions.
- L1T1-1150-212-CON-ED-EST-MO-0001_V00.ifc: 3,431 unique instances; 24 compressed geometry parts; zero represented omissions.
Consolidated count: 4,678 source-qualified IFC instances. Native spatial references audited independently; any recovered reference is applied only as an explicit display transform. Real Body overview appears on BIM entry; detailed original geometry loads on consultation. Shared typology filters, instance-only registration, Volver and POV controls remain available. Interestation is excluded from station management.

## I13 native integration

Both structural sources (1100 and 1150) converted with original IFC identities, names, classes, metre units and every native element placement verified.
- L1T1-1100-213-CON-ED-EST-MO-0001_V01.ifc: 1,466 unique instances; 4 compressed geometry parts; zero represented omissions.
- L1T1-1150-213-CON-ED-EST-MO-0001_V00.ifc: 4,210 unique instances; 33 compressed geometry parts; zero represented omissions.
Consolidated count: 5,676 source-qualified IFC instances. Native spatial references audited independently; any recovered reference is applied only as an explicit display transform. Real Body overview appears on BIM entry; detailed original geometry loads on consultation. Shared typology filters, instance-only registration, Volver and POV controls remain available. Interestation is excluded from station management.

## I14 native integration

Both structural sources (1100 and 1150) converted with original IFC identities, names, classes, metre units and every native element placement verified.
- L1T1-1100-214-CON-ED-EST-MO-0001_V04.ifc: 600 unique instances; 4 compressed geometry parts; zero represented omissions.
- L1T1-1150-214-CON-ED-EST-MO-0001_V01.ifc: 6,884 unique instances; 89 compressed geometry parts; zero represented omissions.
Consolidated count: 7,484 source-qualified IFC instances. Native spatial references audited independently; any recovered reference is applied only as an explicit display transform. Real Body overview appears on BIM entry; detailed original geometry loads on consultation. Shared typology filters, instance-only registration, Volver and POV controls remain available. Interestation is excluded from station management.
