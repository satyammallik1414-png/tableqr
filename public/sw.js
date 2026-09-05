const VERSION = "smartserve-v1";
const SHELL = `${VERSION}-shell`;
const PUBLIC = `${VERSION}-public`;
const APP_SHELL = ["/", "/offline", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", event => event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Authentication, APIs, admin pages and personalized documents must never enter Cache Storage.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/super-admin") || url.pathname.startsWith("/kitchen") || url.pathname.startsWith("/counter") || url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }
  const safeAsset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:css|js|woff2?|png|jpg|jpeg|webp|avif|svg)$/.test(url.pathname);
  if (safeAsset) event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => { if (response.ok && response.type === "basic") caches.open(PUBLIC).then(cache => cache.put(request, response.clone())); return response; })));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "SYNC_SAFE_ACTIONS") self.clients.matchAll().then(clients => clients.forEach(client => client.postMessage({ type: "SYNC_STATE", state: "complete" })));
});
