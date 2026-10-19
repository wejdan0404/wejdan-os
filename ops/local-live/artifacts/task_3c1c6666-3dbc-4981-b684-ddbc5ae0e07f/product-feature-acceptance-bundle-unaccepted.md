<!-- Wejdan local artifact · task=task_3c1c6666-3dbc-4981-b684-ddbc5ae0e07f · trace=trace_7484d0cb-4f16-4e97-be18-42426c2bdef3 · role=PROD-01 · provider=ollama-local · model=qwen3:8b -->

# Synthetic offline planning reminder feature — unaccepted draft

Task: task_3c1c6666-3dbc-4981-b684-ddbc5ae0e07f
Trace: trace_7484d0cb-4f16-4e97-be18-42426c2bdef3
Provider/model: Ollama local / qwen3:8b
Review verdict: REVISE

## Consolidated bounded revision — Web UI Developer

# 🧩 Final Deliverable: Synthetic Offline Planning Reminder Feature  
**Task ID:** task_3c1c6666-3dbc-4981-b684-ddbc5ae0e07f  
**Trace ID:** trace_7484d0cb-4f16-4e97-be18-42426c2bdef3  
**Role ID:** FE-02 — Web UI Developer  
**Status:** PENDING  

---

## ✅ **Confirmed Baseline Requirements (Not Pending)**  
| **Requirement** | **Status** | **Owner Decision** |
|------------------|------------|---------------------|
| Single-user, local-first, offline-first | CONFIRMED | CONFIRMED |
| Quiet hours 23:00–07:00 | CONFIRMED | CONFIRMED |
| Focus blocks suppress nudges | CONFIRMED | CONFIRMED |
| Use local Hive data | CONFIRMED | CONFIRMED |
| Accessibility: 44pt targets | CONFIRMED | CONFIRMED |
| Accessibility: 200% text scale | CONFIRMED | CONFIRMED |
| Accessibility: semantic labels | CONFIRMED | CONFIRMED |
| Accessibility: contrast AA | CONFIRMED | CONFIRMED |

---

## 📌 **Pending New Behavior (Owner Decision: PENDING)**  
| **Behavior** | **Status** | **Owner Decision** |
|--------------|------------|---------------------|
| Reminder during quiet hours → deferred to 07:00 | PENDING | PENDING |
| Reminder during focus block → deferred to end of block | PENDING | PENDING |
| Reminder still in quiet hours after focus block → deferred to 07:00 | PENDING | PENDING |
| Disabling reminder cancels pending delivery and stays disabled offline | PENDING | PENDING |

---

## 🧾 **Requirements-to-Design Matrix (PENDING)**

| **Requirement** | **Design Behavior** | **Status** | **Owner Decision** |
|------------------|---------------------|------------|---------------------|
| Quiet hours 23:00–07:00 | Reminders during this time are deferred to 07:00 | PENDING | PENDING |
| Focus blocks suppress nudges | Reminders during focus blocks are deferred to end of block | PENDING | PENDING |
| Reminder deferral to quiet-end | If reminder is still during quiet hours after focus block, defer to 07:00 | PENDING | PENDING |
| Disabling reminder cancels pending delivery | Disabling the reminder removes any scheduled delivery and keeps it disabled offline | PENDING | PENDING |
| Use local Hive data | All reminder data is stored in local Hive, no network access | CONFIRMED | CONFIRMED |
| Accessibility: 44pt targets | UI elements have minimum 44pt font size | CONFIRMED | CONFIRMED |
| Accessibility: 200% text scale | UI supports scaling to 200% | CONFIRMED | CONFIRMED |
| Accessibility: semantic labels | All UI elements have semantic labels | CONFIRMED | CONFIRMED |
| Accessibility: contrast AA | UI meets AA contrast standards | CONFIRMED | CONFIRMED |

---

## 🧪 **Test Matrix (NOT_RUN)**

