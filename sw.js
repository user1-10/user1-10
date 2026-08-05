/* 日程 App — 离线缓存 Service Worker（v9）
 * 目的：让 App 装到手机后，即使 GitHub 在大陆连不上，也能离线打开、正常使用。
 * 策略：
 *  - 安装时预缓存应用外壳（单文件 index.html + 图标 + manifest）。
 *  - 请求时：命中缓存立即返回（离线秒开），并在后台静默更新缓存。
 *  - 离线且无命中时：回退到已缓存的 index.html，保证 App 永远能打开。
 * 安全：不监听 controllerchange、不做 location.reload()，杜绝“刷新死循环/卡死”。
 */
const VERSION = 'my-schedule-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源请求；外链（若有）直接走网络
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    if (cached) {
      // 离线秒开：先返回缓存，再后台静默刷新
      fetch(req).then(netRes => {
        if (netRes && netRes.status === 200 && netRes.type === 'basic') {
          cache.put(req, netRes.clone());
        }
      }).catch(() => {});
      return cached;
    }
    try {
      const netRes = await fetch(req);
      if (netRes && netRes.status === 200) {
        cache.put(req, netRes.clone());
      }
      return netRes;
    } catch (err) {
      // 离线且未缓存：尽量回退到应用外壳，保证 App 能打开
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
      throw err;
    }
  })());
});
