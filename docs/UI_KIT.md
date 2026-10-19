# Wejdan Life OS — UI kit (Flutter) · for the hub-tabs engineer

Design source: `design/UIKIT.md` ("Calm Sky") + artboards. Everything below
is implemented in `lib/ui/`; reuse it — never hard-code hex, sizes or copy.

```
lib/ui/
  app.dart              WejdanApp (MaterialApp.router, locale, theme mode, text-scale clamp 2.0, resume → re-plan)
  router.dart           go_router routes (table in file header); AppShell = 5-tab StatefulShellRoute
  demo_flags.dart       web-only QA flags (?onboarded=1&theme=dark&lang=en&energy=red&sem=1&scale=1.5&done=h_vocab:minimum)
  format.dart           dateLine, greeting, minutesText, cueLabel, anchorOf, levelMinutes, metaJoin (bidi-safe), textDirFor
  theme/                tokens.dart · typography.dart · motion.dart · domain_palette.dart · app_theme.dart · theme_ext.dart
  state/                ui_providers.dart (view models) · completion.dart (log + burst + undo snackbar)
  widgets/              shared components (barrel: widgets.dart)
  screens/<feature>/    onboarding · morning_brief · today · habit (why sheet) · studio · routine · focus · recovery · evening
                        UI-2: habits · path · ielts · driving · joy · rewards · review · insights · me · money · home_admin · evidence · settings · help · sensitive
```

## Theme access
`import '../theme/theme_ext.dart';` then `context.c` (WColors), `context.t`
(WType), `context.l` (AppLocalizations), `context.lang`, `context.isRtl`.

* **Colours** `WColors.light/dark`: `bg surface surfaceSubtle sky200 sky300
  primary primaryFill onPrimary accentText deep text textSecondary caption
  border spark scrim glow`; tints `c.tint(TintName.x)` → `Tint(bg, ink)`;
  semantic `c.done c.rest c.joy c.info c.energyGreen/Yellow/Red`;
  `c.domain(DomainId)`; `c.energy(EnergyMode)`. Dark tints follow the
  designer's values (sage/sky/gold/rose/apricot) + derived lilac/sand/slate/mint.
* **Type** `context.t.display h1 h2 body bodyStrong small caption label metric`
  — separate AR (Plex Sans Arabic, 700 max, taller leading) and EN (Plex
  Sans, 600 max) scales; numbers use `metric`. Nothing below 12 px.
* **Space/radius** `WSpace.x4…x32, page=20, tap=44`; `WRadius.card 20,
  tile 14, button 16, sheet 28, pill`.
* **Motion** `WMotion.fast/base/slow/celebrate`; always
  `WMotion.of(context, d)` (zero when Reduce Motion is on).

## Components (`widgets/`)
| Widget | Notes |
|---|---|
| `WTabBar(index,onTap)` | 5 tabs, dot + primary for active; used by `AppShell` |
| `WHeader(title, subtitle, actions)` | H1 + caption; actions = `CircleIconButton`s |
| `CircleIconButton(icon,label,onPressed,filled)` | 44 px, required semantic label; icon never auto-mirrors — use `forwardIcon(ctx)` / `backIcon(ctx)` / `forwardArrow(ctx)` |
| `WCard(child,onTap,color,borderColor,glow)` | radius 20, 1 px border, 16 padding; `glow` = dark celebration |
| `SectionLabel(text, trailing, spark)` | 12/600 caption; spark only for Joy |
| `WPill(text, tint, icon)` | small status pill ("عيّنة", "مقترح") |
| `DomainIcon(domain,size)` / `TintIcon(icon,tint)` | round tinted icons (always paired with a label) |
| `PrimaryButton(label,onPressed)` | 52 px, one per view; `SecondaryButton(label, small:)` = text link |
| `EnergyChip(mode, onTap, showChange)` | dot + "طاقتي: …" |
| `JoyBadge(text)` | gold chip + spark |
| `WChoiceChip(label,selected,onTap,dashed,icon)` | 40 px chip in a 44 px target |
| `SegmentedPills<T>(options,selected,onSelected,disabled,selectedTint)` | level / Grow-Maintain-Rest / 25-50 |
| `HabitCard(...)` / `HabitCard.simple(...)` | Today row; `CheckButton` 44 px pops on done; why + level stack under text-scale > 1.15 or narrow |
| `SparkIcon` / `SparkPainter.pathFor` / `SparkBadge(count)` | UIKIT spark path; badge counts up and floats "+n" |
| `MomentumRing(value 0–100)` · `TimerRing(progress, child)` · `WProgressBar(value)` · `GrowthStageBar(stage)` | |
| `WSheet(title, child, footer, leading)` · `showWSheet()` · `SheetPage` | 28 radius, grabber, scrim; `SheetPage` makes sheets deep-linkable routes |
| `EmptyRestState(message, title, action)` | line illustration + one sentence, never guilt |
| `CelebrationBurst.show(ctx, globalOrigin, variant, strong)` | 3 rotating variants (radiate/rise/orbit), light/medium haptic, reduced motion → single spark fade |

