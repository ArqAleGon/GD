# Huellas de implantación CAD
Se integran 40 contornos georreferenciados de 14 estaciones. La nave central y cada edificio de acceso son geometrías independientes, con el mismo color y opacidad de la capa predial.

Fuente: E1.dwg a E16.dwg de la carpeta Huella suministrada. Coordenadas de la retícula del CAD transformadas desde MAGNA Bogotá EPSG:6247 a WGS84. Se conserva la escala medida en la retícula, incluidas rotaciones internas, y se simplifica el exterior con tolerancia de 3 cm. No se incorporan contexto urbano ni viaductos.

## Cobertura
| Estación | Contornos |
|---|---|
| E01 | Nave central |
| E02 | Nave central, ascendente 01 y ascendente 02 |
| E03, E04, E05, E07, E10, E11, E16 | Nave central, ascendente y descendente |
| E06, E08 | Nave central |
| E09 | Nave central y cuatro polígonos correspondientes a tres bloques de acceso |
| E12, E15 | Nave central y tres edificios de acceso |

## Pendientes de fuente
- E13: falta una cota Norte legible en la retícula extraída. Se mantiene la huella anterior de ESTACIONES.shp.
- E14: falta una cota Este legible en la retícula extraída. Se mantiene la huella anterior de ESTACIONES.shp.
- E01, E06 y E08: no se encontraron bloques arquitectónicos independientes de los edificios ascendente y descendente.
- E02: Ascendente 02 incorporado con el perímetro escalonado del bloque arquitectónico y cierre del borde superior entre sus extremos, bajo la superposición de la nave central, contrastado con la imagen del plano suministrada por el usuario.
- E09: no se encontraron rótulos ascendente/descendente legibles. Sus accesos se identifican por el bloque CAD original.

La información de origen, los bloques, áreas y transformaciones se conserva en predial-station-footprints.json. Los originales DWG no se publican.
