# WEJDAN LIFE OS — Product Spec v2.2 (public multi-platform product)

> This document is the consumer-app product authority. `ops/APP_FEATURE_GAP_MATRIX.md` tracks implementation evidence; `docs/PRODUCT_DELIVERY_PLAN.md` tracks delivery phases and release gates. The current primary navigation is the owner-approved four-tab model: اليوم، مهني، العناية، أنا. DEC-018 is the latest owner instruction and requires iOS, Android, and web, superseding the earlier DEC-016 platform deferral.

Audience: general users, initially in Saudi Arabia, on iOS, Android, and web. Arabic-first RTL and English LTR are launch requirements for every platform. Wejdan's personal profile remains private and must never be committed as source code or public demo data. Product name and public brand must be decided before closed beta.
Goal: **help each user shape and follow a realistic day.** The app prepares an editable plan from the person's own goals, routines, commitments, time, energy, and preferences. It suggests next actions and reminders while keeping the user in control.

Core principle: **Behavior design, not discipline.** Every behavior = clear + easy to start + enjoyable now + stable cue + visible progress. Competing temptations = less visible + more friction. Failure is design data, never a verdict on her.

Evidence rule: separate evidence-backed guidance from practical tips and user-defined preferences. The "لماذا؟ / Why" view identifies the applicable source and its strength when a source exists; it must not imply that every personal action is peer-reviewed. Do not invent efficacy claims, doses, effect sizes, or safety guarantees.

### Delivery decisions

- **Public product from launch:** one product for iOS, Android, and web; each platform passes its own functional, security, accessibility, and release gates before public launch. DEC-018 is the latest owner authority and supersedes DEC-016's platform deferral. Closed beta validates the completed product, not a reduced-scope tier.
- **Accounts and required cloud sync:** account creation and cloud sync are required product capabilities. Local-first editing and offline use remain available; queued changes synchronize when connectivity returns. Provider, data region, retention, and operational budget must pass architecture, privacy, security, legal, and owner gates before a production service is configured. Never upload the existing personal pilot profile without an explicit preview and user action.
- **Free launch:** no advertisements, subscriptions, or payments at launch. Cloud operating costs require an owner-approved cap, alerts, abuse controls, and a fail-safe mode before beta; public service must not start without an approved operating budget.
- **Consumer AI:** local-first. A cloud model may only receive the minimum data needed for a clearly disclosed feature after explicit, purpose-specific user consent. Health and money records are excluded from cloud AI by default.
- **All specified life domains:** available in the public product, including manual money-lite and opt-in sensitive cycle/PCOS tools. Sensitive health remains off and locked by default, non-diagnostic, and subject to independent clinical, privacy, and legal review. Money remains manually entered and offers no financial advice, bank integration, or transaction import.
- **Generalization:** configurable identity, goals, schedule, locale and accessibility; synthetic examples only. Wejdan is one pilot profile, never the public starter profile.
- **Brand and launch market:** Saudi Arabia first; Arabic and English at launch. Owner selects the product name and brand before beta. Further market expansion receives a separate jurisdiction review.

---

## 1. Platform & technical requirements

- Use SwiftUI and native iOS APIs for the iPhone implementation per DEC-016. The existing Flutter client is the current Android/web foundation and behavioral reference. Keep product rules and versioned sync contracts aligned across both codebases; do not claim shared UI or business logic until it is implemented and verified.
- Flutter state uses Riverpod and Hive behind repository abstractions for offline work. iOS persistence uses a separately reviewed native implementation. Add account identity and sync only after provider-neutral contracts, threat model, data lifecycle, legal review, and budget gates pass. Local storage must never be presented as cloud sync.
- Use platform-specific notification implementations with timezone-safe local scheduling. Optional prayer-time anchors are computed offline and used only as cues if enabled; verify calculations against current official regional requirements.
- Implement animations and haptics with native APIs and respect reduced-motion settings throughout.
- Bundle Arabic and English fonts with all clients; do not fetch fonts at runtime. Use Western digits 0–9.
- Arabic-first RTL and English LTR are requirements across clients. Use localized resources and require native review of Arabic copy.
- Theming: Calm Sky is the default token set; System / Light / Dark, curated accent palettes, a contrast-checked custom accent color, three card styles, and density presets. Settings apply immediately with an in-context preview and one-tap reset. Enforce readable contrast and semantic status colors; appearance settings cannot hide or reorder critical safety/privacy controls.
- Accessibility: minimum 44pt interactive targets, text scaling to 200% without clipping in core flows, semantic labels, WCAG AA contrast target, no color-only meaning; verify with assistive technology on device.
- Privacy: minimize data; encrypt transport and server-side data; strictly isolate account data; apply user-visible consent and controls to optional processing. Sensitive modules are separately opt-in, access-controlled, and non-diagnostic. Export, account deletion, and local delete must explain effects and be auditable, including cloud replicas and backup lifecycle. Resolve Saudi PDPL and cross-border transfer requirements with qualified counsel before selecting hosting or processing locations.
- Quality gates: SwiftUI/iOS and Flutter/Android/web builds and tests pass; verify iOS on supported macOS/Xcode and each platform on physical devices/browser. One platform's acceptance never substitutes for another's.

