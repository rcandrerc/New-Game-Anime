// app do jogo de hábitos: busca sempre a versão nova na internet e guarda uma cópia pra abrir sem internet
const CACHE = 'habitos-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url); if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (/\.(glb|mp3|ogg|wav|webp|jpg)$/i.test(u.pathname)) return; // modelos e sons ficam no cache normal do navegador (passar pelo app deixava o carregamento lento)
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)) } return res })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(c => c || Response.error())));
});
