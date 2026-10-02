let shell = null;
try { if (parent !== window) shell = parent.embSceneShell; } catch {}
const fullscreen = document.querySelector('[data-scene-fullscreen]');
function updateFullscreen() {
  if (!fullscreen) return;
  const active = shell ? shell.isFullscreen() : !!document.fullscreenElement;
  const title = active ? 'Salir de pantalla completa' : 'Ampliar a página completa';
  fullscreen.setAttribute('aria-pressed', String(active));
  fullscreen.setAttribute('aria-label', title);
  fullscreen.title = title;
  const label = fullscreen.querySelector('[data-fullscreen-label]');
  if (label) label.textContent = active ? 'Salir' : 'Pantalla completa';
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-scene-fullscreen]');
  if (button) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      if (shell) await shell.toggleFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      button.title = 'El navegador no permitió pantalla completa. Intenta de nuevo.';
    }
    updateFullscreen();
    return;
  }
  const link = event.target.closest('a[href]');
  if (!shell || !link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  if (shell.navigate(link.href)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.addEventListener('shellfullscreenchange', updateFullscreen);
document.addEventListener('fullscreenchange', updateFullscreen);
document.addEventListener('mockupscenechange', event => shell?.syncView(event.detail?.view));
updateFullscreen();

// Measure wrapped headers instead of assuming a fixed monitor resolution.
const header = document.querySelector('body > header, #app > header');
if (header) new ResizeObserver(() => {
  document.documentElement.style.setProperty('--scene-header', `${Math.ceil(header.getBoundingClientRect().height)}px`);
}).observe(header);
for (const [id, variable] of [['toolbar','--scene-toolbar-height'], ['povControls','--scene-pov-height']]) {
  const control = document.getElementById(id);
  if (control) new ResizeObserver(() => {
    document.documentElement.style.setProperty(variable, `${Math.ceil(control.getBoundingClientRect().height)}px`);
  }).observe(control);
}

const scene = document.body.dataset.scene;
if (scene !== 'inicio' && new URLSearchParams(location.search).get('embed') !== '1') {
  const bar = document.createElement('div');
  bar.className = 'compactSceneTools';
  for (const [selector, label, cls] of [['main > aside', scene === 'documentos' ? 'Catálogo' : 'Filtros', 'filtersOpen'], ...(scene === 'registro' ? [['.inspector', 'Consulta / registro', 'inspectorOpen']] : [])]) {
    const panel = document.querySelector(selector);
    if (!panel) continue;
    if (!panel.id) panel.id = `responsive-${cls}`;
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const open = document.body.classList.toggle(cls);
      button.setAttribute('aria-expanded', String(open));
    });
    bar.append(button);
  }
  document.body.append(bar);
  document.addEventListener('click', event => {
    if (!event.target.closest('.docCard')) return;
    document.body.classList.remove('filtersOpen');
    bar.querySelector('[aria-controls="responsive-filtersOpen"]')?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.body.classList.remove('filtersOpen', 'inspectorOpen');
    bar.querySelectorAll('button').forEach(button => button.setAttribute('aria-expanded', 'false'));
  });
  // Selection still reveals the consultation panel on compact screens.
  const selected = document.querySelector('.inspector');
  if (selected) new MutationObserver(() => {
    document.body.classList.add('inspectorOpen');
    bar.querySelector('[aria-controls="' + document.querySelector('.inspector').id + '"]')?.setAttribute('aria-expanded','true');
  }).observe(selected, {childList:true});
}
