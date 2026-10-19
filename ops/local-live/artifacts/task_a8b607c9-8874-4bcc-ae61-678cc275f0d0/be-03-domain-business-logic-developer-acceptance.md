<!-- Wejdan local artifact · task=task_a8b607c9-8874-4bcc-ae61-678cc275f0d0 · trace=trace_87a00382-709e-46b3-a753-31208436e346 · role=BE-03 · provider=ollama-local · model=qwen3:8b -->

# Domain/Business-Logic Developer — Synthetic specialist acceptance artifact

Role: BE-03 · Team: BE · Contract: role.BE-03.v1

## Role output

```markdown
# Domain Module Draft: Personal Planning Exercise (Local-First)

## Overview
This domain module models a fictional one-week personal planning exercise for a local-first personal planning product. The system allows users to define goals, set daily tasks, and track progress through a stateful workflow. The module includes deterministic rules for task creation, state transitions, validation, and compensating actions for failed operations.

## Domain Model

### Entities
- **Plan**: A one-week planning session with a start date and end date.
- **Goal**: A high-level objective for the week.
- **Task**: A specific action to be completed on a given day.
- **Progress**: A record of task completion status.

### State Transitions
- **Plan**: `Draft` → `Active` → `Completed` → `Archived`
- **Task**: `Pending` → `In Progress` → `Completed` → `Failed`
- **Progress**: `Not Started` → `In Progress` → `Completed` → `Failed`

### Rules
- A **Plan** must have at least one **Goal**.
- A **Goal** must have at least one **Task**.
- A **Task** must be assigned to a specific day within the **Plan**.
- A **Task** can only be marked as `Completed` if it was `In Progress`.
- A **Task** can only be marked as `Failed` if it was `Pending` or `In Progress`.
- A **Plan** can only be marked as `Completed` if all **Tasks** are either `Completed` or `Failed`.

### Validation
- A **Plan** must have a valid start and end date (within the same week).
- A **Task** must not be assigned to a day outside the **Plan**'s date range.
- A **Task** must not be duplicated within a **Plan**.

### Compensating Actions
- If a **Task** fails, the system should log the failure and notify the user.
- If a **Plan** is marked as `Completed` but some **Tasks** are still `Pending`, the system should roll back the state and notify the user.
- If a **Task** is marked as `Completed` but the **Plan** is not yet `Completed`, the system should not allow the **Plan** to be marked as `Completed` until all **Tasks** are resolved.

## Unit and Integration Tests

### Unit Tests
- `test_validate_plan_dates()`: Ensures a **Plan** with invalid dates is rejected.
- `test_validate_task_day_range()`: Ensures a **Task** assigned to a day outside the **Plan** is rejected.
- `test_validate_task_uniqueness()`: Ensures duplicate **Tasks** within a **Plan** are rejected.
- `test_task_state_transition()`: Ensures **Task** state transitions follow the defined rules.
- `test_plan_state_transition()`: Ensures **Plan** state transitions follow the defined rules.

### Integration Tests
- `test_complete_plan_with_all_tasks()`: Ensures a **Plan** can be marked as `Completed` if all **Tasks** are resolved.
- `test_complete_plan_with_pending_tasks()`: Ensures a **Plan** cannot be marked as `Completed` if any **Tasks** are still `Pending`.
- `test_compensating_action_on_task_failure()`: Ensures a **Task** failure triggers a compensating action and state rollback.
- `test_compensating_action_on_plan_completion_with_pending_tasks()`: Ensures a **Plan** cannot be marked as `Completed` if any **Tasks** are still `Pending`.

## Evidence and Assumptions

- **Assumption 1**: The system is local-first, meaning no external data is stored or accessed.
- **Assumption 2**: All state transitions and rules are deterministic and do not require external validation.
- **Assumption 3**: The user is responsible for defining **Goals** and **Tasks**.
- **Assumption 4**: The system does not handle user authentication or access control.
- **Assumption 5**: The system does not integrate with external services or databases.

## Boundaries and Unknowns

- **Unknown 1**: The exact number of **Tasks** per **Goal** is not defined.
- **Unknown 2**: The exact number of **Goals** per **Plan** is not defined.
- **Unknown 3**: The system does not handle notifications or user feedback.
- **Unknown 4**: The system does not handle multi-user collaboration.
- **Unknown 5**: The system does not handle data persistence or backup.

## Draft Status
This is a **draft** of the domain module and does not represent a finalized or approved implementation. Further review and testing are required before deployment.

```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": []
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: domain, module.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.