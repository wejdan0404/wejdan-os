> **ملخص**
> هذا الملف يوثّق نظام التصميم كما هو منفَّذ فعلًا في الكود (tokens.css وmotion.ts وsrc/ui/components) للوضعين الفاتح والداكن، مع قواعد RTL والحركة المخفّفة وإمكانية الوصول.
> في آخر الملف جدول مقارنة بين التصميم المعتمد (لوحة «Wejdan Life OS — Redesign») والمنفَّذ، مع كل فرق تم التحقق منه من الكود.
> كل رقم هنا مأخوذ من الملفات مباشرة؛ أي شيء لم أستطع التحقق منه مكتوب صراحة UNKNOWN أو NOT VERIFIED.

# 07 — Design system (as implemented)

> **Precedence:** the owner's approved decisions override the generic master prompt that asked for a "predominantly dark" UI and Thmanyah/IBM Plex: this system is **light + dark**, identity colours only, **IBM Plex Sans Arabic + El Messiri**; Thmanyah is not used (licence forbids public font hosting). See `15_DECISION_LOG.md` D-59.

Verified on 2026-10-24 against branch `docs/handoff` (on top of `main` @ `ed0df23`; the design tokens and components were unchanged by the gate-3 fixes except `Bidi`, the reminder banner and the lock screens). Sources of truth in code:

| What | File |
|---|---|
| Colour, type, spacing, radius, motion CSS variables | `src/ui/styles/tokens.css` |
| Global reset, focus ring, `.num`, sheet scale-back | `src/ui/styles/base.css` |
| Motion constants for framer-motion (durations, easings, springs) | `src/ui/motion.ts` |
| Fonts | `src/ui/fonts.ts` (imports `@fontsource/*` CSS), `index.html` |
| Components | `src/ui/components/*` (+ `components/flowers`, `components/streak`) |
| Lock-specific form components | `src/ui/lock/fields.tsx`, `ProfileAvatar.tsx` |
| Theme switching | `src/ui/shell/theme.tsx` (`localStorage` key `wejdan.theme`: `system` \| `light` \| `dark`; sets `data-theme` on `<html>`) |

