# Onboarding — وش يفرّحك؟ (feature G)

**Purpose.** An optional onboarding step, right after the life map, that lets a new user start her joy map: small / medium / big joys and (when she already has habits) reserved-joy bundles. Reuses `JoyMap` and `JoyBundles` (area C) and `JoyEditSheet`; no schema change.

**Registration.** `src/ui/screens/me/onboardingExtraSteps.tsx` imports `JoyOnboardingStep` and pushes `{ id: 'joy', Component, isEmpty }` at module load — before `OnboardingScreen` computes its step ids. `JoyOnboardingStep` imports nothing from `me/`, so there is no cycle. The hook gained an optional `isEmpty(snapshot)`; while true the footer says «تخطّي», otherwise «التالي».

**States.**
- New user: title «وش يفرّحك؟», lede (can stay empty), «أفكار تبدين منها» (five neutral suggestion chips), the map card with three empty groups each inviting «أضيفي أول وحدة», footer «تخطّي».
- A suggestion chip saves one free joy on tap (stable id `joy_onb_<key>` → repeating it never duplicates), disappears from the suggestions, and appears in its size group; it is then editable like any joy (tap → editor sheet). Nothing is saved without a tap.
- Bundles: shown only when she has active habits or already has a bundle; otherwise a one-line note says bundles come after habits exist.
- Skipping writes nothing; the existing flow and resume drafts are unchanged (the draft stores a step index; the step list is the same on every load).
- No loading/error states: reads come from the local snapshot; writes are the store's normal upserts.

**Finish.** No `finish` hook: joys are persisted the moment she taps/saves, so finishing is trivially idempotent.

**Layout / tokens.** Same `.step` column as other onboarding steps (30rem max). Map and bundles keep their own components; a wrapper removes their page margin (the onboarding body already has one) and adds a `--border-subtle` hairline so the map card reads in light mode. Chips use the kit's 44pt chip; no star, no gold, no red.

**Motion / a11y.** Step transition is the onboarding one (reduced-motion aware). Suggestions are a `role=group` labelled «أفكار تبدين منها»; map groups keep `role=group`. Wraps at text scale 2.0.

**Copy.** Arabic only, soft Saudi voice; no claims or numbers.
