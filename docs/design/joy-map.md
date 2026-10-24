# خريطة متعتي + باقات المتعة المحجوزة (feature C3)

**Purpose.** Her joys, grouped by effort — سريعة (أقل من 15 د) / متوسطة / كبيرة — instead of one flat list; and up to three *reserved joys*, each kept for one habit («متعة محجوزة لعادة»), so the joy stays special. No locks, no pressure.

**Data (no schema change).** `JoyItem.size` already exists. A bundle is a `JoyItem` kind `bundled` + `bundledHabitId` (the planner already offers it beside that habit). Max 3 bundles; one per habit; the last remaining free joy can't be reserved (today's joy comes from free ones). Unbinding returns it to free.

**States.** Fresh → existing empty state. Map: three groups with chips (a coin icon marks joys that cost money; footer line «الأشياء اللي تحبينها أصلًا ما نحط عليها سعر — تبقى حرة.»; if any cost money, a soft hint «في متع تكلّف فلوس — تحسبينها من ميزانيتك»). Empty group → quiet dashed «＋ أضيفي» chip. Bundles section: rows «عادة ← متعة», «أضيفي باقة» until 3 («ثلاث باقات كفاية — عشان تبقى المتعة مميزة. شيلي وحدة وبعدها اختاري الجديدة.»), no-habits and no-candidates states explain what to add first.

**Layout.** Map card `--r-card` with group titles (type-footnote bold) and wrapping chips (44pt, radius 4 per kit); chip tap edits (existing JoyEditSheet) with size picker in the sheet; «تعديل» not needed. Bundle sheet: pick habit chips, pick an existing free joy or type a new one.

**Tokens.** surface-subtle chips, text-secondary, action tint for selected; no gold, no star (stars only for achievements).

**Motion/a11y.** Chips use kit press states; reduced-motion respected; groups are `role=group` with labels; text scale 2.0 wraps.
