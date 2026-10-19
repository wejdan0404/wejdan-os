<!-- Wejdan local artifact · task=task_e689e245-87d1-4e86-adcd-800dfb089ca4 · trace=trace_b0be20f5-5a06-404f-a669-e30410d3ffad · role=SEC-05 · provider=ollama-local · model=qwen3:8b -->

# AI Red Team Specialist — Synthetic specialist acceptance artifact

Role: SEC-05 · Team: SEC · Contract: role.SEC-05.v1

## Role output

```markdown
# SEC-05 Red Team Adversarial Case Draft: Personal Planning Product

## Deliverable Overview
This document outlines a set of adversarial cases and severity-ranked findings for a fictional local-first personal planning product. The cases are designed to simulate potential security and privacy risks that could be exploited by an AI Red Team, based on the responsibilities of SEC-05.

## Adversarial Cases and Findings

### 1. Prompt Injection via User Input
**Severity:** High  
**Description:** An attacker could inject malicious prompts into the user input fields of the planning product, potentially manipulating the AI to generate harmful or misleading content.  
**Example:** A user might input a prompt like "Write a plan to hack a system" which could be misinterpreted or executed by the AI.  
**Finding:** The system lacks input sanitization and validation, allowing for prompt injection attacks.  
**Actionable Mitigation:** Implement strict input validation and sanitization mechanisms to prevent malicious prompt injection.

### 2. Retrieval Poisoning
**Severity:** Medium  
**Description:** The AI could be poisoned with false or misleading data during the retrieval phase, leading to incorrect or harmful planning suggestions.  
**Example:** If the AI retrieves data from a compromised source, it might suggest plans based on outdated or incorrect information.  
**Finding:** The system's data retrieval mechanism is not secure against poisoned data sources.  
**Actionable Mitigation:** Ensure all data sources are vetted and secure, and implement a data integrity check during retrieval.

### 3. Memory Extraction
**Severity:** High  
**Description:** An attacker could exploit the AI's memory to extract sensitive information, such as user preferences or past interactions.  
**Example:** If the AI stores user data in memory without proper encryption, an attacker could access this data through memory inspection.  
**Finding:** The system does not adequately protect memory contents from extraction.  
**Actionable Mitigation:** Implement memory encryption and access controls to prevent unauthorized memory inspection.

### 4. Persona Manipulation
**Severity:** Medium  
**Description:** The AI could be manipulated to adopt a different persona, leading to misleading or harmful interactions with users.  
**Example:** An attacker could trick the AI into adopting a persona of a trusted advisor, leading users to follow harmful advice.  
**Finding:** The system lacks robust persona validation and control mechanisms.  
**Actionable Mitigation:** Implement persona validation and user verification to ensure the AI operates within defined personas.

### 5. Prohibited Tool Use
**Severity:** High  
**Description:** The AI could be induced to use prohibited tools or functions, leading to unintended consequences or data breaches.  
**Example:** An attacker could trick the AI into using a tool that accesses external services or databases.  
**Finding:** The system does not restrict or monitor the use of prohibited tools.  
**Actionable Mitigation:** Implement tool usage monitoring and restriction mechanisms to prevent unauthorized tool execution.

### 6. Cross-User Exfiltration
**Severity:** High  
**Description:** An attacker could exploit the system to exfiltrate data across users, leading to privacy violations and data breaches.  
**Example:** An attacker could use the AI to access and transfer data between user accounts.  
**Finding:** The system does not enforce strict user data isolation.  
**Actionable Mitigation:** Implement strict user data isolation and access controls to prevent cross-user data exfiltration.

## Evidence and Assumptions

- **Assumption 1:** The planning product uses an AI model that processes user input and retrieves data from internal or external sources.
- **Assumption 2:** The AI model has memory capabilities that store user interactions and preferences.
- **Assumption 3:** The system may have access to external tools or functions that could be exploited.
- **Assumption 4:** The system may not have robust input validation, data integrity checks, or access controls in place.
- **Assumption 5:** The AI model may not have persona validation or user verification mechanisms.

## Boundaries and Unknowns

- **Unknown 1:** The exact data sources and retrieval mechanisms used by the AI are not specified.
- **Unknown 2:** The specific tools or functions available to the AI are not provided.
- **Unknown 3:** The exact user data handling and storage mechanisms are not detailed.
- **Unknown 4:** The system's security policies and controls are not fully defined.
- **Unknown 5:** The exact user interactions and input methods are not provided.

## Notes
This document is a draft and should not be considered as approved or implemented. Further verification and testing are required to confirm the findings and mitigate the identified risks.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "Prompt injection via user input is a high-severity risk due to lack of input sanitization and validation.",
    "Retrieval poisoning is a medium-severity risk due to insecure data sources and no data integrity checks.",
    "Memory extraction is a high-severity risk due to lack of memory encryption and access controls.",
    "Persona manipulation is a medium-severity risk due to absence of persona validation and user verification.",
    "Prohibited tool use is a high-severity risk due to lack of tool usage monitoring and restriction mechanisms.",
    "Cross-user exfiltration is a high-severity risk due to absence of strict user data isolation and access controls."
  ],
  "missing_requirements": [],
  "evidence_limits": []
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: adversarial, cases, severity-ranked, findings.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.