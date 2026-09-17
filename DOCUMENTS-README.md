# Visor documental

`documents.html` muestra el catálogo público de `documents.json`. Se accede desde la cabecera del mockup y de Avance BIM. La selección de un grupo BIM ofrece un enlace filtrado por sector. No se infieren UE documentales: la carpeta no proporciona una relación verificada entre documentos y unidades de ejecución.

## Contenido publicado

- PDF original: lector PDF.js con 14 páginas, navegación y zoom.
- XLSX original: selector de las hojas Lista Chequeo y Bitácora, tabla paginada de valores guardados y descarga. Las fórmulas no se recalculan; el formato completo y los gráficos se consultan en Excel.
- Dos PNG originales.
- Video completo: derivado H.264 a 1280 × 720 y 30 fps, compatible con navegadores. Duración 123,2 segundos; el original HEVC de aproximadamente 1 GB no se publica. La descarga corresponde a la versión web.
- PBIX: entrada de catálogo y enlace al informe de Power BI suministrado. El PBIX original no se publica ni se interpreta en el navegador. Power BI puede exigir permisos independientes.

La carpeta fue autorizada por el usuario para publicación pública. Es una instantánea, no una conexión en vivo al disco D: ni a OneDrive. Los cambios de la carpeta deben incorporarse al catálogo y volver a publicarse. Para futura sincronización en vivo se necesita una fuente web, por ejemplo SharePoint/OneDrive con sus permisos y API.

## Otros formatos

Abrir archivo local admite PDF, DOCX, XLS, XLSX, CSV, JPG/JPEG, PNG, WebP, GIF, MP4, WebM, MP3, WAV, M4A y OGG. Estos archivos no se suben ni se incorporan al catálogo. La reproducción multimedia depende de los códecs compatibles con el navegador. No había DOCX, XLS ni audio en la carpeta suministrada; DOCX y XLS se comprobaron con archivos sintéticos locales.

Word usa Mammoth para una vista de lectura. Se eliminan etiquetas/atributos ajenos a una lista permitida; la salida se representa en un iframe sin permisos de scripts ni red. Excel se representa mediante textContent. Ningún documento se interpreta como instrucciones del sitio.

## Bibliotecas

- SheetJS CE 0.20.3, distribución standalone, Apache 2.0. [Documentación oficial](https://docs.sheetjs.com/docs/getting-started/installation/standalone/). Archivo servido localmente; obtenido del paquete espejo @e965/xlsx 0.20.3.
- Mammoth 1.9.1, BSD 2-Clause. [Repositorio oficial](https://github.com/mwilliamson/mammoth.js).
- PDF.js 4.10.38, Apache 2.0. [Repositorio oficial](https://github.com/mozilla/pdf.js).

Las licencias se conservan en vendor/. Las bibliotecas se sirven desde el mismo sitio; los documentos de Word/Excel no se envían a un servicio externo de conversión.

## Verificación

Se comprobó en navegador: lectura y cambio de hojas del XLSX real, páginas 1/2 del PDF, carga y reproducción del video completo, imágenes, enlace Power BI, lectura DOCX y XLS mediante archivos sintéticos, filtros y presentación adaptable. Los originales de la carpeta permanecen sin modificar.
