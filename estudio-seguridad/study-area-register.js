// PDF schedules may be consulted before their spatial registration is available.
const $=s=>document.querySelector(s);
const names={B:'Sótano',A:'Acceso',I:'Intermedio',P:'Plataforma'};
export function filterAreaRows(rows,level='all',building='all',type='all'){
 return rows.filter(r=>(level==='all'||r.level===level)&&(building==='all'||r.building===building)&&(type==='all'||r.type===type));
}
export class AreaRegister{
 constructor(data){
  this.data=data;this.type='all';
  const panel=$('#spaces-dialog');panel.querySelector('.eyebrow').textContent='CUADRO DE ÁREAS · '+data.station;
  panel.querySelector('thead th').textContent='Código';
  panel.querySelector('p:last-child').textContent='El filtro consulta los registros del cuadro PDF. La vinculación con etiquetas, colores y ubicación en las plantas está en construcción. No se asignan áreas a una geometría sin correspondencia comprobada.';
  const controls=document.createElement('div');controls.className='dashboard-filters';controls.id='area-register-controls';
  this.level=this.select(controls,'Nivel del cuadro','area-register-level',[['all','Todos los niveles'],...Object.entries(names)]);
  this.building=this.select(controls,'Edificación','area-register-building',[['all','Todas las edificaciones'],...[...new Set(data.areaRecords.map(r=>r.building))].sort().map(b=>[b,b||'Sin edificación declarada'])]);
  $('#space-filters').before(controls);
  for(const b of document.querySelectorAll('[data-open-spaces],#open-spaces'))b.addEventListener('click',()=>panel.showModal());
  $('#close-spaces').addEventListener('click',()=>panel.close());
  this.refresh();
 }
 select(parent,label,id,items){const box=document.createElement('label');box.textContent=label;const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',label);for(const [value,text] of items)select.append(new Option(text,value));box.append(select);parent.append(box);select.addEventListener('change',()=>this.refresh());return select;}
 setLevel(level){this.level.value=Object.entries(names).find(([,name])=>name===level.name)?.[0]||'all';this.refresh();}
 refresh(){
  const rows=filterAreaRows(this.data.areaRecords,this.level.value,this.building.value,this.type);
  $('#spaces-summary').textContent=`${this.data.areaRecords.length} áreas PDF registradas · ubicación en construcción`;
  $('#spaces-source').textContent=`${rows.length} espacios en la consulta. ${this.data.source.file} · ${this.data.source.revision}. Áreas útiles en m², conservadas por código, edificación, nivel y subnivel. Etiquetas y colores en planta: En construcción.`;
  const types=[['all','Todos los tipos'],...[...new Set(this.data.areaRecords.map(r=>r.type))].sort().map(t=>[t,t])];
  $('#space-filters').replaceChildren(...types.map(([value,text])=>{const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-pressed',String(value===this.type));b.addEventListener('click',()=>{this.type=value;this.refresh();});return b;}));
  $('#space-rows').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');const cells=Array.from({length:4},()=>document.createElement('td'));cells[0].textContent=r.code;cells[1].textContent=r.name;const location=document.createElement('small');location.textContent=`${r.building} · ${names[r.level]}${r.sourceSublevel?' · '+r.sourceSublevel:''} · Ubicación pendiente`;cells[1].append(document.createElement('br'),location);cells[2].textContent=r.area.toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2});const source=document.createElement('small');source.textContent=`PDF ${this.data.source.revision} · pág. ${r.pdfPage}`;cells[2].append(document.createElement('br'),source);cells[2].title=r.sourceText;cells[3].textContent=r.type;tr.append(...cells);return tr;}));
  if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='No hay registros para esta combinación de filtros.';tr.append(td);$('#space-rows').append(tr);}
 }
}
