/* 安全版 Service Worker（v8）
 * 不再做任何离线缓存，纯网络透传；激活时清空所有历史缓存。
 * 作用：把此前被旧版 SW 缓存“锁死”、导致页面突然打不开的情况彻底解除。
 * 页面 index.html 启动时也会主动 unregister 本 SW，使其完全退出。
 */
const CACHE = 'my-schedule-v8';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 不缓存任何请求，直接走网络，保证永远拿到最新页面 */
self.addEventListener('fetch', e => { /* network only */ });
