async function loadGzipJSON(url){const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(stream).text());}
const predialPayload=await loadGzipJSON('./predial-data.json.gz?v=20260922-shp');
const PREDIAL_META=predialPayload.meta,PREDIAL_RECORDS=predialPayload.records;

const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const STATUS={
 acquired:{label:'Adquirido / entregado',short:'Adquiridos',color:'#44c58a',opacity:.88},
 formalized:{label:'Formalizado',short:'Formalizados',color:'#65b8e8',opacity:.84},
 offer:{label:'En oferta',short:'En oferta',color:'#f2c94c',opacity:.9},
 identified:{label:'Identificado',short:'Identificados',color:'#9b8de3',opacity:.78},
 unmanaged:{label:'Sin gestión de adquisición',short:'Sin gestión',color:'#697985',opacity:.58}
};
const mapWidth=PREDIAL_META.mapWidth||1200,mapHeight=PREDIAL_META.mapHeight||620;
const padding=26;
const initialView={x:-padding,y:-padding,w:mapWidth+padding*2,h:mapHeight+padding*2};
let view={...initialView},selected=null,drag=null;

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const svg=(tag,attrs={})=>{const node=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));return node;};
const fmtNumber=(value,digits=0)=>Number(value||0).toLocaleString('es-CO',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const fmtDate=value=>{if(!value)return 'Pendiente';const date=new Date(value+'T12:00:00');return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(date);};
const relationLabel=record=>record.matched?'Correlacionado por LotCodigo':'Sin correlación en la base predial';

function filters(){return {status:$('predialStatus').value,locality:$('locality').value,segment:$('segment').value,search:$('predialSearch').value.trim().toLocaleLowerCase('es')};}
function matches(record,filter){
 const haystack=[record.lotCode,record.id,record.chip,record.address,record.neighborhood,record.station,record.group,record.ue].join(' ').toLocaleLowerCase('es');
 return (!filter.status||record.status===filter.status)&&(!filter.locality||record.locality===filter.locality)&&(!filter.segment||(record.group||record.station)===filter.segment)&&(!filter.search||haystack.includes(filter.search));
}
const visibleRecords=()=>{const filter=filters();return PREDIAL_RECORDS.filter(record=>matches(record,filter));};

function renderBase(){
 const base=$('geoGrid');base.replaceChildren();
 base.append(svg('rect',{x:0,y:0,width:mapWidth,height:mapHeight,class:'mapExtent'}));
 const [minLon,minLat,maxLon,maxLat]=PREDIAL_META.bbox;
 for(let index=0;index<=6;index++){
  const x=mapWidth*index/6,lon=minLon+(maxLon-minLon)*index/6;
  base.append(svg('line',{x1:x,y1:0,x2:x,y2:mapHeight,class:'coordinateGrid'}));
  const label=svg('text',{x,y:mapHeight+17,class:'coordinateLabel','text-anchor':'middle'});label.textContent=`${Math.abs(lon).toFixed(3)}° O`;base.append(label);
 }
 for(let index=0;index<=4;index++){
  const y=mapHeight*index/4,lat=maxLat-(maxLat-minLat)*index/4;
  base.append(svg('line',{x1:0,y1:y,x2:mapWidth,y2:y,class:'coordinateGrid'}));
  const label=svg('text',{x:-8,y:y+3,class:'coordinateLabel','text-anchor':'end'});label.textContent=`${lat.toFixed(3)}° N`;base.append(label);
 }
 const north=svg('g',{class:'northArrow',transform:`translate(${mapWidth-38} 34)`});
 north.append(svg('path',{d:'M0,23 L8,0 L16,23 L8,18 Z'}));
 const n=svg('text',{x:8,y:-6,'text-anchor':'middle'});n.textContent='N';north.append(n);base.append(north);
 const corridor=svg('text',{x:18,y:27,class:'mapTitle'});corridor.textContent='PREDIOS L1MB · GEOMETRÍA SHP WGS 84';base.append(corridor);
}

function renderKpis(list){
 const mapped=list.filter(record=>record.matched).length,unmanaged=list.length-mapped;
 const shpArea=list.reduce((sum,record)=>sum+(record.shpArea||0),0);
 $('predialKpis').innerHTML=[
  ['Geometrías visibles',fmtNumber(list.length),'polígonos SHP','#83c9ee'],
  ['Con gestión predial',fmtNumber(mapped),list.length?Math.round(mapped/list.length*100)+' %':'0 %',STATUS.acquired.color],
  ['Sin gestión de adquisición',fmtNumber(unmanaged),list.length?Math.round(unmanaged/list.length*100)+' %':'0 %',STATUS.unmanaged.color],
  ['Área geométrica',fmtNumber(shpArea),'m² SHP','#a98bea']
 ].map(([label,value,unit,color])=>`<article class="kpi" style="--state:${color}"><span>${label}</span><b>${value}<small>${unit}</small></b></article>`).join('');
 $('resultCount').textContent=`${fmtNumber(list.length)} de ${fmtNumber(PREDIAL_META.recordCount)} geometrías`;
}

function statusGradient(counts,total){
 let cursor=0;const stops=[];
 for(const [key,state] of Object.entries(STATUS)){const next=cursor+(counts[key]||0)/Math.max(1,total)*100;stops.push(`${state.color} ${cursor}% ${next}%`);cursor=next;}
 return `conic-gradient(${stops.join(',')})`;
}

function renderCharts(list){
 const counts=Object.fromEntries(Object.keys(STATUS).map(key=>[key,list.filter(record=>record.status===key).length]));
 $('statusChart').innerHTML=`<div class="donut" style="background:${statusGradient(counts,list.length)}"><div><b>${fmtNumber(list.length)}</b><small>geometrías</small></div></div><div class="donutLegend">${Object.entries(STATUS).map(([key,state])=>`<div><i style="--state:${state.color}"></i><span>${state.short}</span><b>${fmtNumber(counts[key])}</b></div>`).join('')}</div>`;
 const groups=[...list.reduce((map,record)=>{const name=record.group||record.station||'Sin tramo registrado';return map.set(name,(map.get(name)||0)+1);},new Map())].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'es',{numeric:true})).slice(0,7),max=Math.max(1,...groups.map(group=>group[1]));
 $('coverageChart').innerHTML=groups.length?groups.map(([name,count])=>`<div class="chartRow"><span>${escapeHTML(name)}</span><div class="chartTrack"><i style="width:${count/max*100}%"></i></div><b>${fmtNumber(count)}</b></div>`).join(''):'<div class="emptyDetail"><span>Sin datos para los filtros seleccionados.</span></div>';
}

