export const STATES={late:{label:'Atrasado',color:'#ef6464',opacity:1},done:{label:'Terminado',color:'#44c58a',opacity:1},started:{label:'Iniciado',color:'#f2c94c',opacity:1},pending:{label:'No iniciado y sin atraso',color:'#a9bcc8',opacity:.12}};
// Illustrative schedule only; no values are extracted from Power BI.
export const DEMO=[['2026-07-01','2026-08-15',100],['2026-07-15','2026-09-01',65],['2026-08-01','2026-10-15',35],['2026-10-01','2026-11-15',0],['2026-09-01','2026-11-30',20],['2026-07-01','2026-08-31',100],['2026-08-01','2026-09-10',40],['2026-10-15','2026-12-15',0]];
export function metrics(record,cutoff){
 const now=Date.parse(cutoff+'T12:00:00Z'),start=Date.parse(record.start+'T12:00:00Z'),end=Date.parse(record.end+'T12:00:00Z');
 const planned=Math.round(Math.max(0,Math.min(1,(now-start)/(end-start)))*100);
 const status=record.actual>=100?'done':record.actual<planned?'late':record.actual>0?'started':'pending';
 return {planned,status};
}
export const UNASSIGNED_UE='__unassigned__';
export function normalizeUE(value){return typeof value==='string'?value.trim():'';}
export function ueOptions(records){return [...new Set(records.map(r=>normalizeUE(r.ue)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));}
export function matches(record,filters){return (!filters.ue||(filters.ue===UNASSIGNED_UE?!normalizeUE(record.ue):normalizeUE(record.ue)===filters.ue))&&(!filters.sector||record.section===filters.sector)&&(!filters.discipline||record.discipline===filters.discipline)&&(!filters.status||record.status===filters.status)&&(!filters.search||(record.source+' '+record.section+' '+record.discipline).toLowerCase().includes(filters.search.toLowerCase()));}
