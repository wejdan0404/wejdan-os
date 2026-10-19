<!-- Wejdan local artifact · task=task_ff61e0c2-8b9c-457e-be0c-d336e4efdd79 · trace=trace_33a7191e-2b75-4861-ad05-d74c1ce177ba · role=AI-04 · provider=ollama-local · model=qwen3:8b -->

# Instruction/Behavior Engineer — Synthetic specialist acceptance artifact

Role: AI-04 · Team: AI · Contract: role.AI-04.v1

## Role output

# Prompt Registry, Diff, and Evaluation Report  
**Task ID:** task_ff61e0c2-8b9c-457e-be0c-d336e4efdd79  
**Trace ID:** trace_33a7191e-2b75-4861-ad05-d74c1ce177ba  
**Role ID:** AI-04  
**Deliverable Type:** Draft  

---

## ✅ Prompt Registry (Draft)

| Prompt ID | Prompt Text | Status | Owner | Notes |
|----------|-------------|--------|-------|-------|
| PR-001 | "Generate a one-week personal planning exercise for a fictional local-first personal planning product." | Pending | AI-04 | No tool use, no real-world data |
| PR-002 | "Ensure the planning exercise includes daily goals, reflection prompts, and a weekly summary." | Pending | AI-04 | No user facts, no real-world data |
| PR-003 | "Avoid any mention of budgets, legal, or financial content." | Pending | AI-04 | Safety boundary |
| PR-004 | "Use a fictional team name and no real-world dates or staffing details." | Pending | AI-04 | Fictional scenario |

---

## 🔄 Diff (Draft)

| Field | Version 1 | Version 2 | Change |
|------|-----------|-----------|--------|
| Prompt ID | N/A | PR-001 | New |
| Prompt Text | N/A | "Generate a one-week personal planning exercise for a fictional local-first personal planning product." | New |
| Status | N/A | Pending | New |
| Owner | N/A | AI-04 | New |
| Notes | N/A | No tool use, no real-world data | New |
| Prompt ID | N/A | PR-002 | New |
| Prompt Text | N/A | "Ensure the planning exercise includes daily goals, reflection prompts, and a weekly summary." | New |
| Status | N/A | Pending | New |
| Owner | N/A | AI-04 | New |
| Notes | N/A | No user facts, no real-world data | New |
| Prompt ID | N/A | PR-003 | New |
| Prompt Text | N/A | "Avoid any mention of budgets, legal, or financial content." | New |
| Status | N/A | Pending | New |
| Owner | N/A | AI-04 | New |
| Notes | N/A | Safety boundary | New |
| Prompt ID | N. | PR-004 | New |
| Prompt Text | N/A | "Use a fictional team name and no real-world dates or staffing details." | New |
| Status | N/A | Pending | New |
| Owner | N/A | AI-04 | New |
| Notes | N/A | Fictional scenario | New |

---

## 📄 Evaluation Report (Draft)

### ✅ Summary
This draft includes a prompt registry for a fictional one-week personal planning exercise. The prompts are designed to align with the role of an Instruction/Behavior Engineer (AI-04) and the responsibilities of maintaining versioned system/task instructions and structured output contracts. The prompts avoid real-world data, user facts, and tool use, as required.

### 📌 Evidence and Assumptions

- **Prompt PR-001** is based on the assumption that the user wants a fictional planning exercise for a local-first product.
- **Prompt PR-002** assumes that the planning exercise should include daily goals, reflection prompts, and a weekly summary.
- **Prompt PR-003** assumes that the content must avoid any mention of budgets, legal, or financial content.
- **Prompt PR-004** assumes that the team name and dates should be fictional, and no real-world staffing details should be included.

### 🚧 Boundaries and Unknowns

- **Unknown:** The exact scope of the planning exercise (e.g., number of goals per day, format of reflection prompts).
- **Unknown:** The fictional team name and product name.
- **Unknown:** The exact structure of the weekly summary.
- **Unknown:** Whether the planning exercise should include any visual elements (e.g., charts, calendars).
- **Unknown:** Whether the planning exercise should be interactive or static.

---

## 📝 Final Notes

This draft is a **work in progress** and is intended for review and refinement. It does not imply approval or completion. All content is fictional and based on the provided scenario. No real-world data, user facts, or tool use is included.

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": []
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: prompt, registry, diff, evaluation, report.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.