function showDetail(record){
 selected=record;$('selectionLabel').textContent='Predio seleccionado';
 const state=STATUS[record.status],affectedArea=record.area||record.landArea||0;
 const milestones=[['Oferta',record.dates.offer],['Aceptación',record.dates.acceptance],['Promesa de compraventa',record.dates.promise],['Resolución de expropiación',record.dates.expropriation],['Entrega para demolición',record.dates.delivery],['Demolición',record.dates.demolition]];
 const process=record.matched?`<div class="milestones"><h4>Hitos del proceso</h4>${milestones.map(([label,date])=>`<div class="milestone ${date?'done':''}"><b>${label}</b><span>${fmtDate(date)}</span></div>`).join('')}</div>`:'<div class="unmanagedNotice"><b>Sin gestión de adquisición</b><span>No se encontró un LotCodigo correlacionado en la base predial suministrada.</span></div>';
 $('parcelDetail').innerHTML=`<div class="detailHead"><h3>${escapeHTML(record.id)}</h3><span class="statusPill" style="--state:${state.color}"><i></i>${state.label}</span></div><div class="joinState ${record.matched?'matched':'unmatched'}">${relationLabel(record)}</div><div class="detailGrid"><div class="detailMetric"><span>LotCodigo</span><b>${escapeHTML(record.lotCode||'Sin dato')}</b></div><div class="detailMetric"><span>CHIP</span><b>${escapeHTML(record.chip||'Sin dato')}</b></div><div class="detailMetric"><span>Estación / tramo</span><b>${escapeHTML(record.group||record.station||'Sin dato')}</b></div><div class="detailMetric"><span>Área geométrica SHP</span><b>${fmtNumber(record.shpArea)} m²</b></div><div class="detailMetric"><span>Área afectada</span><b>${record.matched?fmtNumber(affectedArea)+' m²':'Sin dato'}</b></div><div class="detailMetric"><span>Localidad</span><b>${escapeHTML(record.locality||'Sin dato')}</b></div><div class="detailMetric"><span>Barrio</span><b>${escapeHTML(record.neighborhood||'Sin dato')}</b></div><div class="detailMetric"><span>Afectación</span><b>${escapeHTML(record.affectation||'Sin dato')}</b></div></div><p class="address">${escapeHTML(record.address||'Dirección no registrada')} · ${escapeHTML(record.destination||'Destino no registrado')}</p>${process}`;
 render();
}

