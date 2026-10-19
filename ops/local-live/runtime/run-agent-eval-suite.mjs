import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const api = process.env.WEJDAN_EVAL_API || 'http://127.0.0.1:8766';
const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const selectedRole = process.argv.includes('--role') ? process.argv[process.argv.indexOf('--role') + 1] : null;
const limitArg = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity;
if (!Number.isFinite(limitArg) && limitArg !== Infinity || limitArg < 1) throw new Error('INVALID_CASE_LIMIT');
if (process.argv.includes('--role') && !selectedRole) throw new Error('ROLE_ID_REQUIRED');
const suite = JSON.parse(await readFile(resolve(root, 'ops/agent-acceptance/agent-eval-suite.v1.json'), 'utf8'));
const registry = JSON.parse(await readFile(resolve(root, 'roles/role_registry.json'), 'utf8'));
const roles = new Map(registry.roles.map(role => [role.role_id, role]));
const selectedCases = suite.cases.filter(item => !selectedRole || item.role_id === selectedRole).slice(0, limitArg);
const selectedIds = new Set(selectedCases.map(item => item.case_id));
const fullRun = !selectedRole && selectedCases.length === 850 && suite.cases.length === 850;
const cases = selectedCases;
if (!cases.length) throw new Error('NO_EVALUATION_CASES_SELECTED');
if (!execute) {
  console.log(JSON.stringify({ result: 'DRY_RUN', roles: [...new Set(cases.map(item => item.role_id))].length, cases: cases.length, paid_calls: 0, external_actions: 0, next_step: 'Pass --execute to run synthetic cases against the local Ollama runtime.' }));
  process.exit(0);
}
const health = await fetch(`${api}/api/health`, { signal: AbortSignal.timeout(3000) }).then(response => response.json());
if (health.provider !== 'ollama-local' || health.paid_routes_enabled !== false || health.bind !== '127.0.0.1' || !health.n8n_ready || !health.ollama_ready) throw new Error('LOCAL_ONLY_EVAL_RUNTIME_NOT_READY');
const reviewerFor = role => role.role_id === 'QA-01' ? 'QA-02' : (role.reviewer_roles || []).includes('QA-01') ? 'QA-01' : (role.reviewer_roles || [])[0];
const runId = process.env.WEJDAN_EVAL_RUN_ID || `candidate-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = resolve(root, 'ops/agent-acceptance/evaluations');
await mkdir(outputDir, { recursive: true });
const outPath = resolve(outputDir, `${runId}.json`);
const resultsById = new Map();
try {
  const previous = JSON.parse(await readFile(outPath, 'utf8'));
  if (previous.schema_version === 'agent-eval-results.v1' && previous.suite_hash === createHash('sha256').update(JSON.stringify(suite)).digest('hex')) for (const item of previous.results || []) {
    if (selectedIds.has(item.case_id) && ['PASS', 'FAIL', 'BLOCKED', 'REVISE'].includes(item.result)) resultsById.set(item.case_id, item);
  }
} catch {}
const suiteHash = createHash('sha256').update(JSON.stringify(suite)).digest('hex');
for (const testCase of cases) {
  if (resultsById.has(testCase.case_id) && ['PASS', 'FAIL', 'BLOCKED'].includes(resultsById.get(testCase.case_id).result)) continue;
  const role = roles.get(testCase.role_id);
  if (!role || role.contract_id !== testCase.contract_id) throw new Error(`EVAL_CONTRACT_MISMATCH:${testCase.role_id}`);
  const reviewer = reviewerFor(role);
  if (!reviewer || !(role.reviewer_roles || []).includes(reviewer) && !(role.role_id === 'QA-01' && reviewer === 'QA-02')) throw new Error(`EVAL_REVIEWER_NOT_REGISTERED:${role.role_id}`);
  const response = await fetch(`${api}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role_id: role.role_id, input: testCase.scenario_input, provider: 'ollama-local', asynchronous: true, collaborate: true, reviewer_role_id: reviewer, synthetic: true }), signal: AbortSignal.timeout(15000) });
  const accepted = await response.json();
  if (response.status !== 202 || !accepted.task_id || !accepted.trace_id) {
    resultsById.set(testCase.case_id, { case_id: testCase.case_id, role_id: role.role_id, dimension: testCase.dimension, result: 'BLOCKED', failure: accepted.error || `HTTP_${response.status}` });
    await saveReport();
    continue;
  }
  let task = null;
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch(`${api}/api/tasks/${accepted.task_id}`, { signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      task = await response.json();
      if (['completed', 'failed', 'cancelled', 'blocked', 'waiting_approval'].includes(task.status)) break;
    }
  }
  const output = task?.result?.output || '';
  let review = null;
  try { review = JSON.parse(task?.result?.collaboration?.review_output || 'null'); } catch {}
  const correlation = task?.task_id === accepted.task_id && task?.trace_id === accepted.trace_id && task?.role_id === role.role_id;
  const pass = correlation && task?.status === 'completed' && output.trim().length >= 180 && review?.verdict === 'PASS' && Array.isArray(review.findings) && Array.isArray(review.missing_requirements) && Array.isArray(review.evidence_limits);
  const hardFailure = !correlation || task?.status !== 'completed' || review?.verdict === 'REJECT';
  resultsById.set(testCase.case_id, { case_id: testCase.case_id, role_id: role.role_id, contract_id: role.contract_id, dimension: testCase.dimension, language: testCase.language, result: pass ? 'PASS' : hardFailure ? 'FAIL' : 'REVISE', task_id: accepted.task_id, trace_id: accepted.trace_id, reviewer_role_id: reviewer, reviewer_verdict: review?.verdict || 'UNPARSED', model_generated_review: true, output_sha256: output ? createHash('sha256').update(output).digest('hex') : null, output_chars: output.length, review_findings: review?.findings || [], failure: correlation ? null : 'TASK_TRACE_ROLE_CORRELATION_FAILURE' });
  await saveReport();
}
await saveReport();
const results = [...resultsById.values()];
const roleSummaries = [...new Set(cases.map(item => item.role_id))].map(roleId => {
  const rows = results.filter(item => item.role_id === roleId);
  return { role_id: roleId, passed: rows.filter(item => item.result === 'PASS').length, total: rows.length, pass_rate: rows.length ? rows.filter(item => item.result === 'PASS').length / rows.length : null, complete: rows.length === 10 };
});
const criticalFailures = results.filter(item => item.result === 'FAIL');
const completeSelectedRun = selectedCases.every(item => ['PASS', 'FAIL', 'BLOCKED', 'REVISE'].includes(resultsById.get(item.case_id)?.result));
const report = {
  schema_version: 'agent-eval-results.v1', run_id: runId, generated_at: new Date().toISOString(), suite_hash: suiteHash,
  execution: { provider: 'ollama-local', model: health.model, bind: '127.0.0.1', synthetic_only: true, paid_calls: 0, external_actions: 0 },
  coverage: { cases_selected: cases.length, cases_completed: results.filter(item => ['PASS', 'REVISE', 'FAIL'].includes(item.result)).length, roles: roleSummaries.length, roles_complete: roleSummaries.filter(item => item.complete).length, full_suite: fullRun && completeSelectedRun },
  overall_pass_rate: results.length ? results.filter(item => item.result === 'PASS').length / results.length : null,
  role_summaries: roleSummaries, critical_failures: criticalFailures.map(({ case_id, role_id, dimension, task_id, trace_id, failure, reviewer_verdict }) => ({ case_id, role_id, dimension, task_id, trace_id, failure, reviewer_verdict })),
  result: fullRun && completeSelectedRun && roleSummaries.every(item => item.complete && item.pass_rate >= 0.9) && criticalFailures.length === 0 ? 'PASS' : fullRun ? 'BLOCKED' : 'PARTIAL',
  results,
};
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ result: report.result, coverage: report.coverage, overall_pass_rate: report.overall_pass_rate, critical_failures: criticalFailures.length, evidence: `ops/agent-acceptance/evaluations/${runId}.json`, paid_calls: 0, external_actions: 0 }));

async function saveReport() {
  const partial = { schema_version: 'agent-eval-results.v1', run_id: runId, generated_at: new Date().toISOString(), suite_hash: suiteHash, execution: { provider: 'ollama-local', model: health.model, bind: '127.0.0.1', synthetic_only: true, paid_calls: 0, external_actions: 0 }, results: [...resultsById.values()] };
  await writeFile(outPath, `${JSON.stringify(partial, null, 2)}\n`);
}
