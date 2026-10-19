<!-- Wejdan local artifact · task=task_6d237d02-c465-4566-9c5c-1bd1160cb095 · trace=trace_0bd6c5cb-09c7-4ea2-9fca-70504356c0a4 · role=BE-06 · provider=ollama-local · model=qwen3:8b -->

# Identity/Authorization Engineer — Synthetic specialist acceptance artifact

Role: BE-06 · Team: BE · Contract: role.BE-06.v1

## Role output

```markdown
# Role-Specific Deliverable: Permission Matrix and Negative Access Tests (Draft)

## Permission Matrix

| Resource | Actor (User) | Tenant | Action | Allowed | Reason |
|---------|-------------|--------|--------|---------|--------|
| Task | User | Tenant A | Read | ✅ | Session-bound access |
| Task | User | Tenant A | Write | ✅ | Session-bound access |
| Task | User | Tenant B | Read | ❌ | No tenant binding in session |
| Task | User | Tenant B | Write | ❌ | No tenant binding in session |
| Task | Admin | Tenant A | Delete | ✅ | Admin role with tenant binding |
| Task | Admin | Tenant B | Delete | ❌ | No tenant binding in session |
| Session | User | Tenant A | Create | ✅ | Valid session creation |
| Session | User | Tenant A | Destroy | ✅ | Valid session termination |
| Session | User | Tenant B | Create | ❌ | No tenant binding in session |
| Session | User | Tenant B | Destroy | ❌ | No tenant, session invalid |

## Negative Access Tests

| Test Case | Description | Expected Outcome | Notes |
|----------|------------|------------------|-------|
| Test 1 | User tries to access Task in Tenant B without tenant binding | Access denied | No tenant in session |
| Test 2 | Admin tries to delete Task in Tenant B without tenant binding | Access denied | No tenant in session |
| Test 3 | User tries to create session for Tenant B without tenant binding | Session creation denied | No tenant in session |
| Test 4 | User tries to write to Task in Tenant B without tenant binding | Write denied | No tenant in session |
| Test 5 | User tries to change own permissions | Access denied | No self-modification allowed |
| Test 6 | User tries to use production data without explicit approval | Access denied | No data access without approval |
| Test 7 | User tries to send external message without approval | Access denied | No external communication allowed |

## Evidence and Assumptions

- **Assumption 1**: All session creation and validation is done through a trusted identity provider (IdP) that binds actor and tenant.
- **Assumption 2**: Object-level access is enforced through a role-based access control (RBAC) system that uses tenant and actor identifiers from the session.
- **Assumption 3**: No user-supplied IDs are used for actor or tenant; all are derived from the trusted session.
- **Assumption 4**: Admin roles are explicitly defined and must have tenant binding to perform destructive actions.
- **Assumption 5**: All access decisions are made based on the session context and not on user-provided data.

## Boundaries and Unknowns

- **Unknown 1**: The exact identity provider (IdP) integration details are not provided, so the session binding mechanism is assumed to be secure and trusted.
- **Unknown 2**: The exact RBAC model and its implementation are not specified, so the matrix is a conceptual representation.
- **Unknown 3**: The exact tenant and actor identifiers are not provided, so the matrix is based on assumed naming conventions.
- **Unknown 4**: The exact approval process for data access or external communication is not defined, so the tests are based on assumed policy boundaries.
- **Unknown 5**: The exact session lifecycle management (e.g., expiration, renewal) is not specified, so the matrix is based on standard session management practices.

## Draft Note

This deliverable is a conceptual draft aligned with the role responsibilities and expected deliverables. It assumes a secure, trusted session-based identity and access control model. Further details on the IdP, RBAC, and session management would be required to finalize the implementation.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "The draft assumes secure and trusted IdP integration without providing specific details or verification of its security posture."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: permission, matrix, negative, access, tests.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.