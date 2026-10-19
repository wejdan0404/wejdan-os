<!-- Wejdan local artifact · task=task_e0afd647-0929-4337-8032-4d5728812cee · trace=trace_9efe8e28-2d59-4806-9952-9ee2174a9689 · role=DES-03 · provider=ollama-local · model=qwen3:8b -->

# User-Flow Designer — Synthetic specialist acceptance artifact

Role: DES-03 · Team: DES · Contract: role.DES-03.v1

## Role output

# User-Flow Design Draft for Fictional Local-First Personal Planning Product

## Overview
This document outlines the user flow for a fictional local-first personal planning product. The product includes a one-week planning exercise designed for both new and returning users. The flow includes happy path scenarios, exception states, accessibility considerations, and recovery journeys. User approval is specified where necessary.

## Flow Map

### 1. New User Journey
**Happy Path:**
- User opens the app
- User is prompted to create an account
- User fills in basic profile information
- User is guided through the one-week planning exercise
- User completes the planning exercise
- User is shown a summary of their plan
- User is prompted to save or export the plan
  - **User Approval:** User must approve the final plan before saving/exporting

**Exception States:**
- User cancels account creation
- User fails to provide required information
- User exits the planning exercise before completion
- User requests to review or edit the plan
  - **Branching Logic:** User is redirected to a "Review/Edit Plan" screen or prompted to re-enter information

**Exit/Cancel Routes:**
- User cancels account creation → App returns to the home screen
- User exits the planning exercise → App returns to the home screen
- User cancels the save/export process → App returns to the plan summary screen

### 2. Returning User Journey
**Happy Path:**
- User logs in
- User is shown their previous plan
- User is prompted to review or update the plan
- User completes the planning exercise
- User is shown a summary of their updated plan
- User is prompted to save or export the plan
  - **User Approval:** User must approve the updated plan before saving/exporting

**Exception States:**
- User logs in and finds no previous plan → User is prompted to start a new plan
- User cancels the update process → App returns to the home screen
- User exits the planning exercise before completion → App returns to the home screen
- User requests to review or edit the plan
  - **Branching Logic:** User is redirected to a "Review/Edit Plan" screen or prompted to re-enter information

**Exit/Cancel Routes:**
- User cancels the update process → App returns to the home screen
- User exits the planning exercise → App returns to the home screen
- User cancels the save/export process → App returns to the plan summary screen

### 3. Accessibility Journey
**Happy Path:**
- User navigates the app using screen reader
- User is prompted to create an account or log in
- User is guided through the planning exercise
- User completes the planning exercise
- User is shown a summary of their plan
- User is prompted to save or export the plan
  - **User Approval:** User must approve the final plan before saving/exporting

**Exception States:**
- User encounters an accessibility barrier → User is prompted to adjust settings or contact support
- User requests to review or edit the plan
  - **Branching Logic:** User is redirected to a "Review/Edit Plan" screen or prompted to re-enter information

**Exit/Cancel Routes:**
- User exits the planning exercise → App returns to the home screen
- User cancels the save/export process → App returns to the plan summary screen

### 4. Recovery Journey
**Happy Path:**
- User logs in and finds an error in their plan
- User is prompted to review or edit the plan
- User completes the planning exercise
- User is shown a summary of their updated plan
- User is prompted to save or export the plan
  - **User Approval:** User must approve the updated plan before saving/exporting

**Exception States:**
- User logs in and finds no previous plan → User is prompted to start a new plan
- User cancels the update process → App returns to the home screen
- User exits the planning exercise before completion → App returns to the home screen
- User requests to review or edit the plan
  - **Branching Logic:** User is redirected to a "Review/Edit Plan" screen or prompted to re-enter information

**Exit/Cancel Routes:**
- User cancels the update process → App returns to the home screen
- User exits the planning exercise → App returns to the home screen
- User cancels the save/export process → App returns to the plan summary screen

## Handoff to FE/BE/AI
- **Frontend (FE):** Handle user interface, accessibility, and user interaction (e.g., modals for approval, screen reader support, navigation)
- **Backend (BE):** Manage user data, plan storage, and user authentication (e.g., storing plans, retrieving previous plans, handling account creation)
- **AI:** Provide guidance during the planning exercise and assist with plan review (e.g., suggesting tasks, offering feedback)

## Evidence and Assumptions
- The planning exercise is a one-week process (assumed based on the product description)
- User approval is required before saving/exporting the plan (assumed based on the product description)
- The app is designed for local-first use, with no external data sharing (assumed based on the product description)
- Accessibility is a key consideration in the design (assumed based on the product description)
- User flows are designed to be intuitive and user-friendly (assumed based on the product description)

## Boundaries and Unknowns
- The exact features of the planning exercise are not specified, which limits the clarity of the user journey
- The exact user interface and interaction design are not specified, which affects the feasibility of the flow map
- The exact data storage and retrieval mechanisms are not specified, which impacts the BE handoff details
- The exact accessibility features are not specified, which affects the accessibility journey design
- The exact recovery mechanisms are not specified, which impacts the recovery journey design

## Notes
- This is a draft and should not be considered as approved
- The flow map is based on the information provided and may need to be revised based on further input
- The user approval process is designed to ensure that users are aware of and agree to the plan before saving/exporting
- The accessibility journey is designed to ensure that all users, including those with disabilities, can use the app effectively
- The recovery journey is designed to help users correct any errors in their plan
- The flow map is intended to be used as a guide for further development and design

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The draft includes branching logic and exception states, but lacks explicit conditional paths and detailed branching logic for all exception scenarios.",
    "User approval is mentioned, but the exact process (e.g., modal, button, confirmation steps) is not detailed.",
    "Handoff to FE/BE/AI is mentioned, but no specific responsibilities or interfaces are defined for each component.",
    "The draft does not include a visual flow map or diagram for clarity, which is a key deliverable for user-flow design."
  ],
  "missing_requirements": [
    "Explicit conditional paths and detailed branching logic for all exception states",
    "Detailed user approval process (e.g., modal, button, confirmation steps)",
    "Specific responsibilities and interfaces for FE/BE/AI handoff",
    "Visual flow map or diagram for user journeys"
  ],
  "evidence_limits": [
    "The draft assumes the planning exercise is a one-week process, but no evidence is provided to support this assumption.",
    "The exact features of the planning exercise are not specified, which limits the clarity of the user journey.",
    "The exact user interface and interaction design are not specified, which affects the feasibility of the flow map.",
    "The exact data storage and retrieval mechanisms are not specified, which impacts the BE handoff details.",
    "The exact accessibility features are not specified, which affects the accessibility journey design."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: flow, branching, exit, cancel, routes, handoff.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.