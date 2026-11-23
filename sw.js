const CACHE_NAME = 'Beerdex-v5.3.12'; // v5.3.12: Remove M3 Expressive & OCR/Pression, soften Nothing OS
// App shell only. Multi-megabyte media (foam.png ~85 MB, logo-bnr.png ~16 MB,
// easter-egg mp3/mp4) is intentionally NOT precached: downloading it on install
// delayed first-run/offline availability dramatically. It is cached lazily by
// the fetch handler when actually used.
const ASSETS = [
    './images/Authentic_trappist_product_logo.svg',
    './index.html',
    './style.css',
    './style-museum.css',
    './css/wrapped.css',
    './js/achievements.js',
    './js/analytics.js',
    './js/api.js',
    './js/app.js',
    './js/aroma-wheel.js',
    './js/autoRarity.js',
    './js/bac.js',
    './js/compare.js',
    './js/crashLogger.js',
    './js/data.js',
    './js/deduplicator.js',
    './js/env.js',
    './js/event-system.js',
    './js/feedback.js',
    './js/fx.js',
    './js/i18n.js',
    './js/idb-store.js',
    './js/import-export.js',
    './js/liquid-glass.js',
    './js/map.js',
    './js/match.js',
    './js/ota-sync.js',
    './js/pairing.js',
    './js/passport.js',
    './js/recommendation.js',
    './js/rust-core.js',
    './js/share.js',
    './js/storage.js',
    './js/thanos.js',
    './js/theme.js',
    './js/ui.js',
    './js/ui-cards.js',
    './js/ui-modals.js',
    './js/ui-scanner.js',
    './js/ui-settings.js',
    './js/utils.js',
    './js/vendor-loader.js',
    './js/widget-bridge.js',
    './js/wrapped.js',
    './js/vendor/brewbrother.js',
    './js/vendor/brewbrother_nlp.js',
    './js/vendor/chart.umd.min.js',
    './js/vendor/chartjs-plugin-annotation.min.js',
    './js/vendor/confetti.browser.min.js',
    './js/vendor/haptics-shim.js',
    './js/vendor/html5-qrcode.min.js',
    './js/vendor/lz-string.min.js',
    './js/vendor/p2p.js',
    './js/vendor/peerjs.min.js',
    './js/vendor/qrcode.min.js',
    './js/vendor/vanilla-tilt.min.js',
    './wasm/beerdex_app.js',
    './wasm/beerdex_app_bg.wasm',
    './data/missing-images.json',
    './data/bac_rules.json',
    './event/events-config.json',
    './data/deutchbeer.json',
    './data/belgiumbeer.json',
    './data/saison.json',
    './data/frenchbeer.json',
    './data/nlbeer.json',
    './data/usbeer.json',
    './data/newbeer.json',
    './data/cobeer.json',
    './data/krbeer.json',
    './data/jpbeer.json',
    './data/cnbeer.json',
    './data/breweries.json',
    './data/thanos_aliases.json',
    './data/locales/en.json',
    './data/locales/fr.json',
    './data/locales/nlp_en.json',
    './data/locales/nlp_fr.json',
    './manifest.webmanifest',
    './icons/192x192.png',
    './icons/512x512.png',
    './offline.html',
    './images/kr.svg',
    './images/jp.svg',
    './images/cn.svg',
    './images/beer/world/birra-moretti-33cl-bottle-lautentica-new-label-2022-988x2216px.png',
    './images/beer/world/AHI_4354523130313833363835.jpg',
    './images/beer/world/AHI_4354523130313931373330.jpg',
    './images/beer/world/AHI_4931354f34776e38514e5763323577624f336f6c3441.jpg',
    './images/beer/world/0_0_orig.webp',
    './images/beer/world/QTAwMTI0MjhfVU5JVA==.webp',
    './images/beer/nl/brouwerijtij-zatte-fles.png',
    './images/beer/nl/brouwerij-t-ij-gouden-ij-bottle.png',
    './images/beer/nl/brouwerijtij-ijwit-fles.png',
    './images/beer/nl/brouwerijtij-vrijwit-fles.png',
    './images/beer/nl/brouwerijtij-ipa-fles.png',
    './images/beer/nl/brouwerijtij-freeipa-blik.png',
    './images/beer/nl/brouwerijtij-nijpa-blik.png',
    './images/beer/nl/brouwerijtij-calypso-blik.png',
    './images/beer/nl/brouwerijtij-blondie-blik.png',
    './images/beer/nl/brouwerijtij-natte-blik.png',
    './images/beer/nl/brouwerijtij-paasij-fles.png',
    './images/beer/nl/brouwerijtij-loeuf-blik.png',
    './images/beer/nl/brouwerijtij-ijbok-blik.png',
    './images/beer/nl/brouwerijtij-ijndejaars-fles.png',
    './images/beer/nl/brouwerijtij-sunnysideup-blik.png',
    './images/beer/nl/brouwerijtij-panjapaloma-blik_2026.png',
    './images/beer/nl/brouwerijtij-columbus-fles.png',
    './images/beer/FUT.jpg',
    './images/beer/default.png',
    './images/Rickroll.png',
    './'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching App Shell');
                // Individual add() so one missing asset can never fail the whole
                // install (addAll is atomic and would leave us with no cache).
                return Promise.allSettled(ASSETS.map(asset => cache.add(asset)));
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Clearing Old Cache');
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    // Only handle GET requests (Cache API does not support HEAD, POST, PUT, DELETE)
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);
    const isJSON = url.pathname.endsWith('.json') || url.search.includes('.json');
    const isImage = url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);
    const isStatic = url.pathname.match(/\.(js|css|wasm|woff2?)$/i);
    const isRoot = url.pathname === '/' || url.pathname === '/index.html';
    const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

    // Strategy: Cache First, Fallback to Network, Fallback to Offline Page
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            // 1. Serve from Cache if available
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Special handling for Google Fonts (Cache on the fly)
            if (isGoogleFont) {
                return fetch(event.request).then(resp => {
                    if (resp && resp.status === 200 && event.request.method === 'GET') {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
                    }
                    return resp;
                }).catch(() => {
                    // Fail gracefully for fonts to avoid TypeError
                    return new Response('', { status: 404 });
                });
            }

            // 3. Fallback for Root to index.html
            if (isRoot) {
                return caches.match('./index.html').then(idx => {
                    return idx || fetch(event.request).catch(() => caches.match('./offline.html'));
                });
            }

            // 4. Fallback to Network
            return fetch(event.request).then(networkResponse => {
                // Cache valid responses on the fly for images and data we encounter
                if (networkResponse && networkResponse.status === 200 && (isImage || isJSON || isStatic) && event.request.method === 'GET') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache)).catch(() => {});
                }
                return networkResponse;
            }).catch(err => {
                // 5. Final Fallback when truly offline
                if (event.request.mode === 'navigate' || isRoot) {
                    return caches.match('./offline.html').then(off => off || new Response('Offline', { status: 503 }));
                }
                
                // --- JSON Robustness ---
                if (isJSON) {
                    return new Response('[]', { 
                        status: 200, 
                        statusText: 'Offline Fallback',
                        headers: new Headers({ 'Content-Type': 'application/json' })
                    });
                }
                
                // Return a valid error response for other assets
                return new Response('Offline', { 
                    status: 503, 
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain' })
                });
            });
        }).catch(() => {
            // Ultimate fallback to prevent any 'Failed to convert value to Response'
            return new Response('Offline Error', { status: 503 });
        })
    );
});

// Listen for skipWaiting message
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
