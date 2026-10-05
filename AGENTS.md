# Metro Digital scene conventions

All scenes must retain the same top header as Inicio: Inicio, BIM (Modelos, Avance), Documental (Predial, Documentos), language, Referencia, Ayuda, fullscreen.

Use the shared scene-header.js and scene-header.css through scene-controls.js. Do not implement an independent menu for a new scene. Keep a body data-scene identifier, a top-level header with the Metro Digital brand and a navigation container, and load scene-controls.js. Add scene-specific active navigation and help to scene-header.js when needed.

Keep Metro Digital in Gotham HTF Regular using metro-brand.css. Preserve existing embedded-document header visibility and persistent fullscreen behavior. When changing shared scripts, update scene-controls.js versions in every scene and the scene-shell.js versions in page wrappers to avoid stale assets.

## BIM model interaction

For every existing or newly added 3D building model, clicking its name label must open the shared object consultation dialog directly via bimmodelaction. Load its IFC section first so parameters, source files, element count, dimensions and registration history belong to that building. Every IFC model section must provide Registrar avance and Vista aislada in the dialog. Isolation hides the surrounding models. Labels contain only the name, with no inline Registrar button. Reuse createSectionLabel, the shared consultation/registration dialog and isolateSection for future models; never restrict these actions to a hard-coded station whitelist.

BIM/Modelos and individual model viewers must stop orbiting and panning immediately when pointer input ends. Disable OrbitControls damping for these views; retain explicit camera navigation and user-enabled automatic rotation. Verify a new model has one external registration action and no residual orbit motion.

In every isolated BIM model view, hide Spot · Render E15, Respuesta sísmica, Volúmenes de edificaciones, Vista inicial and Restablecer entorno from the toolbar. Apply this shared rule to all existing and future model sections.

Dashboards start hidden in every scene and model viewer; show them only via Mostrar dashboards. BIM entry keeps the full-scene framing and never automatically fits the depot. Isolated model toolbars provide Volver, restoring the exact latest pre-isolation camera position, target, field of view and prior model focus. Registrar and Registrar avance are allowed only for a selected IFC element inside the isolated model, never on general building or model-label menus. Apply these rules to every future model.
