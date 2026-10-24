# Today: tiers, «يومك جاهز», levels, free joy, week strip, momentum ring + Calm day

Scope: features 4 and 7 of the missing-features wave. Improves the existing Today screen; adds one pushed route `/today/calm`.

## Principles
- Today stays fast: the hero «خطوتك الجاية» remains first. «يومك جاهز» is one compact card right below it (not above), hidden when the day is empty.
- Nothing is added, removed or re-levelled without her touch (suggestion mode). Grouping and counts only read her accepted day; the free-joy card and calm-day fills never write on render.
- Numbers come from the engine: caps = `kMaxCore` (3) / `kMaxCoreYellow` (2) / red 1 / `kMaxMaintain` (2) via `tierCaps()`; momentum = `averageMomentum` over core habits; week strip = `thisWeek` + active projects due in 7 days. Joy has no cap. No invented stats.
- Calm wording only: no «فاتك», no day counts, no red. Over-cap is a soft line, never a warning colour.

## 1. Grouped day
Sections (inset lists): «الأساسيات · n» (tier core), «الصيانة · n» (maintain + system), then the free-joy card, then «مهامك» (her tasks). Routine chain keeps its own thread. Empty groups are not rendered.

## 2. «يومك جاهز» card
Start: title + one calm line by energy («على قد طاقتك اليوم، ونسخة صغيرة تكفي» / red: «يوم هادئ — الأساس بس» / unanswered: «على قد طاقتك»). End: momentum ring (ProgressArc 56) captioned «الزخم»; at the resting floor it shows «ترتاح» instead of a number; no core habits -> no ring.
Row of 3 count chips: أساسية / صيانة / متعة (number in tabular numerals). aria-label carries the cap («3 أساسية، الحد 3»). Over cap: footnote «يومك أكثر من المعتاد — عادي، اختاري اللي يناسبك» (no colour change).
Bottom: thin progress bar (done/total) + «n من total». All done -> the existing «يومك كمل» card stays the single celebration (no extra star).
States: empty (hidden) · normal · over-cap · all done · red.

## 3. Per-card levels
Each plan row gets a level chip («عادي» ▾, 44pt target) in the trailing slot. Tap expands an inline 3-segment control (أقل / عادي / زيادة) with the item's own level text under it (same copy source as item detail). Choice persists via `store.setPlannedLevel`; completing uses it. Collapsed by default so the list stays quiet. Done/skipped rows show no chip.

## 4. Free-joy card
Tinted card (identity tokens: surface-subtle + hairline, no yellow) titled with her free joy item, subtitle «لك بدون شروط — ما تحتاجين تستحقينها». Check circle completes it (does not add it to her plan). Empty state: no free joy configured -> card not shown.

## 5. «هذا الأسبوع» strip
Up to 4 cards in a wrapping grid (1 column at large text): next project step with «قبل <اليوم> · n د» or weekly task «هذا الأسبوع · n د». Tap opens project / item detail. Hidden when empty. Footnote: none.

## 6. Calm day `/today/calm`
Purpose: low-energy version of the day. Reachable from Today (link under the energy control when energy is «قليلة») and from the Morning Brief (shape section when «قليلة» is chosen). Back arrow returns.
Layout (RTL, top→bottom): hero card «يوم هادئ» + «ثلاث أشياء صغيرة ومتعة لك — هذا يكفي تمامًا. الباقي يرتاح اليوم بدون ما ينقص شي.»; «الحد الأدنى فقط · n من 3» list (minimum-level checks; her accepted essentials first, then maintenance; if fewer than 3 are accepted the gap is filled with engine suggestions each with «+ أضيفيه» — never auto-added); free-joy card; «اللي يرتاح اليوم» note listing suggested-but-not-accepted essentials (max 4 names + «وغيرها»), copy «يوم هادئ مو تراجع — ولا شي يرجع للصفر.»; help link «إذا الأمور ثقيلة جدًا: المساعدة موجودة» -> `/help`. Items she accepted beyond 3 stay visible under «باقي اللي اخترتيه» (muted) — never hidden.
States: no items at all -> only joy + rest note + help; all 3 done -> calm line «يكفي اليوم — ارتاحي.»; no joy -> card omitted.
Motion: Framer fades/translate 12px, `useReducedMotion` disables. Targets 44pt, text scale 2.0 wraps (no fixed heights), AA contrast via tokens, light+dark.
