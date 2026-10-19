# Wejdan Life OS — public product delivery plan

**Status:** active owner-directed plan  
**Product direction:** public product for iOS, Android, and web; accounts and cloud sync required; latest owner direction DEC-018 supersedes DEC-016's platform deferral  
**Market/languages:** Saudi Arabia first; Arabic and English  
**Product authority:** [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)  
**Implementation evidence:** [`../ops/APP_FEATURE_GAP_MATRIX.md`](../ops/APP_FEATURE_GAP_MATRIX.md), [`../ops/APP_GATE_QUEUE.json`](../ops/APP_GATE_QUEUE.json)  
**Sync design:** [`architecture/public-account-sync.md`](architecture/public-account-sync.md)

## Product and release decisions

- Public launch is the target; all platforms and all approved life domains are in scope. Closed beta validates a completed product and is not a reduced product tier.
- Launch is free and has no advertisements. A written owner-approved cloud operating budget, hard spend limit, alerting, abuse controls, and fail-safe shutdown must exist before beta service starts.
- Accounts and cloud sync are required, with local-first editing and offline operation. The backend/provider, region, and production credentials remain unselected until legal, privacy, threat-model, operational-cost, and owner gates pass.
- All user data is private and account-scoped. Existing personal pilot data is not migrated or uploaded without a preview and explicit user action. All demo and evaluation data is synthetic or separately authorized and de-identified.
- The public catalog includes every specified domain. Cycle/PCOS remains opt-in, locked by default, non-diagnostic, and independently reviewed. Money remains manual-only without bank integration or financial advice.
- Consumer AI is local-first. A cloud AI feature requires purpose-specific opt-in, a concise data disclosure, data minimization, and controls that exclude health/money data by default.
- Saudi Arabia is first; Arabic RTL and English LTR are launch requirements. Owner must approve product name and public identity before beta. No geographic expansion without a jurisdiction review.
- The four-tab navigation remains Today, Professional, Care, Me. Existing routes do not count as feature acceptance by themselves.

## Technology and workstation decision

- Build the primary iPhone app in SwiftUI and use native iOS APIs for notifications, Face ID, local persistence, accessibility, navigation, and system behavior.
- Keep the current Flutter project as a reference for product rules, content, and behavior while the SwiftUI client is rebuilt and verified. Do not treat the Flutter web build as the iPhone release artifact.
- Use the owner's Mac with Xcode for SwiftUI development, simulator/device runs, native permission checks, signing, profiling, archive, and TestFlight/App Store builds.
- Use Windows for product documentation, design review, data/content preparation, and non-native planning. iPhone code changes and builds happen on the Mac.
- Keep one canonical source history across machines. First audit and initialize local version control; then use a private remote for source only after checking ignore rules and history for databases, exports, credentials, and personal data. On Mac, clone/pull the approved revision; do not edit two independent copies or use a synced folder as concurrent source control.
- Track iOS, Android, and web acceptance separately. A successful Windows/web run is not evidence that iOS works; the Mac run does not establish Android or web readiness.

**Decision:** the latest user-approved implementation plan requires iOS, Android, and web, superseding DEC-016's platform deferral. Retain SwiftUI/native APIs for iPhone and use the existing Flutter client as the Android/web foundation; align product rules and sync contracts across them without claiming unbuilt shared logic. Validate iOS with the owner's supported Mac/Xcode environment.

## Delivery phases and gates

### P0 — Reconcile authority and baseline

**Work:** update product authority to these owner decisions; preserve older decisions as history; inventory routes, data, storage, agent state, platform targets, and evidence. Confirm the Windows/Mac Flutter and Xcode version matrix; establish one canonical source-control history; inspect repository privacy before creating a private remote. Do not stage personal exports, local databases, secrets, credentials, or real user traces.

**Exit:** one current specification, evidence-backed gap map, reproducible Windows shared-code and Mac iOS build baselines, synthetic/demo separation, and an owner-approved repository/backup strategy.

### P1 — Complete the public-product contract and UX

**Work:** define end-to-end journeys and states for onboarding/account creation, consent, Today, all domains, local-first offline use, sync status/conflicts, recovery, export/delete, accessibility, help, and user-visible AI controls. Finalize brand and public name. Keep health optional and non-diagnostic; keep money manual-only.

**Exit:** every launch feature maps to a route, owner, data class, source or domain reviewer where needed, permission/consent, empty/loading/error/offline state, and acceptance scenario. No control is represented as working until wired and tested.

### P2 — Account, sync, privacy, and cloud architecture

**Work:** complete [`architecture/public-account-sync.md`](architecture/public-account-sync.md); compare providers and regions using data-location, access-control, encryption, export/delete, recovery, availability, and cost criteria. Complete threat model, Saudi privacy/legal review, data-flow inventory, processor agreements, consent model, retention/backup policy, incident plan, and service budget. Build provider-neutral interfaces and local test fakes before production integration. No live cloud service until the owner approves a specific provider, region, budget, and credentials.

**Exit:** independently reviewed architecture and threat model; verified tenant authorization at the service boundary; tested schema migration and conflict strategy; deletion/export semantics cover derived data and backups; cost controls and restore objectives are owner-approved.

### P3 — Cross-platform foundation and account lifecycle

