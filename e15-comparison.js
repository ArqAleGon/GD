export const COMPARISONS={
 'ifc-render':{from:'Modelo IFC',to:'Render hiperrealista',en:['IFC model','Hyperrealistic render']},
 'render-progress':{from:'Render hiperrealista',to:'Estado real',en:['Hyperrealistic render','Actual construction']},
 'ifc-progress':{from:'Modelo IFC',to:'Estado real',en:['IFC model','Actual construction']}
};
export function comparisonLayers(mode,value){
 const t=Math.min(1,Math.max(0,Number(value)||0));
 if(mode==='render-progress')return {render:1,progress:t};
 if(mode==='ifc-progress')return {render:0,progress:t};
 return {render:t,progress:0};
}
