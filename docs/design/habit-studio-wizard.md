# Habit Studio — 9-step wizard

**Purpose.** Replace the single long habit form with a calm step-by-step flow (board: HabitStudio). The old form stays as the quick path.

**Entry / routes.** `/studio` = wizard for a new habit. `/studio?mode=quick` or `?habit=<id>` (editing) = the quick form. A header link switches between the two (`خطوة خطوة` / `نموذج سريع`). `/studio?action=<ACTION-ID>` opens the wizard prefilled from the evidence library.

**Steps (board order).** 1 الهدف · 2 السلوك (name, domain flower, importance) · 3 النسخ أدنى/عادي/إضافي · 4 الإشارة (anchor + days) · 5 التحضير · 6 ربط بمتعة · 7 إذا… فإني · 8 صعّبي المُغري · 9 التذكير. Only the name (2) and at least one day (4) are required; everything else can be skipped.

**Layout (RTL, 390pt).** Progress: 9 segments + «الخطوة n من 9». Each step is a card: done = number badge turns to a check + one-line value; current = expanded editor + help line; upcoming = collapsed. Tap any card to jump. Sticky footer: primary «التالي: <step>» (last: «احفظي العادة»), plain «السابق», plain «احفظيها كمسودة» (saved paused — kept, off her day).

**Evidence prefill.** A card at the top «ابدئي من مكتبة الأدلة» opens a sheet (search + habit-type actions). Picking fills only fields the library has text for; filled fields show a «مقترح» chip; the top card says «عبّأنا الحقول، عدّلي اللي تبين» with «تراجعي عن التعبئة» (restores every touched field).

**States.** Empty: first step open, nothing suggested. Normal: above. Edge: capacity violation on save → same sheet as the quick form (save paused / continue / back); domain asleep → existing wake sheet. Error: inline `role=alert` at the field and jump to its step. Loading: library comes from the store snapshot (no spinner).

**Undo.** Prefill undo (above); after saving a *new* habit the toast carries «تراجع» (deletes it again through the store's undoable delete).

**Tokens.** `--cell-bg`, `--border-subtle/default`, `--action-default`, `--success` (done badge), `--text-*`, `--r-card`. No red, no star (not an achievement). Fonts: IBM Plex Sans Arabic.

**Motion.** Framer spring on card expand (height auto) and progress fill; `prefers-reduced-motion` → instant.

**A11y.** Step cards are `button[aria-expanded]` headers + region; progress is `role=progressbar` with `aria-valuetext`; 44pt targets; works at text scale 2.0 (footer wraps, cards grow).

**Copy.** Saudi-light, feminine address, never commanding: «اختاري… / عدّلي اللي تبين / ما يلزم تعبّين كل شي».
