import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const gzipJson=file=>JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
const manifest=json('./bim-registration-models.json');
const primavera=gzipJson('./primavera-data.json.gz');
const p6Units=new Set(primavera.tasks.map(task=>String(task.ue||'').trim()).filter(Boolean));

for(const [section,entry] of Object.entries(manifest.sections)){
  if(entry.status!=='ready')continue;
  test(`${section} offers Primavera activities for every mapped UE`,()=>{
    assert.ok(entry.data&&fs.existsSync(entry.data),`${section} needs element metadata`);
    const payload=gzipJson(entry.data),units=new Set(Object.values(payload.elements).map(element=>String(element.u||'').trim()).filter(value=>value&&value!=='Sin UE'));
    assert.ok(Object.keys(payload.elements).length>0,`${section} needs selectable elements`);
    for(const unit of units)assert.ok(p6Units.has(unit),`${section} UE ${unit} is missing from Primavera`);
  });
}