## Behaviour helpers
* `Completion.complete(ctx, ref, item, level, origin:)` — log, burst,
  10 s undo snackbar with Sparks earned; `Completion.uncheck/relevel`.
* View models: `dayProgressProvider`, `restingTodayProvider`,
  `weekMomentumProvider`, `firstActionProvider`, `routineItemsProvider(id)`,
  `planItemProvider(itemId)`, `habitGridProvider(habitId)`.
* Strings: add keys to both ARBs (template `app_ar.arb`); parity test enforces
  it. Western digits only. Wrap mixed meta lines with `metaJoin()`; show
  English seed text with `textDirFor()`.

## Rules the next tabs must keep
RTL default; 44 pt targets (test: `MinimumTapTargetGuideline(44)`); button
Semantics use `container: true`; no red/failure states for misses; one
primary button per view; Dynamic Type to 200 % (Today tested at 1.5);
dark mode uses glow, not shadows.

## UI-2 additions (hub tabs)

Routes (table in `router.dart`): `/habits`, `/path` (+ `/path/ielts`,
`/path/driving`), `/joy` (+ `/joy/reward?id=`), `/me` (+ `insights`,
`money`, `home`, `evidence`, `settings`, `help`, `cycle`, `pcos`), root
`/review?step=`, `/ielts/review`, `/help`. Sheets use the **root navigator**
(`showWSheet(useRootNavigator: true)`) so they cover the tab bar.

| Widget (`widgets/hub.dart`, `plant.dart`) | Notes |
|---|---|
| `HubPage(title, subtitle, back, actions, leading, bottom, children)` | hub scaffold; back → pop or `/me`; one pinned primary in `bottom` |
| `NavRow(title, subtitle, icon, tint, onTap, trailing)` | 56 px row + forward chevron |
| `ListCard(children)` / `RowDivider` | card with dividers |
| `ToggleRow(title, subtitle, value, onChanged, locked)` | whole row toggles; lock glyph for sensitive modules |
| `CheckRow(title, subtitle, checked, onChanged, strike)` | 28 px square check (feedback checklist, errands, wins) |
| `LabelledBar(label, fraction, valueText)` | chart bar; value always written as text |
| `StatTile(value, label)` · `OutlineAction(label, tint)` · `Stepper44` | numeric tile · card-level secondary button · − value + |
| `showInputSheet(fields: [InputSpec…])` · `showConfirmSheet(destructive:)` | quick forms / calm confirms |
| `PlantGlyph(stage, resting)` | Life Garden line plant; resting = moon + slow sway (off under Reduce Motion) |
| `SegmentedPills(expand: true)` | full-width equal segments |
| `FreshStartCard(fresh, tomorrow)` (`screens/review/`) | JOY-10 card on Today / Me / Weekly Review |

View models: `ui/state/hub_providers.dart` — `gardenProvider`
(`GardenPlant{habit, stage, resting}`; rest = paused / Rest domain / no
planned day done in 7 days), `roadmapQuarter()` (before Oct 2026 → Q1),
`goalNextStep()`. `ui_providers.dart` — `seedTextIndexProvider` +
`localizeSeed()` (unedited library text shown in the current language; her own
text untouched), `libraryText(ref, id, field, lang)`.
Format: `slotTimeLabel` («صباحًا · 07:05» when prayer anchors are off),
`dayPartLabel`, `dayMonth`, `relativeDays`, `moneyText`, `bandText`,
`plusMinutes` (bidi-safe «13+ د»).
Sensitive: `SensitiveGate`, `openSensitive()`, `appLockServiceProvider`,
`sensitiveUnlockedProvider` (session unlock). Settings: `exportShareProvider`.
Web QA flags: `?seed=test` (all records titled `test`), `?mods=cycle,pcos,aquarium,lock`.

## Fix pass 1 additions
* `c.checkRing` — unchecked check-button ring, light `#5E8BC4` (3.52:1 on
  white, 3.28:1 on bg, 3.1:1 on surfaceSubtle; WCAG 1.4.11), dark `#9BC4EE`.
  Replaces `sky300` in `CheckButton`. *Design mirror: add the token to
  `design/UIKIT.md` + boards (designer).*
* `largeText(context)` (surfaces.dart): true at text scale ≥ 1.3.
  `SectionLabel` moves its trailing note under the label; Today's status row
  wraps chip / momentum / sparks onto two lines.
* `MomentumRing` shows «راحة» (never "0") at rest; its semantics value is
  "N من 100". `MomentumRing` and `SparkBadge` are separate semantics
  containers (no merged "زخم الأسبوع شرارات: 3 13").
* Undo snackbar: own 44×44 `TextButton`, `persist: false`, leaves at the 10 s
  deadline; a late undo shows «انتهت مهلة التراجع…».
* `WPill(l.unsourcedBadge)` «ممارسة عملية — بلا مصدر محكّم» on Why sheet and
  Evidence cards/detail for actions without sources.
* Storage banner (`_StorageBanner`, app.dart) above the app, never over it.
