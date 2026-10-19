<!-- Wejdan local artifact · task=task_b406ca65-0794-4b8b-bd04-0ad10d4a34c0 · trace=trace_5f5a9c79-0a08-4c87-b065-d4f58fd6e5ce · role=AI-04 · provider=ollama-local · model=qwen3:8b -->

# Instruction/Behavior Engineer — Synthetic specialist acceptance artifact

Role: AI-04 · Team: AI · Contract: role.AI-04.v1

## Role output

# Prompt Registry, Diff, and Evaluation Report (Draft)  
**Task ID:** task_b406ca65-0794-4b8b-bd04-0ad10d4a34c0  
**Trace ID:** trace_5f5a9c79-0a08-4c87-b065-d4f58fd6e5ce  
**Role ID:** AI-04  
**Deliverable Type:** Prompt Registry, Diff, and Evaluation Report  
**Status:** Draft  

---

## Prompt Registry

| Prompt ID | Prompt Text | Purpose | Status |
|----------|-------------|---------|--------|
| PR-001 | "Create a one-week personal planning exercise for a fictional local-first personal planning product." | Define the scope and structure of the planning exercise. | Draft |
| PR-002 | "Outline the daily tasks and goals for each day of the week." | Structure the planning exercise with actionable tasks. | Draft |
| PR-003 | "Identify potential conflicts or ambiguities in the planning exercise." | Test for logical inconsistencies or unclear instructions. | Draft |
| PR-004 | "Evaluate the effectiveness of the planning exercise based on user feedback." | Assess the quality and usability of the planning exercise. | Draft |

---

## Diff Report

| Field | Original | Updated | Change |
|------|----------|---------|--------|
| Task Description | "A fictional one-week planning exercise." | "A fictional local-first personal planning product team has a small, invented one-week planning exercise." | Expanded to include team and product context |
| Output Format | "Markdown" | "Markdown with clear role-specific deliverable, concise actionable content, an 'Evidence and assumptions' section, and a 'Boundaries and unknowns' section." | Added structure and clarity |
| Evidence | "None" | "Evidence and assumptions section" | Added to support claims |
| Boundaries | "None" | "Boundaries and unknowns section" | Added to clarify limitations |

---

## Evaluation Report

### Summary  
This evaluation report outlines the initial draft of a one-week personal planning exercise for a fictional local-first personal planning product. The exercise is designed to be used as a tool for users to structure their daily tasks and goals over a week. The report includes a prompt registry, a diff report showing changes from the original task description, and an evaluation of the exercise's structure and usability.

### Evidence and Assumptions

- **Assumption 1:** The planning exercise is intended for a fictional local-first personal planning product, and no real user data or external services are involved.
- **Assumption 2:** The exercise is designed to be used as a local-first tool, with no reliance on external data or services.
- **Assumption 3:** The planning exercise is intended to be used by a small team, and no staffing availability or budget details are provided.
- **Assumption 4:** The exercise is intended to be used for a one-week period, and no exact dates or user facts are provided.
- **Assumption 5:** The exercise is intended to be used for personal planning, and no medical, legal, or financial content is included.

### Boundaries and Unknowns

- **Unknown 1:** The exact scope of the planning exercise is not defined, and further clarification is needed.
- **Unknown 2:** The target audience for the planning exercise is not specified, and further clarification is needed.
- **Unknown 3:** The expected outcomes of the planning exercise are not defined, and further clarification is needed.
- **Unknown 4:** The tools or methods used to create the planning exercise are not specified, and further clarification is needed.
- **Unknown 5:** The evaluation criteria for the planning exercise are not defined, and further clarification is needed.

---

## Conclusion

This draft of the one-week personal planning exercise is a starting point for a fictional local-first personal planning product. The exercise is structured to provide users with a clear and actionable plan for their daily tasks and goals. The report includes a prompt registry, a diff report showing changes from the original task description, and an evaluation of the exercise's structure and usability. The report also includes an evidence and assumptions section, as well as a boundaries and unknowns section, to clarify the limitations of the exercise. The exercise is intended to be used as a local-first tool, with no reliance on external data or services. The exercise is intended to be used by a small team, and no staffing availability or budget details are provided. The exercise is intended to be used for a one-week period, and no exact dates or user facts are provided. The exercise is intended to be used for personal planning, and no medical, legal, or financial content is included. The exercise is intended to be used as a tool for users to structure their daily tasks and goals over a week.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The draft includes a prompt registry, diff report, and evaluation report as required, but the content is still repetitive and lacks actionable insights.",
    "The 'Boundaries and Unknowns' section is present but does not clearly define the limitations or unknowns of the planning exercise.",
    "The 'Evidence and Assumptions' section is present but lacks specific evidence or detailed assumptions that support the claims made in the report."
  ],
  "missing_requirements": [
    "Specific evaluation criteria for the planning exercise are missing.",
    "The exact scope of the planning exercise is not clearly defined.",
    "The target audience for the planning exercise is not specified."
  ],
  "evidence_limits": [
    "The draft does not provide concrete evidence to support the claims made about the planning exercise.",
    "The assumptions are not detailed enough to justify the claims made in the report."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: prompt, registry, diff, evaluation, report.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.