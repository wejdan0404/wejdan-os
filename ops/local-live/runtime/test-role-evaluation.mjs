import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildRoleEvaluationCases, evaluateRoleResult } from './role-evaluation.mjs';

const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const cases = buildRoleEvaluationCases(registry);
assert.equal(cases.length, 85);
assert.equal(new Set(cases.map(item => item.responsibility_boundary)).size, 85);
assert.equal(new Set(cases.map(item => item.expected_outputs_text)).size, 85);
assert.equal(new Set(cases.map(item => item.scenario_input)).size, 85);
function validActual(expected) {
  return {
    task_id: expected.task_id,
    trace_id: expected.trace_id,
    role_id: expected.expected_role_id,
    status: 'completed',
    output: `Synthetic contract fixture for ${expected.role_name}; no domain correctness claim.`,
    deliverables: [{ type: expected.expected_outputs_text, evidence_refs: [`fixture:${expected.case_id}`] }],
    tool_actions: [],
    provider: 'deterministic-stub',
    model: null,
    usage_known: false,
    usage: null,
    real_cost_usd: null,
    simulated_cost_usd: null,
    claims: [],
    claimed_tool_actions: [],
  };
}
const entries = cases.map(expected => {
  const result = evaluateRoleResult(expected, validActual(expected));
  return { case_id: expected.case_id, role_id: expected.expected_role_id, team_id: expected.team_id, source_contract_id: expected.source_contract_id, scenario_input: expected.scenario_input, responsibility_boundary: expected.responsibility_boundary, expected_deliverable: expected.expected_outputs_text, forbidden_actions: expected.forbidden_actions, declared_allowed_tools: expected.declared_allowed_tools, task_tool_grants: expected.task_tool_grants, checks_declared: expected.role_checks, ...result };
});
assert.equal(entries.filter(item => item.result === 'PASS').length, 85);
const perRoleNegativeCases = cases.flatMap(expected => {
  const missingDeliverable = evaluateRoleResult(expected, { ...validActual(expected), deliverables: [] });
  const unauthorizedTool = evaluateRoleResult(expected, { ...validActual(expected), tool_actions: ['external.publish'] });
  assert.equal(missingDeliverable.result, 'FAIL', `${expected.expected_role_id}: missing deliverable should fail`);
  assert.equal(missingDeliverable.violations.includes('ROLE_DELIVERABLE_MISSING'), true);
  assert.equal(unauthorizedTool.result, 'FAIL', `${expected.expected_role_id}: unauthorized tool should fail`);
  assert.equal(unauthorizedTool.violations.includes('TOOL_ACTION_NOT_GRANTED_TO_TASK'), true);
  return [
    { role_id: expected.expected_role_id, scenario: 'required role-specific deliverable omitted', expected_violation: 'ROLE_DELIVERABLE_MISSING', result: missingDeliverable },
    { role_id: expected.expected_role_id, scenario: 'ungranted external tool action', expected_violation: 'TOOL_ACTION_NOT_GRANTED_TO_TASK', result: unauthorizedTool },
  ];
});
const sample = cases[0];
const base = validActual(sample);
const negativeCases = [
  ['task mismatch', sample, { ...base, task_id: 'task_wrong' }, 'TASK_ID_MISMATCH'],
  ['trace mismatch', sample, { ...base, trace_id: 'trace_wrong' }, 'TRACE_ID_MISMATCH'],
  ['role mismatch', sample, { ...base, role_id: 'PMO-01' }, 'ROLE_ID_MISMATCH'],
  ['non-completed status', sample, { ...base, status: 'failed' }, 'STATUS_NOT_COMPLETED'],
  ['empty output', sample, { ...base, output: '  ' }, 'OUTPUT_EMPTY'],
  ['missing role-specific deliverable', sample, { ...base, deliverables: [] }, 'ROLE_DELIVERABLE_MISSING'],
  ['missing deliverable evidence', sample, { ...base, deliverables: [{ type: sample.expected_outputs_text, evidence_refs: [] }] }, 'DELIVERABLE_EVIDENCE_MISSING'],
  ['forbidden provider', sample, { ...base, provider: 'anthropic' }, 'PROVIDER_NOT_ALLOWED'],
  ['unknown usage invented', sample, { ...base, usage: { input_tokens: 1, output_tokens: 1 } }, 'UNKNOWN_USAGE_MUST_REMAIN_NULL'],
  ['tool action without task grant', sample, { ...base, tool_actions: ['filesystem.write'] }, 'TOOL_ACTION_NOT_GRANTED_TO_TASK'],
  ['tool action claim', sample, { ...base, claimed_tool_actions: ['published'] }, 'UNAUTHORIZED_TOOL_ACTION_CLAIM'],
  ['unsupported claim without evidence', sample, { ...base, claims: [{ text: 'I completed an external action', evidence_refs: [] }] }, 'CLAIM_WITHOUT_EVIDENCE_REFERENCE'],
  ['invalid real cost type', sample, { ...base, real_cost_usd: '0.00' }, 'REAL_COST_INVALID'],
];
for (const [name, expected, actual, expectedViolation] of negativeCases) {
  const result = evaluateRoleResult(expected, actual);
  assert.equal(result.result, 'FAIL', `${name} did not fail`);
  assert.equal(result.violations.includes(expectedViolation), true, `${name} missing ${expectedViolation}`);
}
const evidence = {
  schema_version: 'll14-role-contract-evaluation-preparatory.v1',
  verified_at: new Date().toISOString(),
  status: 'PREPARED_PENDING_PREDECESSORS',
  expected_roles: 85,
  role_routing_contract_passed: 85,
  role_routing_contract_failed: 0,
  negative_cases_expected: negativeCases.length,
  negative_cases_failed_as_expected: negativeCases.length,
  domain_quality_certification: 0,
  human_expert_reviews: 0,
  entries,
  negative_cases: negativeCases.map(([name, expected, actual, expectedViolation]) => ({ name, role_id: expected.expected_role_id, expected_violation: expectedViolation, result: evaluateRoleResult(expected, actual) })),
  per_role_negative_cases: perRoleNegativeCases,
  role_specific_coverage: { unique_scenarios: new Set(cases.map(item => item.scenario_input)).size, unique_responsibilities: new Set(cases.map(item => item.responsibility_boundary)).size, unique_deliverables: new Set(cases.map(item => item.expected_outputs_text)).size, per_role_negative_cases_generated: 85 * 2, per_role_negatives_executed: perRoleNegativeCases.length },
  limitations: ['Deterministic contract/routing/security checks only; does not validate domain truth, factual correctness, or professional competence.', 'Task grants are empty unless explicitly provided; this suite verifies least privilege at the contract layer, not real tool execution.', 'Existing LL07 representative role evaluation evidence remains unchanged.', 'Not integrated into active API/Command Center; LL09 and LL10 predecessors remain incomplete.'],
  live_codex_calls: 0,
  paid_api_calls: 0,
  n8n_runs: 0,
};
const payload = `${JSON.stringify(evidence, null, 2)}\n`;
const digest = createHash('sha256').update(payload).digest('hex');
const evidencePath = `ops/evidence/LL14_role_contract_evaluation_preparatory_${new Date().toISOString().replace(/[-:.]/g, '').replace('T', '-').replace('Z', '')}.json`;
await writeFile(evidencePath, payload, { flag: 'wx' });
console.log(JSON.stringify({ result: 'PASS', mode: 'deterministic-role-contract-fixture', roles: 85, role_contract_passes: 85, unique_scenarios: cases.length, unique_responsibilities: new Set(cases.map(item => item.responsibility_boundary)).size, unique_deliverables: new Set(cases.map(item => item.expected_outputs_text)).size, per_role_negative_cases_executed: perRoleNegativeCases.length, cross_cutting_negative_cases: negativeCases.length, domain_quality_certification: 0, live_codex_calls: 0, paid_api_calls: 0, n8n_runs: 0, evidence_path: evidencePath, evidence_sha256: digest }));
