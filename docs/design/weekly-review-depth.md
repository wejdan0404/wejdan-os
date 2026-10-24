# Weekly review depth (feat/a)

Board: WeeklyReview. Gap: blockers + one fix, strength check, season adjust, week experiment, chapter card.

## Purpose
Turn the six-question review into the ten-step ritual on the board, without making it longer than ~10 minutes:
every new step is optional to fill, skippable with «التالي», and applies nothing until «خلّصي المراجعة»
(same deferred-apply + «تراجعي عنها» pattern the review already has). No schema change.

## Steps (ids, in order)
wins · important · deferred · **blockers** · pause · **strength** · **season** · top3 · **experiment** · close (energy fit + chapter title + chapter card preview).
`strength` is skipped when there are no active habits, `experiment` when she has no habit to test and nothing is running.
The cover lists the steps; the progress thread counts the steps that exist for her.

## New steps
- **وش عطّلك؟** — chips from the 8 existing miss reasons (`MISS_REASON_AR`), multi-select. Each selected chip opens one card
  «اقتراح تعديل وحد» with one fix sentence. Fixes that map to an experiment (`BLOCKER_EXPERIMENT`) say
  «نجرّبها في تجربة الأسبوع» and pre-pick that experiment; «مو مهمة الحين» points to the pause step. Saved to `blockers[]`.
- **فحص القوة** — one habit (the one least recently checked; chips to switch), 4 SRBAI sentences, 1–5 each in a radiogroup
  (end labels «ما أوافق أبدًا» / «أوافق تمامًا»). A complete check is stored with `recordStrengthCheck`. Result is a *word*
  (`strengthBand`), never a score. Skipping is fine.
- **تعديل الموسم** — per enabled domain نمو / صيانة / راحة (`SegmentedControl`), live counters against the caps (3 / 5).
  A choice that would break a cap is refused in place with a calm line; nothing is forced. Applied with `setDomainState`; reverted by «تراجعي عنها».
- **تجربة الأسبوع** — if one is running and its days are over: result card (shared with Insights) with keep / revert.
  If running and not over: «يوم n من 7». Otherwise up to 3 `suggestExperiments` as radio cards + «بدون تجربة هالأسبوع».
  Started with `startExperiment` at finish; its id goes to the review record.
- **close** — keeps «الخطة ناسبت طاقتك؟» and the chapter title; adds the chapter card preview.
- **Done** — chapter card «سكّرتي الفصل N» (one star, the screen's hero) with a summary built only from her data
  (wins count, comebacks this week, blockers named) + «+N شرارات المراجعة».

## States
empty (no habits/domains/experiments → step skipped or empty note) · loading n/a (local) · normal · edge (cap refused,
experiment already running, rating partly filled = not saved) · error (save fails → existing toast, nothing half-applied is shown as done).
Draft: `wejdan.reviewDraft.v2.<week>` stores step id + new answers (old v1 drafts are ignored — their step numbers no longer map).

## Layout / tokens / motion / a11y
RTL logical properties only. Tokens: `--cell-bg`, `--surface-subtle`, `--action-tint`, `--brand-primary`, `--text-*`,
`--r-card/--r-control`, `--space-*`. Only star on the question screens is the existing progress thread; one hero star on the done card.
Rating buttons ≥44pt in a 5-column grid that wraps to a 3+2 grid at text scale ≥ 1.6 (container query on the grid width). Step transitions
reuse the existing fade/slide; reduced-motion removes the slide. Each rating group is a `radiogroup` with the sentence as its label.

## Copy
Calm, never grading: «ليش ما مشى الحال؟ نعدّل التصميم، مو نلومك.» · «4 جمل، 20 ثانية.» · «أسبوع واحد يعطي إشارة، مو حكم نهائي.»
