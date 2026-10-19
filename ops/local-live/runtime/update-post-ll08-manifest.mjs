import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const manifestPath = resolve('ops/EVIDENCE_MANIFEST.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const paths = [
  'ops/FINAL_ACCEPTANCE_REPORT.md','ops/EXECUTION_LOG.md','ops/CURRENT_STATE.md','ops/TEST_MATRIX.md','ops/WEJDAN_HQ_ARCHITECTURE.md','ops/hq/server.mjs','ops/hq/public/index.html','ops/hq/public/app.js','ops/hq/test/hq.test.mjs','ops/hq/README.md','ops/hq/.env.example','ops/evidence/hq_passwordless_local_access_20261019.json','ops/local-live/runtime/manage-local-api.ps1','ops/history/local-api-before-stop-20261019-080621-719.sqlite',
  'ops/LOCAL_LIVE_GATE_QUEUE.json','ops/PROGRESS.md','ops/CURRENT_STATE.md','ops/NEXT_CODEX_STEP.md','ops/AUTONOMOUS_RUNBOOK.md','ops/TEST_MATRIX.md',
  'ops/APP_FEATURE_GAP_MATRIX.md','ops/APP_GATE_QUEUE.json','ops/EXECUTION_LEDGER.jsonl','ops/AUTONOMOUS_RECOVERY.md',
  'ops/POST_LL08_BASELINE_AUDIT.md','ops/CODEX_SUBSCRIPTION_SECURITY_AUDIT.md','ops/PROPOSED_LOCAL_LIVE_LL09_LL16.md','ops/LL10_APPROVAL_REQUIRED.md',
  'ops/evidence/LL09_adapter_mock_negative_tests.json','ops/evidence/LL09_runtime_reconciliation_20261018.json','ops/evidence/LL09_runtime_reconciliation_post_managed_restart_20261018.json','ops/evidence/codex-subscription-state-reconciliation.json','ops/evidence/LL11_scoped_tool_policy_preparatory.json','ops/evidence/LL13_memory_governance_preparatory.json','ops/evidence/local-lifecycle-negative-tests.json','ops/LOCAL_WORKFLOW_REGISTRY.json','ops/local-live/runtime/workflow.local-agent.json',
  'ops/evidence/LL12_ollama_artifact_demo.json','ops/evidence/LL12_ollama_artifact_demo_task_dcb379ab-9746-43c7-a20b-69302de6301d.json','ops/evidence/LL14_role_contract_evaluation_preparatory_20261018-r2.json','ops/evidence/LL14_role_contract_evaluation_preparatory_20261018-091127865.json','ops/evidence/LL14_role_contract_evaluation_preparatory_20261018-092605212.json','ops/evidence/LL14_role_contract_evaluation_preparatory_20261018-092725815.json',
  'ops/evidence/role-matrix-independent-audit-20261018.json','ops/evidence/local-production-scenario-acceptance-audit-20261018.json','ops/evidence/LOCAL_RUNTIME_RECONCILIATION_20261018_1800.json',
  'ops/evidence/command-center-e2e-20261018.json','ops/evidence/LL12_engineering_export_runtime_test_20261018.json','ops/evidence/flutter-navigation-browser-20261018.json','ops/evidence/local-command-center-live.png',
  'ops/local-live/runtime/codex-subscription-adapter.mjs','ops/local-live/runtime/server.mjs','ops/local-live/runtime/role-capabilities.mjs','ops/local-live/runtime/scoped-artifact-tools.mjs','ops/local-live/runtime/artifact-pipeline.mjs','ops/local-live/runtime/ollama-local-inference.mjs','ops/local-live/runtime/memory-governance.mjs','ops/local-live/runtime/audit-role-matrix.mjs','ops/local-live/runtime/test-role-scoped-capability-live.mjs','ops/local-live/runtime/run-role-acceptance.mjs','ops/local-live/runtime/audit-production-scenarios.mjs','ops/local-live/runtime/preserve-scenario-failure-draft.mjs','ops/local-live/runtime/run-production-scenarios.mjs',
  'ops/local-live/runtime/test-codex-subscription-adapter.mjs','ops/local-live/runtime/test-codex-subscription-integration.mjs','ops/local-live/runtime/test-local-capabilities-tools.mjs','ops/local-live/runtime/test-artifact-pipeline.mjs','ops/local-live/runtime/test-memory-governance.mjs','ops/local-live/runtime/role-evaluation.mjs','ops/local-live/runtime/test-role-evaluation.mjs','ops/local-live/runtime/run-role-acceptance.mjs','ops/local-live/runtime/test-role-scenario-context.mjs','ops/local-live/runtime/test-role-acceptance-evaluator.mjs','ops/local-live/runtime/run-artifact-pipeline-demo.mjs','ops/local-live/runtime/verify-active-db.mjs','ops/local-live/runtime/install-codex-dispatch-interlock.mjs','ops/local-live/runtime/test-live-api-codex-interlock.mjs','ops/local-live/runtime/snapshot-sqlite.mjs','ops/local-live/runtime/update-post-ll08-manifest.mjs','ops/local-live/runtime/test-flutter-web-smoke.mjs','ops/local-live/runtime/test-flutter-navigation-browser.mjs','ops/evidence/role-queue-api-unavailable-before-enqueue-20261018.json','ops/evidence/flutter-web-smoke-20261018.json','ops/evidence/flutter-web-smoke-375.png','ops/evidence/role-tool-capability-batch-retry-20261018.jsonl','ops/evidence/role-repair-batch-1-20261018.jsonl','ops/evidence/role-repair-batch-2-20261018.jsonl','ops/evidence/role-repair-batch-3-20261018.jsonl','ops/evidence/role-repair-batch-4-20261018.jsonl','ops/evidence/role-repair-batch-5-20261018.jsonl','ops/evidence/role-repair-batch-6-20261018.jsonl','ops/evidence/role-repair-batch-7-20261018.jsonl','ops/evidence/role-repair-batch-8-20261018.jsonl','ops/evidence/role-repair-batch-9-20261018.jsonl','lib/engine/notifications_service.dart','web/flutter_bootstrap.js','ops/history/local-api-before-stop-20261018-131421-902.sqlite','ops/history/20261018-ll09-pre-restart-wejdan-local.sqlite',
  'ops/agent-acceptance/role_matrix.json',
  'ops/APP_FEATURE_GAP_MATRIX.md','ops/APP_GATE_QUEUE.json','ops/TEST_MATRIX.md','ops/CURRENT_STATE.md','ops/NEXT_CODEX_STEP.md','ops/PROGRESS.md','design/UIKIT.md','docs/PRODUCT_SPEC.md',
  'lib/ui/router.dart','lib/ui/widgets/tab_shell.dart','lib/ui/screens/habits/habits_hub_screen.dart','lib/l10n/app_ar.arb','lib/l10n/app_en.arb','lib/l10n/app_localizations.dart','lib/l10n/app_localizations_ar.dart','lib/l10n/app_localizations_en.dart','test/widget/hubs_test.dart',
  'command-center/index.html','command-center/app.js','command-center/codex-adapter-smoke.mjs','command-center/smoke-test.mjs','command-center/preview-server.mjs',
  'ops/local-live/artifacts/task_5f125aae-8505-44f8-af90-6123c88a2afc/tool-boundary-demo.md',
  'ops/local-live/artifacts/task_1852e1d4-6c4a-4237-a9b9-47b2d4143cda/tool-boundary-demo.md',
  'ops/local-live/artifacts/task_0ca816b2-28d9-4020-8cbc-f4fa58078c2d/tool-boundary-demo.md',
  'ops/local-live/artifacts/task_3643ea9e-e612-4221-baab-3d016c17d41d/codex-adapter-hardening-implementation-note.md',
  'ops/local-live/artifacts/task_dcb379ab-9746-43c7-a20b-69302de6301d/codex-adapter-hardening-implementation-note.md',
  'ops/history/20261018-ll09-final-pre-migration-wejdan-local.sqlite'
];
async function walkArtifactDirectory(directory) {
  const entries = await readdir(resolve(directory), { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await walkArtifactDirectory(child));
    else if (entry.isFile()) found.push(child);
  }
  return found;
}
const allPaths = [...new Set([...paths, ...await walkArtifactDirectory('ops/evidence'), ...await walkArtifactDirectory('ops/local-live/artifacts'), ...await walkArtifactDirectory('ops/agent-acceptance/roles'), ...await walkArtifactDirectory('ops/agent-acceptance/scenarios')])];
const byPath = new Map(manifest.entries.map(entry => [entry.path, entry]));
for (const path of allPaths) {
  const bytes = await readFile(resolve(path));
  byPath.set(path, { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
manifest.entries = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
manifest.entry_count = manifest.entries.length;
manifest.generated_at = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', updated_paths: allPaths.length, manifest_entries: manifest.entry_count, generated_at: manifest.generated_at }));
