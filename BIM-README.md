# Avance BIM y contexto de Bogotá

El tablero `bim.html` utiliza las propiedades reales de UE de los IFC originales. Los porcentajes y fechas de avance siguen siendo datos ilustrativos; no existe conexión en vivo con Power BI.

## Unidades de ejecución

`bim-ue-elements.json` registra 29 grupos de geometría provenientes de ocho modelos. Las asignaciones se extrajeron de `Execution_unit-Unidad_de_ejecucion` y se vincularon por GlobalId con la geometría original antes de comprimirla. Un modelo puede contener varias UE y una UE puede aparecer en varios modelos. Los grupos admiten listas de pertenencia. Los identificadores numéricos se normalizan: 093 y 93 se presentan como UE 93; el manifiesto conserva los valores originales. Vacíos y N/A aparecen como Sin asignar.

Ejemplos verificados: UE 202 reúne 339 elementos de E15 e I16; UE 93 reúne 160 elementos en tres modelos de I16 y E16. El filtro afecta geometría, tabla, conteos y promedios, combinado con sector, disciplina y estado. Para consultar una UE transversal se debe seleccionar Todos los sectores. Restablecer limpia todos los filtros.

La selección opera por grupo UE–modelo. Las geometrías web están simplificadas; los conteos corresponden a los elementos convertidos de origen. Los elementos que no se pudieron convertir en la preparación original no forman parte de estos conteos. `bim-ue.json` es un archivo anterior sin uso por el tablero actual.

## Avance ilustrativo

Las fechas y avances de `bim-state.js` se heredan por modelo. Cambiar la fecha de corte recalcula solo lo planificado. Los promedios son simples por grupo UE–modelo, no avance ponderado contractual.

- Terminado: verde #44c58a (100%).
- Atrasado: rojo #ef6464 (ejecutado menor que planificado).
- Iniciado: amarillo #f2c94c (avance positivo sin atraso).
- No iniciado y sin atraso: transparente (opacidad 0.12).

Terminado tiene prioridad sobre atraso. Material original restaura los materiales cargados.

## Contexto urbano

`bogota-context.js` construye la primera escena con la traza ferroviaria esquemática existente, corredores Caracas y NQS, calles 26, 45, 63 y 72, cerros orientales y referencias urbanas. Torre Atrio, El Campín, Universidad Nacional e Iglesia de Lourdes son representaciones volumétricas esquemáticas, no levantamientos arquitectónicos ni posiciones GIS de precisión. Cada hito abre su descripción y fuente. La vista GIS mantiene su cartografía independiente.

Fuentes de referencia: [Atrio](https://www.arpro.com.co/proyectos/en-venta/atrio-torre-norte), [El Campín](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?dt=S&i=81382), [Universidad Nacional](https://derecho.bogota.unal.edu.co/fileadmin/user_upload/Ciudad_Universitaria_.pdf), [Lourdes](https://www.idartes.gov.co/es/programas/arte-a-la-KY/Chapinero).

## Verificación

`node bim-state.test.mjs` comprueba estados, filtros combinados, pertenencia múltiple, UE compartidas y normalización. La extracción se contrastó por elemento con IfcOpenShell en E15 EST, I16 EST 1100 y E16 EST 1150. El manifiesto y los archivos de geometría se verifican con `node bim-assets.test.mjs`.
