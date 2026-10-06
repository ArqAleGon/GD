/* One persistent document owns fullscreen; only its scene frame is replaced. */
(() => {
  const pages = new Set(['index.html', 'bim.html', 'predial.html', 'documents.html', 'model-register.html']);
  const base = new URL('./', location.href);
  function route(value) {
    const url = new URL(value, base);
    const name = url.pathname.slice(base.pathname.length) || 'index.html';
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !pages.has(name)) return null;
    return { url, name, source: new URL(name.replace('.html', '-scene.html') + url.search + url.hash, base) };
  }
  const initial = route(location.href);
  // Predial's document preview is embedded content, not scene navigation.
  if (initial.url.searchParams.get('embed') === '1') {
    location.replace(initial.source.href);
    return;
  }
  if (parent !== window && parent.embSceneShell) {
    parent.embSceneShell.navigate(initial.url.href);
    return;
  }
  let frame;
  const status = document.querySelector('#shellStatus');
  function navigate(value, push = true) {
    const next = route(value);
    if (!next) return false;
    if (push && next.url.href !== location.href) history.pushState(null, '', next.url);
    status.hidden = false;
    const fresh = document.createElement('iframe');
    fresh.id = 'sceneFrame';
    fresh.title = 'Metro Digital · escena activa';
    fresh.allow = 'fullscreen';
    fresh.allowFullscreen = true;
    next.source.searchParams.set('brand', '20261006-level-controls-v2');
    fresh.src = next.source.href;
    fresh.addEventListener('load', () => {
      status.hidden = true;
      try { document.title = fresh.contentDocument.title; } catch {}
    });
    if (frame) frame.replaceWith(fresh); else document.body.append(fresh);
    frame = fresh;
    return true;
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }
  window.embSceneShell = {
    navigate, toggleFullscreen,
    isFullscreen: () => !!document.fullscreenElement,
    syncView(view) {
      if (route(location.href)?.name !== 'index.html') return;
      const url = new URL(location.href);
      if (view === 'urban') url.searchParams.set('view', 'urban'); else url.searchParams.delete('view');
      history.replaceState(null, '', url);
    }
  };
  document.addEventListener('fullscreenchange', () => {
    frame?.contentWindow?.dispatchEvent(new Event('shellfullscreenchange'));
  });
  window.addEventListener('popstate', () => navigate(location.href, false));
  navigate(location.href, false);
})();
