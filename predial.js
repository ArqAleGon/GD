import {networkLines} from './network-data.js?v=20260921';

async function loadGzipJSON(url){const response=await fetch(url);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);const stream=response.body.pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(stream).text());}
const predialPayload=await loadGzipJSON('./predial-data.json.gz?v=20260921');
const PREDIAL_META=predialPayload.meta,PREDIAL_RECORDS=predialPayload.records;

const $=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg';
const L1=networkLines.find(line=>line.id==='L1');
const STATUS={
 acquired:{label:'Adquirido / entregado',short:'Adquiridos',color:'#44c58a'},
 formalized:{label:'Formalizado',short:'Formalizados',color:'#65b8e8'},
 offer:{label:'En oferta',short:'En oferta',color:'#f2c94c'},
 identified:{label:'Identificado',short:'Identificados',color:'#8598a7'}
};
const initialView={x:780,y:90,w:570,h:440};
let view={...initialView},selected=null,drag=null;

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const svg=(tag,attrs={})=>{const node=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));return node;};
const hash=value=>{let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const fmtNumber=value=>Math.round(value||0).toLocaleString('es-CO');
const fmtDate=value=>{if(!value)return 'Pendiente';const date=new Date(value+'T12:00:00');return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric'}).format(date);};

function routePosition(record){
 const value=(record.group+' '+record.station).toUpperCase();
 if(/PATIO/.test(value))return .35;
 if(/RAMAL/.test(value))return .75;
 let match=value.match(/\bIE0?(\d{1,2})\b/);if(match)return Number(match[1])+.5;
 match=value.match(/\bINT0?(\d{1,2})\b/);if(match)return Number(match[1])-.5;
 match=value.match(/\bE0?(\d{1,2})[AD]?\b/);if(match)return Number(match[1]);
 return 10;
}

function pointAt(record){
 const position=Math.max(1,Math.min(L1.stations.length,routePosition(record)));
 const low=Math.floor(position),high=Math.ceil(position),fraction=position-low;
 const a=L1.stations[Math.max(0,low-1)].xy,b=L1.stations[Math.max(0,high-1)].xy;
 const px=a[0]+(b[0]-a[0])*fraction,py=a[1]+(b[1]-a[1])*fraction;
 const before=L1.stations[Math.max(0,low-2)].xy,after=L1.stations[Math.min(L1.stations.length-1,high)].xy;
 const dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1;
 const seed=hash(record.id+'|'+record.key),side=seed%2?1:-1;
 const along=((seed>>>3)%170)/10-8.5,away=(5+((seed>>>11)%270)/10)*side;
 return {x:px+dx/length*along-dy/length*away,y:py+dy/length*along+dx/length*away,angle:Math.atan2(dy,dx)*180/Math.PI};
}

function filters(){return {status:$('predialStatus').value,locality:$('locality').value,segment:$('segment').value,search:$('predialSearch').value.trim().toLocaleLowerCase('es')};}
function matches(record,filter){
 const haystack=[record.id,record.chip,record.address,record.neighborhood,record.station,record.group,record.ue].join(' ').toLocaleLowerCase('es');
 return (!filter.status||record.status===filter.status)&&(!filter.locality||record.locality===filter.locality)&&(!filter.segment||record.group===filter.segment)&&(!filter.search||haystack.includes(filter.search));
}
const visibleRecords=()=>{const filter=filters();return PREDIAL_RECORDS.filter(record=>matches(record,filter));};

function renderBase(){
 const city=$('cityBase'),route=$('routeLayer');
 const boroughs=[
  ['BOSA','1205,410 1370,410 1370,540 1170,540'],['KENNEDY','1165,300 1370,300 1370,410 1185,410'],
  ['PUENTE ARANDA','1130,220 1325,220 1325,300 1160,300'],['ANTONIO NARIÑO','1160,170 1305,170 1305,225 1135,225'],
  ['LOS MÁRTIRES','1080,130 1235,130 1235,180 1080,180'],['TEUSAQUILLO','980,112 1090,112 1090,190 970,190'],
  ['CHAPINERO','820,95 980,95 980,195 820,195']
 ];
 boroughs.forEach(([name,points])=>{city.append(svg('polygon',{points,class:'borough'}));const coords=points.split(' ').map(pair=>pair.split(',').map(Number));const x=coords.reduce((sum,p)=>sum+p[0],0)/coords.length,y=coords.reduce((sum,p)=>sum+p[1],0)/coords.length;const label=svg('text',{x,y,class:'boroughLabel','text-anchor':'middle'});label.textContent=name;city.append(label);});
 [[790,145,1380,145,'AV. CARACAS'],[1010,285,1390,285,'AV. PRIMERO DE MAYO'],[1115,365,1390,365,'AV. VILLAVICENCIO'],[1180,105,1180,540,'NQS'],[1288,90,1288,535,'AV. BOYACÁ']].forEach(([x1,y1,x2,y2,label])=>{city.append(svg('line',{x1,y1,x2,y2,class:'artery'}));const t=svg('text',{x:(x1+x2)/2,y:(y1+y2)/2-4,class:'streetLabel','text-anchor':'middle'});t.textContent=label;city.append(t);});
 const routePath=L1.path.map((point,index)=>(index?'L':'M')+point.join(' ')).join(' ');route.append(svg('path',{d:routePath,class:'l1route'}));
 L1.stations.forEach(station=>{route.append(svg('circle',{cx:station.xy[0],cy:station.xy[1],r:4,class:'l1station'}));const label=svg('text',{x:station.xy[0],y:station.xy[1]-9,class:'stationLabel','text-anchor':'middle'});label.textContent=station.code;route.append(label);});
}

function renderKpis(list){
 const area=list.reduce((sum,record)=>sum+(record.area||record.landArea||0),0);
 const acquired=list.filter(record=>record.status==='acquired').length;
 $('predialKpis').innerHTML=[
  ['Predios visibles',fmtNumber(list.length),'registros','#83c9ee'],
  ['Adquiridos / entregados',fmtNumber(acquired),list.length?Math.round(acquired/list.length*100)+' %':'0 %',STATUS.acquired.color],
  ['Área afectada',fmtNumber(area),'m²','#a98bea'],
  ['Cobertura',fmtNumber(new Set(list.map(record=>record.locality).filter(Boolean)).size),'localidades','#eaa56f']
 ].map(([label,value,unit,color])=>`<article class="kpi" style="--state:${color}"><span>${label}</span><b>${value}<small>${unit}</small></b></article>`).join('');
 $('resultCount').textContent=`${fmtNumber(list.length)} de ${fmtNumber(PREDIAL_META.recordCount)} predios`;
}

function renderCharts(list){
 const total=Math.max(1,list.length),counts=Object.fromEntries(Object.keys(STATUS).map(key=>[key,list.filter(record=>record.status===key).length]));
 const p1=counts.acquired/total*100,p2=p1+counts.formalized/total*100,p3=p2+counts.offer/total*100;
 $('statusChart').innerHTML=`<div class="donut" style="--p1:${p1}%;--p2:${p2}%;--p3:${p3}%"><div><b>${fmtNumber(list.length)}</b><small>predios</small></div></div><div class="donutLegend">${Object.entries(STATUS).map(([key,state])=>`<div><i style="--state:${state.color}"></i><span>${state.short}</span><b>${fmtNumber(counts[key])}</b></div>`).join('')}</div>`;
 const groups=[...list.reduce((map,record)=>map.set(record.locality||'Sin localidad',(map.get(record.locality||'Sin localidad')||0)+1),new Map())].sort((a,b)=>b[1]-a[1]).slice(0,6),max=Math.max(1,...groups.map(group=>group[1]));
 $('localityChart').innerHTML=groups.length?groups.map(([name,count])=>`<div class="chartRow"><span>${escapeHTML(name)}</span><div class="chartTrack"><i style="width:${count/max*100}%"></i></div><b>${fmtNumber(count)}</b></div>`).join(''):'<div class="emptyDetail"><span>Sin datos para los filtros seleccionados.</span></div>';
}

function showDetail(record){
 selected=record;$('selectionLabel').textContent='Predio seleccionado';
 const state=STATUS[record.status],area=record.area||record.landArea||0;
 const milestones=[['Oferta',record.dates.offer],['Aceptación',record.dates.acceptance],['Promesa de compraventa',record.dates.promise],['Resolución de expropiación',record.dates.expropriation],['Entrega para demolición',record.dates.delivery],['Demolición',record.dates.demolition]];
 $('parcelDetail').innerHTML=`<div class="detailHead"><h3>${escapeHTML(record.id)}</h3><span class="statusPill" style="--state:${state.color}"><i></i>${state.label}</span></div><div class="detailGrid"><div class="detailMetric"><span>CHIP</span><b>${escapeHTML(record.chip||'Sin dato')}</b></div><div class="detailMetric"><span>Estación / tramo</span><b>${escapeHTML(record.group||record.station||'Sin dato')}</b></div><div class="detailMetric"><span>Área afectada</span><b>${fmtNumber(area)} m²</b></div><div class="detailMetric"><span>Afectación</span><b>${escapeHTML(record.affectation||'Sin dato')}</b></div><div class="detailMetric"><span>Localidad</span><b>${escapeHTML(record.locality||'Sin dato')}</b></div><div class="detailMetric"><span>Barrio</span><b>${escapeHTML(record.neighborhood||'Sin dato')}</b></div></div><p class="address">${escapeHTML(record.address||'Dirección no registrada')} · ${escapeHTML(record.destination||'Destino no registrado')}</p><div class="milestones"><h4>Hitos del proceso</h4>${milestones.map(([label,date])=>`<div class="milestone ${date?'done':''}"><b>${label}</b><span>${fmtDate(date)}</span></div>`).join('')}</div>`;
 render();
}

function showTooltip(event,record){
 const tip=$('mapTooltip');tip.innerHTML=`<b>${escapeHTML(record.id)}</b><span>${escapeHTML(record.address||record.neighborhood||'Predio L1')}</span><span>${STATUS[record.status].label} · ${escapeHTML(record.group||record.station||'Tramo sin dato')}</span>`;tip.hidden=false;
 const rect=$('predialMap').parentElement.getBoundingClientRect();tip.style.left=Math.min(event.clientX-rect.left+12,rect.width-245)+'px';tip.style.top=Math.max(8,event.clientY-rect.top-12)+'px';
}

function renderMap(list){
 const layer=$('parcelLayer');layer.replaceChildren();
 list.forEach(record=>{const point=pointAt(record),seed=hash(record.id),size=Math.max(3.8,Math.min(8,3.5+Math.sqrt(record.area||record.landArea||20)/7));const rect=svg('rect',{x:(point.x-size/2).toFixed(2),y:(point.y-size/2).toFixed(2),width:size.toFixed(2),height:(size*.72).toFixed(2),rx:1.2,fill:STATUS[record.status].color,class:'parcel'+(selected?.key===record.key?' selected':''),tabindex:0,role:'button','aria-label':`${record.id}. ${STATUS[record.status].label}`,transform:`rotate(${(point.angle+((seed>>>19)%19)-9).toFixed(1)} ${point.x.toFixed(2)} ${point.y.toFixed(2)})`});rect.addEventListener('pointerdown',event=>event.stopPropagation());rect.addEventListener('click',event=>{event.stopPropagation();showDetail(record);});rect.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDetail(record);}});rect.addEventListener('pointermove',event=>showTooltip(event,record));rect.addEventListener('pointerleave',()=>{$('mapTooltip').hidden=true;});layer.append(rect);});
}