**Work:** implement SwiftUI/native iOS and continue Flutter/Riverpod Android/web clients with aligned data contracts. Complete Android scaffolding, web release hardening, and iOS workflow on macOS/Xcode. Add account/session lifecycle, secure credential handling, local-to-account migration preview, encrypted offline queues, sync state/conflict UX, server authorization, recovery, export, and deletion only after provider, privacy, legal, security, and budget gates pass. Use versioned migrations without destructive fallback.

**Exit:** iOS, Android, and web build from documented reproducible workflows; account isolation and authorization pass independent negative tests; local-first use survives connectivity loss; migrations, recovery, export, and deletion never silently lose or expose data.

### P4 — Complete product domains and platform behavior

**Work:** finish every product journey end-to-end across the four-tab structure, including local persistence, account sync, notifications, theme, RTL/LTR, accessibility, and all failure/offline states. Validate domain references and jurisdiction-specific driving/emergency information from current official sources. Gate cycle/PCOS behind explicit opt-in and separate protection. Preserve manual-only money boundaries.

**Exit:** all domain journeys pass functional and data-lifecycle acceptance on supported devices/browsers for iOS, Android, and web; no dead controls, data-loss paths, unsupported claims, or inaccessible launch blockers remain.

### P5 — Agent context, memory, skills, and role quality

**Work:** assess all 85 canonical roles individually. Verify actual runtime assembly of task packet, shared context, contract/card, approved project knowledge, role-isolated approved memory, and only task-selected skills. Maintain provenance manifests and treat retrieved sources as untrusted evidence. Replay preserved failures first; expand role-specific ambiguous, negative/adversarial, multilingual, and evidence-grounding evaluations. Review health, money, security, and legal roles with appropriate human experts. Keep invocation, model review, specialist review, and human approval as separate evidence.

**Exit:** every role has current role-level readiness, evaluation denominator and results, known limitations, scoped tools, memory/skill/context evidence, and an owner/reviewer. No role is called expert-certified or production-ready on invocation smoke results alone.

### P6 — Bounded continuous improvement function

**Work:** operate improvement under AI-01 after rejection/regression and in a weekly portfolio review. It may inspect only authorized, sanitized evidence; trace failures to a layer; create versioned proposal-space changes; and run approved local synthetic evaluations in an isolated candidate workspace. A low-risk candidate may be staged automatically only after independent deterministic, AI-QA/QA-01 and relevant specialist gates pass, full regression controls remain intact, and rollback is available. The agent cannot change its own tools, permissions, policy, evaluator, approval state, sensitive-data access, provider budget, or release state; these changes require separate authorized owner action.

**Exit:** reproducible event/weekly review records, candidate diffs, baseline-versus-candidate evidence, independent verdicts, audit log, and tested rollback. Any protected regression blocks promotion. New skills require recurring evidence in two independent cases or one documented high-risk mandatory procedure.

### P7 — Security, legal, domain, and operations readiness

**Work:** independent application/cloud security assessment; tenant-isolation and authorization testing; threat-model abuse cases; privacy and retention verification; breach/incident and support runbooks; backup restore drills; SLO/error monitoring without unnecessary personal-data logging; budget alarm/shutdown rehearsal; store/privacy disclosures; and clinical/financial/domain review. Review Saudi PDPL and transfer requirements with qualified counsel for chosen vendors/regions before processing real accounts.

**Exit:** zero open critical/high security or privacy findings; successful restore and deletion evidence; on-call/incident ownership and support path identified; approved cost cap and shutdown behavior; all store and domain disclosures reviewed.

### P8 — Completed-product closed beta

**Work:** distribute the complete feature set to a recruited, consented, limited group on all supported platforms. Use synthetic accounts for QA and real beta data only under the approved privacy/consent and support processes. Measure onboarding completion, sync conflicts, data loss, accessibility failures, reliability, support burden, and cost. Triage each finding with traceable evidence and rerun affected regressions.

**Exit:** beta cohorts complete the target journeys; no unresolved critical issue, cross-account leak, unrecoverable data-loss case, or unbounded cost; every material finding is fixed or explicitly excluded from the approved release scope; owner approves the release candidate.

### P9 — Public release and ongoing operations

**Work:** complete iOS App Store, Google Play, and public web release readiness; submit localized listings and required disclosures; deploy only after owner release approval. Roll out gradually with tested rollback, budget alarms, privacy-safe monitoring, support coverage, and documented incident handling. Review agent portfolio weekly and product reliability continuously without automatic exposure of raw personal traces.

**Exit:** stores accept all three platform releases; owner authorizes release timing; production smoke, account isolation, sync, deletion, backup restore, and rollback pass; public operating budget and incident/support ownership are active; version and evidence are recorded.

## Agent and product decision boundaries

- AI-01 owns improvement coordination; AI-09 memory controls; AI-12 evaluation datasets/graders; AI-11 safeguards; PMO-04 approved knowledge; AI-QA and QA-01 independent review; relevant domain experts review domain truth.
- Runtime authority is deny-by-default and task-scoped. Skills, memories, retrieved content, and model confidence never grant tools or approval.
- Owner approval is required for product identity, cloud provider/region, real cloud credentials, production data migration, operating budget, sensitive-domain release, permissions/policy changes, external processing, and public deployment.
- Keep failures as immutable regressions. Report numerator, denominator, window, evaluation type, and confidence; never collapse plumbing, specialist, expert, and privacy evidence into one readiness score.

## Acceptance record

Every gate records build/revision, platform/device/runtime, exact scenario, expected and actual result, test/evaluator, artifact path, data classification, reviewer, known limitation, and approval state. Use `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`; one platform's result cannot stand in for another.



