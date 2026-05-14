const CACHE_NAME = 'face-id-v99';
const ASSETS = ['index.html', 'manifest.json'];
const CDN_TIMEOUT = 5000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const fetchWithTimeout = (url, timeout) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]);
};

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const {request} = e;
  const url = new URL(request.url);
  const isCDN = url.hostname.includes('cdn') || url.hostname.includes('jsdelivr');

  e.respondWith(
    caches.match(request).then(r => {
      if(r) return r;
      const fetcher = isCDN ? fetchWithTimeout(request.url, CDN_TIMEOUT) : fetch(request);
      return fetcher.then(r => {
        if(!r || r.status !== 200 || r.type === 'error') return r;
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return r;
      }).catch(() => caches.match('index.html'));
    })
  );
});
