<!-- Wejdan local artifact · task=task_94bb2f2f-86a0-48e1-885b-cf2f8b8e157a · trace=trace_001ade00-5e4d-4dbe-ba30-4d5913159a51 · role=DES-04 · provider=ollama-local · model=qwen3:8b -->

# Interaction Designer — Synthetic specialist acceptance artifact

Role: DES-04 · Team: DES · Contract: role.DES-04.v1

## Role output

# Interaction Specification Draft for Personal Planning Exercise

## Overview
This interaction specification outlines the behavior and states for a fictional local-first personal planning product. The focus is on user controls, gestures, focus, form validation, previews, edit/undo, loading, offline, and feedback behaviors. The product is a one-week planning exercise designed for personal use, with no external data dependencies.

## UI States and Interaction Behaviors

### 1. **Main Planning Interface**
- **State**: Default view showing a weekly calendar with daily slots.
- **Controls**:
  - **Add Task Button**: Located at the top-right corner. When clicked, opens a modal form.
  - **Task List**: Displays all tasks added by the user.
  - **Navigation Arrows**: Left and right arrows to move between days.
- **Gestures**:
  - **Swipe Left/Right**: Navigate between days.
  - **Tap on Day**: Opens the day's task list.
- **Focus**:
  - **Keyboard Focus**: When the user navigates via keyboard, focus moves through the task list and buttons.
- **Form Validation**:
  - **Task Title Field**: Required. If empty, displays a red border and error message.
  - **Task Description Field**: Optional. If provided, must be under 255 characters.
  - **Due Date Picker**: Required. If not selected, form cannot be submitted.
- **Preview**:
  - **Task Preview**: When a task is created, a preview is shown in the task list with title, due date, and a short description. The preview is a compact card with a title, due date, and a truncated description.
- **Edit/Undo**:
  - **Edit Task**: Tap on a task to open an edit form.
  - **Undo Edit**: Press "Undo" button to revert changes. The undo function reverts the task to its previous state, provided the change was made within the last 30 seconds.
- **Loading**:
  - **Loading Indicator**: Appears when the app is fetching data (e.g., from local storage).
- **Offline**:
  - **Offline Mode**: All data is stored locally. No internet connection required.
- **Feedback**:
  - **Success Toast**: Appears when a task is added or edited.
  - **Error Toast**: Appears when form validation fails.

### 2. **Task Creation Modal**
- **State**: Modal form for adding a new task.
- **Controls**:
  - **Title Input**: Required.
  - **Description Input**: Optional.
  - **Due Date Picker**: Required.
  - **Save Button**: Submits the task.
  - **Cancel Button**: Closes the modal without saving.
- **Form Validation**:
  - **Task Title Field**: Required. If empty, displays a red border and error message.
  - **Task Description Field**: Optional. If provided, must be under 255 characters.
  - **Due Date Picker**: Required. If not selected, form cannot be submitted.
- **Feedback**:
  - **Success Toast**: Appears when the task is saved.
  - **Error Toast**: Appears if validation fails.

### 3. **Task Edit Modal**
- **State**: Modal form for editing an existing task.
- **Controls**:
  - **Title Input**: Required.
  - **Description Input**: Optional.
  - **Due Date Picker**: Required.
  - **Save Button**: Submits the updated task.
  - **Cancel Button**: Closes the modal without saving.
- **Form Validation**:
  - **Task Title Field**: Required. If empty, displays a red border and error message.
  - **Task Description Field**: Optional. If provided, must be under 255 characters.
  - **Due Date Picker**: Required. If not selected, form cannot be submitted.
- **Feedback**:
  - **Success Toast**: Appears when the task is updated.
  - **Error Toast**: Appears if validation fails.

### 4. **Task List View**
- **State**: Displays all tasks in a list format.
- **Controls**:
  - **Task Card**: Each task is displayed as a card with title, due date, and description.
  - **Delete Button**: Located on the right of each task card. Deletes the task.
  - **Edit Button**: Located on the right of each task card. Opens the edit form.
- **Feedback**:
  - **Success Toast**: Appears when a task is deleted or edited.
  - **Error Toast**: Appears if deletion/edit fails (e.g., due to invalid data).

## Interaction Tests

| Test ID | Description | Expected Outcome |
|--------|-------------|------------------|
| T001 | User taps on a day to view its task list | Task list for that day is displayed |
| T002 | User swipes left/right to navigate between days | Day changes accordingly |
| T003 | User clicks "Add Task" and fills out the form | Task is added and previewed in the task list |
| T004 | User clicks "Edit Task" and modifies the task | Task is updated in the list |
| T005 | User clicks "Delete Task" | Task is removed from the list |
| T006 | User submits a form with empty title | Error message appears, task is not saved |
| T007 | User navigates via keyboard | Focus moves through controls and form fields |
| T008 | User opens the app with no internet connection | All data is loaded from local storage |
| T009 | User submits a task while offline | Task is saved locally and displayed |
| T010 | User clicks "Undo" after editing a task | Task reverts to its previous state |
| T011 | User attempts to delete a task | Task is removed from the list |
| T012 | User submits a form with invalid date | Error message appears, task is not saved |
| T013 | User submits a form with duplicate task title | Error message appears, task is not saved |
| T014 | User navigates through a large dataset in offline mode | App remains responsive and loads data efficiently |

## Evidence and Assumptions

- **Assumption 1**: The product is designed for local-first use, with no external data dependencies.
- **Assumption 2**: All user interactions are handled via UI and keyboard navigation.
- **Assumption 3**: Form validation is based on title, description, and due date fields.
- **Assumption 4**: Offline mode is supported with local storage, and data is stored in a structured JSON format.
- **Assumption 5**: Feedback is provided via toast messages for all actions.
- **Assumption 6**: The undo function reverts the task to its previous state, provided the change was made within the last 30 seconds.
- **Assumption 7**: Task preview is a compact card with a title, due date, and a truncated description.

## Boundaries and Unknowns

- **Unknown 1**: The exact behavior of the task deletion process is not specified, but it is assumed to remove the task from the list and local storage.
- **Unknown 2**: The exact format of the task preview is not defined, but it is assumed to be a compact card with a title, due date, and a

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "The revised draft provides a comprehensive and detailed interaction specification that aligns with the role of Interaction Designer (DES-04).",
    "All UI states and interaction behaviors are clearly defined, including task creation, editing, deletion, and preview.",
    "The interaction tests are well-structured and cover a wide range of scenarios, including edge cases like invalid date inputs, duplicate tasks, and offline behavior.",
    "The 'Evidence and Assumptions' section is explicit and clearly outlines the assumptions made about local storage, task preview, and undo functionality.",
    "The 'Boundaries and Unknowns' section identifies the unknowns and limitations, such as the exact behavior of task deletion and preview format."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "No real-world validation or user data is provided, which is acceptable for a synthetic task.",
    "No external citations or research are required for this synthetic task.",
    "No legal or financial content is included, which is appropriate for the fictional scenario."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: interaction, states, tests.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.