/*
 * MemoryCare NER service worker
 *
 * Caching strategy (cache-first for the whole static shell):
 * - INSTALL: precache every HTML/CSS/JS/icon/manifest file needed to play
 *   all games with zero network after the first successful load.
 * - ACTIVATE: delete any cache whose name is not the current versioned
 *   cache (memorycare-v1, memorycare-v2, …) so updates do not leave
 *   stale files behind.
 * - FETCH: cache-first for GET requests. This app has no API yet, so
 *   there is no network-first or stale-while-revalidate path. If the
 *   cache misses, try the network once and store same-origin successes.
 *   Navigations fall back to the cached index.html when offline.
 */

const CACHE_NAME = "memorycare-v11";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/main.js",
  "./js/app.js",
  "./js/db.js",
  "./js/adaptive.js",
  "./js/voice.js",
  "./js/i18n.js",
  "./js/ui.js",
  "./js/profile.js",
  "./js/familyPeople.js",
  "./js/games/patternMatching.js",
  "./js/games/shapeSort.js",
  "./js/games/faceNameRecall.js",
  "./js/games/rememberMyStory.js",
  "./js/content/shapeSortContent.js",
  "./js/content/faceNameContent.js",
  "./js/content/patternMatchingContent.js",
  "./js/content/storyContent.js",
  "./vendor/dexie.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/M.png",
  "./assets/food/momos.jpg",
  "./assets/food/thukpa.jpg",
  "./assets/food/pitha.jpg",
  "./assets/food/khar.jpg",
  "./assets/food/jadoh.jpg",
  "./assets/food/bamboo-shoot-curry.jpg",
  "./assets/food/fish-tenga.jpg",
  "./assets/fruit/assam-orange.jpg",
  "./assets/fruit/pineapple.jpg",
  "./assets/fruit/litchi.jpg",
  "./assets/fruit/passion-fruit.jpg",
  "./assets/fruit/kiwi.jpg",
  "./assets/fruit/star-fruit.jpg",
  "./assets/objects/clock.jpg",
  "./assets/objects/telephone.jpg",
  "./assets/objects/chair.jpg",
  "./assets/objects/book.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