## 2. Information architecture (4 tabs, order RTL right→left / LTR mirrored)

| Tab | AR | Purpose |
|---|---|---|
| Today | اليوم | The user's editable daily plan and actions. Default tab. |
| Professional | مهني | User-selected learning, career, and goal/project flows. |
| Care | العناية | Habits, routines, wellbeing basics, and user-defined joy/rewards. |
| Me | أنا | Weekly review, insights, evidence, settings, privacy, and help. |

Global overlays: Focus Mode, Recovery flow, Morning Brief, Evening Shutdown, Quick Add (+), Why-sheet.

## 3. Item types (the ontology the engine uses)

- **Habit** — repeated behavior to become automatic (has cue, min/normal/bonus versions, joy pairing, friction plan, if-then, strength).
- **Routine** — ordered chain of habits/steps (Morning, Night, Workout, Study session). One cue starts the chain.
- **Weekly task** — recurring non-daily (meal plan, laundry, IELTS writing, job sprint, weekly review).
- **Project** — finite with steps (Get driving licence, Finish Google UX cert, Portfolio case study). Status: Idea / Active / Waiting / Paused / Done / Archived. Max 2 Active (ENG-17).
- **Goal** — outcome with milestones (IELTS band target, licence, job). Goals never appear as daily checkboxes; they drive habits/projects.
- **System** — automation/one-time setup that removes a decision (auto-save transfer, 2FA, notification batching, backups).
- **Reference** — knowledge card (vaccination schedule, sleep guidance, BNPL rules, help lines).
- **Joy** — Free Joy / Bundled Joy / Earned Reward (see §6).

Every item has: id, domain, type, title_ar/en, action_id link (evidence), schedule (slot, days, anchor cue), duration estimate, priority (Core/Recommended/Optional/Conditional), season state.

## 4. Domains (Life Map) — configurable catalog

Movement · sleep/energy · food · care · sensitive cycle/PCOS (private MVP only, off by default) · IELTS/languages · learning · career · driving · money (manual-only personal MVP, no financial advice) · home/admin · digital life · joy/leisure · people/connection · user-defined faith/meaning · optional aquarium. Each user chooses which domains to activate. Domain names and starter content are editable/localized. Sensitive health data remains separately gated and is not collected unless the owner/user explicitly enables that private module. Each active domain may be Grow, Maintain, or Rest; capacity limits guide the planner but can be changed by the user with clear feedback. Seasonal periods are suggestions and user-editable.

## 5. The engine (how the app leads)

