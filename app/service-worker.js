// Bonita OPC Companion — app-shell cache.
// Enough for "Add to Home Screen" to behave like an app: instant repeat loads,
// a usable offline fallback. All real data still lives in localStorage on the
// page itself (see church-app.html) — this only caches the shell that renders it.

const CACHE = "bopc-app-shell-v1";
const SHELL = [
  "./church-app.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for the shell, network-first for everything else (fonts, maps,
// YouTube) so content stays fresh when there is a connection.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isShellRequest = SHELL.some((path) =>
    new URL(path, self.registration.scope).href === event.request.url
  );

  if (isShellRequest) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
