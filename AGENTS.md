# Metro Digital scene conventions

All scenes must retain the same top header as Inicio: Inicio, BIM (Modelos, Avance), Documental (Predial, Documentos), language, Referencia, Ayuda, fullscreen.

Use the shared scene-header.js and scene-header.css through scene-controls.js. Do not implement an independent menu for a new scene. Keep a body data-scene identifier, a top-level header with the Metro Digital brand and a navigation container, and load scene-controls.js. Add scene-specific active navigation and help to scene-header.js when needed.

Keep Metro Digital in Gotham HTF Regular using metro-brand.css. Preserve existing embedded-document header visibility and persistent fullscreen behavior. When changing shared scripts, update scene-controls.js versions in every scene and the scene-shell.js versions in page wrappers to avoid stale assets.
