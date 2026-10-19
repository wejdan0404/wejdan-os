import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const matrix = JSON.parse(await readFile('ops/agent-acceptance/role_matrix.json', 'utf8'));
if (registry.role_count !== 85 || registry.roles.length !== 85 || matrix.roles.length !== 85) throw new Error('ROLE_COUNT_MISMATCH');
const violations = [];
const seen = new Set();
const reviewerIds = new Set();
for (const canonical of registry.roles) {
  const row = matrix.roles.find(item => item.role_id === canonical.role_id);
  if (!row) { violations.push({ role_id: canonical.role_id, code: 'MATRIX_ROW_MISSING' }); continue; }
  if (seen.has(row.role_id)) violations.push({ role_id: row.role_id, code: 'DUPLICATE_ROLE_ROW' });
  seen.add(row.role_id);
  if (row.contract_id !== canonical.contract_id || row.name_en !== canonical.name_en || row.team_id !== canonical.team_id) violations.push({ role_id: row.role_id, code: 'CANONICAL_IDENTITY_MISMATCH' });
  if (row.live_inference_status !== 'PASS') violations.push({ role_id: row.role_id, code: 'LIVE_INFERENCE_NOT_PASS', value: row.live_inference_status });
  if (!row.task_id || !row.trace_id || !Array.isArray(row.n8n_execution_ids) || !row.n8n_execution_ids.length) violations.push({ role_id: row.role_id, code: 'TASK_TRACE_EXECUTION_EVIDENCE_MISSING' });
  try {
    const evidenceBytes = await readFile(resolve(row.evidence_path));
    const evidence = JSON.parse(evidenceBytes.toString('utf8'));
    if (evidence.independent_review?.reviewer_role_id) reviewerIds.add(evidence.independent_review.reviewer_role_id);
    if (evidence.role.role_id !== row.role_id || evidence.scenario.task_id !== row.task_id || evidence.scenario.trace_id !== row.trace_id) violations.push({ role_id: row.role_id, code: 'EVIDENCE_CORRELATION_MISMATCH' });
    if (evidence.execution.provider !== 'ollama-local' || evidence.execution.model !== 'qwen3:8b') violations.push({ role_id: row.role_id, code: 'PROVIDER_MODEL_MISMATCH' });
    if (evidence.artifact.path !== row.artifact_path || evidence.artifact.sha256 !== row.artifact_sha256) violations.push({ role_id: row.role_id, code: 'ARTIFACT_POINTER_MISMATCH' });
    if (hash(await readFile(resolve(row.artifact_path))) !== row.artifact_sha256) violations.push({ role_id: row.role_id, code: 'ARTIFACT_HASH_MISMATCH' });
    if (evidence.execution.n8n_execution_ids.join(',') !== row.n8n_execution_ids.join(',')) violations.push({ role_id: row.role_id, code: 'EXECUTION_ID_MISMATCH' });
    if (evidence.statuses.specialist_artifact !== row.specialist_artifact_status || evidence.statuses.reviewer_verdict !== row.review_verdict) violations.push({ role_id: row.role_id, code: 'ACCEPTANCE_STATUS_MISMATCH' });
    const expectedEvidenceHash = hash(Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`));
    if (row.evidence_sha256 && expectedEvidenceHash !== row.evidence_sha256) violations.push({ role_id: row.role_id, code: 'EVIDENCE_HASH_MISMATCH' });
  } catch (error) { violations.push({ role_id: row.role_id, code: 'EVIDENCE_OR_ARTIFACT_UNREADABLE', message: String(error.message || error) }); }
}
const statusCounts = Object.fromEntries([...new Set(matrix.roles.map(row => row.specialist_artifact_status))].map(status => [status, matrix.roles.filter(row => row.specialist_artifact_status === status).length]));
const report = {
  schema_version: 'role-matrix-independent-audit.v1',
  audited_at: new Date().toISOString(),
  auditor: 'local deterministic file/hash/correlation assertions; independent of model success claims',
  expected_roles: 85,
  audited_roles: seen.size,
  live_inference_passes: matrix.roles.filter(row => row.live_inference_status === 'PASS').length,
  specialist_artifact_status_counts: statusCounts,
  reviewer_passes: matrix.roles.filter(row => row.review_verdict === 'PASS').length,
  distinct_reviewers_observed: [...reviewerIds].sort(),
  role_tool_capability_verified: matrix.counters.tool_capability_verified_for_role,
  human_expert_approved: matrix.counters.human_expert_approved,
  violations,
  result: violations.length === 0 && seen.size === 85 ? 'PASS' : 'FAIL',
  safety: { paid_api_calls: 0, live_codex_calls: 0, n8n_cloud_runs: 0, external_actions: 0 },
};
await writeFile('ops/evidence/role-matrix-independent-audit-20261018.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: report.result, audited_roles: report.audited_roles, live_inference_passes: report.live_inference_passes, specialist_artifact_status_counts: statusCounts, reviewer_passes: report.reviewer_passes, violations: violations.length, evidence: 'ops/evidence/role-matrix-independent-audit-20261018.json' }));
if (report.result !== 'PASS') process.exitCode = 1;
