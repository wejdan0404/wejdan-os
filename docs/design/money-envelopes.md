# ظروف الشهر — per-category monthly envelopes (feature C5a)

**Purpose.** Inside the payday-day-1 cycle, split «مصروف الشهر» into her own categories and see plan vs spent per category, calmly. Manual entry only; nothing leaves the device.

**Data (no schema change).** A category is a `MoneyEnvelope` with id `env_<cycleKey>_cat_<suffix>`; it sub-divides the cycle's `_spend` envelope. Logging into a category raises both the category and the spend envelope (month total unchanged in meaning). Cycle key / `paydayHistory` semantics untouched. New month: one tap copies last cycle's categories (spent 0).

**States.**
- No plan yet → existing payday card (unchanged). Plan, no categories → empty card «قسّمي مصروفك بظروف» + «سوّي ظروف» (+ «انسخي ظروف الشهر اللي فات» when a previous cycle had some).
- Normal → card «ظروف الشهر» · «باقي N يوم»; one row per category: name, «X من Y ر.س», 8px bar, one line of state text.
- Tones (descriptive, never judging; no red, no warning colour): `roomy` «باقي X»; `close` (>= 80 %) «باقي X — قربتي من الخطة»; `full` «وصلتي لخطته بالضبط»; `over` outline marker + «فوق الخطة بـ X — عادي، عدّليها لو تبين» (bar full in deepest identity tone); `noPlan` «بدون خطة · صرفتي X».
- Footer: «غير مصنّف: X» (spent outside categories); «لسا ما وزّعتي X من خطة المصروف»; if categories exceed the spend plan: «الظروف أكبر من خطة المصروف بـ X — عدّلي وحدة منهم».
- Edge: 12 categories max; empty name disallowed; plan 0 allowed; deleting a category keeps its spend in «غير مصنّف» (undo toast).
- Error: none network-side; invalid amount keeps the button disabled.

**Layout (RTL).** Card `--r-card`, `--cell-bg`, page margin; rows 44pt min, name at the start, amounts at the end (`bdi dir=ltr`, Western digits via `Riyal`). Manage sheet (large): inline name + plan fields per row, suggestion chips (أكل وقهوة، مواصلات، تسوق، ترفيه، صحة وعناية، هدايا — suggestions only).

**Tokens.** `--cell-bg --text-primary --text-muted --action-default --action-pressed --brand-primary --brand-secondary --border-subtle`, radii card/control/pill. No new colours. No achievement star.

**Motion.** Bar fill animates width with `springs.smooth`; instant under `prefers-reduced-motion`.

**A11y.** Each bar `role=progressbar` with name/valuenow/valuemax; state is text + icon, never colour alone; rows are buttons (44pt); works at text scale 2.0 (rows wrap, amounts drop under the name).

**Copy (Arabic, Saudi-light).** As above; no commands, no shame, no advice.
