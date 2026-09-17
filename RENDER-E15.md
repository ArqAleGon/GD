# Comparación Render E15

La referencia activa es `assets/render-e15-20260917.png`, copia sin modificaciones del archivo Render_E15.png suministrado por el usuario (1672 × 941).

`render-e15-camera.js` conserva la cámara ajustada a puntos de cubierta de E15. La imagen y la proyección usan el mismo recorte centrado al cambiar la proporción de pantalla. La cámara permanece fija durante la comparación para evitar deriva por órbita, rotación automática o movimiento de teclado. Al cerrar se recuperan la navegación y las capas cartográficas.

La alineación es visual y aproximada: hay diferencias entre el render y el IFC en fachadas, ancho de cubierta, contexto urbano y elementos representados. No se deformó la geometría ni se alteró la imagen para ocultarlas. Para una coincidencia exacta debe generarse el render desde esta misma versión del IFC y conservar su cámara.

Verificación: `node render-e15-camera.test.mjs` comprueba el recorte imagen/proyección en proporciones horizontal, panorámica, vertical y cuadrada. Se comprobaron en navegador los extremos 0/100 %, la superposición 50 %, el cambio de tamaño y el cierre.
