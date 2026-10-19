# G00 — Local/cloud source drift audit

Exact current cloud exports are in `workflows/n8n/backups/g00-rebaseline-20261016/`. Hashes are SHA-256. A matching export file is an exact snapshot; a template with a different hash is not current cloud evidence.

| Live workflow | Local candidate | Hash comparison | Structural finding |
|---|---|---|---|
| `KvMjR2lx81qsuCPL` | `Wejdan Life OS _ Agent Financial & Runtime Monitoring _ Pilot (1).json` | EXACT MATCH; live `BDB3409E95EC24E8EC21B329177B2DC73D23FCA2E2D164CB1DCF9C90C953182C` / local `BDB3409E95EC24E8EC21B329177B2DC73D23FCA2E2D164CB1DCF9C90C953182C` | Exact current export snapshot. |
| `6leaYQgPdxIgACYC` | `workflows/n8n/source/agent-program-director-live-export.json` | EXACT MATCH; live `DF27260FE935DD2200E389084579112D8E64C700BEFC0FE96231AD3B51E68091` / local `DF27260FE935DD2200E389084579112D8E64C700BEFC0FE96231AD3B51E68091` | Exact current export snapshot. |
| `Vsng8tOmTK1IIAgK` | `workflows/n8n/source/agent-resource-cost-controller-live-export.json` | EXACT MATCH; live `7377FFEE72AA4D8AACC9B74234CF03F059AC984122E4535FD7FE01E0E6B2A043` / local `7377FFEE72AA4D8AACC9B74234CF03F059AC984122E4535FD7FE01E0E6B2A043` | Exact current export snapshot. |
| `O7hWODxtpfIciHwq` | `workflows/n8n/source/agent-ai-observability-cost-engineer.json` | EXACT MATCH; live `33B4F31ED0A336C726002BF0611A258E8F6A03EFC2DA8E9596E9AC38ACC8A60A` / local `33B4F31ED0A336C726002BF0611A258E8F6A03EFC2DA8E9596E9AC38ACC8A60A` | Exact current export snapshot. |
| `94SV8TzA5AGWWtH5` | `workflows/n8n/source/v2/agent-program-director-v2.json` | DRIFT; live `5ABE2EDCA351D1FA5C3FCE959B79D7D1584EC97D84631099E43C3A64EB976219` / local `1AE41DDA1535123DC3D26AE2D790D89E72BC3E2DCD7984703D561F0E0F5D2762` | Template differs. Live nodes: manualTrigger, code, executeWorkflowTrigger. Local nodes: manualTrigger, executeWorkflowTrigger, code. Treat local file as stale/unverified template. |
| `lGKO45bElUeCXDpv` | `workflows/n8n/source/v2/agent-resource-cost-controller-v2.json` | DRIFT; live `61282C5E449D3A7059AD88290208BFA899BEFA596360B4AEB739552EB472E5D5` / local `113BE5C4CCCE26F86B9F7FFD510CB46AFA646B1B88563CBD37456B5EF5E2CB5D` | Template differs. Live nodes: manualTrigger, code, executeWorkflowTrigger. Local nodes: manualTrigger, executeWorkflowTrigger, code. Treat local file as stale/unverified template. |
| `tbQTccAcfza2XpnI` | `workflows/n8n/source/v2/agent-ai-observability-cost-engineer-v2.json` | DRIFT; live `1E91ACFD59E8FFA39944CACA04ACE5B71F1C83B008C232F5C3739302D87A7A5B` / local `7EC86AE237702174071E5F65AC9C0FCF83E03E4A23577D3397C43AEC45471BC1` | Template differs. Live nodes: manualTrigger, code, executeWorkflowTrigger. Local nodes: manualTrigger, executeWorkflowTrigger, code. Treat local file as stale/unverified template. |
| No live workflow | `workflows/n8n/source/v2/agent-mock-orchestrator-v2.json` | no cloud counterpart; SHA-256 `BD4A2F5BA95FB00F926D82C01842621BD260B8E6F302B787332D7C8E02876683` | Local deterministic orchestrator template only; no verified cloud parent. |

## Root-level exports and user-provided files

Root-level original JSON exports match the newly captured cloud originals by ID and SHA-256. Root V2 exports are snapshots, not canonical source: Program Director and Finance root downloads match the current cloud exports; Observability has a current `(1)` export and an older two-node snapshot with no child trigger. All files were preserved; no root JSON was overwritten.

## Confirmed G00 scope

- Four original exports match the previously preserved exact originals.
- All current cloud workflows are inactive (`active: false`) and exported nodes contain no `credentials` property. The cloud credential inventory displays “Create your first credential.”
- All seven workflow Version history > Publish Timeline pages state “This workflow has no publish history yet”; therefore all seven are verified unpublished. Active state is separately false in every export.
- Cloud V2 Program Director/Finance have internal child triggers wired to Code handlers; Observability has the trigger but its handler remains the original six-row hard-coded fixture mapper.
- No verified parent orchestrator exists in the seven-workflow inventory.

## Verified publication state

The per-workflow n8n Version history > Publish Timeline was checked for all seven IDs. Every page states “This workflow has no publish history yet.” The list Status filters were inconsistent and not used as evidence. All seven exports also report `active: false`.

### V2 code comparison details

All three live V2 `executeWorkflowTrigger` nodes use `inputSource: passthrough`, matching the local template. The live graphs have a Manual Trigger, Code node, and internal child trigger; both trigger connections lead into Code. Local templates use different node names and serialized order. Live Code source differs in all three pairs: Program Director 2,362 live characters vs 1,686 template; Finance 3,253 vs 1,660; Observability 2,115 vs 1,569. Observability live Code includes the fixed `PILOT-SUCCESS-001` fixture. The exact live export is the baseline for future gates.
