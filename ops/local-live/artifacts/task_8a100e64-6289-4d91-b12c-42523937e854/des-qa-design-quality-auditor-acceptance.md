<!-- Wejdan local artifact · task=task_8a100e64-6289-4d91-b12c-42523937e854 · trace=trace_42549817-5070-47a4-9cb1-8f84f3f06850 · role=DES-QA · provider=ollama-local · model=qwen3:8b -->

# Design Quality Auditor — Synthetic specialist acceptance artifact

Role: DES-QA · Team: DES · Contract: role.DES-QA.v1

## Role output

# Design Release Checklist - Task ID: task_8a100e64-6289-4d91-b12c-42523937e854

## Checklist Summary

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Design Completeness | [ ] Incomplete | Design Lead | Missing visual assets for task flow |
| Component Usage | [ ] Incomplete | Component Librarian | Missing usage of core UI components |
| Content Sign-Off | [ ] Incomplete | Content Lead | Missing final sign-off from content team |
| Motion Purpose | [ ] Incomplete | Motion Designer | Missing motion rationale for transitions |
| Accessible States | [ ] Incomplete | Accessibility Lead | Missing accessibility testing report |
| Consistency Against Requirements | [ ] Incomplete | Product Manager | Missing alignment with product spec |

## Evidence and Assumptions

- **Design Completeness**: The visual assets for the task flow are missing, including wireframes and high-fidelity mockups. This prevents a full review of the design.
- **Component Usage**: The core UI components (e.g., buttons, modals, cards) are not clearly referenced or used in the design, which may lead to inconsistencies.
- **Content Sign-Off**: The content team has not provided final sign-off for the text and copy used in the design, which is required for release.
- **Motion Purpose**: The motion designer has not provided a rationale for the transitions used in the interface, which is necessary to ensure they align with user experience goals.
- **Accessible States**: There is no evidence of accessibility testing or documentation of accessible states for interactive elements, which is a critical requirement.
- **Consistency Against Requirements**: The design has not been aligned with the product spec, which includes user flows, functionality, and design language.

## Boundaries and Unknowns

- **Missing Visual Assets**: The design team has not provided all visual assets, which prevents a full review.
- **Missing Component Usage**: The component library has not been referenced or used in the design, which may lead to inconsistencies.
- **Missing Content Sign-Off**: The content team has not provided final sign-off, which is required for release.
- **Missing Motion Rationale**: The motion designer has not provided a rationale for the transitions, which is necessary to ensure they align with user experience goals.
- **Missing Accessibility Testing**: There is no evidence of accessibility testing or documentation of accessible states for interactive elements.
- **Missing Alignment with Product Spec**: The design has not been aligned with the product spec, which includes user flows, functionality, and design language.

## Notes

This is a draft checklist and does not imply approval. The design is incomplete and requires further review and sign-off from the respective owners before release.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "Design is incomplete; missing visual assets for task flow",
    "Component usage is not referenced or used in the design",
    "Content sign-off is missing from the content team",
    "Motion rationale for transitions is missing",
    "Accessible states are not documented or tested",
    "Design is not aligned with product spec"
  ],
  "missing_requirements": [
    "Visual assets for task flow",
    "Component usage references",
    "Content sign-off",
    "Motion rationale",
    "Accessibility testing report",
    "Alignment with product spec"
  ],
  "evidence_limits": [
    "No visual assets provided",
    "No component usage references",
    "No content sign-off",
    "No motion rationale",
    "No accessibility testing report",
    "No alignment with product spec"
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: design, release, checklist, incomplete.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.