import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
const index=read('./index.html'),app=read('./app.js'),register=read('./model-register.html'),registerJs=read('./model-register.js');

for(const page of ['./index.html','./bim.html','./predial.html','./documents.html']){
  const html=read(page);
  assert.match(html,/Modelos BIM/);
  assert.ok(html.indexOf('Modelos BIM')>html.indexOf('Inicio'),`${page} sitúa Modelos BIM después de Inicio`);
}
assert.doesNotMatch(register,/href="\.\/index\.html\?view=urban">Modelos BIM</);
assert.match(app,/class="navchildren" hidden/);
assert.match(app,/bimHeaderLink.*toggleAttribute\('hidden',isUrban\(\)\)/);
assert.match(register,/ID del elemento/);
assert.match(register,/ActivityID/);
assert.match(register,/UE · Unidad de ejecución/);
assert.match(register,/Tipo de elemento/);
assert.match(register,/Level · Nivel/);
assert.match(register,/Avance por actividad/);
assert.match(register,/Avance por nivel/);
assert.match(register,/Avance por tipo de elemento/);
assert.match(register,/Desviación vs Primavera/);
assert.match(register,/Alcance exclusivo del edificio activo/);
assert.match(register,/selectionMarker/);
assert.match(register,/typeFilterSummary/);
assert.match(registerJs,/scopeType==='activity'/);
assert.match(registerJs,/scopeType==='ue'/);
assert.match(registerJs,/element\.section===section/);
assert.match(registerJs,/activitySummaries/);
assert.match(registerJs,/ActivityID Primavera vigente/);
assert.match(registerJs,/weightedElementProgress/);
assert.match(registerJs,/renderTypeFilterSummary/);
assert.match(index,/register-scenes-v1/);
console.log('Header navigation, active-model filters, progress dashboards and registration scopes verified');
