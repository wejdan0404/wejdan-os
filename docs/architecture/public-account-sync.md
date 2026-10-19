# Public account and sync architecture

**Status:** proposed provider-neutral architecture; no cloud provider or production data processing is authorized.  
**Authority:** owner direction recorded 2026-10-19; `docs/PRODUCT_SPEC.md`.  
**Review required before live integration:** security, privacy, qualified Saudi legal counsel, operations/cost owner.

## Product contract

- User accounts and cloud sync are required for the public release. The app remains usable offline and stores pending edits locally until the service is reachable.
- Initial launch is free with no ads. A written operating-cost ceiling, alerts, rate limits, abuse response, and safe stop condition must be approved before a beta backend runs.
- The app must not upload Wejdan's existing personal profile without a user-visible category preview and an explicit migration action.
- Consumer AI is local-first. Cloud AI needs separate, purpose-specific consent and data minimization; health and money data are excluded by default.
- Public domain coverage includes all approved areas. Cycle/PCOS is separately opted into, access-controlled, non-diagnostic, and expert-reviewed. Money remains manual-only.

## Trust boundaries and identities

1. **Flutter client:** untrusted. It may cache, queue, and present data but cannot choose the authoritative account owner for a request.
2. **Identity provider:** authenticates the user and returns short-lived verifiable credentials. Do not implement password storage or recovery cryptography in the app itself.
3. **Application API:** validates the caller identity and authorizes every record operation against the authenticated account on the server. Client-supplied `userId` is never authorization evidence.
4. **Data store and backup:** private service boundary. Separate account-scoped records and operational metadata; privileged administrative access is audited and minimized.
5. **AI/model providers:** separate optional processor boundary. No health/money data is sent by default; consent is checked at the service boundary, not only in the UI.

## Data and sync behavior

- Keep the existing Hive local store behind the `LifeRepository` abstraction. Add a versioned sync adapter only after service contracts and provider review pass.
- A provider-neutral client contract now exists at `lib/sync/sync_contracts.dart`, with unit regressions in `test/sync/sync_contracts_test.dart`. It contains no network implementation, credential handling, local encrypted outbox, or production account service; do not count it as live sync.
- Each user-owned record needs a stable record ID, schema version, account binding enforced server-side, local revision, remote revision, and last-synced cursor. Read-only catalog data and synthetic profiles are not account records.
- Local edits enter a durable outbox. Each operation has an idempotency key, record ID, schema version, base revision, operation type, and minimal payload. Retries must be idempotent and bounded.
- The server returns accepted revision/cursor or an explicit conflict. Do not silently apply last-write-wins to user content. Keep both versions until the user or deterministic domain-specific merge resolves the conflict.
- Sync applies only after authorization, schema validation, size/rate limits, and ownership checks. Unknown schema versions fail closed with recoverable local data.
- Account migration previews record categories, estimated size, sensitive-module state, destination account, and transfer purpose. Require an explicit confirmation before first upload.
- Logout removes credentials and account-specific decrypted views from the active session. Shared-device behavior and local cache retention must be specified and tested before release.

## Security and privacy controls

- Require TLS for all service traffic, secure OS credential storage, encryption at rest, managed key rotation, least-privilege service identities, tenant-scoped authorization, and audited administrative access.
- Treat cycle/PCOS content as a separately classified data domain with opt-in, restricted application paths, no ordinary telemetry/log payloads, no demo fixtures, and explicit export/delete behavior. Review any additional encryption or key-recovery design with independent security reviewers before implementation.
- Do not place record content, credentials, access tokens, health/money details, or raw prompts in analytics or operational logs. Prefer opaque request IDs and bounded counters.
- Document data categories, purpose, location, processors, retention, deletion behavior, backups, and user rights before choosing a provider. A cross-border data flow requires qualified review of current Saudi PDPL and transfer requirements.
- Account export must be complete and versioned. Account deletion must revoke sessions and remove primary/derived data; backup expiry must have a stated, verified window and evidence. Do not claim immediate backup erasure if the system only expires backups later.
- No real personal data enters local agent evaluations, agent memory, or knowledge stores. Sanitized operational traces require explicit authorization and access scoping.

## Provider and region decision gate

Compare managed identity, application hosting, database, object storage, backup, and key management as a coherent service. Score each candidate on:

1. Saudi privacy and cross-border transfer fit for every processor/subprocessor;
2. server-side tenant authorization and auditable administrative access;
3. encryption/key lifecycle, restore, export, deletion, and incident support;
4. iOS, Android, and web reliability, latency, and operational maturity;
5. projected free-tier cost under expected, peak, and abusive traffic;
6. lock-in, migration, data portability, and exit cost.

Prefer a suitable Saudi hosting region if it meets security, service, and cost requirements. If data or processing would leave Saudi Arabia, document the data map, necessity, safeguards, user disclosures, and counsel review before approval. The applicable controls and duties must be rechecked against current official sources at provider selection and before release.

## Required failure behavior

- Network unavailable: local work continues; outbox remains durable and visibly pending.
- Authentication expired: pause sync, retain local edits, request re-authentication without discarding work.
- Authorization denied or account mismatch: reject the operation, do not retry with a different account, and emit a redacted security event.
- Server validation/schema error: keep the local version recoverable and surface a clear support code.
- Conflict: preserve both versions and ask the user to resolve, except where a reviewed deterministic merge is proven safe.
- Quota, budget, or abuse limit reached: block new cloud work safely, preserve local work, alert operators, and do not silently incur unbounded spend.
- Deletion failure: show that deletion is incomplete, retain an auditable request state, retry safely, and prevent a false success message.

## Acceptance before beta

- Independent negative tests prove account A cannot read, overwrite, export, or delete account B's records by guessing IDs, changing request fields, replaying operations, or using stale tokens.
- Migration, offline queue, retry/idempotency, conflict, multi-device update, schema upgrade, export, delete, backup expiry, and restore scenarios pass on each client platform.
- Fault injection covers expired identity, network interruption, partial batches, duplicate requests, malformed payloads, stale cursors, account switches, quota exhaustion, and interrupted deletion.
- Restore and deletion evidence names exactly which data copies were tested and which expiry window remains.
- Budget guard, operator alert, and service stop behavior are exercised before beta; only synthetic accounts are used until the privacy/legal and owner gates approve real beta processing.

## Official references

- SDAIA, [Regulation on Personal Data Transfer Outside the Kingdom](https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/RegulationonPersonalDataTransferOutsidetheKingdom/).
- NCA, [Cloud Cybersecurity Controls](https://nca.gov.sa/ar/regulatory-documents/controls-list/ccc/).
- These references guide the design but are not a substitute for qualified advice on the selected provider, data flows, and current applicable rules.

## Current implementation alignment — DEC-018

The latest direct owner instruction requires public clients on iOS, Android, and web and supersedes DEC-016's platform deferral. The contract in `lib/sync/sync_contracts.dart` is a Flutter-side provider-neutral contract only; it is not an identity provider, encrypted outbox, API, or live sync. All three clients and the chosen service must pass account-isolation, offline, conflict, migration, export, deletion, and recovery acceptance before beta. iOS acceptance requires a supported Mac/Xcode environment and owner signing.
