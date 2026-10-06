import assert from 'node:assert/strict';
import {stationFlowAt,flowMetrics,flowConfig,FLOW_SCENARIOS} from './station-flow.js';
const c={start:330,end:1380,base:1800,dwell:6,minute:450,scenario:'peak'};
for(const scenario of Object.keys(FLOW_SCENARIOS)){
 for(let minute=0;minute<=1440;minute++){
  const r=stationFlowAt({...c,scenario},minute);
  assert.ok(r.entries>=0&&r.exits>=0);assert.ok(Math.abs(r.entries+r.exits-r.total)<1e-8);
  if(minute<c.start||minute>=c.end)assert.equal(r.total,0);
 }
 const m=flowMetrics({...c,scenario});assert.ok(m.dayEntries>0&&m.dayExits>0&&m.present>=0);
 const doubled=flowMetrics({...c,scenario,base:3600});assert.ok(Math.abs(doubled.dayEntries-2*m.dayEntries)<1e-7);
}
assert.ok(stationFlowAt(c,450).total>stationFlowAt(c,750).total);
const ev={...c,scenario:'event'};assert.ok(stationFlowAt(ev,1110).entries>stationFlowAt(ev,1110).exits);assert.ok(stationFlowAt(ev,1260).exits>stationFlowAt(ev,1260).entries);
const wk={...c,scenario:'weekend'};assert.ok(stationFlowAt(wk,780).total>stationFlowAt(wk,360).total);
assert.equal(flowMetrics({...c,base:0}).present,0);assert.equal(flowMetrics({...c,minute:330}).present,0);
assert.ok(flowMetrics({...c,minute:451}).present>flowMetrics({...c,minute:451,dwell:1}).present);
assert.equal(flowMetrics({...c,scenario:null}).dayEntries,0);
const invalid=flowConfig({...c,start:1380,end:1200,base:-5,minute:1500});assert.equal(invalid.end,1410);assert.equal(invalid.minute,1410);assert.equal(invalid.base,0);
console.log('Four flow profiles: nonnegative conservation, operating boundaries, directional event, daily integration and parameter scaling passed.');
