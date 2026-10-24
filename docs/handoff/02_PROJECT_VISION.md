# 02 — Project Vision

> **ملخص**
> «وجدان» مساحة شخصية هادية تنظّم اليوم بدون ضغط ولا لوم: الخطة تقترح وهي تقرر، والبيانات على جوالها بس.
> الهوية بصرية وصوتية محددة (ألوانها فقط، عربي سعودي ودود، ورد لكل تصنيف، نجمة الإنجاز)، والتحفيز اختياري ومرن.
> هذا الملف يحدد وش المنتج لازم يكونه ووش ممنوع يصير، عشان أي تطوير جاي ما يخرج عن روحه.

Sources: owner decisions recorded in the project ledger (`2026-10-24-react-rebuild-ledger.md`, outside this repo) and the session summary; behaviour verified in code where noted. Quotes of Arabic strings are product strings.

## 1. Purpose

A personal "life operating system" for one person, shipped as an installable web app. It helps her:

- see a **realistic day** (not an overloaded one) and add things to it by choice,
- keep **habits and care routines** without streak anxiety,
- move **projects and goals** forward with a clear next step,
- hold **joy, rewards, money (payday cycle, bills), notes and decisions** in one calm place,
- keep her data **private, on her phone**, with simple export/restore.

## 2. User and context

- One owner (Wejdan), iPhone, Arabic, Saudi (Asia/Riyadh time zone; `timeZoneName: 'Asia/Riyadh'` in `src/domain/models.ts` defaults). Prayer-time anchors use `adhan` with Umm Al-Qura (`src/domain/engine/anchors.ts`).
- Other people may open the same URL and get their **own** data (each device stores its own); a neutral edition for friends (name/logo/wording) was **not requested** and is not built (audit row, owner-deferred).
- Installed as a home-screen PWA from `https://wejdan0404.github.io/wejdan-os/`; must work offline after the first open.

## 3. Product principles (owner-approved)

| Principle | What it means in the product | Where to see it |
|---|---|---|
| Suggestion mode | The engine proposes; she adds with a tap. Nothing is silently added, trimmed or postponed. Postponed/moved items appear in «بعدين». | `settings.planMode` default `'suggest'` (`src/domain/models.ts`), `src/ui/screens/today/LaterSheet.tsx` |
| No guilt | No red failure states, no "you missed" wording; skipped routine ends calmly; weekly review is a reorder, not a score. | Copy review (`PER-REPORT`: `review/copy-report.md`), `WeeklyReviewScreen.tsx` (6 neutral questions) |
| Momentum, not streak pressure | Momentum, sparks and rewards stay. A **flexible streak** (2 compensation days per week) is optional and calm; turning it off leaves momentum only. | `src/domain/engine/momentum.ts`, `tests/domain/flexibleStreak.test.ts` |
| One flower per category | 16 flower kinds × 5 growth stages (seed, bud, opening, blooming, rooted) bound to habit strength. The old aquarium was retired. | `src/ui/components/flowers/drawings.json` (16 keys × 5 stages, VERIFIED-NOW), `RETIRED_DOMAINS` in `src/domain/snapshot.ts` |
| Resting, not failing | A habit that is paused, in a rest domain, or not done on any planned day in the last 7 days shows «ترتاح». | `tests/domain/resting.test.ts` |
| Local-only | No server, no cloud accounts, no analytics, no sync. Backup = JSON export / import with preview and an automatic backup before import (last 5). | storage in `src/domain/storage.ts`; export/import in `SettingsScreen.tsx` |
| Honest copy | UI text must not promise what the system cannot do (example: reminders say they show only while the app is open; phone alerts come via the calendar export). | `src/ui/screens/reminders/RemindersScreen.tsx` |
| Calm motion, reduced-motion respected | Spring transitions via Framer Motion; reduced motion supported in 37 source files that reference it (VERIFIED-NOW by grep count). | `src/ui/motion.ts` |

## 4. Identity

- **Colours:** White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5` and their scales. Both **light and dark** themes exist (Settings theme choice). The generic master prompt suggested charcoal/turquoise: the owner **rejected** that.
- **Mark:** the W monogram (owner's SVGs in `public/brand/`, inline `currentColor` component `WMark`). Concave 4-point star is reserved for achievement/evidence (component `StarMark.tsx`; the "max 3 per screen" rule is `NOT VERIFIED` in code).
- **Type:** IBM Plex Sans Arabic for text, El Messiri for display. Thmanyah is not used (licence forbids public hosting of the font files). A native iOS app might be able to use it only after a written licence question (LOS-020).
- **Voice:** friendly Saudi dialect, feminine address, no formal MSA phrases such as «يمكنك / سوف / لقد / الرجاء» (audit grep: 0 hits in the UI at `0fa7aa6`, `PER-REPORT`).
- **Language:** Arabic only, RTL. No English switch.

## 5. Navigation

Five tabs, fixed by decision: **اليوم · عاداتي · مساري · متعتي · أنا**. Full-screen flows hide the tab bar (`fullscreen` routes in `src/ui/routes.tsx`: morning brief, weekly review, note editor, import review).

## 6. Non-goals (do not build without a new owner decision)

- Any backend, login to a cloud service, social features, analytics, remote sync, remote push notifications.
- Collecting or bundling anyone's health/medical data. The cycle module exists in the data model as an optional switch, **off by default** (`cycleModule: false`); the public build contains no women's-health content (privacy grep: 0 hits for the removed module's keywords in `src/` and `public/`, VERIFIED-NOW).
- Streak mechanics that punish a miss.
- Colour or font changes outside the identity.
- A "neutral edition" for friends, unless the owner asks.
- Rewriting repository history or making the repository private on your own.

## 7. Success looks like

- She can open the app on her iPhone, offline, and see a calm Today with suggestions she can add in one tap.
- Her data survives reloads and can be exported/restored; a lock is available if she wants one.
- Nothing she did is lost or hidden by the app; every destructive action is undoable or backed up.
- The public repository and the published build contain only neutral, synthetic data.
