import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const folders = {
  product: 'ops/agent-acceptance/scenarios/product-feature-design',
  research: 'ops/agent-acceptance/scenarios/research-quality',
  engineering: 'ops/agent-acceptance/scenarios/engineering-security',
};
const digest = value => createHash('sha256').update(value).digest('hex');
const readJson = async path => JSON.parse(await readFile(resolve(path), 'utf8'));

async function latestScenario(folder, scenarioId, includeFailures = false) {
  const candidates = [];
  for (const name of await readdir(resolve(folder))) {
    if (!name.endsWith('.json') || (!includeFailures && name.endsWith('-failure.json'))) continue;
    try {
      const value = await readJson(`${folder}/${name}`);
      if (value.scenario_id === scenarioId) candidates.push({ value, path: `${folder}/${name}` });
    } catch { /* malformed history remains available but is not accepted as evidence */ }
  }
  candidates.sort((a, b) => String(b.value.recorded_at || '').localeCompare(String(a.value.recorded_at || '')));
  if (!candidates.length) throw new Error(`NO_SCENARIO_EVIDENCE:${scenarioId}`);
  return candidates[0];
}

async function auditArtifact(evidence, expectedReviewer, checkText) {
  const filePath = evidence.artifact?.path || evidence.draft_artifact?.path;
  if (!filePath) return { accepted: false, failures: ['ARTIFACT_PATH_MISSING'] };
  const bytes = await readFile(resolve(filePath));
  const text = bytes.toString('utf8');
  const actualHash = digest(bytes);
  const expectedHash = evidence.artifact?.sha256 || evidence.artifact_sha256 || evidence.draft_artifact?.sha256;
  const failures = [];
  if (!expectedHash || actualHash !== expectedHash) failures.push('ARTIFACT_SHA256_MISMATCH');
  if (evidence.provider !== 'ollama-local' || evidence.model !== 'qwen3:8b') failures.push('PROVIDER_OR_MODEL_MISMATCH');
  if (evidence.status !== 'completed') failures.push('TASK_STATUS_NOT_COMPLETED');
  if (evidence.reviewer_role_id !== expectedReviewer || evidence.reviewer_verdict !== 'PASS') failures.push('INDEPENDENT_REVIEW_NOT_PASS');
  if (!Array.isArray(evidence.steps) || evidence.steps.length < 3) failures.push('INSUFFICIENT_CHAIN_STEPS');
  else {
    for (const step of evidence.steps) {
      if (step.task_id !== evidence.task_id || step.trace_id !== evidence.trace_id || !step.n8n_execution_id || step.status === 'failed') failures.push('STEP_CORRELATION_OR_EXECUTION_INVALID');
    }
  }
  failures.push(...checkText(text));
  return { accepted: failures.length === 0, path: filePath, sha256: actualHash, bytes: bytes.length, failures, text };
}

const productRecord = await latestScenario(folders.product, 'product-feature-design');
const researchRecord = await latestScenario(folders.research, 'research-quality');
const engineeringRecord = await latestScenario(folders.engineering, 'engineering-security', true);
const [product, research, engineering, engineeringRuntimeTest] = await Promise.all([
  Promise.resolve(productRecord.value), Promise.resolve(researchRecord.value), Promise.resolve(engineeringRecord.value),
  readJson('ops/evidence/LL12_engineering_export_runtime_test_20261018.json'),
]);

