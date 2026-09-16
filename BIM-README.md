# Avance BIM

Access `bim.html` or the **Avance BIM** link in the mockup header.

The interface follows the supplied dashboard video: filters, planned/actual comparison, 3D viewer and linked model table. It uses the existing dark blue visual language and existing GLB assets. There is no live Power BI connection.

## Data and granularity

Model files, disciplines, source IFC names, revisions and converted counts come from `ifc-placement-20260915-i16-e16.json`. Most GLB files consolidate IFC objects. Selection, filters and status coloring therefore operate on eight model packages, not individual IFC elements. Level, quadrant and element-type filters require a future property/GlobalId mapping; they are not simulated as real properties.

The schedule and completion percentages in `bim-state.js` are explicitly illustrative. Actual percentages are fixed sample values; changing the cutoff recalculates planned percentages only. Summary percentages are unweighted package averages, not measured project completion. No private Power BI data or reference video is included.

## Status rules

- 100% actual: green `#44c58a`, Terminado.
- Actual less than planned at cutoff: red `#ef6464`, Atrasado.
- Actual above zero and not delayed: yellow `#f2c94c`, Iniciado.
- Zero actual and zero planned: translucent, No iniciado y sin atraso (opacity 0.12, depthWrite false).

Completed status takes priority, followed by delay. Selection outlines do not overwrite the status colors. The original-material mode restores the loaded GLB materials. Flat shading is enabled for status materials because compressed models may omit normals.

## Checks

Run `node bim-state.test.mjs` for schedule boundaries, status priority and combined filtering. Serve the repository over HTTP for browser checks. Tested local model loading, sector/discipline filtering, table selection, isolation, original materials, plan view, empty search/reset, and mobile width 390px. Browser error log was empty during these checks.

## Execution units (UE)

`bim-ue.json` maps each model filename to its verified UE string. Unknown values are null and shown as Sin asignar. The UE selector filters KPI counts, averages, model visibility and table rows together, and UE is shown in table/detail. Reset clears UE. No UE assignment is inferred from station names or from the video. The current mapping awaits official project data. If one package spans multiple UEs, geometry must be split or linked at element level before precise UE isolation is possible; do not assign the whole package to an arbitrary UE.
