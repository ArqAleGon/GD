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
    ctx.font=size+'px Arial';
    const lines=observationLines(text,s=>ctx.measureText(s).width,1038),height=size+5;
    if(lines.length*height<=156)return {lines,size,height};
  }
  return null;
}
