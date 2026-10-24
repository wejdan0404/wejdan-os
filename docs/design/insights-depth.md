# Insights depth (feat/a)

Board: Insights. Gap: momentum by domain, return speed, experiment result (keep / revert).

## Purpose
Numbers that help her adjust the design, not judge her. Existing «أوقاتك» and «وقتك مع التطبيق» stay. No streak counters anywhere.

## Cards (top → bottom)
1. **الزخم حسب المجال** — horizontal bars 0–100, one row per enabled domain with active habits (`momentumByDomain`). Resting domains read «ترتاح»
   (never zero). Scale line 0/50/100 + the board's sentence: the weighted average of the last days; a missed day lowers it a little, never resets.
2. **سرعة الرجوع** — line with 4 weekly points (`returnSpeed`): days to come back after a miss; lower is better; zero baseline drawn.
   Weeks with no miss are gaps in the line, labelled «ما فيه غياب» in the table view, not zeros. Title line says «أسرع كل أسبوع» only when the trend is faster.
   Empty: «نحتاج كم أسبوع عشان نرسمها».
3. **نتيجة التجربة** — active/ready experiment: before vs after (days done of planned, enjoyment of 5) + the honest line
   «تجربة شخصية قصيرة — إشارة، مو دليل.» Buttons «أثبّتها» / «أرجّع القديم» appear once its days are over (`finishExperiment`).
   Until then «يوم n من 7 — النتيجة تكمل بعد». Past kept/reverted ones show as a quiet line.
4. existing: هالأسبوع, أوقاتك, وقتك مع التطبيق.
Every chart has a «جدول» toggle that shows the same numbers as a list (accessible table view), and values in aria-labels.

## Charts (SVG, tokens only)
Single hue (`--brand-primary`) on a `--heat-1`/`--border-subtle` track; text in `--text-*`; line 2px, markers 8px with 2px surface ring;
bars 10px thick with 4px rounded ends anchored at the baseline. Both themes come free from the tokens (checked in screenshots).
Direct value labels on bars; no legend needed for one series. No red/green: «better» is shown by words and direction text.

## States
empty (no habits / not enough data) · normal · edge (all null weeks, single point, experiment without habit data) · error n/a (derived).

## Motion / a11y
Bars grow once with the shared spring; none under reduced motion. Hit areas ≥44pt for the table toggle. Text at 2.0 scale wraps; chart is width-fluid (viewBox).
