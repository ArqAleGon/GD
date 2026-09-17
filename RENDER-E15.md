# Comparación Render E15

La referencia activa es `assets/render-e15-20260917.png`, copia sin modificaciones del archivo Render_E15.png suministrado por el usuario (1672 × 941).

`render-e15-camera.js` conserva la cámara ajustada a puntos de cubierta de E15. La imagen y la proyección usan el mismo recorte centrado al cambiar la proporción de pantalla. La cámara permanece fija durante la comparación para evitar deriva por órbita, rotación automática o movimiento de teclado. Al cerrar se recuperan la navegación y las capas cartográficas.

La alineación es visual y aproximada: hay diferencias entre el render y el IFC en fachadas, ancho de cubierta, contexto urbano y elementos representados. No se deformó la geometría ni se alteró la imagen para ocultarlas. Para una coincidencia exacta debe generarse el render desde esta misma versión del IFC y conservar su cámara.

Verificación: `node render-e15-camera.test.mjs` comprueba el recorte imagen/proyección en proporciones horizontal, panorámica, vertical y cuadrada. Se comprobaron en navegador los extremos 0/100 %, la superposición 50 %, el cambio de tamaño y el cierre.

## Estado de obra

`assets/e15-obra-20260831.png` es una copia sin modificaciones de E15-2_08_2026.png. La etiqueta «Estado de la obra al 31 de agosto de 2026» corresponde a la fecha indicada por el usuario.

El selector permite IFC ↔ render, render ↔ estado real e IFC ↔ estado real. Los botones de los extremos muestran una fuente al 100%; el deslizador mezcla las fuentes del par seleccionado. El porcentaje indica la mezcla visual, no el porcentaje de ejecución. La fotografía no modifica los indicadores de avance simulados del tablero BIM.

Las imágenes mantienen su relación de aspecto y un recorte centrado. Son referencias visuales, con diferencias de perspectiva y geometría; no se deformaron para forzar una coincidencia. El modo render/estado real mantiene el render como base opaca; IFC/estado real elimina por completo la capa del render.

`node e15-comparison.test.mjs` verifica las tres parejas al 0, 50 y 100%, y los límites de opacidad. Se verificaron ambos extremos en navegador, la etiqueta de fecha, la presentación a 390px y el cierre de las capas.
