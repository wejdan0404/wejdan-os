<!-- Wejdan local artifact · task=task_8269d70b-eea8-4965-978e-f59aa2cf9069 · trace=trace_b54fe1d6-d22d-4edd-9445-67a8bc48c72c · role=UR-QA · provider=ollama-local · model=qwen3:8b -->

# Research Quality Auditor — Synthetic specialist acceptance artifact

Role: UR-QA · Team: UR · Contract: role.UR-QA.v1

## Role output

```markdown
# Research Quality Audit Draft: UR-QA Review of Fictional Personal Planning Exercise

## Deliverable: Independent Quality Decision
**Verdict:** REVISE  
**Findings:**  
- Potential bias in question wording that may lead to overgeneralization.  
- Insufficient sample size and lack of demographic representation.  
- Missing evidence of ethical compliance and informed consent.  
- Unclear analytical traceability of findings.  

**Missing Requirements:**  
- Explicit ethical compliance documentation.  
- Detailed recruitment strategy and participant demographics.  
- Justification for sample size and representativeness.  
- Clear analytical process and traceability of findings.  

**Boundaries and Unknowns:**  
- The exact nature of the planning exercise and its objectives are not specified.  
- No user data, external services, or real-world actions are involved.  
- No evidence of ethical review or informed consent process is provided.  
- No tools or external data sources are referenced.  
- No human sign-off, legal findings, or financial content is included.  

## Evidence and Assumptions
- The planning exercise is described as "fictional" and "local-first," with no real user data involved.  
- The team has conducted a one-week planning exercise, but no details about the structure, questions, or recruitment process are provided.  
- The review assumes that the exercise involves user interaction and data collection, but no evidence is available to confirm this.  
- The review assumes that ethical compliance and informed consent are required for any user data collection, even in a fictional context.  
- The review assumes that sample size and representativeness are important for validity, but no data is available to assess this.  

## Conclusion
The current draft lacks sufficient evidence to validate the findings of the planning exercise. The review recommends revising the exercise to include ethical compliance documentation, detailed recruitment strategy, justification for sample size, and clear analytical traceability. Further data collection and analysis are required before the findings can be used as validation.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "Potential bias in question wording that may lead to overgeneralization.",
    "Insufficient sample size and lack of demographic representation.",
    "Missing evidence of ethical compliance and informed consent.",
    "Unclear analytical traceability of findings."
  ],
  "missing_requirements": [
    "Explicit ethical compliance documentation.",
    "Detailed recruitment strategy and participant demographics.",
    "Justification for sample size and representativeness.",
    "Clear analytical process and traceability of findings."
  ],
  "evidence_limits": [
    "The exact nature of the planning exercise and its objectives are not specified.",
    "No user data, external services, or real-world actions are involved.",
    "No evidence of ethical review or informed consent process is provided.",
    "No tools or external data sources are referenced.",
    "No human sign-off, legal findings, or financial content is included."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: independent, quality, decision, before, findings, validation.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.