'use strict';
// Legacy kill switch. The old Flutter build of this app lived at this same path.
// If any device still has a Flutter service worker registered, the browser's
// update check fetches this file. It then:
//  1. collects every open window of the app,
//  2. drops Flutter's caches (never IndexedDB — her old data stays for the
//     in-app migration),
//  3. unregisters itself,
//  4. reloads those windows on a fresh URL so a page cached by HTTP
//     (GitHub Pages caches 10 min) isn't reused — the new app then loads.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    let windows = [];
    try { windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); } catch (e) { /* ignore */ }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => /^flutter/i.test(k)).map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    try { await self.registration.unregister(); } catch (e) { /* ignore */ }
    for (const c of windows) {
      try {
        if (!c.url || !('navigate' in c)) continue;
        const u = new URL(c.url);
        u.searchParams.set('r', String(Date.now()));
        await c.navigate(u.toString());
      } catch (e) { /* ignore */ }
    }
  })());
});
// While this worker briefly controls pages, never serve from the old cache.
self.addEventListener('fetch', () => { /* network as usual */ });
