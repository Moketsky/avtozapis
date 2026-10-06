// Кэш оболочки: приложение открывается с главного экрана даже без сети.
// Страницы берём из сети, чтобы обновления доезжали сразу; остальное отдаём из кэша и обновляем фоном.
const CACHE = 'autozapis-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // запросы к серверу записи никогда не кэшируем — расписание должно быть свежим
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/') || url.pathname.endsWith('/api.php')) return;

  const isPage = req.mode === 'navigate' || req.url.endsWith('.json') || req.url.endsWith('.webmanifest');

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return isPage ? network.then((res) => res || cached) : cached || network;
    })
  );
});
