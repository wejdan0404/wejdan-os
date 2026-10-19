<!-- Wejdan local artifact · task=task_d7885b5d-e18d-412d-94bf-ec5e60084133 · trace=trace_d30614a6-a670-48cd-a232-e5f037af7f2c · role=DES-08 · provider=ollama-local · model=qwen3:8b -->

# Motion/Animation/Media Designer — Synthetic specialist acceptance artifact

Role: DES-08 · Team: DES · Contract: role.DES-08.v1

## Role output

# Motion and Media Specification Draft for One-Week Planning Exercise

## Overview
This specification outlines the motion and media design for a fictional local-first personal planning product. The focus is on creating an intuitive, accessible, and performant user experience for a one-week planning exercise. The design includes motion tokens, micro-interactions, transition timing, storyboards, image/video use, asset licensing, media optimization, and `prefers-reduced-motion` behavior.

## Motion Tokens
- **Transition Duration**: 200ms (default), 400ms (hover), 600ms (focus)
- **Easing**: `ease-in-out` for all transitions
- **Opacity Change**: 0.2 for fade-in/fade-out effects
- **Scale**: 1.05 for subtle hover effects
- **Scroll Snap**: `snap` for section transitions

## Micro-Interactions
- **Hover Effects**: Subtle scale and opacity change on buttons and cards
- **Focus Effects**: Highlight border and scale on focus states
- **Loading States**: Skeleton loaders with 100ms delay
- **Error States**: Red border and shake animation (10ms duration, 3 repetitions)

## Transition Timing
- **Page Load**: 1s fade-in
- **Section Navigation**: 0.5s slide-in with `ease-in-out`
- **Form Submission**: 0.3s fade-out with confirmation message
- **Modal Appearances**: 0.4s fade-in with backdrop dimming

## Storyboards
1. **Onboarding Flow**:
   - Welcome screen with fade-in
   - Interactive tutorial with micro-interactions
   - Progress bar with smooth transitions

2. **Planning Interface**:
   - Weekly view with scroll snap
   - Task creation with modal animation
   - Task completion with checkmark animation

3. **Summary View**:
   - Summary card with fade-in
   - Progress bar with color transition
   - Export button with scale animation

## Image/Video Use
- **Images**: Optimized for 1x and 2x density, with `srcset` and `sizes` attributes
- **Videos**: Compressed to 1080p, with `preload="none"` and `playsinline` attributes
- **Fallbacks**: Grayscale images for `prefers-reduced-motion` users
- **Licensing**: All assets are either original or use CC0-licensed content

## Media Optimization
- **Image Format**: WebP for all images
- **Video Format**: MP4 with H.264 encoding
- **Compression**: Lossy compression with 80% quality
- **Performance Budget**: 1MB for images, 2MB for videos (to be confirmed by FE-06)

## `prefers-reduced-motion` Behavior
- **Fallbacks**: Static UI with no animations
- **Accessibility**: Ensure all functionality is available without motion
- **Testing**: Confirm `prefers-reduced-motion` behavior with FE-06

## Evidence and Assumptions
- **Motion Tokens**: Assumed to be consistent with standard UI/UX practices
- **Micro-Interactions**: Based on common UI patterns and accessibility guidelines
- **Transition Timing**: Estimated for smooth user experience without performance issues
- **Performance Budget**: Placeholder; needs confirmation by FE-06
- **Asset Licensing**: All assets are assumed to be either original or CC0-licensed

## Boundaries and Unknowns
- **Performance Budget**: Needs confirmation by FE-06
- **Exact Transition Durations**: May vary based on device and browser
- **Asset Licensing**: Some assets may require additional verification
- **User Preferences**: `prefers-reduced-motion` behavior may vary by user
- **Accessibility Testing**: Requires actual user testing and validation

## Notes
- This is a draft specification and should not be considered final
- All values and assumptions are subject to change based on further review and validation
- FE-06 is responsible for verifying performance budgets and fallbacks

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "Motion tokens, micro-interactions, and transition timing are clearly defined and aligned with accessibility and performance best practices",
    "Storyboards and media use are structured and provide a clear visual flow for the one-week planning exercise",
    "Asset licensing and `prefers-reduced-motion` behavior are addressed with fallbacks and assumptions",
    "Performance budget is acknowledged as a pending requirement and marked for FE-06 verification"
  ],
  "missing_requirements": [
    "Performance budget confirmation"
  ],
  "evidence_limits": [
    "Performance budget is still pending confirmation by FE-06",
    "Asset licensing details are assumed and may require further verification",
    "Accessibility testing plan is not explicitly defined in the draft"
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: motion, media, performance, budget, accessibility, review, fe-06.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.