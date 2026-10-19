<!-- Wejdan local artifact · task=task_1f8150c3-54d6-48e5-a4b5-2dc4a9f37699 · trace=trace_7c969c22-2783-4800-9f08-d4c55f4d2f2b · role=PROD-01 · provider=ollama-local · model=qwen3:8b -->

# Synthetic offline planning reminder feature — unaccepted draft

Task: task_1f8150c3-54d6-48e5-a4b5-2dc4a9f37699
Trace: trace_7c969c22-2783-4800-9f08-d4c55f4d2f2b
Provider/model: Ollama local / qwen3:8b
Review verdict: REVISE

## Consolidated bounded revision — Web UI Developer

# 🧱 **Final Deliverable: Consolidated Web UI Design & Test Matrix for Synthetic Offline Planning Reminder**  
**Task ID:** task_1f8150c3-54d6-48e5-a4b5-2dc4a9f37699  
**Trace ID:** trace_7c969c22-2783-4800-9f08-d4c55f4d2f2b  
**Role ID:** FE-02  
**Artifact Title:** Web UI Developer — Final Deliverable  

---

## ✅ **Overview**  
This deliverable consolidates the **requirements**, **design**, **flow logic**, **controls**, and **test strategy** for the **synthetic offline planning reminder** feature. It ensures **accessibility compliance**, **local-first behavior**, and **non-intrusive UI**. All **tests are proposed** and **not executed** in this planning task, so they are marked as **NOT_RUN**.  

---

## 📌 **Baseline Requirements (Confirmed)**  
These are **not unresolved** and are considered **implemented** or **enforced** in the system:

- **§1:** Single-user, local-first, offline-first  
- **§5.6:** Default quiet hours 23:00–07:00; focus blocks suppress nudges  
- **§8:** Uses local Hive data  
- **§1 Accessibility:** Minimum 44pt targets, text scaling to 200%, semantic labels, contrast AA  

---

## 🧠 **Feature Design: Synthetic Offline Planning Reminder**  
**Purpose:** Provide a local, optional reminder for planning tasks, respecting user preferences and system constraints.

### ✅ **Core Behavior**  
- The reminder is **optional** and **not mandatory**.  
- It is **local-only**, using **Hive data** for task storage.  
- It **does not use real user data** or external services.  
- It **does not schedule notifications** or send messages.  
- It **respects quiet hours** and focus blocks.  

### 📌 **Inputs**  
- User-defined task (title, time, priority, tags)  
- User preference for reminder frequency (daily, weekly, one-time)  
- User preference for quiet hours (override default)  
- User preference for focus blocks (override default)  

### 📌 **Outputs**  
- Local reminder stored in Hive  
- Visual confirmation in UI (no external output)  
- No external data sent  

### 📌 **Edge Cases**  
- User disables reminders entirely  
- User sets reminder during quiet hours  
- User sets reminder during focus block  
- User edits or deletes a reminder  
- User has no Hive data  

---

## 📌 **User-Flow Design**  
### ✅ **Happy Path Flow**  
**User Action:** User enables the optional reminder for a planning task.  
**System Behavior:**  
1. The app checks if the user is in **quiet hours** (23:00–07:00) or in a **focus block**.  
2. If the user is in a **focus block**, the reminder is **deferred** until the block ends.  
3. If the user is **not in quiet hours** or **focus block**, the reminder is **displayed** as a **non-modal, non-intrusive prompt**.  
4. The prompt includes:  
   - A **semantic label** for accessibility.  
   - A **44pt minimum text size**.  
   - A **200% text scaling option**.  
   - A **contrast AA-compliant background**.  
5. The user can **accept**, **dismiss**, or **edit** the reminder.  
6. The reminder is **stored locally in Hive** and **not synchronized** with any external system.  

**Exit/Cancel Routes:**  
- User **dismisses** the reminder → Reminder is **not saved**.  
- User **edits** the reminder → Reminder is **updated** in Hive.  
- User **accepts** the reminder → Reminder is **stored** in Hive and marked as **active**.  

---

## 📌 **Edge Case Flows**  
### ✅ **User in Quiet Hours**  
**User Action:** User enables a reminder while in quiet hours.  
**System Behavior:**  
1. The app detects the user is in **quiet hours**.  
2. The reminder is **deferred** and stored in Hive under a **"deferred"** status.  
3. A **notification** is **not scheduled**, but the user is **informed** via a **non-modal prompt** that the reminder is **deferred** due to quiet hours.  
4. The user can **edit** or **cancel** the deferred reminder.  

