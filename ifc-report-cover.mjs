import {reportFileName,observationLines} from './ifc-report-options.mjs?v=20261022-annotations-v2';
export async function loadReportFonts(){
 const fonts=[...['100','200','300','400','500','700','800','900'].map(w=>`${w} 20px Gotham`),'italic 400 20px Gotham','italic 700 20px Gotham'];
 const loaded=await Promise.all(fonts.map(font=>document.fonts.load(font)));
 if(loaded.some(result=>!result.length))throw new Error('No se pudieron cargar las fuentes Gotham. Reintenta cuando estén disponibles.');
}
export async function loadModoLogo(){const logo=new Image();logo.src=new URL('./assets/bogota-mm-logo.png',import.meta.url).href;await logo.decode();return logo;}
export function reportCover({section,label,meta,total,logo}){
 const canvas=document.createElement('canvas');canvas.width=1754;canvas.height=1240;const c=canvas.getContext('2d');
 c.fillStyle='#f7f8fa';c.fillRect(0,0,1754,1240);c.fillStyle='#e60028';c.fillRect(0,0,28,1240);c.fillRect(82,82,74,8);
 c.fillStyle='#59616d';c.font='500 19px Gotham';c.fillText('EMPRESA METRO DE BOGOTÁ',82,139);
 c.fillStyle='#121d2a';c.font='900 74px Gotham';c.fillText('INFORME',82,300);c.font='800 66px Gotham';c.fillText('DE REVISIÓN IFC',82,385);
 c.font='300 30px Gotham';c.fillText('GEMELO DIGITAL',86,451);
 const scale=Math.min(690/logo.width,580/logo.height);c.drawImage(logo,977,90,logo.width*scale,logo.height*scale);
 c.strokeStyle='#cdd3da';c.lineWidth=2;c.beginPath();c.moveTo(82,550);c.lineTo(1670,550);c.stroke();
 c.fillStyle='#e60028';c.font='700 35px Gotham';c.fillText('EDIFICACIÓN / UBICACIÓN',82,630);
 c.fillStyle='#121d2a';let size=44;do{c.font=`500 ${size}px Gotham`;if(c.measureText(label).width<1570)break;size--;}while(size>22);c.fillText(label,82,698);
 c.font='400 23px Gotham';const name=reportFileName(section,meta.number);observationLines(name,t=>c.measureText(t).width,1500).forEach((line,i)=>c.fillText(line,82,781+i*32));
 c.font='300 24px Gotham';c.fillText('Fecha: '+meta.date.split('-').reverse().join('/')+'     Versión: '+meta.version,82,865);
 c.font='italic 400 20px Gotham';c.fillStyle='#59616d';c.fillText('Revisión por tipología de entidades IFC',82,922);
 c.fillStyle='#121d2a';c.font='500 37px Gotham';c.fillText('Equipo BIM-OTI-EMB',82,1134);
 c.font='200 20px Gotham';c.fillStyle='#59616d';c.textAlign='right';c.fillText('01 / '+String(total).padStart(2,'0'),1670,1134);
 return canvas.toDataURL('image/jpeg',.95);
}
