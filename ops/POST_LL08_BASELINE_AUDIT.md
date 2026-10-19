# Post-LL08 baseline audit — 2026-10-18

## Evidence reconciliation

- LL00–LL08 remain historical gate records. This audit does not repeat LL07 tests or the one previously authorized direct Codex CLI pilot.
- `ops/evidence/codex-subscription-pilot.json` records one successful direct CLI invocation before application integration. The file's legacy top-level status `CODEX_SUBSCRIPTION_LIVE` is too broad: it means **CLI direct pilot only**, not live API/Command Center execution.
- `ops/evidence/codex-subscription-integration.json` records a mock CLI API/SQLite integration. It records zero live Codex calls, zero paid API calls and zero n8n runs.
- The SQLite task ledger had 118 records at the start of this work; the API list endpoint returns at most 100. Existing task providers are Ollama local; no app Codex live task is in the historical evidence.
- Existing local services were observed on `127.0.0.1`: API `8766`, Command Center preview `8765`, n8n `5678`, Ollama `11434`. This work made no n8n call, edit, activation or workflow run.
- ZIP restoration completed into `ops/` without overwriting present files. LL07 and LL08 plans are historical references; the post-LL08 roadmap defines LL09–LL16 as new proposed local milestones.

## Current state

The adapter, API source, and Command Center source now hard-deny Codex application dispatch until a separate live-call approval is provided. The API integration test starts an isolated API against a temporary SQLite database and verified its new provider-status state and no-task-creation denial. The currently running API process PID 45096 was started before these source changes and still returns 404 for `/api/provider-status`; it must be restarted before the updated API source is active. An attempted normal process restart was rejected by the command execution safety layer, so the persistent runtime process was left untouched. To prevent the old process from accepting a real Codex task, a temporary SQLite trigger was installed and tested against the active API: the synthetic negative request failed before task insertion; task row count remained 118, Codex rows remained 0, and SQLite integrity remained `ok`. The trigger must stay until the new API is active and separately approved LL10 work explicitly removes it.

The local CLI login status had previously been verified as ChatGPT account sign-in, and the historical direct pilot remains valid. This turn made zero live Codex calls. No new purchase or paid provider call occurred.
