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

const CACHE_NAME = "memorycare-v13";

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
  "./assets/assamese_interface_voice/appTag.mp3",
  "./assets/assamese_interface_voice/appTitle.mp3",
  "./assets/assamese_interface_voice/back.mp3",
  "./assets/assamese_interface_voice/done.mp3",
  "./assets/assamese_interface_voice/english.mp3",
  "./assets/assamese_interface_voice/faceBlurb.mp3",
  "./assets/assamese_interface_voice/faceHelp.mp3",
  "./assets/assamese_interface_voice/facePromptRelated.mp3",
  "./assets/assamese_interface_voice/facePromptWhich.mp3",
  "./assets/assamese_interface_voice/facePromptWho.mp3",
  "./assets/assamese_interface_voice/facePromptWhoRelated.mp3",
  "./assets/assamese_interface_voice/faceShape.mp3",
  "./assets/assamese_interface_voice/familyHelp.mp3",
  "./assets/assamese_interface_voice/familyPhotos.mp3",
  "./assets/assamese_interface_voice/hindi.mp3",
  "./assets/assamese_interface_voice/home.mp3",
  "./assets/assamese_interface_voice/nice.mp3",
  "./assets/assamese_interface_voice/patternBlurb.mp3",
  "./assets/assamese_interface_voice/patternHelp.mp3",
  "./assets/assamese_interface_voice/patternName.mp3",
  "./assets/assamese_interface_voice/personRelation.mp3",
  "./assets/assamese_interface_voice/profileName.mp3",
  "./assets/assamese_interface_voice/profileState.mp3",
  "./assets/assamese_interface_voice/profileSubtitle.mp3",
  "./assets/assamese_interface_voice/profileTitle.mp3",
  "./assets/assamese_interface_voice/rel_brother.mp3",
  "./assets/assamese_interface_voice/rel_daughter.mp3",
  "./assets/assamese_interface_voice/rel_doctor.mp3",
  "./assets/assamese_interface_voice/rel_father.mp3",
  "./assets/assamese_interface_voice/rel_friend.mp3",
  "./assets/assamese_interface_voice/rel_granddaughter.mp3",
  "./assets/assamese_interface_voice/rel_grandson.mp3",
  "./assets/assamese_interface_voice/rel_mother.mp3",
  "./assets/assamese_interface_voice/rel_neighbor.mp3",
  "./assets/assamese_interface_voice/rel_nurse.mp3",
  "./assets/assamese_interface_voice/rel_sister.mp3",
  "./assets/assamese_interface_voice/rel_son.mp3",
  "./assets/assamese_interface_voice/rel_spouse.mp3",
  "./assets/assamese_interface_voice/repeat.mp3",
  "./assets/assamese_interface_voice/shapeBlurb.mp3",
  "./assets/assamese_interface_voice/shapeInstCircle.mp3",
  "./assets/assamese_interface_voice/shapeInstDynamic.mp3",
  "./assets/assamese_interface_voice/shapeInstPentagon.mp3",
  "./assets/assamese_interface_voice/shapeInstRectangle.mp3",
  "./assets/assamese_interface_voice/shapeInstSquare.mp3",
  "./assets/assamese_interface_voice/shapeInstStar.mp3",
  "./assets/assamese_interface_voice/shapeInstTriangle.mp3",
  "./assets/assamese_interface_voice/shapeName.mp3",
  "./assets/assamese_interface_voice/startGame.mp3",
  "./assets/assamese_interface_voice/storyBlurb.mp3",
  "./assets/assamese_interface_voice/storyContinue.mp3",
  "./assets/assamese_interface_voice/storyHelp.mp3",
  "./assets/assamese_interface_voice/storyName.mp3",
  "./assets/assamese_interface_voice/welcomeName.mp3",
  "./assets/assamese_interface_voice/wellDone.mp3",
  "./assets/assamese_story_voice/story1/option1.1.mp3",
  "./assets/assamese_story_voice/story1/option1.2.mp3",
  "./assets/assamese_story_voice/story1/option1.3.mp3",
  "./assets/assamese_story_voice/story1/question1.1.mp3",
  "./assets/assamese_story_voice/story1/question1.2.mp3",
  "./assets/assamese_story_voice/story1/question1.3.mp3",
  "./assets/assamese_story_voice/story1/story1.mp3",
  "./assets/assamese_story_voice/story2/option2.1.mp3",
  "./assets/assamese_story_voice/story2/option2.2.mp3",
  "./assets/assamese_story_voice/story2/option2.3.mp3",
  "./assets/assamese_story_voice/story2/question2.1.mp3",
  "./assets/assamese_story_voice/story2/question2.2.mp3",
  "./assets/assamese_story_voice/story2/question2.3.mp3",
  "./assets/assamese_story_voice/story2/story2.mp3",
  "./assets/assamese_story_voice/story3/option3.1.mp3",
  "./assets/assamese_story_voice/story3/option3.2.mp3",
  "./assets/assamese_story_voice/story3/option3.3.mp3",
  "./assets/assamese_story_voice/story3/question3.1.mp3",
  "./assets/assamese_story_voice/story3/question3.2.mp3",
  "./assets/assamese_story_voice/story3/question3.3.mp3",
  "./assets/assamese_story_voice/story3/story3.mp3",
  "./assets/assamese_story_voice/story4/option4.1.mp3",
  "./assets/assamese_story_voice/story4/option4.2.mp3",
  "./assets/assamese_story_voice/story4/option4.3.mp3",
  "./assets/assamese_story_voice/story4/question4.1.mp3",
  "./assets/assamese_story_voice/story4/question4.2.mp3",
  "./assets/assamese_story_voice/story4/question4.3.mp3",
  "./assets/assamese_story_voice/story4/story4.mp3",
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