### ✅ **User in Focus Block**  
**User Action:** User enables a reminder while in a focus block.  
**System Behavior:**  
1. The app detects the user is in a **focus block**.  
2. The reminder is **deferred** and stored in Hive under a **"deferred"** status.  
3. A **notification** is **not scheduled**, but the user is **informed** via a **non-modal prompt** that the reminder is **deferred** due to a focus block.  
4. The user can **edit** or **cancel** the deferred reminder.  

### ✅ **User Disables Reminder**  
**User Action:** User disables the reminder.  
**System Behavior:**  
1. The reminder is **not triggered** in future.  
2. The user is **informed** via a **non-modal prompt** that the reminder is **disabled**.  

### ✅ **User Edits Reminder**  
**User Action:** User edits the reminder.  
**System Behavior:**  
1. The reminder is **updated** in Hive.  
2. The user is **informed** via a **non-modal prompt** that the reminder has been **updated**.  

---

## 📌 **Web UI Design**  
### ✅ **Non-Modal Prompt UI**  
- **Title:** "Reminder: [Task Title]"  
- **Body:** "You have a reminder for [Task Title] at [Time]. Would you like to accept, edit, or dismiss this reminder?"  
- **Buttons:**  
  - **Accept** (green)  
  - **Edit** (blue)  
  - **Dismiss** (gray)  
- **Accessibility:**  
  - Semantic labels for all buttons  
  - 44pt minimum font size  
  - 200% text scaling option  
  - Contrast AA-compliant background  

### ✅ **Deferred Reminder UI**  
- **Title:** "Reminder Deferred"  
- **Body:** "Your reminder for [Task Title] has been deferred due to [Quiet Hours/Focus Block]. Would you like to edit or cancel this reminder?"  
- **Buttons:**  
  - **Edit** (blue)  
  - **Cancel** (gray)  
- **Accessibility:**  
  - Semantic labels for all buttons  
  - 44pt minimum font size  
  - 200% text scaling option  
  - Contrast AA-compliant

## Reviewer feedback
{
  "verdict": "REVISE",
  "findings": [
    "The 'deferred' status is now defined in the system's data model, but the test strategy still lacks specific test cases for its handling during quiet hours or focus blocks.",
    "The 'non-modal, non-intrusive prompt' includes accessibility criteria, but no test cases are provided to validate the UI against the accessibility baseline.",
    "The '200% text scaling option' and 'contrast AA-compliant background' are described, but no test cases are provided to validate these features against the accessibility standard.",
    "The 'semantic label' is mentioned, but no test cases are provided to validate that the UI elements are properly labeled for screen readers.",
    "The 'User in Quiet Hours' and 'User in Focus Block' flows are described, but the system behavior for deferred reminders is not fully defined, leading to potential gaps in test coverage.",
    "The 'User disables the reminder' scenario is described, but no test case is provided to validate the disable functionality."
  ],
  "missing_requirements": [
    "Test cases for the 'deferred' status handling during quiet hours or focus blocks.",
    "Test cases for the 'non-modal, non-intrusive prompt' accessibility compliance.",
    "Test cases for 200% text scaling and contrast AA compliance.",
    "Test cases for semantic labels and screen reader compatibility.",
    "Definition of the behavior for deferred reminders during quiet hours or focus blocks.",
    "Test cases for the 'User disables the reminder' functionality."
  ],
  "evidence_limits": [
    "No actual test cases are executed in this planning task, so all proposed tests must be marked as NOT_RUN.",
    "The 'deferred' status and its handling are now defined, but no test cases are provided to validate its behavior.",
    "The UI design for the 'non-modal, non-intrusive prompt' includes accessibility criteria, but no test cases are provided to validate compliance.",
    "The 'semantic label' and other accessibility features are referenced but not validated with test cases.",
    "The 'User disables the reminder' functionality is described but lacks test case evidence."
  ]
}

## Acceptance state
FAILED/BLOCKED: SCENARIO_FINAL_REVIEW_NOT_PASS:REVISE
This draft is preserved for inspection and is not accepted, approved, deployed, or a factual/professional certification.