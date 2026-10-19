import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const fileHash = async path => createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
const [canonical, bindings, matrix, suite] = await Promise.all([
  readJson('roles/role_registry.json'), readJson('agents/registry.json'),
  readJson('ops/agent-acceptance/role_matrix.json'), readJson('ops/agent-acceptance/agent-eval-suite.v1.json'),
]);
let latestEval = null;
try {
  const evalDir = resolve(root, 'ops/agent-acceptance/evaluations');
  for (const file of (await readdir(evalDir)).filter(name => name.endsWith('.json'))) {
    try {
      const candidate = JSON.parse(await readFile(resolve(evalDir, file), 'utf8'));
      if (candidate.schema_version === 'agent-eval-results.v1' && candidate.generated_at && (!latestEval || candidate.generated_at > latestEval.generated_at)) latestEval = candidate;
    } catch {}
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
if (canonical.role_count !== 85 || canonical.roles.length !== 85 || bindings.roles.length !== 85 || matrix.roles.length !== 85) throw new Error('ROLE_PORTFOLIO_COUNT_MISMATCH');
const bindingById = new Map(bindings.roles.map(role => [role.role_id, role]));
const acceptanceById = new Map(matrix.roles.map(role => [role.role_id, role]));
const issues = [];
for (const role of canonical.roles) {
  const binding = bindingById.get(role.role_id);
  const acceptance = acceptanceById.get(role.role_id);
  if (!binding || !acceptance) { issues.push({ role_id: role.role_id, severity: 'critical', layer: 'portfolio-coverage', finding: 'binding_or_acceptance_row_missing' }); continue; }
  if (binding.contract_id !== role.contract_id || !binding.role_card || !binding.skills?.length || !binding.knowledge_refs?.length || !binding.shared_context_ref || !binding.memory_policy_ref) issues.push({ role_id: role.role_id, severity: 'high', layer: 'role-binding', finding: 'binding_incomplete_or_stale' });
  for (const ref of [binding.role_card, binding.shared_context_ref, binding.memory_policy_ref, ...binding.skills, ...binding.knowledge_refs]) {
    try { await readFile(resolve(root, ref.replaceAll('\\', '/'))); }
    catch { issues.push({ role_id: role.role_id, severity: 'high', layer: 'role-binding', finding: 'bound_source_missing', source: ref }); }
  }
  if (acceptance.specialist_artifact_status !== 'PASS') issues.push({ role_id: role.role_id, severity: 'high', layer: 'specialist-evaluation', finding: acceptance.specialist_artifact_status, task_id: acceptance.task_id || null });
  if (acceptance.review_verdict !== 'PASS') issues.push({ role_id: role.role_id, severity: 'high', layer: 'independent-review', finding: acceptance.review_verdict, task_id: acceptance.task_id || null });
  if (role.allowed_tools?.length) issues.push({ role_id: role.role_id, severity: 'critical', layer: 'authorization', finding: 'role_registry_grants_tools_by_default' });
  if (!Array.isArray(role.forbidden_actions) || role.forbidden_actions.length === 0) issues.push({ role_id: role.role_id, severity: 'critical', layer: 'authorization', finding: 'role_forbidden_actions_missing' });
}
if (suite.cases.length !== 850 || suite.canonical_role_count !== 85 || suite.cases_per_role !== 10) issues.push({ severity: 'critical', layer: 'evaluation-suite', finding: 'expected_850_cases_across_85_roles' });
for (const role of canonical.roles) {
  const cases = suite.cases.filter(item => item.role_id === role.role_id);
  if (cases.length !== 10 || new Set(cases.map(item => item.dimension)).size !== 10 || !cases.some(item => item.language === 'ar') || !cases.some(item => item.language === 'en')) issues.push({ role_id: role.role_id, severity: 'critical', layer: 'evaluation-suite', finding: 'role_case_coverage_incomplete' });
}
const passCount = predicate => matrix.roles.filter(predicate).length;
const metrics = {
  role_coverage: { passed: matrix.roles.filter(row => row.live_inference_status === 'PASS').length, total: 85 },
  specialist_acceptance: { passed: passCount(row => row.specialist_artifact_status === 'PASS'), total: 85, threshold: 77 },
  independent_review: { passed: passCount(row => row.review_verdict === 'PASS'), total: 85, threshold: 77 },
  role_tool_receipts: { passed: passCount(row => row.role_tool_capability_status === 'VERIFIED'), total: 85, informational: true },
  authorization_contracts: { passed: canonical.roles.filter(role => Array.isArray(role.allowed_tools) && role.allowed_tools.length === 0 && role.forbidden_actions?.length > 0).length, total: 85, threshold: 85 },
  human_expert_approvals: { passed: matrix.counters.human_expert_approved, total: 85, interpretation: 'not a universal gate; risk-specific approvals are recorded separately and currently unclassified' },
  evaluation_fixtures: { passed: suite.cases.length, total: 850, model_execution: 'NOT_RUN_BY_DAILY_STATIC_AUDIT' },
  latest_candidate_eval: latestEval ? { run_id: latestEval.run_id, result: latestEval.result || 'PARTIAL', overall_pass_rate: latestEval.overall_pass_rate ?? null, coverage: latestEval.coverage || null } : null,
};
const failingRoles = matrix.roles.filter(row => row.specialist_artifact_status !== 'PASS' || row.review_verdict !== 'PASS').map(row => ({ role_id: row.role_id, artifact: row.specialist_artifact_status, review: row.review_verdict, task_id: row.task_id || null, trace_id: row.trace_id || null }));
const gates = {
  role_coverage_85: metrics.role_coverage.passed === 85,
  specialist_acceptance_at_least_90_percent: metrics.specialist_acceptance.passed >= 77,
  independent_review_at_least_90_percent: metrics.independent_review.passed >= 77,
  deny_by_default_authorization_100_percent: metrics.authorization_contracts.passed === 85,
  evaluation_suite_850_role_grounded_cases: metrics.evaluation_fixtures.passed === 850 && issues.every(issue => issue.layer !== 'evaluation-suite'),
  latest_candidate_full_suite_passed: latestEval?.result === 'PASS' && latestEval.coverage?.full_suite === true && latestEval.overall_pass_rate >= 0.9,
  no_critical_findings: !issues.some(issue => issue.severity === 'critical'),
};
const report = {
  schema_version: 'daily-agent-improvement-review.v1',
  generated_at: new Date().toISOString(),
  accountable_role: 'AI-01',
  mode: 'read-only portfolio review; candidate changes require separate proposal and owner approval',
  sources: [
    { path: 'roles/role_registry.json', sha256: await fileHash('roles/role_registry.json') },
    { path: 'agents/registry.json', sha256: await fileHash('agents/registry.json') },
    { path: 'ops/agent-acceptance/role_matrix.json', sha256: await fileHash('ops/agent-acceptance/role_matrix.json') },
    { path: 'ops/agent-acceptance/agent-eval-suite.v1.json', sha256: await fileHash('ops/agent-acceptance/agent-eval-suite.v1.json') },
    ...(latestEval?.run_id ? [{ path: `ops/agent-acceptance/evaluations/${latestEval.run_id}.json`, sha256: await fileHash(`ops/agent-acceptance/evaluations/${latestEval.run_id}.json`) }] : []),
  ],
  metrics, gates, result: Object.values(gates).every(Boolean) ? 'PASS' : 'BLOCKED',
  issues: [...issues, ...failingRoles.map(row => ({ ...row, severity: row.tool_capability !== 'VERIFIED' ? 'critical' : 'high', layer: 'acceptance', finding: 'role_below_release_threshold' }))],
  required_actions: [
    'Repair failed role outputs or reviews with new evidence; never edit matrix outcomes by hand.',
    'Review any requested task-scoped tools separately; missing optional capability receipts do not imply that an ungranted role has authority.',
    'Complete a documented risk classification and obtain domain expert review where the role risk requires it.',
    latestEval?.result === 'PASS' ? 'Review the latest full candidate suite independently and attach risk-appropriate domain approval evidence.' : 'Run the 850-case suite against the candidate model/runtime with `node ops/local-live/runtime/run-agent-eval-suite.mjs --execute`; the daily portfolio audit deliberately makes zero model calls.',
  ],
};
const date = report.generated_at.slice(0, 10);
const outDir = resolve(root, 'ops/evidence/daily-agent-review');
await mkdir(outDir, { recursive: true });
const out = resolve(outDir, `${date}.json`);
await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: report.result, metrics, issue_count: report.issues.length, evidence: `ops/evidence/daily-agent-review/${date}.json`, model_calls: 0, paid_calls: 0, external_actions: 0 }));
if (report.result !== 'PASS') process.exitCode = 2;
