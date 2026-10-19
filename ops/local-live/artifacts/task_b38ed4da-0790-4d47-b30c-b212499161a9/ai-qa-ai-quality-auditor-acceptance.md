<!-- Wejdan local artifact · task=task_b38ed4da-0790-4d47-b30c-b212499161a9 · trace=trace_957dc212-de34-4efd-b488-2da8f24ded7c · role=AI-QA · provider=ollama-local · model=qwen3:8b -->

# AI Quality Auditor — Synthetic specialist acceptance artifact

Role: AI-QA · Team: AI · Contract: role.AI-QA.v1

## Role output

# AI-QA Draft Deliverable: Synthetic Local Evaluation Task

## Role-Specific Deliverable

**Task ID:** task_b38ed4da-0790-4d47-b30c-b212499161a9  
**Trace ID:** trace_957dc212-de34-4efd-b488-2da8f24ded7c  
**Role ID:** AI-QA  
**Deliverable Type:** QA Decision Draft  
**Status:** Draft (Not Approved)

---

## QA Decision

**Verdict:** REVISE  
**Findings:**  
- The synthetic local evaluation task lacks a defined set of test cases or evaluation criteria.  
- No user personas, scenarios, or failure modes are specified.  
- No evidence of tool usage, memory behavior, or retrieval accuracy is provided.  
- The task does not include a reproducible case or a clear method for sampling real-world failures.  
- No boundary conditions or privacy rules are explicitly addressed.  

**Missing Requirements:**  
- Evaluation criteria or test cases  
- User personas or scenarios  
- Privacy rules or data handling constraints  
- Evidence of tool or memory behavior  
- Reproducible case or failure sampling method  

**Evidence Limits:**  
- No user data or external service interaction is provided.  
- No real-world failure examples or privacy rule compliance checks are included.  
- No tool usage or memory behavior is described.  
- No legal, financial, or medical content is included, which is required for boundary checks.  

---

## Evidence and Assumptions

**Assumptions:**  
- The task is a synthetic local-first planning exercise, and no real-world data is involved.  
- The product team has not provided any domain-specific facts or user data.  
- The AI-QA role is expected to inspect language, persona, retrieval, tool, and memory behavior.  
- The AI-QA is not allowed to invent evidence, user facts, or tool usage.  

**Evidence Provided:**  
- The task is described as a synthetic local evaluation with no real user data, external services, or real-world actions.  
- The AI-QA is instructed to return only the requested deliverable and not to invent evidence or user facts.  

---

## Boundaries and Unknowns

**Boundaries:**  
- No real-world data, external services, or real user interactions are allowed.  
- No tool usage, memory behavior, or retrieval accuracy can be assumed.  
- No legal, financial, or medical content is permitted.  
- No evidence of user facts, test execution, or deployment is allowed.  

**Unknowns:**  
- The exact nature of the planning exercise is not defined.  
- The user personas, scenarios, or failure modes are not specified.  
- The evaluation criteria or test cases are not provided.  
- The privacy rules or data handling constraints are not addressed.  
- The AI-QA cannot assume any tool usage or memory behavior.  

---

## Conclusion

This task requires a more detailed evaluation plan, including test cases, user scenarios, and privacy rule compliance checks. The current draft lacks the necessary structure and evidence to meet the AI-QA role's responsibilities. A revised deliverable should include all required components to ensure compliance with the role's expectations and safety boundaries.

Independent QA-01 review:
{
  "verdict": "REVISE",
  "findings": [
    "The draft lacks a defined set of test cases or evaluation criteria.",
    "No user personas, scenarios, or failure modes are specified.",
    "No evidence of tool usage, memory behavior, or retrieval accuracy is provided.",
    "The task does not include a reproducible case or a clear method for sampling real-world failures.",
    "No boundary conditions or privacy rules are explicitly addressed."
  ],
  "missing_requirements": [
    "Evaluation criteria or test cases",
    "User personas or scenarios",
    "Privacy rules or data handling constraints",
    "Evidence of tool or memory behavior",
    "Reproducible case or failure sampling method"
  ],
  "evidence_limits": [
    "No user data or external service interaction is provided.",
    "No real-world failure examples or privacy rule compliance checks are included.",
    "No tool usage or memory behavior is described.",
    "No legal, financial, or medical content is included, which is required for boundary checks."
  ]
}

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The draft lacks a defined set of test cases or evaluation criteria.",
    "No user personas, scenarios, or failure modes are specified.",
    "No evidence of tool usage, memory behavior, or retrieval accuracy is provided.",
    "The task does not include a reproducible case or a clear method for sampling real-world failures.",
    "No boundary conditions or privacy rules are explicitly addressed."
  ],
  "missing_requirements": [
    "Evaluation criteria or test cases",
    "User personas or scenarios",
    "Privacy rules or data handling constraints",
    "Evidence of tool or memory behavior",
    "Reproducible case or failure sampling method"
  ],
  "evidence_limits": [
    "No user data or external service interaction is provided.",
    "No real-world failure examples or privacy rule compliance checks are included.",
    "No tool usage or memory behavior is described.",
    "No legal, financial, or medical content is included, which is required for boundary checks."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: decision, reproducible, cases.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.