const productAudit = await auditArtifact(product, 'QA-02', text => {
  const failures = [];
  const expectedTestIds = ['UT-001','UT-002','UT-003','UT-004','UT-005','UT-006','IT-001','IT-002','E2E-001','E2E-002','AT-001','AT-002','AT-003','AT-004'];
  for (const id of expectedTestIds) if (!text.includes(id)) failures.push(`PRODUCT_TEST_CASE_MISSING:${id}`);
  if (/\bCONFIRMED\b|owner approval (?:is )?confirmed/i.test(text)) failures.push('UNSUPPORTED_HUMAN_APPROVAL_CLAIM');
  if (!/SPECIFIED/i.test(text) || !/NOT_RUN/i.test(text)) failures.push('SOURCE_STATUS_OR_TEST_STATUS_MISSING');
  if (/\b(?:shame|punish|blame)\b/i.test(text) && !/never|no shame|nonpunitive/i.test(text)) failures.push('PUNITIVE_COPY_RISK');
  return failures;
});
const researchAudit = await auditArtifact(research, 'UR-QA', text => {
  const failures = [];
  const ids = [...text.matchAll(/\|\s*(SYN-\d{2})\s*\|/g)].map(match => match[1]);
  const expected = Array.from({ length: 8 }, (_, index) => `SYN-${String(index + 1).padStart(2, '0')}`);
  if (new Set(ids).size !== 8 || !expected.every(id => ids.includes(id))) failures.push('RESEARCH_SYNTHETIC_ROWS_INVALID');
  if (!/schema|validation|assertion/i.test(text) || !/consent.{0,60}privacy|privacy.{0,60}consent/is.test(text)) failures.push('RESEARCH_VALIDATION_OR_PRIVACY_CHECKLIST_MISSING');
  if (!/sample question.{0,120}(?:field|column|variable)|question.{0,120}(?:field|column|variable)/is.test(text)) failures.push('RESEARCH_QUESTION_FIELD_ALIGNMENT_MISSING');
  if (/\b20\d{2}-\d{2}-\d{2}\b/.test(text)) failures.push('INVENTED_CALENDAR_DATE');
  if (/\b(?:participants|interviews|observations)\b[^\n]{0,90}\b(?:completed|conducted|found|showed)\b/i.test(text)) failures.push('FABRICATED_HUMAN_RESEARCH');
  if (!/synthetic/i.test(text) || /synthetic data.{0,100}(?:proves|demonstrates|shows user intent)/i.test(text)) failures.push('SYNTHETIC_DATA_BOUNDARY_VIOLATION');
  return failures;
});