Brand rules that govern the system (owner decisions): identity colours only (White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5`), W mark, concave 4-point star only for achievement/evidence, light **and** dark, Arabic RTL only, Saudi dialect copy, IBM Plex Sans Arabic + El Messiri (Thmanyah NOT used).

---

## 1. Theming mechanism

* `:root, [data-theme='light']` define light tokens; `[data-theme='dark']` defines dark tokens; a third block under `@media (prefers-color-scheme: dark)` with `:root:not([data-theme='light'])` repeats the dark values so "system" follows the OS. **The dark token list is duplicated twice in `tokens.css`** (a change to a dark value must be made in both blocks — see 14_BUGS_AND_TECH_DEBT.md).
* `ThemeProvider` removes `data-theme` for `system`, sets it for explicit choices, and rewrites `<meta name="theme-color">` and the iOS status-bar style to match the real page ground (`syncThemeColor`). `index.html` also ships two media-query `theme-color` metas (`#FFFFFF` / `#0E121C`) for first paint.
* `color-scheme: light|dark` is set per theme so native controls follow.

## 2. Colour tokens and semantic roles

Hex values copied from `tokens.css`. "—" = not overridden in dark (inherits the light value).

### 2.1 Surfaces, text, borders

| Token | Role | Light | Dark |
|---|---|---|---|
| `--surface-default` | screen ground | `#FFFFFF` | `#0E121C` |
| `--surface-subtle` | quiet field, light hero, secondary button | `#F2F7FE` | `#181C26` |
| `--surface-elevated` | sheets, the single elevated card | `#FFFFFF` | `#222630` |
| `--surface-inverse` | inverse | `#0E121C` | `#FFFFFF` |
| `--group-bg` | ground of main screens | `#FFFFFF` | `#0E121C` |
| `--ground-tinted` | ground of settings-like screens (`Screen ground="tinted"`: Me, Settings, Sources, Change log, Import review) | `#F2F7FE` | `#0E121C` |
| `--cell-bg` / `--cell-pressed` | grouped-list cell / pressed | `#FFFFFF` / `#DDEBFC` | `#181C26` / `#222630` |
| `--text-primary` | body, titles | `#0E121C` | `#FFFFFF` |
| `--text-secondary` | secondary copy | `#2B3358` | `#D1D2D5` |
| `--text-muted` | captions, helper text | `#50545C` | `#A2A4A9` |
| `--text-accent` | small links, accent text | `#4E5C96` | `#BEDAF7` |
| `--text-on-inverse` | | `#FFFFFF` | `#0E121C` |
| `--border-subtle` | hairlines, selection | `#BEDAF7` | `#40444D` |
| `--border-default` | | `#9BC4EE` | `#6E7179` |
| `--border-strong` | | `#0E121C` | `#86898F` |
| `--separator` | row separators | `rgba(14,18,28,.10)` | `rgba(255,255,255,.10)` |
| `--check-ring` | empty check circle outline | `#86898F` | `#86898F` |

### 2.2 Brand and action

| Token | Role | Light | Dark |
|---|---|---|---|
| `--brand-primary` | brand violet (marks, small accents) | `#6172B5` | `#7587CF` |
| `--brand-secondary` | | `#9BC4EE` | `#BEDAF7` |
| `--action-default` | primary button, done check, links | `#6172B5` (violet leads) | `#9BC4EE` (sky leads) |
| `--action-hover` | | `#3D4877` | `#BEDAF7` |
| `--action-pressed` | | `#2B3358` | `#7FAAE3` |
| `--on-action` | text on action fill | `#FFFFFF` | `#0E121C` |
| `--action-tint` | secondary-button fill | `#EEF0F8` | `#1B2E4C` |
| `--action-disabled` | | `#E5E6E7` | `#40444D` |
| `--focus-ring` | 2px focus outline | `#6172B5` | `#BEDAF7` |
| `--glow-accent` | | `#9BC4EE` | `#BEDAF7` |
| `--switch-off-border` / `--switch-off-thumb` / `--switch-on-thumb` / `--switch-on-glyph` | switch parts | `#86898F` / `#6E7179` / `#FFFFFF` / `#6172B5` | `#86898F` / `#A2A4A9` / `#0E121C` / `#9BC4EE` |

### 2.3 Status (always paired with icon + text per the visual language)

| Token | Light | Dark |
|---|---|---|
| `--success` / `--success-surface` | `#207F4D` / `#EDF9F2` | `#78E8AF` / `#10291D` |
| `--warning` | `#966400` | `#FFCD53` |
| `--error` / `--on-error` | `#A71A1E` / `#FFFFFF` | `#F78383` / `#0E121C` |
| `--info` | `#2169C7` | `#78B7FF` |

### 2.4 Heat scale (habit grids)

`--heat-0..4`: light `#F2F7FE #DDEBFC #BEDAF7 #9BC4EE #5E93D6`, dark `#181C26 #1B2E4C #2A4470 #3A5F94 #7FAAE3`; ring `--heat-ring` `rgba(14,18,28,.08)` / `#40444D`.

### 2.5 Contrast — computed now (WCAG relative luminance, script run during this handoff)

| Pair | Ratio |
|---|---|
| light text-primary / white | 18.72 |
| light text-secondary / white | 12.23 |
| light text-muted / white · / `#F2F7FE` | 7.60 · 7.06 |
| light text-accent / white | 6.37 |
| light on-action / action (`#FFFFFF` on `#6172B5`) | **4.58** (passes AA for normal text, narrow margin) |
| light check-ring `#86898F` / white | 3.51 (≥3:1 for non-text; the CSS comment says 3.6 — comment is slightly off) |
| light success / warning / error / info on white | 4.99 / 5.10 / 7.47 / 5.37 |
| dark text-primary / `#0E121C` | 18.72 |
| dark text-secondary · muted / `#0E121C` | 12.38 · 7.50 |
| dark text-muted / cell `#181C26` | 6.83 |
| dark text-accent / `#0E121C` | 12.98 |
| dark on-action / action (`#0E121C` on `#9BC4EE`) | 10.27 |
| dark check-ring `#86898F` / cell `#181C26` | 4.86 |
| dark success / warning / error / info on `#0E121C` | 12.44 / 12.58 / 7.60 / 8.93 |

Not computed: text over gradients (Weekly review cover, Morning brief wash, Joy hero), text over glass materials. **NOT VERIFIED.**

### 2.6 Colours outside `tokens.css` (hard-coded hex in components)

These bypass the "no hex inside components" rule of the visual-language brief. All are in files other than `tokens.css`:

| File | Values |
|---|---|
| `src/ui/lock/lock.module.css` (initial-avatar) | `#DCE0EF` / `#3D4877` (light), `#2B3358` / `#BEDAF7` (dark) |
| `src/ui/screens/me/WeeklyReview.module.css` | gradients `#0F1220 → #1E243F → #3D4877` (light cover), `#0F1220 → #12161F → #1A1E29 → #262B3A` (dark), `#959AA6`, `#BEDAF7`, `#D1D2D5`, `#A2A4A9`, `#9BC4EE`/`#0E121C` with `!important` |
| `src/ui/screens/me/WeeklyReviewScreen.tsx` | `<StarMark color="#bedaf7">` |
| `src/ui/screens/joy/JoyScreen.module.css`, `Joy.module.css` | hero vars `#0E121C #FFFFFF #D1D2D5 #BEDAF7 #9BC4EE #222630`, `#0E121C`, error fallback `#A71A1E` |
| `src/ui/screens/today/MorningBrief.module.css` | `--brief-wash-1/2`, `--brief-diamond`: `#DDEBFC #F2F7FE #B9C1DE` / `#1A1F3A #141826 #2B3358` |
| `src/ui/shell/theme.tsx` | fallback `#0E121C` / `#FFFFFF` for the theme-color meta |

Several of these (`#12161F`, `#1A1E29`, `#959AA6`, `#141826`, `#262B3A`, `#1E2230`) do not appear in the owner's visual-language brief (local-only file, not in the repo); `#262B3A` / `#1E2230` appear only in the dark hero gradient in `tokens.css`. Whether they are on the owner's neutral/violet ramps in the Figma identity file: **UNKNOWN** (identity-brief mentions `#0F1220 #1E243F #1A1F3A #B9C1DE #DCE0EF`, not the others).

## 3. Typography (Arabic UI)

Fonts (CSS variables):

| Variable | Stack |
|---|---|
| `--font-display` | `'El Messiri', 'IBM Plex Sans Arabic', 'Geeza Pro', serif` |
| `--font-body` | `'IBM Plex Sans Arabic', 'IBM Plex Sans', -apple-system, 'SF Arabic', 'Geeza Pro', system-ui, sans-serif` |
| `--font-numeric` | `'IBM Plex Sans', 'IBM Plex Sans Arabic', -apple-system, system-ui, sans-serif` (class `.num` adds `tabular-nums`) |

Files actually loaded: self-hosted via npm `@fontsource/*` 5.1.0 (OFL-1.1) imported in `src/ui/fonts.ts`: IBM Plex Sans Arabic 400/500/600/700, IBM Plex Sans 400/500/600, El Messiri 500/700. No Google Fonts link, no `<link>` to any font CDN in `index.html` (verified). Two first-paint faces (`ibm-plex-sans-arabic-arabic-400`, `el-messiri-arabic-700`) are `<link rel=preload>`-ed by a Vite plugin (`vite.config.ts`). Thmanyah: no reference anywhere in `src/` (comment in `fonts.ts` states the licence reason). Details in 09_ASSETS_AND_RESOURCES.md.

Scale (all `rem`, so it follows the user's text size; `html` uses `-apple-system-body` where supported → 1rem = 17px on iOS at default Dynamic Type, else 16px). px column = rem × 17.

| Token | Spec (`weight size/line-height family`) | ≈px @17 | Use |
|---|---|---|---|
| `--type-display` | 700 2rem/1.42 display | 34 | large title |
| `--type-h1` | 700 1.647rem/1.43 display | 28 | standalone screen titles only ("one serif per screen") |
| `--type-hero` | 600 1.294rem/1.55 body | 22 | hero / card title |
| `--type-card` | 600 1.176rem/1.6 body | 20 | card title (Path) |
| `--type-title2` | 600 1.294rem/1.5 body | 22 | title 2 |
| `--type-h2` | 500 1.176rem/1.6 body | 20 | |
| `--type-headline` | 600 1rem/1.6 body | 17 | |
| `--type-body` | 400 1rem/1.7 body | 17 | body |
| `--type-row` | 500 1rem/1.6 body | 17 | list-row title |
| `--type-label` | 500 0.882rem/1.6 body | 15 | |
| `--type-caption` | 400 0.882rem/1.6 body | 15 | |
| `--type-footnote` | 400 0.765rem/1.55 body | 13 | |
| `--type-overline` | 600 0.765rem/1.55 body | 13 | section overline |
| `--type-tab` | 500 0.706rem/1.3 body | 12 | tab-bar label ("floor") |
| `--type-metric` | 600 1.882rem/1.2 numeric | 32 | numbers |

Letter-spacing: no token; Arabic is not letter-spaced. `font-feature-settings: 'kern'` on `body`. There is **no English type scale** — the app is Arabic-only (owner decision); Latin runs use Plex via the stack.

Arabic count agreement: `src/ui/lib/plural.ts` (`NOUNS`, `countWords`): 1 → one, 2 → dual («يومين»), 3–10 → few («أيام»), 11+ → many («يوم»), plus «شي/أشياء» etc.

## 4. Spacing, layout, radii, strokes

| Token | Value |
|---|---|
| `--space-1..10` | 4, 8, 12, 16, 20, 24, 32, 40 px (`--space-7`, `--space-9` do not exist) |
| `--page-margin` | 20px |
| `--tap` | 44px (minimum target) |
| `--tabbar-h` / `--navbar-h` | 56px / 44px |
| `--safe-top` / `--safe-bottom` | `env(safe-area-inset-*)` |
| `--r-chip` / `--r-control` / `--r-card` / `--r-hero` / `--r-pill` | 4 / 12 / 20 / 32 / 999 px |
| `--hairline` | 0.5px (1px at ≤1dppx) |

Measured component sizes (from CSS): Button `min-height` 48 (large 52), `min-width` 44; Chip 32 (44 in radiogroup/selectable use); SegmentedControl `min-height` 36, inner radius 9; ListRow `min-height: max(64px, 3.75rem)`; FAB 56×56 radius 20; CheckCircle hit area 44 (`--tap`, default drawn size 28); TabBar `max-width` 640, indicator 44×28; Toast radius 16; Sheet top corners `--r-hero`.

## 5. Depth, glass, shadows

| Token | Light | Dark |
|---|---|---|
| `--shadow-subtle` | `0 4px 16px rgba(14,18,28,.12)` | `none` |
| `--shadow-elevated` | `0 12px 32px rgba(14,18,28,.18)` | `0 12px 32px rgba(0,0,0,.44)` |
| `--card-shadow` | `0 4px 16px rgba(14,18,28,.08), 0 0 0 .5px rgba(14,18,28,.06)` | `inset 0 0 0 .5px #40444D` |
| `--hero-bg` / `--hero-shadow` | `#F2F7FE` / none (soft sky block, no shadow, no glow) | gradient `160deg #262B3A → #222630 → #1E2230` / `0 0 0 1px rgba(190,218,247,.18), 0 18px 56px rgba(97,114,181,.42)` |
| `--glow-micro` / `--glow-hero` | `0 0 12px rgba(155,196,238,.55)` / `0 0 48px rgba(155,196,238,.45)` | `0 0 12px rgba(190,218,247,.45)` / `0 0 56px rgba(190,218,247,.28)` |
| `--hero-glow-opacity` | 0 | 0.14 |
| `--aurora` | none | radial violet `rgba(97,114,181,.3)` (Today header only; `Screen aurora`) |
| `--material-bar` / `--material-thick` / `--material-tab` | white @ .82 / .86 / .84 | `#0E121C` @ .82, `#222630` @ .86, `#181C26` @ .94 |
| `--scrim` | `rgba(14,18,28,.56)` | same |
| `--toast-bg` | `#0E121C` | `#222630` (+ border `rgba(255,255,255,.12)`) |

`backdrop-filter` (glass) is used in 7 CSS files: `Screen.module.css` (`blur(20px) saturate(180%)`, collapsing nav bar), `TabBar.module.css` (`blur(28px) saturate(180%)`), `ContextMenu.module.css` (scrim `blur(8px)`, panel `blur(24px) saturate(180%)`), `reminders.module.css` (banner), `WeeklyReview.module.css`, `sources.module.css`, `MorningBrief.module.css` (blur values not recorded here). No `@supports` fallback was found (NOT VERIFIED for browsers without backdrop-filter; the `--material-*` colours are translucent, so contrast would depend on content behind).

Sheet scale-back (iOS feel): `body[data-sheet] #root { transform: scale(.94) translateY(safe-top + 10px); border-radius: 12px }`, body turns `#000`. Disabled under reduced motion.

## 6. Motion

CSS (`tokens.css`) and TS (`motion.ts`) carry the same values.

| Token | CSS | TS (s) |
|---|---|---|
| instant | 0ms | 0 |
| quick | 120ms | 0.12 |
| base | 200ms | 0.2 |
| slow | 320ms | 0.32 |
| gentle | 500ms | 0.5 |
| ambient | 8000ms | 8 |
| `ease-standard` | `cubic-bezier(.2,0,0,1)` | `[0.2,0,0,1]` |
| `ease-enter` | `cubic-bezier(0,0,0,1)` | `[0,0,0,1]` |
| `ease-exit` | `cubic-bezier(.3,0,1,1)` | `[0.3,0,1,1]` |

Springs (`springs` in `motion.ts`, SwiftUI response/damping-ratio converted with mass 1: `k = (2π/response)²`, `c = 4π·ζ/response`): `smooth` response .4 / ζ .9 (k≈246.7, c≈28.3); `snappy` .32 / .82 (k≈385.5, c≈32.2); `sheet` .45 / 1 (k≈195.0, c≈27.9); `pop` .3 / .7 (k≈438.6, c≈29.3).

Identity motion rules reflected in code comments: "explain, then step aside"; no shake, no confetti, no flame; deletion is instant; wrong password = border + helper fade, no shake. (The e2e `lockProfiles` run asserts the calm wrong-password helper; that no shake animation exists is NOT separately tested.)

### Reduced motion
* Global: `<MotionConfig reducedMotion="user">` in `src/App.tsx` (framer-motion skips transforms/layout animations when the OS asks).
* Tokens: under `prefers-reduced-motion: reduce`, `--dur-base/slow/gentle` collapse to 120ms.
* CSS: `@media (prefers-reduced-motion: reduce)` appears in 10 CSS files (e.g. `base.css` removes the sheet scale-back; `Switch`, `Skeleton`).
* TS: `useReducedMotion()` in `Screen`, `Sheet`, `Toast`, `ContextMenu`, `ListRow`, `WeekDots`, `Flower` (flower growth rise is static when reduced).
* Evidence: e2e `lockProfiles` and `toastClearance` support `REDUCED=1` (run during this handoff, see 13_TESTING_AND_QA.md). A full visual check of every screen under reduced motion was **not** repeated in this pass.

## 7. Iconography, marks, graphic language

* Icons: `src/ui/icons/Icon.tsx` — one hand-written outline set, 24 grid, 1.5 stroke, round caps (`IconName` union of 54 names, e.g. `today habits path joy me chevron back check plus … alert`). No icon font, no icon library dependency.
* W monogram: `WMark` (`src/ui/components/WMark.tsx`) renders an inline SVG path (`wPath.ts`, viewBox `0 0 227 205`, W + arc + 3 stars, "exactly as supplied") filled `currentColor` (`--mark-color`: ink in light, white in dark). Identity sizes 16–256. `glow` is honoured only from 48px up (and by CSS only on dark).
* Star: `StarMark` — concave 4-point star path `M0 -1 Q0.04 -0.04 1 0 …`; `StarDottedLine` (steps), `ProgressArc`, `CheckCircle` completion burst. The star is imported by 26 non-kit files (Today, Evening, Focus, Routine, Joy, Rewards, Money, Notes, Sources, Import review, Evidence, Me, Garden, Path kit, PaydayCard, …). Whether each use is a real achievement/evidence moment is **NOT VERIFIED**; observed uses: done/«خلصت ومسجّلة», «مدفوع», «قرار متّخذ» (notes), «مصدر متحقق منه», review done, payday-today eyebrow.
* Flowers (`src/ui/components/flowers`): 16 kinds × 5 stages = 80 drawings in `drawings.json` (verified by script: 16 keys × stages `1..5`), loaded lazily; each drawing is added once as an SVG `<symbol id="wf-{kind}-{stage}">` to a hidden `<svg id="wejdan-flower-sprite">` and rendered as `<use>`. Ink = `currentColor`, fills = literal Violet/Sky. Stage names: 1 بذرة · 2 برعم · 3 تتفتح · 4 مزهرة · 5 متجذرة (mapped from `GrowthStage` seed/sprout/growing/rooted/automatic). Kinds: delphinium, hydrangea, lavender, chamomile, iris, bluebell, orchid, morning-glory, peony, jasmine, anemone, forget-me-not, taif-rose, sweet-pea, lily, magnolia; category → flower map in `flowers.ts` (`DOMAIN_FLOWER`). `Flower` is `role="img"` with label «{flower} · {stage}» unless `decorative`.
* Patterns/textures: Today dark header aurora, EmptyState dotted pattern (`EmptyState pattern`), Brief diamond wash. No grain texture asset exists (NOT APPLICABLE / not implemented).

## 8. Component inventory (`src/ui/components`)

Props are from the TypeScript interfaces. States such as pressed/disabled/focus live in each `*.module.css` (focus = global `:focus-visible` 2px `--focus-ring`, offset 2px).

| Component | Variants / key props | Notes |
|---|---|---|
| `Button` | `variant` primary \| secondary \| plain; `size` regular \| large; `block`; `icon` | motion `button`; secondary has hairline ring in dark |
| `Chip` | `tone` neutral \| accent \| success \| warning; `selected`; `icon`; `role="radio"` | visible chip 32px tall, interactive hit box 44×44 (`.interactive`); selected shows a check (never colour alone) |
| `Switch` | `checked`, `onChange`, `label`, `disabled` | `role="switch"`; off = hollow track + solid thumb, on = filled + check in thumb |
| `SegmentedControl<T>` | `segments`, `value`, `onChange`, `label`, `commitOnArrow` | `role="radiogroup"` |
| `EnergySegmented` | `Energy = low \| medium \| good` | Today energy check |
| `CheckCircle` | `checked`, `onChange`, `label`, `size` (28), `index` | 44px hit area, star burst on done |
| `ListRow` | `title`, `subtitle`, `leading`, `trailing`, `chevron`, `onClick`, `leadingActions`/`trailingActions` (swipe: tone accent \| neutral \| destructive \| success), `menu`, `moreButton`, `muted` | container query at 20rem |
| `InsetGroupedList` | `header`, `footer`, `headerAction`, `variant` inset \| plain, `flush`, `elevated`, `asList` | iOS grouped list |
| `SectionHeader` | `title`, `action`, `divider` | |
| `Screen` | `title`, `compactTitle`, `subtitle`, `eyebrow`, `backLabel`, `backStyle` back \| cancel, `actions`, `withFab`, `inlineTitle`, `revealTitle`, `band`, `ground` plain \| tinted, `aurora`, `titleEnd` | large title collapses into glass nav bar |
| `TabBar` | `active`, `onSelect`, `tabs` (`TABS`: today, habits, path, joy, me), `hidden` | glass; label 12px |
| `Sheet` | `open`, `onClose`, `title`, `detents` medium \| large, `cancelLabel`, `action`, `bare` | grabber, drag to resize/dismiss, makes the rest of `<body>` `inert` (toast + update prompt are exempt via `data-inert-exempt`), focus trap, named close button |
| `ContextMenu` | `items` (`MenuItem`: label, icon, destructive), `label` | `role="menu"`, long-press / "more" |
| `Toast` (`ToastProvider`, `useToast`) | `message`, `actionLabel`, `onAction`, `actionIcon`, `duration` | `role="status" aria-live="polite"`; places itself clear of controls (`placement` `dock` \| `top`; e2e `toastClearance`) |
| `Fab` | `label`, `onClick` | 56px |
| `HeroNextStep` | `eyebrow`, `title`, `meta`, `why`, `primaryLabel`, `secondaryLabel`, `layoutId` | the one hero per screen |
| `MorphCard` | `id`, `title`, `preview`, `detail`, `eyebrow` | shared-layout expand |
| `PaydayCard` | `daysLeft`, `paydayDay`, `onPlan` | star only when payday is today |
| `PostponeSheet` | `PostponeChoice` tomorrow \| thisWeek \| date \| inbox | |
| `ProductStep` | `order`, `name`, `category`, `slot` am \| pm \| weekly, `done` | routine step |
| `ProgressArc` | `value`, `size`, `stroke`, `label` | `role="img"` |
| `StarDottedLine` | `total`, `done`, `label` | step tracker |
| `StarMark`, `WMark`, `Flower` | see §7 | |
| `StreakChip`, `WeekDots`, `streakIcons` | chip (with/without arc icon), 7-day dots: done / compensation / rest / today / upcoming | each dot has an aria-label «أحد: منجز» |
| `EmptyState` | `title`, `body`, `action`, `pattern` | |
| `Skeleton`, `SkeletonRows` | | shimmer disabled under reduced motion |
| `InboxItem` | `InboxType` task \| idea \| note \| link | composed from `ListRow` |
| `TimeField` | `minute`, `onChange`, `label` | native selects (accessible path) |
| `ErrorBoundary` / `ErrorFallback` | `scope` screen \| app, `resetKey` | `role="alert"`, calm recovery copy |
| `Bidi`, `MetaLine` | see §9 | |
| Lock set (`src/ui/lock`) | `TextField`, `StrengthMeter`, `WarnCard` (`fields.tsx`), `ProfileAvatar` (`initial` or `flower`; flowers `taif-rose iris peony jasmine`), `PrivacyCover` | not in `components/` |
| Reminders set (`src/ui/screens/reminders`) | `TimeWheel` (wheel on top of `TimeField`), `TodayReminderBanner` (`role="alert"`), `CalendarExportSheet` (file card, share/download) | not in `components/` |

A dev-only gallery `src/ui/screens/me/KitScreen.tsx` (`#/me/kit`) exists in dev builds only (`import.meta.env.DEV` in `routes.tsx` and `App.tsx`).

## 9. RTL and bidi rules

1. `<html lang="ar" dir="rtl">` in `index.html`. The app is RTL-only.
2. **Digits are Latin (0–9), never Arabic-Indic**, rendered tabular in Plex Sans (`.num`, `--font-numeric`). Dates use `Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', …)` (Gregorian + Latin digits); times use `en-GB` 24h formatters or `ص/م` labels.
3. `Bidi` splits text with regex `LTR_RUN` and wraps runs of Latin letters, digits, URLs, times and thousands-separated numbers (`1,000`, `8,000-10,000`) in `<bdi dir="ltr">`; Latin words also get `lang="en"` (so VoiceOver's Arabic voice does not mangle «IELTS»). `MetaLine` renders a "·"-separated line where each part is its own `<bdi>`.
4. Currency: `riyal(n)` → `«1,750 ر.س»` (`meKit.tsx`, `Intl.NumberFormat('en-US')`); the `Amount` helper isolates **only the digits** as LTR so «ر.س» follows in the RTL line (a whole-LTR `<bdi>` put «ر.س» first — QA #17). Raw uses exist in `MoneyScreen.tsx` (`toLocaleString('en-US')` inside `<bdi dir="ltr" className="num">`).
5. Ranges: `-` between digits stays inside the LTR run (QA #2 fixed the reversed «000,1»); an en-dash between numbers was a reported flip (copy report) — current behaviour is handled by the lookahead-digit branch of the run regex (the `[,٬٫–]` class followed by a digit).
6. Inputs: `fieldDir(value)` (`lib/textDir.ts`): empty or Arabic-containing → `rtl`; Latin-only → `auto`. Never bare `dir="auto"` on an empty field (resolves to LTR). The lock `TextField` for username/password uses LTR values right-aligned; profile name uses `dir="auto"`.
7. Parsing amounts: `parseAmount` accepts Arabic-Indic, Persian digits, `٫` and `٬ , ،` separators (`lib/number.ts`).
8. Logical CSS properties are used where present (`border-start-start-radius` in `Sheet`); `isRtl()` is checked in `AppShell` for the edge-swipe-back direction (swipe from the right edge).
9. Icons that imply direction (`back`, `chevron`) are mirrored by the components (back = chevron pointing right in RTL, see screenshots).

## 10. Accessibility rules in code

* Targets ≥44px (`--tap`), Button min 44×48; Chip selectable variant 44.
* Focus: global `:focus-visible` ring 2px, offset 2px, `--focus-ring` (violet light / sky dark). `AppShell` moves focus to the new screen title on push and restores it on back (`stackFocus.ts`); `Sheet` traps Tab and inerts the background (`tests/ui/a11y/a11y.test.tsx`, 7 tests).
* Status never colour alone: Chip selected check, WeekDots shapes + labels, `Switch` check glyph, errors with alert icon + text.
* `Toast` is a polite live region; `TodayReminderBanner` and `ErrorBoundary` are `role="alert"`.
* Text scales with `rem`; `Sheet` re-measures its header with `ResizeObserver` so 200% text still scrolls (QA reported text at 200% checked in the a11y review of 2026-10-23/24; **not re-run now**).
* No axe-core or lint-a11y dependency exists in the repo (`package.json`); the axe runs in the QA reports were external scripts (not in repo).

## 11. Approved design vs implemented — differences

Approved sources: Claude Design canvas **«Wejdan Life OS — Redesign»** (43 new boards added 2026-10-23, handoff note) and the owner's identity brief and visual-language brief — all three are **local-only files, not in the repo**. I did **not** open the canvas itself (private, not accessible from this environment); the comparison is board *notes* vs code. Rows marked ✔ match; others are differences or unknowns.

| # | Topic | Approved design | Implemented (verified in code) | Status |
|---|---|---|---|---|
| 1 | Palette | Identity colours only; tokens listed in handoff §1 | `tokens.css` values equal the handoff §1 list (ground, subtle, elevated, text×3, accent text, hairline, action light/dark, error/warning/success) | ✔ |
| 2 | Hex outside tokens | "No hex inside components" | 8 files carry hex (§2.6): WeeklyReview, Joy, MorningBrief, lock avatar, theme meta | Difference |
| 3 | Violet/Sky 50–900 scales | Full scales in the brief | Only the steps used are tokenised (no `--violet-*` / `--sky-*` ramps); `--action-tint #EEF0F8` = violet/50, `--action-tint` dark `#1B2E4C` = sky/900 | Partial |
| 4 | Fonts | El Messiri 700 titles, Plex Sans Arabic UI, Plex Sans numbers | Same, self-hosted OFL via fontsource; El Messiri 500+700 loaded | ✔ |
| 5 | W mark | Owner SVG (W + arc + 3 stars), ink/white, glow only on dark ≥48px; old boards still show a placeholder PNG W | `WMark` inline path from the owner SVG, `currentColor`, glow ≥48; `public/brand/w-ink.svg`, `w-white.svg` shipped; no placeholder PNG W in repo | ✔ |
| 6 | Star usage | Only step marker (done) and Today spark chip | 26 consumers (§7) incl. Notes decision, Money paid, Sources, payday-today eyebrow | Difference / needs owner check |
| 7 | New kit components | `TextField`, `StrengthMeter`, `WarnCard`, `ProfileAvatar`, `WeekDots`, `StreakChip`, `ReminderBanner`, `TimeWheel`, `FileCard` added to the kit | All exist, but `TextField/StrengthMeter/WarnCard/ProfileAvatar` live in `src/ui/lock/`, `ReminderBanner` = `screens/reminders/TodayReminderBanner.tsx`, `TimeWheel` + file card (`.fileCard` CSS inside `CalendarExportSheet.tsx`) in `screens/reminders/`; no standalone `FileCard` component | Location differs |
| 8 | `track` token (StrengthMeter empty segment) | `#BEDAF7` / `#40444D` | No `--track` token; not verified how `StrengthMeter` colours its empty segments | UNKNOWN |
| 9 | Flexible streak default | Boards show it on; **default off recommended as an owner decision** (handoff §5.1, §9.3) | `defaultSettings.forgivingStreak: true` (`src/domain/models.ts:1139`); e2e asserts «ON (new install default)» | Difference (owner decision pending) |
| 10 | Streak rules | Up to 2 compensation days/week, third miss breaks; unplanned days neutral; off ⇒ momentum only | Implemented in `domain/engine` + `StreakHero`/`WeekDots`; 18 tests in `tests/domain/flexibleStreak.test.ts`; week start assumed Sunday in board, "existing week definition" in code (not re-verified) | ✔ (week start NOT VERIFIED) |
| 11 | Lock policy | PBKDF2/Argon2-class; recovery code 16 chars unambiguous; 4 free attempts then 30s/60s/2m/5m; auto-lock فورًا/دقيقة/5 دقايق/كل ما أفتحه | PBKDF2-SHA256 310,000 iterations, AES-GCM-256 envelope; recovery 16 symbols from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; `kFreeAttempts = 4`, delays `[30,60,120,300]`; auto-lock `immediate/min1/min5/launch`, default `min1` | ✔ |
| 12 | Profiles | Picker tile 2-col, create sheet with 4 flowers + initial, two-step delete with safe default primary | `AVATAR_FLOWERS = taif-rose iris peony jasmine`; delete step 1 default «لا، خلّيه» asserted by e2e | ✔ |
| 13 | Reminders | In-app only, banner with «ابدئي» / snooze, `.ics` export with VALARM, UID stable | `inAppReminders.ts`, `TodayReminderBanner`, `ics.ts` + `CalendarExportSheet`; e2e asserts VCALENDAR with TZID, RRULE, VALARM; UID re-import behaviour on iOS **NOT VERIFIED** (needs device) | ✔ / device-unverified |
| 14 | Digits | Latin digits in Plex, wrapped in `<bdi>`, never Arabic-Indic | Same (`Bidi`, `nu-latn` formatters) | ✔ |
| 15 | Motion | `base 200ms`, springs, no shake/confetti, sheet scale .94, banner slide 16px + fade | Tokens as §6; sheet scale-back .94 in `base.css`; banner animation specifics NOT VERIFIED | ✔ / partial |
| 16 | Dark W glow / Splash radial | Static radial + W glow on dark splash | iOS splash PNGs generated by `scripts/brand/generate-brand-assets.mjs` (`splash-*-dark.png`); not visually compared to the board | UNKNOWN |
| 17 | Logo board (app icon radius 22.37%, W at 56% of box) | Specified | Icons produced by the same script; exact ratio not measured | UNKNOWN |
| 18 | Garden / flowers | 16 kinds × 5 stages | Verified 16 × 5 = 80 drawings; sprite via `<symbol>` | ✔ |
| 19 | Header W on Today | W alone beside greeting/date | Today header shows `WMark` beside greeting (screenshot `10-today-*`) | ✔ |
| 20 | Grain/texture, glow on every heading | Not required by the approved decisions | none implemented | NOT APPLICABLE |
| 21 | Old boards (Today, Me, Splash …) still showing the placeholder W | Listed as open item 9.2 in the handoff | Code uses the real W everywhere `WMark` is used (grep `WMark`); the *canvas* boards are outside this repo | Canvas side UNKNOWN |

Not compared (no access): pixel comparison of any screen with its board; the 31 pre-existing boards.
