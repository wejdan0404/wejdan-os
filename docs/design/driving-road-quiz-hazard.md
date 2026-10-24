# Driving — staged road, spaced quiz, hazard practice, conditions variety (area F-11)

**Honesty rule.** The app ships NO official procedure, hour counts, fees, question bank or video clips. It ships mechanisms. Where content is missing the empty state says «نضيفه لما نتأكد من المصدر».

## 1. طريق الرخصة (staged road)
- Header line: "المرحلة k من n · خطوة وحدة في كل مرة".
- Stage 1 is the only seeded stage: **تأكيد المسار الرسمي** with two *guide* steps (open the official service page and save its link; write steps/hours/fees as the official source shows them). They state no procedure.
- More stages and steps are **added by her** (title, note, source link). Each such step is `official` and wears a neutral chip **«ما تأكدت من المصدر»** until she toggles **تأكدت من المصدر** → chip becomes **«مؤكدة»** (success tone, check icon, not colour-only).
- Everything is editable/removable (sheet: title, note, link, verified switch). Check circle toggles done. Undo toast for every change.
- Link field: only http/https accepted (others are dropped); opens in a new tab with `rel="noopener noreferrer"`.
- Empty state under stage 1: "باقي المراحل نضيفها لما نتأكد من المصدر." + "أضيفي مرحلة".
- Existing "رخصة القيادة" project (if she created one earlier) is kept as a row; the old invented 7-step list is removed.

## 2. سجل التدريب + ظروف جرّبتيها
- Three metric cells: جلسات · دقائق · "k من N ظروف جرّبتيها" (N = her list; default presets: ليل، مطر أو غبار، طريق سريع، زحمة; she can add/remove). Local only.
- Practice sheet gets a chip group of conditions (multi-select, check glyph when selected) + "ظرف ثاني" inline add. Saved in `DrivingSession.conditions`.
- Copy: "كل ما تنوّعت الظروف كان أفضل" is NOT stated as a rule — wording: "تنويع الظروف يساعدك تعرفين نفسك أكثر، بدون ساعات محددة".

## 3. إدراك المخاطر (hazard practice — her links/notes)
- Card with the week count "هذا الأسبوع: x" (and "من G" only if she set a goal) + dotted bar (reuse `StarDottedLine`).
- Items are her own: title + optional link + optional note. "سجّلي مشاهدة" adds a dated watch. List sheet: add/edit/delete.
- Empty state: "أضيفي رابط أو ملاحظة من مصدر تثقين فيه — نضيفه لما نتأكد من المصدر." No clip is bundled.

## 4. النظري بالتكرار المتباعد (spaced quiz)
- Card: due count, "الجولة الجاية: <date>" when none due, buttons "ابدئي جولة" and "أسئلتك".
- Round = up to 10 due questions. One question per screen in a large sheet; tap a choice → reveal ✓ with the answer + her explanation/source; **no red** (wrong = neutral "نرجّعه لك"); progress dots; summary "راجعتي x، y ترجع لك".
- Scheduling: existing SM-2 engine (`reviewCard`): right = good, wrong = again (returns tomorrow, then after days).
- Questions are all added by her (question, 2–4 choices, correct one, explanation, source). Empty: "ما فيه أسئلة — أضيفي أسئلتك من مصدر رسمي. نضيف بنك أسئلة لما نتأكد من المصدر."

## 5. Anxiety help link
Footnote row: "إذا القلق من القيادة قوي ومستمر، الحديث مع مختص يساعد." + «المساعدة» → `/help`.

## Layout, tokens, motion, a11y
Reuses `Path.module.css` primitives + `PathF.module.css` (new). Tokens only from `tokens.css`. Springs/fades from `motion.ts`, reduced-motion → opacity only. 44pt targets; sheets reuse `Sheet` (focus trap). Text-scale 2.0: metric cells stack to one column via `@container`. Dark: all colours via tokens.

## Data
`ModuleState.ieltsDriving` (opaque JSON, additive, defaults on read) — rides export/import and the vault through the existing module-state meta key.
