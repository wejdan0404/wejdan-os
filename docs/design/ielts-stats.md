# IELTS — stats, target band, current level (area F-10)

**Purpose.** Show her practice in a calm way (no streak that can "break") and let her record her own goal. Nothing is assumed: target band, current level and the 30-day goal are fields she fills; empty means empty.

**Placement.** `IeltsScreen`, directly under the "today's skill" hero. Two new blocks, then the existing weekly rotation.

## Block 1 — "ممارستك" (stats row)
- Three cards (equal width, `--surface-elevated`, `--shadow-subtle`, `--r-card`):
  1. **جلسات هذا الشهر** — number of distinct practice days in the current calendar month.
  2. **آخر 30 يوم** — `ProgressArc` (reuse) with `N` inside, label "N من 30 يوم". If she set a goal: arc = N / goal and label "N من هدفك (G)". Reaching the goal lets the arc's own completion star land (the only star on screen).
  3. **هالأسبوع** — 7 small dots (done = filled violet + check glyph, not colour only) for days practiced this week.
- Evidence of a practice day: a finished IELTS habit/weekly task, a logged mock test, or the latest review of a vocab card. Stated in a footnote ("نحسب اللي سجّلتيه فقط — أي يوم تدرّبتي فيه يُحسب مرة وحدة").
- Copy never shames: with 0 → "نبدأ من أي يوم. ما فيه سلسلة تنكسر هنا."; with N>0 → "تدرّبتي N يوم من آخر 30."
- **No streak, no loss language.** No red.

## Block 2 — "هدفك" (target & level)
- Inset card with two value rows: **الدرجة المستهدفة** and **مستواك الحالي** (value or "ما حددتيها"), one action "عدّلي".
- Sheet (medium): two band inputs (decimal, LTR, 0–9, rounded to nearest half with the existing note), one optional "كم يوم تبين من آخر 30؟" (1–30). Save / clear each field with empty input.
- Empty state: "حطي هدفك ومستواك بنفسك — التطبيق ما يخمّن." + button "حددي".
- Validation errors are inline text (`role="alert"`), never red surfaces.

## States
empty (no data, no goals) · loading (store gate already handles) · normal · edge (goal > days, 0 days, sessions only from mocks) · error (invalid band text).

## RTL / tokens / motion / a11y
- Logical properties only; numbers in `<bdi>` with `--font-numeric`; three cards `grid-template-columns: repeat(3, 1fr)` wrap to 1 column at text-scale ≥ 1.6 (container query on min-width).
- Tokens: `--surface-elevated`, `--text-*`, `--action-default`, `--border-subtle`, `--r-card`, `--shadow-subtle`; no new colours.
- Motion: arc fill spring from `ProgressArc`; dots fade in (`dur.base`); reduced-motion → no motion.
- 44pt targets; each stat card has an accessible name; dots have an `aria-label` list ("سبت: تدرّبتي").

## Needs verified content
None shipped. IELTS band descriptors are NOT included.
