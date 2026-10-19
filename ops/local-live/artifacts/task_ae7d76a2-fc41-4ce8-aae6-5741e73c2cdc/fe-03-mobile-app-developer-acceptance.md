<!-- Wejdan local artifact · task=task_ae7d76a2-fc41-4ce8-aae6-5741e73c2cdc · trace=trace_4035af45-0337-4065-8097-b172b17dea67 · role=FE-03 · provider=ollama-local · model=qwen3:8b -->

# Mobile App Developer — Synthetic specialist acceptance artifact

Role: FE-03 · Team: FE · Contract: role.FE-03.v1

## Role output

# Mobile App Developer (FE-03) Revised Deliverable

## Project Overview
A fictional local-first personal planning product team is developing a one-week planning exercise app. The app will allow users to plan and track their daily activities, goals, and reflections. The app will be built for both iOS and Android platforms, with a focus on responsive design, device lifecycle management, and user permissions.

## Buildable App Draft

### Platform Selection
- **iOS**: SwiftUI for declarative UI, UIKit for legacy compatibility
- **Android**: Jetpack Compose for modern UI, Android SDK for compatibility

### Navigation
- **iOS**: TabBarController for main navigation, NavigationView for deep linking
- **Android**: BottomNavigationView for main navigation, NavigationComponent for deep linking

### Device Lifecycle
- **iOS**: Implement `viewDidLoad`, `viewWillAppear`, `viewWillDisappear`, `viewDidDisappear`, `didReceiveMemoryWarning`
- **Android**: Implement `onCreate`, `onStart`, `onResume`, `onPause`, `onStop`, `onDestroy`, `onConfigurationChanged`

### Permissions
- **iOS**: Request access to camera, microphone, and location via `UNUserNotificationCenter` and `CLLocationManager`
- **Android**: Request permissions via `ActivityCompat.requestPermissions` for camera, microphone, and location

### Responsive States
- **iOS**: Use `@Environment(\.horizontalSizeClass)` and `@Environment(\.verticalSizeClass)` for adaptive layout
- **Android**: Use `Configuration` and `onConfigurationChanged` for responsive layout

### Store-Build Readiness
- **iOS**: Ensure app is compatible with iOS 15 and above, use App Store Connect for metadata
- **Android**: Ensure app is compatible with Android 11 and above, use Google Play Console for metadata

## Device Matrix

| Platform | Minimum Version | Target SDK | Emulator/Device | Notes |
|----------|------------------|------------|------------------|-------|
| iOS      | iOS 15           | iOS 16     | iPhone 13, iPad Pro | Testing to be conducted using Xcode |
| Android  | Android 11       | Android 12 | Pixel 5, Samsung Galaxy S22 | Testing to be conducted using Android Studio |

## Crash/Error Evidence

| Error Type | Description | Evidence |
|------------|-------------|----------|
| Navigation Crash | Deep link not handled properly | No evidence provided; requires testing |
| Permission Denial | User denied camera access | No evidence provided; requires testing |
| Layout Issue | UI not responsive on smaller screens | No evidence provided; requires testing |
| Lifecycle Issue | App crashes on orientation change | No evidence provided; requires testing |

## Evidence and Assumptions

- **Assumptions**:
  - The app will be developed using the latest frameworks and tools.
  - The app will be tested on a variety of devices and emulators.
  - The app will be compatible with the latest versions of iOS and Android.
  - The app will be tested for performance and stability.

- **Evidence**:
  - No actual build or test execution has been performed.
  - No crash logs or error reports are available.
  - No user data or real-world testing has been conducted.

## Boundaries and Unknowns

- **Unknowns**:
  - The exact features and functionality of the app are not fully defined.
  - The target audience and user behavior are not fully understood.
  - The exact design and layout of the app are not fully defined.
  - The exact permissions and data handling requirements are not fully defined.

- **Boundaries**:
  - The app will not use any real user data or external services.
  - The app will not be deployed or published without explicit approval.
  - The app will not be tested on real devices without explicit approval.
  - The app will not be built or deployed without explicit approval.

## Notes
This is a draft deliverable and does not imply approval. Further details and requirements must be verified and approved by the relevant stakeholders. Testing and evidence collection are pending stakeholder approval.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The draft deliverable outlines the structure and components of the app but lacks concrete implementation details.",
    "The 'Crash/Error Evidence' section indicates no evidence has been provided for critical errors, which is a gap in the expected deliverable."
  ],
  "missing_requirements": [
    "Buildable app artifact (e.g., source code, build logs, or binary files)",
    "Device matrix with actual test results or logs",
    "Crash/error evidence with logs or test results"
  ],
  "evidence_limits": [
    "No actual build or test execution has been performed",
    "No crash logs or error reports are available",
    "No user data or real-world testing has been conducted"
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: buildable, device, matrix, crash, error.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.