# Wejdan Life OS («وجدان»)

A personal day-planner / habits / projects / joy / money **PWA** for one owner, in Arabic (RTL, friendly Saudi dialect). Everything is stored **on the device** (IndexedDB via Dexie): no server, no accounts, no analytics, no sync. Built with React 18 + TypeScript + Vite, installable and offline-capable.

- Five tabs: **اليوم** (Today), **عاداتي** (Habits, flower garden), **مساري** (Path: projects, goals, IELTS, driving), **متعتي** (Joy and rewards), **أنا** (Me: money, notes, search, review, settings).
- Day plan in *suggestion mode* (nothing is added or moved without the owner's tap), momentum and sparks, optional flexible streak, in-app reminders with `.ics` calendar export.
- Optional on-device **app lock** with several profiles (AES-GCM-256 at rest, PBKDF2 key derivation, recovery code), encrypted backups, old-app (Flutter) data migration.
- Light **and** dark themes, identity colours only (White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5`), IBM Plex Sans Arabic + El Messiri (self-hosted, OFL).

Live app: <https://wejdan0404.github.io/wejdan-os/> (release 2, a build of `main` @ `ed0df23` per the integrator; see `docs/handoff/01_EXECUTIVE_SUMMARY.md` §3).

## Quick start

Requires Node 22 and npm 10 (verified with Node v22.22.2 / npm 10.9.7; no `engines` field).

```bash
npm ci                                   # install exactly from package-lock.json
npm run dev                              # dev server — open http://localhost:5173/wejdan-os/  (note the base path)
npm test                                 # vitest: 63 files / 726 tests
npx tsc --noEmit -p tsconfig.app.json    # type-check src + tests (bare `tsc --noEmit` checks nothing)
npm run build                            # tsc -b && vite build  → dist/ (service worker + manifest included)
npm run preview                          # serve dist at http://localhost:4173/wejdan-os/
npm run privacy:scan                     # needs a git checkout; fails on tokens, e-mail, phone numbers, private file names (run before every push)
```

`npm run brand:assets` regenerates the icons and iOS splash images from `public/brand/*.svg` (overwrites files in `public/`; only when the logo changes). There is no `lint` script: ESLint cannot run until its packages are added (see `docs/handoff/18_REMAINING_BACKLOG.md`, LOS-037). End-to-end Playwright scripts live in `tests/e2e/` and are run by hand (see `docs/handoff/20_CODEX_EXECUTION_PLAYBOOK.md` §2).

## Repository map

| Path | What |
|---|---|
| `src/domain/` | Framework-free domain: models, engines (planner, momentum, sparks, …), store, Dexie repository, vault (lock) — **no React, no UI imports** |
| `src/ui/` | React UI: shell and routes, screens per area, shared components, tokens (`styles/tokens.css`), lock UI |
| `src/pwa/` | Service-worker boot, update prompt, legacy Flutter cleanup |
| `public/` | Static assets: icons, splash, brand SVGs, the legacy Flutter takeover shims (do not delete) |
| `tests/` | `domain/`, `ui/`, `migration/` (Vitest) and `e2e/` (Playwright scripts) |
| `scripts/` | Brand-asset generator, privacy scan |
| `docs/handoff/` | The engineering handoff package (start at `00_HANDOFF_INDEX.md`) |

## For engineers and coding agents

1. `CODEX_START_HERE.md` — orientation, current state, first work item.
2. `AGENTS.md` — the working rules (architecture boundaries, Arabic/RTL copy, tokens, privacy, tests, git, Definition of Done).
3. `docs/handoff/00_HANDOFF_INDEX.md` — index of the 23 handoff documents, decisions that override generic prompts, and the open backlog.

## Privacy

This is a public repository. Never commit personal data (routines, products, personal action library, health items, backups, recovery codes, tokens, e-mail). Test data is always named `test`. Run `npm run privacy:scan` before every push.

## Licence

No licence file has been chosen yet (all rights reserved by default); third-party packages keep their own licences (fonts: OFL-1.1). See `docs/handoff/17_SECURITY_AND_LIMITATIONS.md` §10.

---

## بالعربي (ملخص)

**وجدان** تطبيق ويب (PWA) شخصي يرتّب اليوم والعادات والمشاريع والمتعة والمال بدون ضغط ولا لوم. الواجهة عربية بالكامل (من اليمين لليسار وباللهجة السعودية)، وكل البيانات تُحفظ على الجهاز نفسه فقط: ما فيه خادم ولا حسابات ولا تتبّع.

- المطوّر يحتاج Node 22: شغّلي `npm ci` ثم `npm run dev` وافتحي `/wejdan-os/` (المسار الأساسي مهم).
- الاختبارات: `npm test` (726 اختبارًا)، والبناء: `npm run build`، وفحص الخصوصية قبل أي رفع: `npm run privacy:scan`.
- ابدئي من `CODEX_START_HERE.md` ثم `AGENTS.md` ثم `docs/handoff/00_HANDOFF_INDEX.md`.
- القرارات المعتمدة من المالكة (وضعان فاتح وداكن، ألوان الهوية فقط، خط IBM Plex Sans Arabic مع El Messiri) تغلب أي برومبت عام؛ خط «ثمانية» غير مستخدم لأن رخصته تمنع استضافة ملفات الخط علنًا.
- المستودع عام: ممنوع رفع أي بيانات شخصية أو نسخ احتياطية أو رموز استرداد.
