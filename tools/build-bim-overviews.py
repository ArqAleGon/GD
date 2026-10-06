"""Generate display-only contextual meshes; original IFC parts remain the selection source."""
import pathlib,json,gzip,struct,collections,sys,numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
placement=json.loads((ROOT/'ifc-placement-20260915-i16-e16.json').read_text('utf-8'))
sections=sorted({m['section'] for m in placement['models'] if m.get('instanceIdentity')=='ifc-globalid'})
manifest=json.loads((ROOT/'bim-overviews.json').read_text('utf-8')) if (ROOT/'bim-overviews.json').exists() else {}
for section in sections:
 if len(sys.argv)>1 and section not in sys.argv[1:]:continue
 reportPath=ROOT/f'assets/models/stations/{section.lower()}-conversion.json'
 if not reportPath.exists():continue
 report=json.loads(reportPath.read_text('utf-8'))
 if report['status']!='converted':continue
 low=np.min([m.get('displayBounds',m.get('bodyBounds',m['bounds']))['min'] for m in report['models']],axis=0);high=np.max([m.get('displayBounds',m.get('bodyBounds',m['bounds']))['max'] for m in report['models']],axis=0);origin=(low+high)/2
 groups=collections.defaultdict(list);sourceTriangles=0
 for model in report['models']:
  for part in model['parts']:
   raw=gzip.decompress((ROOT/part['file']).read_bytes());size=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+size]);binary=raw[28+size:]
   def accessor(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];width={'SCALAR':1,'VEC3':3}[a['type']]
    return np.frombuffer(binary,dtype=dtype,count=a['count']*width,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)
   for node in g['nodes']:
    if node['extras'].get('ifcRepresentation')=='Axis':continue
    matrix=np.array(node['matrix']).reshape(4,4).T
    if model.get('displayTransform'):matrix=np.array(model['displayTransform']).reshape(4,4).T@matrix
    for prim in g['meshes'][node['mesh']]['primitives']:
     if prim.get('mode',4)!=4:continue
     vertices=accessor(prim['attributes']['POSITION']).astype(float)@matrix[:3,:3].T+matrix[:3,3]-origin
     indices=accessor(prim['indices']).reshape(-1,3);sourceTriangles+=len(indices)
     # A 50 cm display grid collapses tiny details without inventing building envelopes.
     grid=np.rint(vertices/.5).astype(np.int32);tri=grid[indices]
     valid=np.any(tri[:,0]!=tri[:,1],axis=1)&np.any(tri[:,0]!=tri[:,2],axis=1)&np.any(tri[:,1]!=tri[:,2],axis=1)
     tri=tri[valid]
     if len(tri):
      material=g['materials'][prim['material']]['pbrMetallicRoughness']['baseColorFactor'];key=tuple(round(c,3) for c in material)
      groups[key].append(tri)
 data=bytearray();out={'asset':{'version':'2.0','generator':'Metro Digital contextual overview, 0.5 m grid'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'translation':origin.tolist()}],'meshes':[{'primitives':[]}],'materials':[],'buffers':[{}],'bufferViews':[],'accessors':[]};triangles=0
 def write(a,component,kind):
  while len(data)%4:data.append(0)
  view=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':a.nbytes});data.extend(a.tobytes())
  entry={'bufferView':view,'componentType':component,'count':len(a),'type':kind}
  if kind=='VEC3':entry.update(min=a.min(0).tolist(),max=a.max(0).tolist())
  index=len(out['accessors']);out['accessors'].append(entry);return index
 for colour,chunks in groups.items():
  tri=np.concatenate(chunks);verts,inverse=np.unique(tri.reshape(-1,3),axis=0,return_inverse=True);faces=np.unique(inverse.reshape(-1,3),axis=0).astype('<u4');triangles+=len(faces)
  pos=(verts*.5).astype('<f4');assert np.isfinite(pos).all() and faces.max()<len(pos)
  out['meshes'][0]['primitives'].append({'attributes':{'POSITION':write(pos,5126,'VEC3')},'indices':write(faces.ravel(),5125,'SCALAR'),'material':len(out['materials'])})
  out['materials'].append({'pbrMetallicRoughness':{'baseColorFactor':list(colour),'metallicFactor':0,'roughnessFactor':.8},'doubleSided':True,**({'alphaMode':'BLEND'} if colour[3]<.99 else {})})
 out['buffers'][0]['byteLength']=len(data);j=json.dumps(out,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data.extend(b'\0'*((-len(data))%4));raw=struct.pack('<4sII',b'glTF',2,28+len(j)+len(data))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(data),b'BIN\0')+data
 path=f'assets/models/stations/{section.lower()}-overview.glb.gz';packed=gzip.compress(raw,mtime=0);(ROOT/path).write_bytes(packed)
 manifest[section]={'file':path,'bounds':{'min':low.tolist(),'max':high.tolist()},'sourceTriangles':sourceTriangles,'triangles':triangles,'bytes':len(packed),'displayGridMeters':.5}
 print(section,len(packed),triangles,'/',sourceTriangles,flush=True)
(ROOT/'bim-overviews.json').write_text(json.dumps(manifest,indent=2)+'\n','utf-8')

