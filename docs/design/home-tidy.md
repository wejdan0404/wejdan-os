# Home — 10-minute tidy, weekly zone, batched errands

Purpose: «البيت والمعاملات» gets a calm home block above the documents list.

1. Tidy timer — length from existing ModuleState.resetMinutes (default 10). Wall-clock based; states ready / running / paused / over. «النسخة الصغيرة: سطح واحد» always shown so a tiny version is allowed. Not logged as a habit automatically (no hidden writes).
2. Weekly zone — one zone per week from a fixed neutral list (pure function of week index + ModuleState.homeZoneOffset, which already exists in the schema). «غيّري المنطقة» bumps the offset (undo via toast). Shows this week's zone and next week's.
3. Batched errands — uses the existing Errand store: add, tick, delete with undo. Header «مشاوير مجمّعة». Empty state invites collecting errands to do in one trip. No fixed day/time is claimed.

States: empty errands; zone with offset; timer over (soft, no alarm sound); reduced motion (no arc animation).
Tokens: surface-subtle card, ProgressArc, action-default. RTL, 44pt, scale 2.0 safe (cards grow).
Copy: «ترتيب {n} دقايق» / «النسخة الصغيرة: سطح واحد — المكتب أو السرير.» / «منطقة الأسبوع» / «مشاوير مجمّعة» / «جمّعي مشاويرك وطلعي لها مرة وحدة.»
