# Metro Digital scene conventions

All scenes must retain the same top header as Inicio: Inicio, BIM (Modelos, Avance), Documental (Predial, Documentos), language, Referencia, Ayuda, fullscreen.

Use the shared scene-header.js and scene-header.css through scene-controls.js. Do not implement an independent menu for a new scene. Keep a body data-scene identifier, a top-level header with the Metro Digital brand and a navigation container, and load scene-controls.js. Add scene-specific active navigation and help to scene-header.js when needed.

Keep Metro Digital in Gotham HTF Regular using metro-brand.css. Preserve existing embedded-document header visibility and persistent fullscreen behavior. When changing shared scripts, update scene-controls.js versions in every scene and the scene-shell.js versions in page wrappers to avoid stale assets.

## BIM model interaction

For every existing or newly added 3D building model, clicking its name label must open the shared object consultation dialog directly via bimmodelaction. Load its IFC section first so parameters, source files, element count, dimensions and registration history belong to that building. Every IFC model section provides Vista aislada in its general dialog. Registrar avance is reserved for a selected element inside the isolated model. Isolation hides the surrounding models. Labels contain only the name, with no inline Registrar button. Reuse createSectionLabel, the shared consultation/registration dialog and isolateSection for future models; never restrict these actions to a hard-coded station whitelist.

BIM/Modelos and individual model viewers must stop orbiting and panning immediately when pointer input ends. Disable OrbitControls damping for these views; retain explicit camera navigation and user-enabled automatic rotation. Verify a new model has one external registration action and no residual orbit motion.

In every isolated BIM model view, hide Spot · Render E15, Respuesta sísmica, Volúmenes de edificaciones, Vista inicial and Restablecer entorno from the toolbar. Apply this shared rule to all existing and future model sections.

Dashboards start hidden in every scene and model viewer; show them only via Mostrar dashboards. BIM entry keeps the full-scene framing and never automatically fits the depot. Isolated model toolbars provide Volver, restoring the exact latest pre-isolation camera position, target, field of view and prior model focus. Registrar and Registrar avance are allowed only for a selected IFC element inside the isolated model, never on general building or model-label menus. Apply these rules to every future model.

## IFC instance identity

Consultation and progress registration operate on an individual IFC element instance inside a building: wall, railing, floor/slab, column, beam, etc. Use the selected instance's persistent IFC GlobalId or stable element ID together with its model/source identity. Do not use the whole building, model section, IFC type, or all geometrically similar objects as the registration target. Each instance has its own parameters, progress and history; selecting another instance must not reuse the previous target. A building-label dialog is model metadata and navigation only, never an element progress record. Apply this rule to every existing and future model.

## Train assets

Inicio and Seguimiento del tren share metro-train-model.js and assets/models/metro-train.glb.gz, converted from the supplied Tren.obj/Tren.mtl with embedded Metro logos. Preserve the red, white/gray, charcoal and yellow livery, per-car picking, existing routes and camera-follow controls, pause/play and sliding door animation. Share template geometries across clones and never dispose them when switching scenes. Future train replacements must retain these behaviors.

## Station and train tracking

Tracking scenes must remove both WebGL urban context and CSS3D aerial imagery on entry. E15 and E16 use their real IFC sections via model-only loading; do not substitute the generic procedural station for an available model. Preserve individual element identity. Initial/top/front/side camera actions disable active train following so the animation cannot overwrite the chosen framing. Inicio uses one leading train car scaled uniformly to four times its prior size (+300%); tracking keeps the six-car train.

Station model-only views retain level filtering, separated floors, alarms and four camera views. Use station-model-controls.js to operate on the actual IFC geometry and measured elevations; preserve element IDs across level display copies. These controls must remain available when replacing station models. The train asset cab faces local -X: align that front with route velocity, including reverse-direction services and tracking motion.

Station CAM views use a fixed optical center: drag rotates the viewing direction through 360 degrees and wheel adjusts FOV; never orbit, pan or translate the camera. Keep spatial spots fixed while updating direction, respect level offsets and provide reset/Ubicar cámara. Recorrido interior starts at that camera pose and enables the shared BIM POV movement/look joysticks and height controls. Apply this to future station viewers.

## Native aerial photography
Use the public Mapas Bogotá proxy (https://catalogopmb.catastrobogota.gov.co/PMBWeb/proxy.jsp?) for IDECA/UAECD orthourbana2025funcion WMS requests: the direct serviciosgis host times out while the official proxy is operational. Keep progressive detail at native 5 cm when zoomed in and retain local overview imagery for fallback. Distinguish native source GSD from the actual requested/displayed cm per pixel; never claim 2 m overview tiles are native 5 cm. Preserve CC BY 4.0 attribution and exclude aerial context from isolated station/train views.
