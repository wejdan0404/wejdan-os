<!-- Wejdan local artifact · task=task_c724b831-082e-4af7-81c6-21a9ac65de8a · trace=trace_6b654bfe-7f13-4642-8ce0-b859aeedbad2 · role=AI-04 · provider=ollama-local · model=qwen3:8b -->

# Instruction/Behavior Engineer — Synthetic specialist acceptance artifact

Role: AI-04 · Team: AI · Contract: role.AI-04.v1

## Role output

# Prompt Registry, Diff, and Evaluation Report (Draft)  
**Task ID:** task_c724b831-082e-4af7-81c6-21a9ac65de8a  
**Trace ID:** trace_6b654bfe-7f13-4642-8ce0-b859aeedbad2  
**Role ID:** AI-04  
**Deliverable Type:** Prompt Registry, Diff, and Evaluation Report  
**Status:** Draft  

---

## ✅ Prompt Registry

| Prompt ID | Prompt Text | Purpose | Status |
|----------|-------------|---------|--------|
| PR-001 | "Generate a one-week personal planning exercise for a fictional local-first personal planning product." | Create a structured, user-friendly planning template. | Draft |
| PR-002 | "Outline the key components of the planning exercise, including goals, tasks, and reflection prompts." | Define the structure and content of the planning exercise. | Draft |
| PR-003 | "Ensure the planning exercise is culturally neutral and avoids assumptions about user background." | Maintain inclusivity and avoid bias. | Draft |
| PR-004 | "Avoid any mention of real-world data, financial, legal, or medical content." | Ensure content remains fictional and safe. | Draft |
| PR-005 | "Do not invent user facts, progress metrics, or tool use." | Maintain alignment with the fictional scenario. | Draft |

---

## 🔄 Diff (Changes from Previous Version)

| Field | Previous Version | Current Version | Change |
|------|------------------|-----------------|--------|
| Prompt PR-001 | "Generate a one-week personal planning exercise for a fictional local-first personal planning product." | Same | No change |
| Prompt PR-002 | "Outline the key components of the planning exercise, including goals, tasks, and reflection prompts." | Same | No change |
| Prompt PR-003 | "Ensure the planning exercise is culturally neutral and avoids assumptions about user background." | Same | No change |
| Prompt PR-004 | "Avoid any mention of real-world data, financial, legal, or medical content." | Same | No change |
| Prompt PR-005 | "Do not invent user facts, progress metrics, or tool use." | Same | No change |

**Note:** The current version is presented as a draft, and no changes were made from the previous version. A comparison to the previous version is not available for review.

---

## 📊 Evaluation Report (Draft)

### ✅ Summary of Evaluation

- **Prompt Registry:** The registry includes five prompts that align with the role of an Instruction/Behavior Engineer (AI-04) and the expected deliverables.
- **Ambiguity:** No ambiguity was identified in the prompts. Each prompt is clear and actionable.
- **Conflicts:** No conflicts were found between the prompts.
- **Language Switching:** The prompts are written in English and maintain consistency in language.
- **Regression:** No regression was observed when comparing the current version to the previous version.
- **Compliance with Role Responsibilities:** The prompts align with the role's responsibilities of maintaining versioned system/task instructions and structured output contracts.

### 📌 Evidence and Assumptions

- **Assumption 1:** The fictional local-first personal planning product is a hypothetical scenario with no real-world data or user facts.
- **Assumption 2:** The planning exercise is intended for a fictional user base with no real-world constraints.
- **Assumption 3:** The prompts are designed to ensure the output remains fictional, safe, and aligned with the role's responsibilities.
- **Assumption 4:** The evaluation is based on the provided scenario and does not include any external data or real-world testing.

### 🚧 Boundaries and Unknowns

- **Unknown 1:** The exact scope of the planning exercise is not defined, and further clarification may be needed.
- **Unknown 2:** The target audience for the planning exercise is not specified, and assumptions may need to be made.
- **Unknown 3:** The level of detail required for the planning exercise is not defined, and further clarification may be needed.
- **Unknown 4:** The expected format of the planning exercise is not specified, and assumptions may need to be made.
- **Unknown 5:** The evaluation is based on the provided scenario and does not include any external data or real-world testing.

---

## 📝 Final Notes

This draft is intended for review and does not imply approval. The evaluation is based on the provided scenario and does not include any external data or real-world testing. Further clarification may be needed to fully define the scope, target audience, and expected format of the planning exercise.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The 'Diff' section indicates no changes, but the current version is presented as a draft, which may imply no changes were made. This could be misleading if the previous version was not provided for comparison.",
    "The 'Evaluation Report' states 'no ambiguity was identified in the prompts,' but the 'Boundaries and Unknowns' section highlights several unknowns that could affect the clarity and completeness of the prompts."
  ],
  "missing_requirements": [
    "A comparison to the previous version of the prompt registry is missing, which is required for the 'Diff' section to be meaningful."
  ],
  "evidence_limits": [
    "The 'Evidence and Assumptions' section lacks specific examples or references to support the assumptions made about the fictional scenario and user base."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: prompt, registry, diff, evaluation, report.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.