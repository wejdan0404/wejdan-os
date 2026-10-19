<!-- Wejdan local artifact · task=task_2235e700-6b35-4758-bfa6-4cefd16aeed3 · trace=trace_2f63ac45-12f3-4341-a6c6-373e4dba9154 · role=DES-03 · provider=ollama-local · model=qwen3:8b -->

# User-Flow Designer — Synthetic specialist acceptance artifact

Role: DES-03 · Team: DES · Contract: role.DES-03.v1

## Role output

```markdown
# User-Flow Design Draft for Fictional Local-First Personal Planning Product

## Overview
This document outlines the user flow for a fictional local-first personal planning product. The product includes a one-week planning exercise designed to help users organize their goals, tasks, and reflections. The flow includes happy path scenarios, exception states, accessibility considerations, and recovery journeys. User approval points are clearly marked.

---

## Flow Map

### 1. **New User Journey**
**Happy Path:**
- User opens the app for the first time.
- Onboarding screen is displayed.
- User clicks "Start Planning".
- User is prompted to set a planning goal (e.g., "Organize my week").
- User confirms the goal.
- User is directed to the planning interface.
- User adds tasks, sets reminders, and sets a reflection date.
- User completes the planning session and is prompted to save.
- User clicks "Save" and is redirected to the dashboard.

**Exception States:**
- User cancels onboarding: Redirect to the home screen.
- User skips setting a goal: Redirect to the planning interface with a default goal.
- User fails to save: Show an error message and prompt to save again.
- User exits without saving: Show a confirmation dialog to save or exit.

**User Approval:**
- User must approve the goal setting.
- User must approve the final save.

### 2. **Returning User Journey**
**Happy Path:**
- User logs in.
- User is redirected to the dashboard.
- User clicks "Continue Planning".
- User is directed to the planning interface.
- User adds tasks, sets reminders, and sets a reflection date.
- User completes the planning session and is prompted to save.
- User clicks "Save" and is redirected to the dashboard.

**Exception States:**
- User logs in but has no saved plan: Redirect to the planning interface with a default plan.
- User fails to save: Show an error message and prompt to save again.
- User exits without saving: Show a confirmation dialog to save or exit.

**User Approval:**
- User must approve the final save.

### 3. **Accessibility Journey**
**Happy Path:**
- User navigates the app using screen reader.
- User is prompted to set a planning goal.
- User confirms the goal.
- User is directed to the planning interface.
- User adds tasks, sets reminders, and sets a reflection date.
- User completes the planning session and is prompted to save.
- User clicks "Save" and is redirected to the dashboard.

**Exception States:**
- Screen reader fails to read a prompt: Show an error message and prompt to retry.
- User fails to save: Show an error message and prompt to save again.
- User exits without saving: Show a confirmation dialog to save or exit.

**User Approval:**
- User must approve the goal setting.
- User must approve the final save.

### 4. **Recovery Journey**
**Happy Path:**
- User logs in and sees a saved plan.
- User clicks "Recover Plan".
- User is directed to the planning interface.
- User adds tasks, sets reminders, and sets a reflection date.
- User completes the planning session and is prompted to save.
- User clicks "Save" and is redirected to the dashboard.

**Exception States:**
- User cannot recover a plan: Show an error message and prompt to try again.
- User fails to save: Show an error message and prompt to save again.
- User exits without saving: Show a confirmation dialog to save or exit.

**User Approval:**
- User must approve the final save.

---

## Handoff to FE/BE/AI
- **FE (Frontend):** Implement onboarding, planning interface, and dashboard.
- **BE (Backend):** Handle user authentication, plan storage, and recovery logic.
- **AI:** Not required for this task.

---

## Evidence and Assumptions

### Assumptions
- The product is a local-first application, meaning all data is stored locally and not shared with external services.
- The planning exercise is a one-week task with a set of predefined goals and tasks.
- User approval is required for goal setting and final save.
- The app supports screen readers and other accessibility tools.

### Evidence
- No real user data or external services are used.
- All domain-specific facts are assumed to be unknown and not provided.
- The flow is based on the given scenario and role responsibilities.

---

## Boundaries and Unknowns

### Boundaries
- No real user data, external services, or real-world actions are used.
- No budgets, cost amounts, exact dates, staffing availability, or evidence are assumed.
- No legal, financial, or medical content is included.

### Unknowns
- The exact nature of the planning goals and tasks is not specified.
- The exact user interface design and layout are not provided.
- The exact implementation of accessibility features is not specified.
- The exact recovery process is not detailed.

---

## Final Notes
This is a draft of the user flow for the fictional local-first personal planning product. It is based on the given scenario and role responsibilities. Further refinement and validation are required before final implementation.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "The draft does not include specific test coverage details or independent QA verification, which are required for release gates."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: flow, exit, handoff.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.