function showTooltip(event,record){
 const tip=$('mapTooltip'),state=STATUS[record.status];tip.innerHTML=`<b>${escapeHTML(record.lotCode||record.id)}</b><span>${escapeHTML(record.id)}</span><span>${state.label} · ${escapeHTML(record.group||record.station||'Tramo sin dato')}</span>`;tip.hidden=false;
 const rect=$('predialMap').parentElement.getBoundingClientRect();tip.style.left=Math.min(event.clientX-rect.left+12,rect.width-245)+'px';tip.style.top=Math.max(8,event.clientY-rect.top-12)+'px';
}

function renderMap(list){
 const layer=$('parcelLayer');layer.replaceChildren();
 list.forEach(record=>{const state=STATUS[record.status];const path=svg('path',{d:record.geometry,fill:state.color,'fill-opacity':state.opacity,class:`parcel ${record.status}${selected?.key===record.key?' selected':''}`,tabindex:0,role:'button','aria-label':`${record.lotCode||record.id}. ${state.label}`,'fill-rule':'evenodd'});path.addEventListener('pointerdown',event=>event.stopPropagation());path.addEventListener('click',event=>{event.stopPropagation();showDetail(record);});path.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDetail(record);}});path.addEventListener('pointermove',event=>showTooltip(event,record));path.addEventListener('pointerleave',()=>{$('mapTooltip').hidden=true;});layer.append(path);});
}

function render(){
 const list=visibleRecords();if(selected&&!list.includes(selected)){selected=null;$('selectionLabel').textContent='Vista general';$('parcelDetail').innerHTML='<div class="emptyDetail"><b>Selecciona un predio</b><span>La ficha mostrará la geometría SHP y los datos relacionados por LotCodigo.</span></div>';}
 renderKpis(list);renderCharts(list);renderMap(list);
}

function setView(next){view={...next};$('predialMap').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);}
function zoom(factor,cx=view.x+view.w/2,cy=view.y+view.h/2){const nextW=Math.max(85,Math.min(mapWidth+padding*2,view.w*factor)),nextH=nextW*view.h/view.w;setView({x:cx-(cx-view.x)*nextW/view.w,y:cy-(cy-view.y)*nextH/view.h,w:nextW,h:nextH});}

function init(){
 $('sourceName').textContent=`${PREDIAL_META.workbookSource} + ${PREDIAL_META.geometrySource}`;
 $('joinSummary').textContent=`Cruce ${PREDIAL_META.joinField}: ${fmtNumber(PREDIAL_META.matchedFeatureCount)} geometrías correlacionadas y ${fmtNumber(PREDIAL_META.unmatchedFeatureCount)} sin gestión de adquisición.`;
 for(const value of [...new Set(PREDIAL_RECORDS.map(record=>record.locality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))){const option=document.createElement('option');option.value=value;option.textContent=value;$('locality').append(option);}
 for(const value of [...new Set(PREDIAL_RECORDS.map(record=>record.group||record.station).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))){const option=document.createElement('option');option.value=value;option.textContent=value;$('segment').append(option);}
 $('mapLegend').innerHTML=Object.values(STATUS).map(state=>`<span class="legendItem"><i style="--state:${state.color}"></i>${state.short}</span>`).join('');
 setView(initialView);renderBase();render();
 for(const id of ['predialStatus','locality','segment'])$(id).addEventListener('change',render);$('predialSearch').addEventListener('input',render);
 $('predialReset').onclick=()=>{$('predialStatus').value='';$('locality').value='';$('segment').value='';$('predialSearch').value='';selected=null;setView(initialView);render();};
 $('zoomIn').onclick=()=>zoom(.78);$('zoomOut').onclick=()=>zoom(1.28);$('resetView').onclick=()=>setView(initialView);
 const map=$('predialMap');map.addEventListener('wheel',event=>{event.preventDefault();const rect=map.getBoundingClientRect(),x=view.x+(event.clientX-rect.left)/rect.width*view.w,y=view.y+(event.clientY-rect.top)/rect.height*view.h;zoom(event.deltaY>0?1.14:.87,x,y);},{passive:false});
 map.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,view:{...view}};map.setPointerCapture(event.pointerId);map.classList.add('dragging');});map.addEventListener('pointermove',event=>{if(!drag)return;const rect=map.getBoundingClientRect();setView({...view,x:drag.view.x-(event.clientX-drag.x)/rect.width*drag.view.w,y:drag.view.y-(event.clientY-drag.y)/rect.height*drag.view.h,w:drag.view.w,h:drag.view.h});});map.addEventListener('pointerup',()=>{drag=null;map.classList.remove('dragging');});map.addEventListener('pointercancel',()=>{drag=null;map.classList.remove('dragging');});
}

init();