| **Test Type** | **Test Case ID** | **Description** | **Status** | **Owner Decision** |
|---------------|------------------|------------------|------------|---------------------|
| **Unit Test** | UT-001 | Quiet hour start (23:00) | NOT_RUN | PENDING |
| **Unit Test** | UT-002 | Quiet hour end (07:00) | NOT_RUN | PENDING |
| **Unit Test** | UT-003 | Cross-midnight boundary (23:30 → 00:30) | NOT_RUN | PENDING |
| **Unit Test** | UT-004 | Focus block overlap (multiple blocks) | NOT_RUN | PENDING |
| **Unit Test** | UT-005 | Deferral to quiet-end after focus block | NOT_RUN | PENDING |
| **Unit Test** | UT-006 | Disable/cancel behavior (offline persistence) | NOT_RUN | PENDING |
| **Integration Test** | IT-001 | Hive persistence of reminder data | NOT_RUN | PENDING |
| **Integration Test** | IT-002 | Offline toggle behavior (enable/disable) | NOT_RUN | PENDING |
| **E2E Test** | E2E-001 | Enable/edit/disable reminder flow | NOT_RUN | PENDING |
| **E2E Test** | E2E-002 | Missed-item neutral copy (no user feedback) | NOT_RUN | PENDING |
| **Accessibility Test** | AT-001 | 44pt target size | NOT_RUN | PENDING |
| **Accessibility Test** | AT-002 | 200% text scale | NOT_RUN | PENDING |
| **Accessibility Test** | AT-003 | Semantic labels | NOT_RUN | PENDING |
| **Accessibility Test** | AT-004 | Contrast AA compliance | NOT_RUN | PENDING |

---

## 📝 **Test Case Definitions (NOT_RUN)**

### **Unit Tests**
- **UT-001**: Validate that a reminder is deferred to 07:00 when the current time is 23:00.
- **UT-002**: Validate that a reminder is deferred to 07:00 when the current time is 07:00.
- **UT-003**: Validate that a reminder is deferred to 07:00 when the current time is 23:30 and the next day is 00:30.
- **UT-004**: Validate that a reminder is deferred to the end of the focus block when the current time is within a focus block.
- **UT-005**: Validate that a reminder is deferred to 07:00 if it is still within quiet hours after a focus block ends.
- **UT-006**: Validate that disabling a reminder removes it from the schedule and persists the disabled state in Hive.

### **Integration Tests**
- **IT-001**: Validate that reminder data is stored in Hive and can be retrieved after app restart.
- **IT-002**: Validate that the app can toggle between online and offline modes and that reminders are deferred accordingly.

### **E2E Tests**
- **E2E-001**: Validate the full flow of enabling, editing, and disabling a reminder.
- **E2E-002**: Validate that no user feedback is shown when a reminder is missed (neutral copy).

### **Accessibility Tests**
- **AT-001**: Validate that all UI elements have a minimum font size of 44pt.
- **AT-002**: Validate that the UI supports scaling to 200%.
- **AT-003**: Validate that all UI elements have semantic labels for accessibility.
- **AT-

## Reviewer feedback
{
  "verdict": "REVISE",
  "findings": [
    "The revised deliverable includes test case definitions and deterministic assertions for all proposed test types (unit, integration, E2E, accessibility).",
    "The 'deferral to quiet-end' logic is now clearly defined in the test matrix and includes handling for cross-midnight boundaries.",
    "The 'disable/cancel' behavior is aligned with the requirement to 'stay disabled offline' and includes explicit test assertions.",
    "The 'cross-midnight boundary' handling is addressed in the test matrix with a dedicated unit test case.",
    "The 'focus block overlap' scenario is covered in the test matrix with a dedicated unit test case.",
    "The 'Hive persistence' and 'offline toggles' are included in integration tests with explicit test case definitions.",
    "The 'missed-item neutral copy' in E2E tests is now defined with a clear test case description.",
    "The 'semantic labels' and 'contrast AA' are included in accessibility tests with detailed test case definitions."
  ],
  "missing_requirements": [
    "Explicit test case definitions for all proposed test types (unit, integration, E2E, accessibility).",
    "Deterministic assertions for all test cases, including setup and expected outcomes.",
    "Clear definition of 'deferral to quiet-end' logic and its handling of cross-midnight boundaries.",
    "Explicit test case for 'disable/cancel' behavior and its offline persistence.",
    "Test case for 'focus block overlap' and its deferral logic.",
    "Test case for 'Hive persistence' and 'offline toggles' with explicit assertions.",
    "Definition of 'missed-item neutral copy' for E2E tests."
  ],
  "evidence_limits": [
    "No actual test execution or evidence is provided; all tests are marked as NOT_RUN.",
    "The draft deliverables do not include test case IDs or deterministic assertions for any proposed test.",
    "The 'deferral to quiet-end' logic is not fully defined and requires further clarification.",
    "The 'disable/cancel' behavior is not fully aligned with the requirement to 'stay disabled offline' and needs explicit test assertions.",
    "The 'cross-midnight boundary' handling is not addressed in the test matrix and requires a unit test case."
  ]
}

## Acceptance state
FAILED/BLOCKED: SCENARIO_FINAL_REVIEW_NOT_PASS:REVISE
This draft is preserved for inspection and is not accepted, approved, deployed, or a factual/professional certification.