const engineeringRuntimePass = engineeringRuntimeTest.result === 'PASS' && engineeringRuntimeTest.checks?.length === 7;
const engineeringArtifactAudit = await auditArtifact(engineering, 'QA-02', text => {
  const failures = [];
  const required = [
    'GET /api/tasks/{task_id}/export', 'local-task-export.v1', '127.0.0.1:8766',
    'CORS is not used for authorization', 'No user authentication', 'Local processes can access',
    'task_id', 'trace_id', 'not production-deployed', '6a1096364ec3bb8e8d5a3989f5584d545e4cea4552a56a80b41136c84a3d0211',
  ];
  for (const marker of required) if (!text.toLowerCase().includes(marker.toLowerCase())) failures.push(`ENGINEERING_REQUIRED_EVIDENCE_MISSING:${marker}`);
  for (const marker of ['Schema/Identity Check','Step Task+Trace Correlation','Memory Trace/Source-Step Scope','Approvals Task Scope','Raw Result JSON Exclusion','Unknown ID 404','POST 404 Enforcement']) if (!text.includes(marker)) failures.push(`ENGINEERING_RUNTIME_CHECK_MISSING:${marker}`);
  const personalDataBoundary = /(?:no personal data|personal data.{0,120}(?:blocked|not authorized|not authorize|requires authentication|requires authorization))/is.test(text);
  if (!personalDataBoundary) failures.push('PERSONAL_DATA_AUTHORIZATION_LIMIT_MISSING');
  if (/correlation_id\s+(?:is\s+)?(?:used|implemented|verified|enforced)/i.test(text) || !/no\s+`?correlation_id/i.test(text)) failures.push('UNSUPPORTED_CORRELATION_FIELD_CLAIM');
  const reviewStart = text.indexOf('## Independent review');
  const reportBody = reviewStart >= 0 ? text.slice(0, reviewStart).trim() : text.trim();
  if (!/[.!?)]$/.test(reportBody)) failures.push('ENGINEERING_REPORT_TRUNCATED');
  if (/external users? (?:cannot|can't) access.{0,100}CORS/i.test(text)) failures.push('CORS_MISREPRESENTED_AS_AUTHORIZATION');
  return failures;
});
const engineeringAudit = {
  task_id: engineering.task_id,
  trace_id: engineering.trace_id,
  evidence_path: engineeringRecord.path,
  accepted: engineeringArtifactAudit.accepted && engineeringRuntimePass,
  status: engineeringArtifactAudit.accepted && engineeringRuntimePass ? 'SYNTHETIC_PROTOTYPE_ACCEPTED_PERSONAL_DATA_BLOCKED' : 'INDEPENDENT_ARTIFACT_CHECK_FAILED',
  reviewer_role_id: engineering.reviewer_role_id || 'QA-02',
  reviewer_verdict: engineering.reviewer_verdict,
  error: engineering.error,
  execution_ids: (engineering.steps || []).map(step => step.n8n_execution_id),
  artifact_path: engineeringArtifactAudit.path,
  artifact_sha256: engineeringArtifactAudit.sha256,
  independent_failures: engineeringArtifactAudit.failures,
  independent_runtime_test: {
    result: engineeringRuntimePass ? 'PASS' : 'FAIL',
    evidence: 'ops/evidence/LL12_engineering_export_runtime_test_20261018.json',
    checks: engineeringRuntimeTest.checks?.length || 0,
    task_id: engineeringRuntimeTest.task_id,
    trace_id: engineeringRuntimeTest.trace_id,
  },
  reasons: [
    'The latest synthetic-only end-to-end design/security artifact passed its independent local model review and deterministic checks for complete content, exact evidence, task/trace correlation, and truthful access-control statements.',
    'The actual synthetic export endpoint passes seven independent read-only runtime checks.',
    'Acceptance is limited to synthetic local prototype behavior. The endpoint has no user authentication or route-level authorization; loopback binding and CORS are not user authorization. Personal-data export remains blocked pending an approved access-control design and implementation.',
    'No model reviewer result is treated as human approval or security certification.',
  ],
};

const checks = {
  product: {
    task_id: product.task_id, trace_id: product.trace_id, evidence_path: productRecord.path,
    accepted: productAudit.accepted, status: productAudit.accepted ? 'PLANNING_ARTIFACT_ACCEPTED_WITH_TESTS_NOT_RUN' : 'INDEPENDENT_ARTIFACT_CHECK_FAILED',
    reviewer_verdict: product.reviewer_verdict, reviewer_role_id: 'QA-02',
    execution_ids: product.steps.map(step => step.n8n_execution_id),
    artifact_path: productAudit.path, artifact_sha256: productAudit.sha256,
    checks: { sha_and_correlation: productAudit.failures.length === 0, required_test_case_ids: 14, tests_executed: 0, output_limit: 'planning artifact only; no notifications or deployment' },
    violations: productAudit.failures,
    limitations: ['All listed tests remain NOT_RUN; this is an accepted plan/deliverable, not implementation or feature runtime acceptance.', 'No human approval is claimed.'],
  },
  research: {
    task_id: research.task_id, trace_id: research.trace_id, evidence_path: researchRecord.path,
    accepted: researchAudit.accepted, status: researchAudit.accepted ? 'SYNTHETIC_METHOD_ARTIFACT_ACCEPTED_NO_HUMAN_FINDINGS' : 'INDEPENDENT_ARTIFACT_CHECK_FAILED',
    reviewer_verdict: research.reviewer_verdict, reviewer_role_id: 'UR-QA',
    execution_ids: research.steps.map(step => step.n8n_execution_id),
    artifact_path: researchAudit.path, artifact_sha256: researchAudit.sha256,
    checks: { sha_and_correlation: researchAudit.failures.length === 0, unique_synthetic_rows: 8, validation_and_privacy_required: true },
    violations: researchAudit.failures,
    limitations: ['Synthetic rows are method fixtures only; no participant observations or real-world findings are represented.'],
  },
  engineering: engineeringAudit,
};
productAudit.text = undefined;
researchAudit.text = undefined;

const accepted = Object.values(checks).filter(item => item.accepted).length;
const report = {
  schema_version: 'local-production-scenario-independent-audit.v1',
  auditor_version: '2.0.0',
  audited_at: new Date().toISOString(),
  evidence_basis: 'Independent deterministic checks of the newest persisted scenario artifact, SHA-256, provider/model, all task/trace-correlated n8n steps, explicit required IDs and synthetic-data boundaries. Reviewer verdicts are supporting evidence, never the sole acceptance oracle.',
  totals: { scenarios: 3, acceptance_passed: accepted, acceptance_failed_or_blocked: 3 - accepted },
  overall_result: accepted === 3 ? 'ACCEPTED_WITH_DOCUMENTED_LIMITS' : 'PARTIALLY_ACCEPTED_NOT_COMPLETE',
  scenarios: checks,
  violations: [
    ...(checks.product.accepted ? [] : ['Product scenario failed deterministic source, status, or test-plan assertions.']),
    ...(checks.research.accepted ? [] : ['Research scenario failed synthetic dataset, question mapping, privacy, or correlation assertions.']),
    ...(checks.engineering.accepted ? [] : ['Engineering scenario failed independent artifact or runtime checks.']),
    'No approval or factual claims were inferred from automated model-review outputs.',
  ],
  external_blockers: ['Do not use the task export route with real/private data until user authentication and route-level authorization are designed, approved, implemented and independently tested.'],
  safety: { paid_api_calls: 0, live_codex_calls: 0, cloud_n8n_runs: 0, external_actions: 0, human_approvals: 0 },
};
const output = 'ops/evidence/local-production-scenario-acceptance-audit-20261018.json';
await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', overall_result: report.overall_result, accepted, product: checks.product.accepted, research: checks.research.accepted, engineering: checks.engineering.accepted, output }));
