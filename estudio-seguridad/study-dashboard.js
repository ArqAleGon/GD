export const displayName=value=>String(value??'').replace(/descendentes/gi,'Gilbraltar').replace(/descendente/gi,'Gilbraltar').replace(/ascendentes/gi,'Calle 72').replace(/ascendente/gi,'Calle 72').replace(/Gibraltar/g,'Gilbraltar');
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function initCameraDashboard(records,types,levels,locations,stationName='E09 · NQS'){
 const $=s=>document.querySelector(s),dialog=$('#camera-dashboard'),lookup=new Map(locations.records.map(r=>[r.id,r]));
 const rows=[...new Map(records.map(r=>[r.ifcSource+':'+r.ifcGlobalId,r])).values()].map(r=>({record:r,station:stationName,building:lookup.get(r.ifcGlobalId)?.building||'Exterior / por asignar',level:levels.find(l=>l.ifc===r.ifcStorey)?.name||'Sin nivel',type:Object.entries(types).find(([,t])=>r.ifcTypeName.includes(t.ifcFamilyToken))?.[1].label||'Sin tipología'}));
 const filters=['station','building','level','type'];
 for(const key of filters){const select=$('#dashboard-'+key);select.append(new Option('Todos',''),...[...new Set(rows.map(r=>r[key]))].sort().map(v=>new Option(v,v)));select.addEventListener('change',draw);}
 function draw(){
  const selected=rows.filter(r=>filters.every(k=>!$('#dashboard-'+k).value||r[k]===$('#dashboard-'+k).value));
  $('#dashboard-total').textContent=selected.length;$('#dashboard-scope').textContent=`de ${rows.length} cámaras únicas del IFC · ${stationName}`;
  $('#dashboard-fixed').textContent=selected.filter(r=>r.record.ifcTypeName.includes('FIXED-CAMERA')).length;
  $('#dashboard-unassigned').textContent=selected.filter(r=>r.building==='Exterior / por asignar').length;
  for(const key of filters){const list=$('#dashboard-by-'+key);list.replaceChildren();const counts=new Map();for(const r of selected)counts.set(r[key],(counts.get(r[key])||0)+1);for(const [label,total] of [...counts].sort((a,b)=>b[1]-a[1])){const row=node('div'),name=node('span',label),value=node('strong',total),bar=node('progress');bar.max=Math.max(1,selected.length);bar.value=total;bar.setAttribute('aria-label',`${label}: ${total}`);row.append(name,value,bar);list.append(row);}if(!selected.length)list.append(node('p','Sin cámaras para estos filtros.'));}
  const body=$('#dashboard-rows');body.replaceChildren();const grouped=new Map();for(const r of selected){const key=[r.building,r.level,r.type].join('|');grouped.set(key,(grouped.get(key)||0)+1);}for(const [key,total] of [...grouped].sort()){const tr=node('tr');for(const v of [...key.split('|'),total])tr.append(node('td',v));body.append(tr);}
 }
 $('#open-camera-dashboard').disabled=false;$('#open-camera-dashboard').addEventListener('click',()=>{draw();dialog.showModal();});$('#close-camera-dashboard').addEventListener('click',()=>dialog.close());$('#dashboard-reset').addEventListener('click',()=>{for(const k of filters)$('#dashboard-'+k).value='';draw();});
 $('#dashboard-method').textContent=locations.method+' Totales de diseño; no certifican equipos instalados.';draw();return lookup;
}
