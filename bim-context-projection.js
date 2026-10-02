// CarMAGBOG parameters from TRAZADO_PLMB.prj. Same inverse used to build Inicio.
// Input WGS84 degrees; output projected metres (never screen/map units).
export function projectBogota(lon, lat) {
  const a=6380687, f=1/298.257222101, e=f*(2-f), ep=e/(1-e);
  const rad=Math.PI/180, p=lat*rad, p0=4.680486111*rad;
  const arc=t=>a*((1-e/4-3*e**2/64-5*e**3/256)*t-(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*t)+(15*e**2/256+45*e**3/1024)*Math.sin(4*t)-35*e**3/3072*Math.sin(6*t));
  const n=a/Math.sqrt(1-e*Math.sin(p)**2),t=Math.tan(p)**2,c=ep*Math.cos(p)**2,A=(lon+74.14659167)*rad*Math.cos(p);
  return [92334.879+n*(A+(1-t+c)*A**3/6+(5-18*t+t*t+72*c-58*ep)*A**5/120),109320.965+arc(p)-arc(p0)+n*Math.tan(p)*(A*A/2+(5-t+9*c+4*c*c)*A**4/24+(61-58*t+t*t+600*c-330*ep)*A**6/720)];
}
export function mapToBim(x,y,meta,origin) {
  const [w,s,e,n]=meta.bbox;
  // Use the exact aspect ratio of the generator, not its rounded display metadata.
  const height=meta.mapWidth*(n-s)/(e-w);
  const p=projectBogota(w+x/meta.mapWidth*(e-w),n-y/height*(n-s));
  return [(p[0]-origin[0])*.06,-(p[1]-origin[1])*.06];
}
