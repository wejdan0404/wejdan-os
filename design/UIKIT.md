# Wejdan Life OS — shared UI kit for public product screens (use EXACT values so every screen matches)

Product scope: a general-purpose app for individual users, configurable by goals, routines, language, and preferences. Wejdan-specific profile data must not appear in public-default artboards or shipped starter data. Use clearly labeled synthetic demo profiles. Working product name; final public brand is not yet approved.

Look name: **"Calm Sky"** — soft, flowing, calm; lots of air; one motif per screen: the 4-point spark ✦ (drawn as inline SVG, never an emoji). No gradients washes, no left-border cards, no shadows heavier than Subtle.

## Tokens (light)
- bg: #F4F7FC (Neutral 100) · surface: #FFFFFF · surface-subtle: #EAF1FB · sky-200: #BEDAF7 · sky-300: #9BC4EE
- primary: #6172B5 (Blue 500; fills/buttons, white text on it is OK at ≥16px semibold) · accent-text: #4F5FA0 (Blue 600, small blue text) · deep: #2B3358 (Blue 800) · night: #0B1020 (Blue 950)
- text: #0E121C (Ink 900) · text-secondary: #3A4256 · caption: #5A6478 · border: #DCE3EF (1px)
- domain tints (bg / icon-ink): Health sage #E3F0E8/#2F6B4A · Sleep lilac #ECE8F7/#5B4C99 · Food apricot #FBEADF/#9A4E1F · IELTS sky #E1EEFB/#2D5F92 · Career sand #F3EEDF/#6E5A1E · Driving slate #E6EAF2/#3A4A6B · Money mint #E2F3F0/#23675C · Home rose #F6E6EA/#8A3950 · Joy gold #FBF1D6/#8A6412
- status: done #2F6B4A on #E3F0E8 · rest/missed = neutral #5A6478 on #EEF1F6 (never red for misses) · energy Green #2F6B4A / Yellow #8A6412 on #FBF1D6 / Red-day uses lilac #5B4C99 on #ECE8F7 (gentle, not alarming)
## Tokens (dark)
- bg #0B1020 · surface #141B33 · surface-subtle #1B2444 · border #2B3358 (1px, always on cards) · text #F4F7FC · text-secondary #C9D2E6 · caption #9FAACB · primary #8C9BD8 (buttons: fill #6172B5 with white text) · glow for celebration: box-shadow 0 0 24px rgba(155,196,238,.35)

## Type (Arabic, IBM Plex Sans Arabic)
- Display 28/36 700 · H1 22/30 700 · H2 18/26 600 · Body 16/26 400 · Body-strong 16/26 600 · Small 14/22 400 · Caption 13/20 500 · Label 12/18 600 · Metric (numbers) 'IBM Plex Sans' 600.
- English strings (e.g., "IELTS", "UX") inline inside Arabic are fine in the same stack.

## Frame
- Phone board 390 wide. Page padding 20px sides. Top area starts at 16px (no fake status bar). Vertical rhythm 8/12/16/24.
- Radius: cards 20px · chips 999px · buttons 16px · sheets top 28px.
- Card: background #FFFFFF; border 1px solid #DCE3EF; radius 20px; padding 16px. Subtle shadow allowed only for floating elements: 0 2px 8px rgba(14,18,28,.06).

## Components (copy these patterns)
1. **Tab bar** (bottom, 84px incl. safe area, bg #FFFFFF, border-top 1px #DCE3EF), four owner-authorized items right→left: اليوم · مهني · العناية · أنا. Each item: 24px stroke icon + 12px label; active = #6172B5 icon+label and a 4px dot above icon; inactive #5A6478. Habits and Joy remain reachable as sections under العناية; Path and career goals remain under مهني. This navigation supersedes the earlier five-tab mockup set.
2. **Header**: row: title (H1) on the right; left side: small circular buttons 44px (icon-only, aria-label). Under it: caption line (date "الإثنين 28 سبتمبر" + optional Hijri).
3. **Energy chip**: pill 32px high, dot + text "طاقتي: متوسطة" using energy colors.
4. **Habit card (Today row)**: card 16px padding; right: 44px round check button (border 2px #9BC4EE; done = filled #6172B5 with white check); middle: title (Body-strong) + meta line (Caption: cue "بعد العصر" · "10 د"); below meta: joy pairing badge (chip bg #FBF1D6 text #8A6412 with small spark icon: "+ الحلقة 4 من مسلسلك"); left: level segmented control 3 small pills "أدنى · عادي · إضافي" (selected pill bg #EAF1FB text #4F5FA0). Optional "لماذا؟" text link 13px #4F5FA0.
5. **Section label**: Label style, color #5A6478, with 12px spark icon for the "Joy" section only.
6. **Primary button**: height 52px, radius 16px, bg #6172B5, text #FFFFFF 16/600, full width. Secondary = text link 16/600 #4F5FA0. One primary per view.
7. **Spark badge**: 4-point star SVG (path "M12 2 C12.8 8.5 15.5 11.2 22 12 C15.5 12.8 12.8 15.5 12 22 C11.2 15.5 8.5 12.8 2 12 C8.5 11.2 11.2 8.5 12 2Z") fill #E0A93B + number in Metric font. Name: شرارات.
8. **Momentum ring**: SVG circle r=18 stroke 4, track #EAF1FB, progress #6172B5, number center (Metric 13).
9. **Growth stages** (Habit strength): بذرة · برعم · تنمو · متجذّرة · تلقائية — shown as 5 small dots / a simple plant glyph line drawing.
10. **Bottom sheet**: top radius 28px, grabber 36×4 #DCE3EF, over a 40% #0E121C scrim.
11. **Chips (choice)**: 40px high, border 1px #DCE3EF, selected bg #EAF1FB border #9BC4EE text #2B3358.
12. **Progress bar**: 8px, radius 999, track #EAF1FB, fill #6172B5.
13. **Empty/rest state**: soft line illustration + one sentence, never guilt.

## Voice (Arabic)
Warm, concise, Saudi-first and broadly understandable; avoid gendered phrasing where natural, and never command or shame. English is neutral. Examples: "نسخة صغيرة تكفي اليوم" · "العودة خطوة مهمة" · "ما الذي جعلها أصعب؟ يمكننا تعديل الخطة" · "خطتك جاهزة، ويمكنك تعديلها".

## Sample persona data (synthetic fixtures only; mark metrics as عيّنة)
- Use at least three clearly fictional profiles across design reviews: Arabic RTL and English LTR; different schedules, focus areas, and accessibility/text-size settings.
- The primary board may use a neutral sample: two self-chosen goals, one habit at a user-selected time, a flexible minimum version, and a free-time suggestion.
- Avoid making prayer times, gender, IELTS, Saudi driving steps, money, health status, or a particular wake time default assumptions. Country-specific examples must be labeled and sourced.
- Never ship an actual owner's personal plan, schedule, rewards, health details, or metrics in public demo data.