function render(){
 const list=visibleRecords();if(selected&&!list.includes(selected)){selected=null;$('selectionLabel').textContent='Vista general';$('parcelDetail').innerHTML='<div class="emptyDetail"><b>Selecciona un predio</b><span>La ficha mostrará identificación, ubicación, áreas e hitos del proceso.</span></div>';}
 renderKpis(list);renderCharts(list);renderMap(list);
}

function setView(next){view={...next};$('predialMap').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);}
function zoom(factor,cx=view.x+view.w/2,cy=view.y+view.h/2){const nextW=Math.max(150,Math.min(900,view.w*factor)),nextH=nextW*view.h/view.w;setView({x:cx-(cx-view.x)*nextW/view.w,y:cy-(cy-view.y)*nextH/view.h,w:nextW,h:nextH});}

function init(){
 $('sourceName').textContent=`${PREDIAL_META.source} · ${fmtNumber(PREDIAL_META.recordCount)} registros`;
 for(const value of [...new Set(PREDIAL_RECORDS.map(record=>record.locality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))){const option=document.createElement('option');option.value=value;option.textContent=value;$('locality').append(option);}
 for(const value of [...new Set(PREDIAL_RECORDS.map(record=>record.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}))){const option=document.createElement('option');option.value=value;option.textContent=value;$('segment').append(option);}
 $('mapLegend').innerHTML=Object.values(STATUS).map(state=>`<span class="legendItem"><i style="--state:${state.color}"></i>${state.short}</span>`).join('');
 renderBase();render();
 for(const id of ['predialStatus','locality','segment'])$(id).addEventListener('change',render);$('predialSearch').addEventListener('input',render);
 $('predialReset').onclick=()=>{$('predialStatus').value='acquired';$('locality').value='';$('segment').value='';$('predialSearch').value='';selected=null;setView(initialView);render();};
 $('zoomIn').onclick=()=>zoom(.78);$('zoomOut').onclick=()=>zoom(1.28);$('resetView').onclick=()=>setView(initialView);
 const map=$('predialMap');map.addEventListener('wheel',event=>{event.preventDefault();const rect=map.getBoundingClientRect(),x=view.x+(event.clientX-rect.left)/rect.width*view.w,y=view.y+(event.clientY-rect.top)/rect.height*view.h;zoom(event.deltaY>0?1.14:.87,x,y);},{passive:false});
 map.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,view:{...view}};map.setPointerCapture(event.pointerId);map.classList.add('dragging');});map.addEventListener('pointermove',event=>{if(!drag)return;const rect=map.getBoundingClientRect();setView({...view,x:drag.view.x-(event.clientX-drag.x)/rect.width*drag.view.w,y:drag.view.y-(event.clientY-drag.y)/rect.height*drag.view.h,w:drag.view.w,h:drag.view.h});});map.addEventListener('pointerup',()=>{drag=null;map.classList.remove('dragging');});map.addEventListener('pointercancel',()=>{drag=null;map.classList.remove('dragging');});
}

init();

