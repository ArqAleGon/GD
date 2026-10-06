const legacy={E15:{vestibule:7.2,platform:14.4,upper:23.2,roof:29.8,access:0},E16:{vestibule:5.4,platform:14.2,upper:20.8,roof:27.4,access:0}};
export function stationLevelProfile(code,entry,bounds){
 const scale=.06,datum=.24,street=entry.streetDatum??2550,height=m=>datum+m*scale;
 const native=(entry.levelDefinitions||[]).filter(level=>{const y=height(level.elevation-street);return y>=bounds.min.y-.06&&y<=bounds.max.y+.06;});
 let e=legacy[code],hasHigh=true;
 if(native.length){
  const main=n=>native.find(level=>new RegExp('_PL_'+n+'(?:_|$)').test(level.name));
  const access=main('01')||native.find(level=>/_PL_01\./.test(level.name));
  const vestibule=main('02'),platform=main('03');
  const roofs=native.filter(level=>/_PL_(?:04(?:\.1)?|05)(?:_|$)/.test(level.name)).sort((a,b)=>a.elevation-b.elevation);
  if(!access||!vestibule||!platform||!roofs.length)throw new Error('Niveles IFC principales incompletos para '+code);
  const firstRoof=roofs[0],roof=roofs.at(-1);hasHigh=roof.elevation-firstRoof.elevation>.5;
  e={access:access.elevation-street,vestibule:vestibule.elevation-street,platform:platform.elevation-street,upper:firstRoof.elevation-street,roof:roof.elevation-street};
 }
 if(!e)throw new Error('Niveles IFC no disponibles para '+code);
 const keys=hasHigh?['base','upper','lower','high','roof']:['base','upper','lower','roof'];
 const cuts=[bounds.min.y-.01,height(e.vestibule-.5),height(e.platform-.5),...(hasHigh?[height(e.upper-.5)]:[]),height(e.roof-.5),bounds.max.y+.01];
 if(cuts.some((value,i)=>i&&value<=cuts[i-1]))throw new Error('Cotas IFC de nivel fuera del modelo '+code);
 return {e,keys,cuts,native,levelLabels:{base:'Accesos y cimentación',upper:'Vestíbulo',lower:'Andén',high:native.length?'Cubierta inferior':'Nivel superior',roof:'Cubierta'}};
}