### 5.1 Day Planner (runs at wake time / first open / 04:30 local)
Inputs: active habits & routines, weekly tasks due, project next-steps, calendar blocks she entered (manual "fixed events"; iOS calendar read is v2), energy mode, available time budget, recent history, Season.
Output: **Today plan** = optional routines + anchored blocks + open tasks, with at most:
- up to **3 Core** (from the user's selected focus domains),
- up to **2 Maintenance** (from domains the user has chosen to maintain),
- **1 Joy** (Free Joy suggestion from her Joy Map; never gated),
- plus due weekly tasks (counted inside the caps or shown as "This week" strip).
Rules: never more items than time budget × 0.7 (planning-fallacy buffer, ENG-18, learns from her actual durations); each item scheduled at its anchor cue (after-X) or slot; each item shows its **minimum version** as the default "done" bar (ENG-19). Every item carries a "why today" line (e.g., "3rd strength day this week", "vocab review due — spacing").
- Energy mode is optional and user-defined; do not label a person's day as clinically or objectively "red". A low-capacity option reduces planned load and uses gentle copy; it never prescribes medication or clinical essentials.
- Deterministic + explainable: planner is pure Dart function `planDay(state, date) -> DayPlan` with unit tests.

### 5.2 Completion model
Each habit tap offers **Minimum / Normal / Bonus** (long-press or segmented). Any = done. Completion counts from Minimum (ENG-19). One-tap logging; optional note. Undo within 10 s.

### 5.3 Habit Strength (not day counts)
- Weekly 4-item SRBAI check (ENG-04) per Grow habit, 1–5 scale, 20 seconds total → strength 0–100.
- Plus consistency (share of planned days done, 28-day rolling, forgiving) and **Recovery speed** (days to return after a miss).
- Never show "Day 21 — habit formed". Show growth stages (Seed → Sprout → Growing → Rooted → Automatic) derived from SRBAI + consistency (ENG-02).

### 5.4 Momentum instead of streaks (ENG-13, ENG-03)
- "Momentum ring" per habit: rolling 7-day weighted score. Missing a day lowers it gently; nothing resets to 0.
- Optional "forgiving streak" (off by default): 2 grace days per week, and a missed day is never displayed with negative icons.

### 5.5 Recovery flow (ENG-20)
Trigger: a Core habit missed 3 planned times in a row or a whole day unopened ×2.
Flow: "What got in the way?" chips (forgot · bad time · too big · tired · not enjoyable · place didn't fit · busy · not important now) → engine proposes one design change (move cue, shrink to minimum, add joy pairing, swap time, pause to Rest) → she accepts/edits → **Comeback Spark bonus** on the next completion (BODY-12 megastudy: rewarding return after a miss). Copy: "رجعتي — هذا أهم جزء".

### 5.6 Reminders (ENG-15, ENG-16, GROW-21)
- Max **4 notifications/day** total (user-adjustable 0–6). Morning Brief (1), up to 2 anchored nudges, Evening Shutdown (1).
- Actionable notifications (Done-min / Snooze 30 / Skip).
- Adaptive: a habit's nudge is muted after 3 ignored in a row and moved to "quiet mode"; engine suggests a better time based on her actual completion times.
- Quiet hours default 23:00–07:00; Focus blocks suppress nudges.

### 5.7 Experiments (N-of-1, ENG-21)
Weekly one-variable experiment (e.g., IELTS morning vs night; podcast bundle on/off for walks). Tracks completion + enjoyment (1–5) before/after, shows simple comparison, she decides keep/revert. Max 1 active experiment.

### 5.8 Capacity & overload guard (ENG-17)
Max 3 Grow domains, max 2 Active projects, max 7 Core habits total. Adding beyond cap → "swap or park" dialog (Idea Inbox for later). Learning hoarding guard: 1 active course at a time (GROW-14).

## 6. Joy & Reward system (the heart — "ربط الروتين بالسعادة")

Evidence: immediate rewards predict persistence (ENG-07), temptation bundling (ENG-08, BODY-11), overjustification risk for already-enjoyed activities (ENG-09), gamification small & fading (ENG-12), autonomy (ENG-22), no dark patterns (ENG-23).

1. **Joy Map** (onboarding + editable): what makes her happy — chips + custom: coffee, series, games, reading, drawing, music, podcasts, going out, shopping (flag money), friends, fish tank, tech, skincare ritual… Each tagged: quick (<15m) / medium / big; cost; "keep free".
2. **Free Joy** — never conditional; Today always has 1. Protects rest (JOY-11).
3. **Bundled Joy** — she chooses 1–3 wants to reserve for a should (e.g., "مسلسل X — فقط وقت المشي", "Podcast — فقط وقت ترتيب الغرفة", "playlist — only workouts"). App shows the bundle as the start button ("ابدئي المشي + الحلقة 4"). Honor-based, no locks.
4. **Sparks ✦ (شرارات)** — earned for: starting (any minimum), comebacks (×2), finishing a weekly review, running an experiment. NOT for perfection, not per-streak. Daily cap to avoid grinding.
5. **Earned Rewards** — she defines rewards with a Spark price (e.g., new coffee beans 60✦, a book 120✦, a day trip 400✦). Milestone rewards for goals (e.g., first driving lesson, IELTS mock +0.5). Spending sparks = celebration moment.
6. **Life Garden** — each Grow habit is a plant in her garden; growth stage = Habit Strength. Plants never die; unattended ones "rest" (sleeping animation). Seasonal garden background changes with Season.
7. **Micro-celebrations** — on completion: haptic + small particle burst (3 variants, rotated; reduced-motion = fade), occasional (≤1/day) surprise delight card (quote from her own "why", a fun fact from evidence, a photo from her Joy list). Variable delight is bounded & ethical: never tied to spending money or opening the app more.
8. **Chapters** — each week is a chapter with a title she can edit; weekly review closes the chapter with a story card (wins, comeback moments, one lesson). Peak-end: every session ends on a positive, specific line.
9. **Identity lines** — optional: "أنتِ تبنين عادة الحركة" style reinforcement after 3+ completions (ENG-22 autonomy framing).
Guardrails: no leaderboards, no loss-framing unless she opts into a commitment (ENG-14), no confirmshaming, no fake urgency, no red failure states.

## 7. v1 screen families (existing routes must be audited before redesign)

1. **Onboarding**: welcome and value → language → choose focus areas → optional schedule/anchors → choose or skip starter actions → optional joy preferences → privacy and optional notification choice. Every step is skippable where possible; ends with an editable first-day plan.
2. **Morning Brief** (optional at first open): greeting, optional capacity check, today's plan preview, first action and explanation.
3. **Today**: date, optional capacity, plan timeline, minimum/normal/bonus actions, optional joy pairing, explanation, weekly items, free-time/joy suggestion, quick add.
4. **Habit card detail / Why sheet**: design (cue, if-then, versions, friction), evidence (source, strength badge), history mini-chart, strength stage.
5. **Habit Studio (builder)**: guided 9 fields: Goal → Behavior → Minimum/Normal/Bonus → Cue (after-X / time / place) → Prepare (friction down) → Joy pairing → If-then obstacle plan → Friction up for competing temptation → Reminder. Suggestions prefilled from Action Library.
6. **Routines / Chains**: Morning, Night, Workout, Study — reorder steps; "start chain" player mode (one step at a time, big buttons, timer, music/bundle).
7. **Focus Mode**: single task, timer (default 25/50, editable), attempt-first note for study (GROW-05), phone-away prompt, end → retrieval quick check for study sessions (GROW-01).
8. **Professional / goals**: user-defined horizon and milestones; sample goals may include driving, language learning, career, or fitness but are examples only; link goals to projects and habits.
9. **Learning hub**: optional learning goals with user-selected subject, practice sessions, and progress records. IELTS is a sample template, not a required destination.
10. **Driving template**: optional region-specific checklist and practice log; show jurisdiction and last-reviewed source for regulatory steps; never hardcode universal licensing requirements.
11. **Joy tab**: Joy Map, Bundles, Sparks balance, Earned Rewards shop (hers), Life Garden, celebrations history.
12. **Weekly Review** (Saturday evening default, 10 min): wins → what got in the way → strength checks (SRBAI) → Season tweak (Grow/Maintain/Rest) → next week's top 3 → pick experiment → chapter title → Sparks.
13. **Insights**: momentum by domain, recovery speed trend, best times, experiment results, "system burden" (minutes spent logging).
14. **Recovery flow** (see 5.5).
15. **Money lite (personal MVP):** manually entered budgets/envelopes, bills and reminders only. No bank integration, transaction import, investment/credit advice, or eligibility claims. Public scope requires separate privacy, product, and jurisdiction review.
16. **Home & Admin**: 10-min reset timer, zone of the week, documents & renewals register with reminders, errands batch list.
17. **Evidence Library**: browse actions by domain, strength badges, sources (open link), "add to my plan".
18. **Settings**: language, appearance studio (System/Light/Dark, presets, accessible custom palette, card shape/density, preview/reset), notification cap, quiet hours, user-selected anchors, modules on/off (sensitive cycle/PCOS opt-in; prayer anchors optional and off by default), app lock, export/import, delete all.
19. **Help & Safety**: non-clinical support guidance. Any country-specific emergency contacts must be locale-selected, sourced from official current pages, and clearly scoped to that country. No diagnosis or clinical tracking.
20. **Evening Shutdown**: tick leftovers → move/park/let go, tomorrow's first action, wind-down chain start (BODY-17), gratitude/savoring one line optional (JOY-02/03).

## 8. Data model (local-first with account-scoped sync)
Keep existing Hive entities where valid; distinguish read-only catalog data, synthetic demo data, and user-owned records. Every user-owned remote record is bound server-side to an authenticated account; clients cannot choose or override its owner scope. Use versioned schema migrations, stable record IDs, server-enforced authorization, conflict metadata, and idempotent sync cursors. Never sync read-only catalogs as user data. In-scope entities include `Action`, `EngineRule`, `DomainPreference`, `Habit`, `Routine`, `WeeklyTask`, `Project`, `Goal`, `Milestone`, `LogEntry`, `DayPlan`, `EnergyCheck`, `StrengthCheck`, `JoyItem`, `SparkTxn`, `Experiment`, `LearningRecord`, `MoneyLiteRecord`, `SensitiveHealthRecord`, and `Settings`. Backups and exports include schema version and import preview; destructive restore/delete requires confirmation. Sensitive records must be excluded from ordinary logs and demo fixtures and protected by separately reviewed access and retention controls.

Account recovery must not silently weaken encryption or expose sensitive records. Local-to-account migration shows the user the account, data categories, and transfer action before syncing. Conflicts are visible and recoverable; no last-write-wins policy may silently destroy user content. Account export and deletion cover primary data, derived data, and the documented backup expiration path. Preserve a local encrypted/offline experience when the network is unavailable.

## 9. Visual language (Wejdan brand, adapted to app)
Tokens (orientation; Figma file pei6kBFtNKDcYAwPBG1gTN is canonical for the brand — mismatches are reported, not "fixed"): Blue 500 #6172B5 (brand/primary), Blue 600 for small accent text, Blue 800 #2B3358, Blue 950 #0B1020 (dark surface), Sky 200 #BEDAF7, Sky 300 #9BC4EE, Ink 900 #0E121C (text), Neutral 100 #F4F7FC (light background). Tone: soft, flowing, calm; rounded 16–24 radius; one motif per screen (a small 4-point spark ✦ is the reward motif — derived from the brand's three stars); gentle glow for celebrations in dark mode instead of shadows. Status colors: calm (no alarm red for misses; use neutral/rest). Typography: IBM Plex Sans Arabic / IBM Plex Sans; separate AR and EN type scales; no text < 12pt. Logo: W only, Ink 900 or white; app icon = W on Blue 500 or Blue 950.
Domain accent hues: derived tints from brand blue/sky plus 4 soft accents (sage, apricot, lilac, sand) at low saturation, always paired with icon + label.

## 10. Copy voice
Arabic: warm, concise, broadly understandable Saudi-first Arabic; avoid gendered verbs where natural, and never command or shame. English: neutral and concise. Examples: "نسخة صغيرة تكفي اليوم" · "العودة خطوة مهمة" · "ما الذي جعلها أصعب؟ يمكننا تعديل الخطة". Keep user-authored labels in the user's own words.

## 11. Example profiles
Examples are explicitly marked as demo data and never silently become a user's commitments. Include at least three synthetic profiles with different languages, goals, schedules, accessibility needs, and selected domains. A Wejdan profile may exist in a private development fixture only and must not ship as the default public profile.

## 12. Definition of done (public launch)
See `docs/PRODUCT_DELIVERY_PLAN.md`. A route rendering, unit suite, or web build alone does not establish product, native, sync, or production readiness. Closed beta begins only after all three platforms, account flows, offline/sync lifecycle, privacy/security controls, domain reviews, accessibility, recovery, support, and operating safeguards meet their gates. Public launch requires beta findings to be resolved, store approval where applicable, owner-approved budget, and a recorded release decision.

