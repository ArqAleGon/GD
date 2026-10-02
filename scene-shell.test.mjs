import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('./scene-shell.js', import.meta.url), 'utf8');
const location = { href:'https://example.test/GD/index.html?view=urban' };
const listeners = {}, docEvents = {}, children = [];
const document = {
  fullscreenElement:null, title:'',
  querySelector:() => ({hidden:false}),
  addEventListener:(type, fn) => docEvents[type] = fn,
  body:{ append(frame){ children.push(frame); } },
  createElement:() => ({
    addEventListener(){}, contentWindow:{dispatchEvent(){}},
    replaceWith(frame){ children.splice(0,1,frame); }
  }),
  documentElement:{ async requestFullscreen(){ document.fullscreenElement=this; } },
  async exitFullscreen(){ document.fullscreenElement=null; }
};
const history = { pushState(_a,_b,url){location.href=url.href;}, replaceState(_a,_b,url){location.href=url.href;} };
const window = {addEventListener:(type,fn)=>listeners[type]=fn};
vm.runInNewContext(source,{window,parent:window,document,location,history,URL,Set,Event});
const shell = window.embSceneShell;
assert.equal(children.length,1);
assert.equal(children[0].src,'https://example.test/GD/index-scene.html?view=urban');
await shell.toggleFullscreen();
const fullscreenRoot = document.fullscreenElement;
for (const route of ['predial.html?chip=AAA0149DEPA','documents.html?sector=Predial','bim.html','model-register.html?section=PT102','index.html?view=urban']) {
  const previous = children[0];
  assert.equal(shell.navigate(route),true);
  assert.notEqual(children[0],previous);
  assert.equal(children.length,1, 'Previous rendering frame must be released');
  assert.equal(document.fullscreenElement,fullscreenRoot);
  assert.equal(new URL(location.href).search,new URL(children[0].src).search);
}
assert.equal(shell.navigate('https://other.test/index.html'),false);
assert.equal(shell.navigate('../other/index.html'),false);
assert.equal(shell.navigate('assets/file.pdf'),false);
assert.equal(shell.navigate('javascript:alert(1)'),false);
await shell.toggleFullscreen();
shell.navigate('predial.html');
assert.equal(shell.isFullscreen(),false, 'Navigation must respect a manual exit');
location.href='https://example.test/GD/documents.html?chip=AAA0149DEPA';
listeners.popstate();
assert.equal(children[0].src,'https://example.test/GD/documents-scene.html?chip=AAA0149DEPA');
for(const page of ['index','bim','predial','documents','model-register']) {
  const wrapper=readFileSync(new URL(`./${page}.html`,import.meta.url),'utf8');
  const scene=readFileSync(new URL(`./${page}-scene.html`,import.meta.url),'utf8');
  assert.match(wrapper, /scene-shell.js/);
  assert.match(scene, /scene-responsive.css/);
  assert.match(scene, /scene-controls.js\?layout=/);
  for(const match of scene.matchAll(/(?:src|href)="(\.\/)?([^"?#]+)(?:[^\"]*)"/g)) {
    const path=match[2];
    if(!path.includes(':')&&!path.startsWith('#')) assert.ok(existsSync(new URL(path,import.meta.url)),`${page}: missing ${path}`);
  }
}
console.log('PASS: five scenes, fullscreen ownership, manual exit, single active frame, deep links, back navigation, external links, local assets.');
