# Wejdan HQ (local, read-only)

HQ is a loopback-only summary viewer. It does not open either SQLite database; each source service computes its own aggregate summary. Browser requests go through the same-origin HQ BFF. The source tokens never reach the browser.

The current release is intentionally read-only: the conversation and task composer are disabled, and the BFF has no source write route.

## Current device setup — 2026-10-19

The local read-only bridge runs on this device at `http://127.0.0.1:8870` without a user-facing password, as requested. The HQ BFF binds only to loopback; two independent server-side source tokens authenticate Life OS and Company OS requests and never reach the browser. Source tokens remain in ignored local env files with restrictive Windows ACLs. No automatic startup task is configured.

HQ loads `ops/hq/.env`; Life OS loads `ops/local-live/private/hq.env`; Company OS loads its project-root `.env`. Restart each owning service after changing its token. Life OS has a verified managed restart command at `ops/local-live/runtime/manage-local-api.ps1`; HQ binds only to loopback. No automatic startup task is configured.

Company OS excludes synthetic/QA and archived task records from operational totals, displaying test and archive counts separately. Life OS classifies new tasks as operational or synthetic; existing rows remain unclassified until reviewed and are shown separately, never guessed into either category. The local Life runtime does not expose project/artifact tables; those values are shown as unavailable rather than evidence of zero across the full Life OS.

## Configure independently on a new device or during credential rotation

Generate two different random URL-safe tokens, each at least 43 characters. Set `HQ_PERSONAL_READ_TOKEN` only in the Life OS API process and HQ. Set `HQ_COMPANY_READ_TOKEN` only in the Company OS API process and HQ. The local entrypoints can load ignored per-service `.env` files; never put secret values in tracked files, `.env.example`, the browser, or logs. A missing token keeps that workspace at **Needs Configuration**. Restart each service after rotating its token. Use `ops/local-live/runtime/manage-local-api.ps1` for Life OS, `npm run dev:api` for Company OS, and `npm start` from this directory for HQ.

Expected source APIs are fixed to `http://127.0.0.1:8766/api/hq/v1/summary` and `http://127.0.0.1:4174/api/hq/v1/summary`. The BFF binds only to `127.0.0.1` on port 8870 by default. It serves the summary route without a user password only over loopback, and rejects any detail or write route. Source targets are injectable only in tests.

## Run

From this directory, use Node.js 22.13 or newer:

```powershell
$env:HQ_PERSONAL_READ_TOKEN = '<personal token>'
$env:HQ_COMPANY_READ_TOKEN = '<company token>'`nnpm start
```

Open `http://127.0.0.1:8870`. Tokens must also already be set in the corresponding source services. If they are not, the relevant workspace remains disconnected. HQ provides no conversation, task creation, approval action, or source fallback.

## Verification

`npm test` uses synthetic tokens, synthetic databases, fake source services and Playwright. It does not touch the production SQLite files or call providers/workflows. `npm run build` checks JavaScript syntax.
