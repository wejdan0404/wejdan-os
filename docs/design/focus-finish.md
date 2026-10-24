# Focus finish — retrieval, try-first tip, silent reminder, phone-away

Purpose: a focus session ends with one small memory exercise (study sessions only), carries one honest learning tip, and nudges her to put the phone away and silenced. No new data model; the answer is saved as an ordinary note (undoable).

Honesty: the app cannot control Do Not Disturb. The «الإشعارات صامتة» pill only appears after she taps «بعّدته» and reads "حسب كلامك" semantics: the copy says it is a reminder for her to silence the phone.

States
- ready: phone-away card (title, hint, «بعّدته» toggle button). Study sessions also show the try-first tip card.
- running: status line unchanged; pill «الإشعارات صامتة» if she confirmed; tip card (study only) stays, quiet.
- finish (study, planned item): phase `recall` — minutes focused, question «اذكري فكرتين…», textarea, «حفظ وإنهاء» / «تخطّي السؤال». Both complete the item (existing complete action: award + undo toast). Empty answer never creates a note.
- error: if save of the note fails the item is still completed; toast says the answer was not saved.
- reload during recall: restored as paused (elapsed kept) so nothing is lost.

RTL: stacked cards, start-aligned text, textarea dir=auto. Targets 44pt, text scale 2.0 wraps (no fixed heights).
Tokens: surface-subtle card, border-subtle, text-secondary, action-tint pill. No stars added (existing done star remains).
Motion: framer fade/translate 6px, springs.snappy; reduced motion = no transform.
a11y: textarea labelled by the question; pill is role=status; toggle is aria-pressed.

Copy (Arabic)
- «جرّبي أول ثم اسألي الذكاء الاصطناعي» / «اكتبي محاولتك ولو ناقصة — المحاولة قبل الجواب تثبّت الفهم.»
- Phone: «الجوال على جنب؟» / «التطبيق ما يقدر يسكّت جوالك، فهذا تذكير: صامت وبعيد عن إيدك.» / «بعّدته»
- Pill: «الإشعارات صامتة»
- Recall: «سؤال استرجاع سريع» / «بدون ما تفتحين الملاحظات — الاسترجاع نفسه تمرين للذاكرة.» / «اذكري فكرتين تعلمتيها اليوم من «{title}».» / «بعدها قارني بملاحظاتك وشوفي وش فاتك.»
