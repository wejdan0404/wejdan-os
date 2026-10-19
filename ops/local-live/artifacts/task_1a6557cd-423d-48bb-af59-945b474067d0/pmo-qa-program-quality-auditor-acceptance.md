<!-- Wejdan local artifact · task=task_1a6557cd-423d-48bb-af59-945b474067d0 · trace=trace_6eabbb53-da1a-4ae9-a0c2-7b48cdc9ae1e · role=PMO-QA · provider=ollama-local · model=qwen3:8b -->

# Program Quality Auditor — Synthetic specialist acceptance artifact

Role: PMO-QA · Team: PMO · Contract: role.PMO-QA.v1

## Role output

```markdown
# QA Draft: Task_1a6557cd-423d-48bb-af59-945b474067d0

## Verdict: REVISE

## Findings
- The task packet lacks clear acceptance criteria.
- The status transition from "In Progress" to "Completed" is not supported by evidence.
- No evidence is provided to confirm the task was completed.
- The decision to mark the task as completed was not owned by a designated stakeholder.
- No human sign-off or approval is documented for the task completion.

## Missing Requirements
- Acceptance criteria for the task must be defined and documented.
- Evidence of task completion must be provided.
- Ownership of the decision to complete the task must be assigned.
- Human sign-off or approval for task completion must be recorded.

## Evidence and Assumptions
- The task packet does not include any evidence of completion, such as documentation, testing results, or stakeholder confirmation.
- The status transition from "In Progress" to "Completed" is assumed to have occurred without proper verification.
- The task is assumed to be part of a fictional local-first personal planning product team's one-week planning exercise.
- The absence of specific domain facts (e.g., exact dates, staffing availability, budgets) is treated as unknown.

## Boundaries and Unknowns
- The exact nature of the task and its acceptance criteria are unknown.
- The identity of the stakeholder who made the decision to complete the task is unknown.
- The actual evidence of task completion is not provided.
- The role of the task within the broader planning exercise is not clearly defined.
- No tool use or external data is assumed to be involved.

## Status
This is a draft QA result and does not imply approval. Further review and evidence collection are required before final determination.
```

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The task packet lacks clear acceptance criteria.",
    "The status transition from 'In Progress' to 'Completed' is not supported by evidence.",
    "No evidence is provided to confirm the task was completed.",
    "The decision to mark the task as completed was not owned by a designated stakeholder.",
    "No human sign-off or approval is documented for the task completion."
  ],
  "missing_requirements": [
    "Acceptance criteria for the task must be defined and documented.",
    "Evidence of task completion must be provided.",
    "Ownership of the decision to complete the task must be assigned.",
    "Human sign-off or approval for task completion must be recorded."
  ],
  "evidence_limits": [
    "No evidence of task completion is provided in the draft.",
    "The status transition lacks supporting documentation.",
    "No stakeholder ownership or sign-off is documented.",
    "No verification of task completion is included."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: result.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.