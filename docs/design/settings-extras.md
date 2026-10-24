# Settings extras + storage banner

1. «الحد الأقصى باليوم» row (settings.notificationCap 0–6, default 4) in the reminders area: a stepper-like select. Copy states what it does: caps the automatic reminders per day; reminder times she set herself are not counted; 0 turns reminders off for the day.
2. «الوحدات الاختيارية» list: replaces the single private-module group. Rows: cycle tracking (existing switch, private) plus life areas that can be switched off (IELTS, driving, career, faith, people) via domain.enabled. Turning off hides the area from Today and Path; data stays. Turning on a growing area that would break the cap is refused with a calm message.
3. Storage banner: when the store reports persistent=false, a banner pushes the app down (not over content): «الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة», with a hint to export. Role status, safe-area aware.
States: normal; cap 0; storage failure. Tokens: surface-subtle, border-subtle, text-secondary. RTL, 44pt, scale 2.0.
