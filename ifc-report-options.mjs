// Wrap author comments without dropping explicit line breaks or long identifiers.
export function observationLines(text, measure, width) {
  return String(text).replace(/\r\n?/g,'\n').split('\n').flatMap(paragraph => {
    const lines=[]; let line='';
    for (let word of paragraph.split(/[^\S\n]+/).filter(Boolean)) {
      if(line && measure(line+' '+word)>width){lines.push(line);line='';}
      while(measure(word)>width){
        let part='';
        for(const char of word){if(part && measure(part+char)>width)break;part+=char;}
        lines.push(part);word=word.slice(part.length);
      }
      if(word)line+=(line?' ':'')+word;
    }
    if(line || !lines.length)lines.push(line);
    return lines;
  });
}
export function observationLayout(ctx,text){
  for(let size=20;size>=14;size--){
    ctx.font=size+'px Gotham';
    const lines=observationLines(text,s=>ctx.measureText(s).width,1038),height=size+5;
    if(lines.length*height<=156)return {lines,size,height};
  }
  return null;
}
export function localReportDate(now=new Date()){
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
export function reportIdentityError(meta){
  if(!/^[A-Za-z0-9_-]{1,30}$/.test(meta.number))return 'Indica un consecutivo de hasta 30 caracteres: letras, números, guion o guion bajo.';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)||!Number.isFinite(Date.parse(meta.date+'T12:00:00Z'))||new Date(meta.date+'T12:00:00Z').toISOString().slice(0,10)!==meta.date)return 'Indica una fecha válida para el informe.';
  if(!/^[A-Za-z0-9_-]{1,12}$/.test(meta.version))return 'Indica una versión de hasta 12 caracteres: letras, números, guion o guion bajo.';
  return '';
}
export function filesLayout(ctx,files){
  for(let size=15;size>=10;size--){
    ctx.font=size+'px Gotham';
    const lines=observationLines(files.join(' | '),s=>ctx.measureText(s).width,1638),height=size+4;
    if(lines.length*height<=64)return {lines,size,height};
  }
  return null;
}
export function includeObservedPages(draft){
  for(const type of draft.types)if(draft.notes[type]?.trim())draft.selected.add(type);
}
export function reportFileName(section,number){
  const building=String(section).replace(/^PT(?=\d)/i,'');
  const sequence=String(number).replace(/^IFC-/i,'');
  if(!/^[A-Za-z0-9_-]{1,30}$/.test(building)||!/^[A-Za-z0-9_-]{1,30}$/.test(sequence))throw new Error('Edificio o número de informe no válido.');
  return `L1T1-0000-${building}-EMB-BIM-${sequence}-IN`;
}
// Letterbox captures: preserve the entire saved view without stretching or cropping.
export function containedImageRect(width,height,x,y,maxWidth,maxHeight){
  const scale=Math.min(maxWidth/width,maxHeight/height),w=width*scale,h=height*scale;
  return {x:x+(maxWidth-w)/2,y:y+(maxHeight-h)/2,width:w,height:h};
}
