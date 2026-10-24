# ادخار تلقائي يوم الراتب — payday saving reminder (feature C5b)

**Purpose.** A gentle monthly nudge to move a saving amount at the bank. The app never moves money, never suggests an amount, never advises.

**Mechanics (existing engine).** Uses `moduleState.autoSaveDay/autoSaveMinute` (already in the schema and export). It surfaces as a timed explicit reminder `money:autosave` (kind `saving`, `monthDay` = chosen day): the engine plans it once a month on that day, quiet hours/focus blocks apply, the Today banner shows «وقت تحويل الادخار» with «افتحي المال» / «بعد 10 دقايق» (needs the master reminders switch, as for other reminders). The old generic dues line for autoSave is dropped so it isn't announced twice. Calendar: the same item exports to `.ics` as `FREQ=MONTHLY;BYMONTHDAY=n` through the existing calendar-export sheet.

**States.** Off: card «ادخار تلقائي يوم الراتب» + «فعّليه مرة وحدة من تطبيق بنكك، ويمشي لحاله. اختاري المبلغ اللي يناسبك.» + «ذكّريني». On: «تذكير: يوم 27 من كل شهر · 09:00» + next date + «غيّري» / «حطيه بالتقويم». Reminders switch off: line «التذكيرات مطفية — شغّليها من التذكيرات عشان يطلع لك بالتطبيق» + link. Sheet: day (1–28, default her payday day capped at 28), time (TimeField), «طفّي التذكير».

**Layout/tokens.** Tinted card (`--action-tint`, `--r-card`), bell icon tile, no star. Day choices stop at 28 so it lands every month.

**A11y/motion.** Native selects (44pt), sheet motion from the kit, reduced-motion respected.
