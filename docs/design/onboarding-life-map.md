# Onboarding — life map (grow / maintain / rest)

**Purpose.** Replace "pick up to 3 to grow" with the board's map: each domain gets «نمو · صيانة · راحة», caps 3 grow / 5 maintain, live counters. Rest is a pause, not neglect.

**Layout.** Title «خريطة حياتك لهذا الموسم», lede (season 6–12 weeks). Three counter tiles: نمو n من 3 · صيانة n من 5 · راحة n. A note strip (info by default; amber `--warning` when a cap is hit — never red). Inset list: one row per domain (icon-less name + 3-way segmented control, 44pt buttons). Women's health stays locked: footnote only.

**Behaviour.** Tapping a full tier does not change anything and shows the cap note («انقلي واحد للصيانة أولًا…»). Initial values = the domain's current state (over-cap leftovers fall one tier). Written on finish through `applyLifeMap` (season included). Existing users never see onboarding, so their data is untouched.

**Draft/resume.** The onboarding draft (localStorage) gains an optional `map`; old drafts that only have `grow` still load.

**Extra steps hook (joy map).** `src/ui/screens/me/onboardingExtraSteps.tsx` exports `onboardingExtraSteps: OnboardingExtraStep[]` (empty by default). Each entry `{ id, Component, finish? }` is inserted right after the life map; with nothing registered the flow is the same minus that step, and the progress dots count only real steps. Onboarding stays skippable: every step after the name has «تخطّي»/«التالي» and nothing blocks the app.

**Tokens/motion/a11y.** `--cell-bg`, `--border-subtle`, `--action-tint` for selected, `--warning` for the cap note; spring thumb from SegmentedControl; progressbar `aria-valuetext`; counters `aria-live=polite`.
