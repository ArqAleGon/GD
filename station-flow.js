// Illustrative scenarios, not a calibrated forecast or an official service timetable.
export const FLOW_SCENARIOS={
 peak:{label:'Hora pico',note:'Mayor demanda laboral a las 07:30 y 17:30; menor flujo al mediodía.'},
 valley:{label:'Hora Valle',note:'Jornada de baja demanda, con distribución suave y sin grandes picos.'},
 event:{label:'Evento',note:'Evento supuesto a las 19:00: llegada previa y salida concentrada a las 21:00.'},
 weekend:{label:'Fin de semana',note:'Menor demanda temprana; actividad recreativa entre mediodía y la tarde.'}
};
export const DEFAULT_FLOW={scenario:null,minute:450,start:330,end:1380,base:1800,dwell:6,playing:false};
const bell=(h,c,w)=>Math.exp(-.5*((h-c)/w)**2);
export function flowConfig(input={}){
 const start=Math.max(0,Math.min(1380,Number(input.start??330))),end=Math.max(start+30,Math.min(1440,Number(input.end??1380)));
 return {...DEFAULT_FLOW,...input,start,end,minute:Math.max(start,Math.min(end,Number(input.minute??450))),base:Math.max(0,Math.min(20000,Number(input.base??1800))),dwell:Math.max(1,Math.min(30,Number(input.dwell??6)))};
}
export function clockLabel(minute){return Math.floor(minute/60).toString().padStart(2,'0')+':'+Math.floor(minute%60).toString().padStart(2,'0');}
export function stationFlowAt(input,minute=input.minute){
 const c=flowConfig(input),h=minute/60;
 if(!FLOW_SCENARIOS[c.scenario]||minute<c.start||minute>=c.end)return {entries:0,exits:0,total:0};
 const taper=Math.min(1,(minute-c.start)/30,(c.end-minute)/30);
 let factor,share=.5;
 if(c.scenario==='peak'){factor=.22+.95*bell(h,7.5,.85)+.85*bell(h,17.5,1.05);share=.5+.18*bell(h,7.5,1)-.18*bell(h,17.5,1.2);}
 if(c.scenario==='valley')factor=.25+.13*bell(h,12.5,2.5)+.1*bell(h,18,2);
 if(c.scenario==='event'){factor=.25+.5*bell(h,17.5,1)+1.4*bell(h,18.5,.65)+1.9*bell(h,21,.4);share=.5+.3*bell(h,18.5,.65)-.35*bell(h,21,.4);}
 if(c.scenario==='weekend'){factor=.13+.48*bell(h,13,2.2)+.55*bell(h,18,1.8);share=.5+.08*bell(h,12,2)-.08*bell(h,19,2);}
 const total=c.base*factor*Math.max(0,taper);
 return {entries:total*share,exits:total*(1-share),total};
}
export function flowMetrics(input){
 const c=flowConfig(input),current=stationFlowAt(c),series=[];let entries=0,exits=0,present=0;
 // One-minute trapezoidal integration: arrivals over the preceding dwell window
 // are present. At closing the platform clears over the configured dwell period.
 for(let m=c.start;m<c.end;m++){
  const a=stationFlowAt(c,m),b=stationFlowAt(c,m+1),en=(a.entries+b.entries)/120,ex=(a.exits+b.exits)/120;
  entries+=en;exits+=ex;
 }
 for(let m=Math.max(c.start,c.minute-c.dwell);m<c.minute;m++){
  const n=Math.min(m+1,c.minute),a=stationFlowAt(c,m),b=stationFlowAt(c,n);present+=(a.total+b.total)*(n-m)/120;
 }
 for(let m=c.start;m<=c.end;m+=15)series.push({minute:m,...stationFlowAt(c,m)});
 if(series.at(-1)?.minute!==c.end)series.push({minute:c.end,...stationFlowAt(c,c.end)});
 return {...current,present,dayEntries:entries,dayExits:exits,series};
}
