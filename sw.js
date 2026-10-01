/* Team Peaches Hub — Service Worker
 * - La "cáscara" de la app (index.html, manifest, iconos) queda guardada: la app abre aunque no haya internet.
 * - Imágenes y librerías externas (logos, fotos, xlsx, globe.gl, mapa) se guardan al usarse por primera vez.
 * - Las llamadas al servidor (Apps Script, Google login, GitHub API) NUNCA pasan por acá: los datos
 *   se guardan desde index.html (localStorage + IndexedDB), no desde el service worker.
 * Para forzar que todos reciban una versión nueva, sube el número de VERSION. */
const VERSION = "v4";
const SHELL_CACHE = "tph-shell-" + VERSION;
const ASSET_CACHE = "tph-assets-v1";      // no se borra al cambiar VERSION (fotos/librerías)
const MAX_ASSETS = 400;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./fonts/Minecraft-Regular.woff2"];

// Hosts que jamás se cachean (datos vivos / autenticación / escritura)
const NO_CACHE_HOSTS = ["script.google.com", "script.googleusercontent.com", "accounts.google.com", "api.github.com", "oauth2.googleapis.com", "apis.google.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("tph-shell-") && k !== SHELL_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function recortarCache_(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map(k => cache.delete(k)));
}

// Páginas: red primero (para recibir actualizaciones), con tope de 4s; si falla, copia guardada.
async function navegacion_(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(t);
    if (res && res.ok) cache.put("./index.html", res.clone());
    return res;
  } catch (err) {
    return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
  }
}

// Recursos mismo-origen (iconos, manifest): caché primero, se refresca por detrás.
async function mismoOrigen_(req) {
  const cache = await caches.open(SHELL_CACHE);
  const guardado = await cache.match(req);
  const red = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return guardado || (await red) || Response.error();
}

// Externos (imágenes, CDNs): caché primero + refresco por detrás. Se pide con CORS para que la
// copia guardada sea liviana (las respuestas "opacas" pesan ~7 MB c/u en cuota); si el sitio no
// permite CORS, se sirve normal sin guardarla.
async function externo_(req) {
  const cache = await caches.open(ASSET_CACHE);
  const guardado = await cache.match(req.url);
  const refrescar = fetch(req.url, { mode: "cors", credentials: "omit" })
    .then(res => { if (res && res.ok) { cache.put(req.url, res.clone()); recortarCache_(cache); } return res; })
    .catch(() => null);
  if (guardado) { refrescar.catch(() => {}); return guardado; }
  const res = await refrescar;
  if (res) return res;
  try { return await fetch(req); } catch (e) { return Response.error(); }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  if (NO_CACHE_HOSTS.indexOf(url.hostname) !== -1) return;

  if (req.mode === "navigate") { e.respondWith(navegacion_(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(mismoOrigen_(req)); return; }
  const dest = req.destination;
  if (dest === "image" || dest === "script" || dest === "style" || dest === "font" || dest === "") {
    // dest "" cubre fetch() de la app (ej. geojson del mapa); solo CDNs/imágenes, no APIs
    if (dest === "" && !/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/.test(url.hostname)) return;
    e.respondWith(externo_(req));
  }
});
