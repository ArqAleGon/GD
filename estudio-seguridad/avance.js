import {activities,inspectProgress,summarize} from './avance-data.js?v=20261104-integrity45';
const $=s=>document.querySelector(s),fmt=new Intl.NumberFormat('es-CO',{style:'percent',maximumFractionDigits:1});
let data=[],context,selected='E02',busy=false,lastRead;
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function option(select,value,text){select.append(new Option(text,value));}
function filtered(){return data.filter(s=>($('#station').value==='all'||s.id===$('#station').value)&&($('#week').value==='all'||s.week===$('#week').value));}
function currentActivities(){return activities.filter(a=>$('#owner').value==='all'||a.owner===$('#owner').value);}
function render(){
 const rows=filtered(),owner=$('#owner').value,summary=summarize(rows,owner);
 $('#ratio').textContent=summary.ratio===null?'—':fmt.format(summary.ratio);$('#coverage').textContent=`${summary.done} de ${summary.total} actividades en consulta`;
 $('#total-bar').style.width=(summary.ratio||0)*100+'%';$('#station-count').textContent=summary.stations;$('#done').textContent=summary.done;$('#pending').textContent=summary.pending;
 if(!rows.some(s=>s.id===selected))selected=rows[0]?.id;
 $('#bars').replaceChildren(...rows.map(s=>{const n=summarize([s],owner),b=element('button',undefined,'station-bar');b.setAttribute('aria-pressed',s.id===selected);b.setAttribute('aria-label',s.name+' '+n.done+' de '+n.total+' actividades');const track=element('span',undefined,'track'),i=element('i');i.style.width=n.ratio*100+'%';track.append(i);b.append(element('span',s.name),track,element('b',`${n.done}/${n.total}`));b.onclick=()=>{selected=s.id;render();};return b;}));
 if(!rows.length)$('#bars').append(element('p','No hay estaciones para esta combinación de filtros.','empty'));
 const cols=currentActivities(),head=element('tr');head.append(element('th','Actividad / responsable'));
 for(const s of rows)head.append(element('th',s.id));$('#matrix thead').replaceChildren(head);
 $('#matrix tbody').replaceChildren(...cols.map(a=>{const tr=element('tr'),label=element('th');label.append(element('div',a.label),element('small',a.owner));tr.append(label);for(const s of rows){const item=s.activities.find(x=>x.id===a.id),td=element('td'),b=element('button',item.complete?'✓':'—',item.complete?'yes':'no');b.title=item.note;b.setAttribute('aria-label',`${s.id}: ${a.label}. ${item.complete?'Incorporado':'En construcción'}`);b.onclick=()=>{selected=s.id;render();$('#detail-'+a.id)?.scrollIntoView({behavior:'smooth',block:'center'});};td.append(b);tr.append(td);}return tr;}));
 detail(rows.find(s=>s.id===selected));
}
function detail(s){
 $('#details').replaceChildren();$('#detail-title').textContent=s?s.name:'Sin estaciones';$('#open-station').hidden=!s;$('#detail-week').textContent=s?`${s.week} del programa original · ${s.id==='E09'?'Referencia ya incorporada':'Estación en seguimiento'}`:'';
 if(!s)return;$('#open-station').href='./?station='+s.id+'&level=all';
 for(const a of s.activities.filter(a=>$('#owner').value==='all'||a.owner===$('#owner').value)){
  const item=element('div',undefined,'detail');item.id='detail-'+a.id;const head=element('div',undefined,'detail-head');head.append(element('b',a.label),element('span',a.complete?'✓ Incorporado':'En construcción',a.complete?'yes':'no'));item.append(head,element('p',a.note));
  if(a.evidence){const link=element('a','Consultar registro fuente ↗');link.href=a.evidence;link.target='_blank';link.rel='noopener';item.append(link);}$('#details').append(item);
 }
 if(s.reservedAreas?.records){const info=element('div',undefined,'detail');info.append(element('b','Cuadro de áreas reservado'),element('p',`${s.reservedAreas.records} registros conservados al ${context.reservedAsOf}. Su reserva no equivale a vinculación espacial. Consultar el estado de Áreas conectadas a etiquetas.`));$('#details').append(info);}
}
async function refresh(){
 if(busy)return;busy=true;$('#refresh').disabled=true;
 const cache=new Map();
 async function read(path){
  if(!cache.has(path))cache.set(path,(async()=>{const url=new URL(path,location.href);url.searchParams.set('avance',Date.now());const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`No se pudo consultar ${url.pathname} (${r.status}).`);return r.json();})());
  return cache.get(path);
 }
 try{
  const configs=await import('./study-stations.js?avance='+Date.now());
  context=await read('./avance-contexto.json');
  const next=await Promise.all(Object.values(configs.stations).filter(s=>s.id!=='E01').sort((a,b)=>a.id.localeCompare(b.id)).map(s=>inspectProgress(s,read,context)));
  if(!data.length){for(const s of next)option($('#station'),s.id,s.name);for(const week of [...new Set(next.map(s=>s.week))].sort())option($('#week'),week,week);for(const owner of [...new Set(activities.map(a=>a.owner))])option($('#owner'),owner,owner);}
  data=next;lastRead=new Date();$('#error').hidden=true;$('#updated').textContent='Recursos consultados: '+lastRead.toLocaleString('es-CO');render();
 }catch(error){$('#error').hidden=false;$('#error').textContent=`${error.message} ${data.length?'Se conservan los últimos datos consultados.':'No se han calculado porcentajes con fuentes incompletas.'}`;$('#updated').textContent=lastRead?'Última consulta correcta: '+lastRead.toLocaleString('es-CO'):'Consulta pendiente';}
 finally{busy=false;$('#refresh').disabled=false;}
}
for(const id of ['station','week','owner'])$('#'+id).onchange=render;
$('#refresh').onclick=refresh;$('#reset').onclick=()=>{for(const id of ['station','week','owner'])$('#'+id).value='all';render();};
$('#csv').onclick=()=>{if(!data.length)return;const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const rows=[['Estación','Nombre','Semana','Responsable','Actividad','Estado','Detalle','Consulta'],...filtered().flatMap(s=>s.activities.filter(a=>$('#owner').value==='all'||a.owner===$('#owner').value).map(a=>[s.id,s.name,s.week,a.owner,a.label,a.complete?'Incorporado':'En construcción',a.note,lastRead.toISOString()]))];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download='ControlAvance-'+lastRead.toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#criteria').replaceChildren(...activities.map(a=>element('li',a.label+': '+a.criterion)));
refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
