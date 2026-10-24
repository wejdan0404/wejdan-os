// Legacy shim. A cached copy of the old Flutter index.html may still ask for this
// file for a few minutes after the update (GitHub Pages caches pages for 10 min).
// Jump to the new app with a fresh URL so the cached page is bypassed.
(function () {
  try {
    var KEY = 'wejdan.legacyShimHops';
    var hops = Number(sessionStorage.getItem(KEY) || '0');
    if (hops >= 3) return; // never loop
    sessionStorage.setItem(KEY, String(hops + 1));
  } catch (e) { /* storage blocked: still try once */ }
  var base = new URL('./', document.baseURI || location.href);
  base.searchParams.set('r', String(Date.now()));
  location.replace(base.toString());
})();
