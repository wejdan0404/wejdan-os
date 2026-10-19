<!-- Wejdan local artifact · task=task_4b600ab3-d26a-428e-82b2-8915a15653d8 · trace=trace_a1d73723-3dfd-46a0-9773-f47896a13ed9 · role=BE-QA · provider=ollama-local · model=qwen3:8b -->

# Backend Quality Auditor — Synthetic specialist acceptance artifact

Role: BE-QA · Team: BE · Contract: role.BE-QA.v1

## Role output

```markdown
# Backend Quality Audit Draft - Task ID: task_4b600ab3-d26a-428e-82b2-8915a15653d8

## Role: Backend Quality Auditor (BE-QA)
## Contract: role.BE-QA.v1
## Deliverable: Failure Evidence and QA Gate to BE-01/central QA

## Summary
This draft outlines a quality assurance review of a fictional local-first personal planning product. The focus is on testing contracts, authorization, race conditions, migration, idempotency, rollback, and partial failure scenarios. The audit is conducted in a synthetic, local-first environment with no real user data or external services involved.

## Evidence and Assumptions

### 1. **Contracts**
- **Assumption**: Contracts are defined as data models or API specifications that govern interactions between components.
- **Evidence**: No contract definitions or specifications were provided. Therefore, no testing of contract compliance or validation can be performed.
- **Missing Requirement**: Contract definitions or API specifications.

### 2. **Authorization**
- **Assumption**: Authorization refers to the enforcement of access control policies.
- **Evidence**: No authorization logic or policy definitions were provided. Therefore, no testing of access control or role-based permissions can be performed.
- **Missing Requirement**: Authorization policies, role definitions, or access control logic.

### 3. **Race Conditions**
- **Assumption**: Race conditions occur when multiple processes access shared resources concurrently without proper synchronization.
- **Evidence**: No concurrency or synchronization mechanisms were described. Therefore, no testing of race conditions can be performed.
- **Missing Requirement**: Concurrency logic, shared resource definitions, or synchronization mechanisms.

### 4. **Migration**
- **Assumption**: Migration refers to the process of updating or transforming data between versions of a system.
- **Evidence**: No migration scripts, versioning logic, or data transformation rules were provided. Therefore, no testing of migration scenarios can be performed.
- **Missing Requirement**: Migration scripts, versioning logic, or data transformation rules.

### 5. **Idempotency**
- **Assumption**: Idempotency ensures that repeated operations have the same effect as a single operation.
- **Evidence**: No idempotency guarantees or retry logic were described. Therefore, no testing of idempotency can be performed.
- **Missing Requirement**: Idempotency guarantees, retry logic, or unique operation identifiers.

### 6. **Rollback**
- **Assumption**: Rollback refers to the ability to revert a system to a previous state after a failure.
- **Evidence**: No rollback mechanisms, versioning, or state management logic were provided. Therefore, no testing of rollback scenarios can be performed.
- **Missing Requirement**: Rollback mechanisms, versioning, or state management logic.

### 7. **Partial Failure**
- **Assumption**: Partial failure refers to the ability of a system to handle failures in some components without affecting others.
- **Evidence**: No error handling, fault tolerance, or partial success logic were described. Therefore, no testing of partial failure scenarios can be performed.
- **Missing Requirement**: Error handling, fault tolerance, or partial success logic.

## Boundaries and Unknowns

- **Domain Knowledge**: No domain-specific facts were provided, so all assumptions are based on general backend system behavior.
- **Tool Usage**: No tools were used or referenced. All testing and analysis are based on hypothetical scenarios.
- **User Data**: No real user data or external services were involved. All testing is synthetic and local-first.
- **Legal/Financial Content**: No legal, financial, or medical content was provided, so no boundaries or restrictions apply in that domain.
- **Human Sign-Off**: No human sign-off or approval was required or provided.

## Conclusion
This draft outlines the necessary testing areas for a backend system, but due to the lack of provided specifications, logic, or data, no actual testing or evidence can be generated. The audit is pending the provision of the required artifacts and definitions.

## QA Gate to BE-01/central QA
- **Verdict**: REVISE
- **Findings**: 
  - No contract definitions provided.
  - No authorization logic provided.
  - No race condition scenarios described.
  - No migration scripts or logic provided.
  - No idempotency guarantees described.
  - No rollback mechanisms provided.
  - No partial failure handling logic described.
- **Missing Requirements**: 
  - Contract definitions.
  - Authorization policies.
  - Concurrency logic.
  - Migration scripts.
  - Idempotency guarantees.
  - Rollback mechanisms.
  - Partial failure handling logic.
- **Evidence Limits**: 
  - No real user data or external services involved.
  - No actual testing or execution performed.
  - No tool usage or deployment involved.
```

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "No contract definitions provided.",
    "No authorization logic provided.",
    "No race condition scenarios described.",
    "No migration scripts or logic provided.",
    "No idempotency guarantees described.",
    "No rollback mechanisms provided.",
    "No partial failure handling logic described."
  ],
  "missing_requirements": [
    "Contract definitions.",
    "Authorization policies.",
    "Concurrency logic.",
    "Migration scripts.",
    "Idempotency guarantees.",
    "Rollback mechanisms.",
    "Partial failure handling logic."
  ],
  "evidence_limits": [
    "No real user data or external services involved.",
    "No actual testing or execution performed.",
    "No tool usage or deployment involved."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: failure, gate, be-01, central.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.