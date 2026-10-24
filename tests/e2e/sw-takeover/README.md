# Flutter → React takeover (same origin + path)

Manual Playwright check that the React build replaces the old Flutter web build
at `/wejdan-os/` without a blank page, and that her old IndexedDB data survives
for the in-app migration.

Setup (folder `$T`): `flutter/` = old Flutter build, `flutter_cachingsw/` = same
with a simulated old cache-first `flutter_service_worker.js`, `react/` = `dist/`
(touch its files so they are newer, like a real deploy), and `current` naming
the served folder. Run `python3 server.py 8931` (GitHub-Pages-like
`Cache-Control: max-age=600`), then `T=$T node swap.mjs plain|cachingsw|expiredSubres`.

Result (2026-10-24): all three scenarios load the React app on the first launch
(worst case ~7 s in, once the old worker goes idle), show «لقينا بياناتك من
النسخة القديمة — ننقلها؟», keep all 30 legacy `wlo_*` databases (11 habits),
and leave no Flutter cache or worker behind.
