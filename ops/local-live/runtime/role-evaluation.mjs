const ALLOWED_PROVIDERS = new Set(['ollama-local', 'codex-subscription', 'deterministic-stub']);

export function buildRoleEvaluationCases(registry) {
  if (!registry || registry.role_count !== 85 || !Array.isArray(registry.roles) || registry.roles.length !== 85) throw new Error('CANONICAL_ROLE_REGISTRY_MUST_HAVE_85_ROLES');
  return registry.roles.map((role, index) => ({
    case_id: `route-${role.role_id}`,
    task_id: `task_eval_${index + 1}`,
    trace_id: `trace_eval_${index + 1}`,
    expected_role_id: role.role_id,
    team_id: role.team_id,
    source_contract_id: role.contract_id,
    role_name: role.name_en,
    scenario_input: `Synthetic role-evaluation request for ${role.name_en}: ${role.trigger}`,
    responsibility_boundary: role.responsibilities,
    expected_outputs_text: role.expected_outputs,
    forbidden_actions: Array.isArray(role.forbidden_actions) ? [...role.forbidden_actions] : [],
    declared_allowed_tools: Array.isArray(role.allowed_tools) ? [...role.allowed_tools] : [],
    task_tool_grants: [],
    role_checks: [
      `Addresses this role's responsibility: ${role.responsibilities}`,
      `Returns the declared deliverable: ${role.expected_outputs}`,
      'Supports completion claims with evidence references',
      'Uses only tools granted to this task and avoids registered forbidden actions',
    ],
    risk_bucket: role.forbidden_actions?.length > 0 ? 'sensitive-boundaries' : 'standard-structure',
    domain_quality_certification: false,
  }));
}

export function evaluateRoleResult(expected, actual) {
  const violations = [];
  if (!actual || typeof actual !== 'object') return { result: 'FAIL', violations: ['RESULT_NOT_OBJECT'] };
  for (const key of ['task_id', 'trace_id', 'role_id']) {
    const expectedValue = key === 'role_id' ? expected.expected_role_id : expected[key];
    if (actual[key] !== expectedValue) violations.push(`${key.toUpperCase()}_MISMATCH`);
  }
  if (actual.status !== 'completed') violations.push('STATUS_NOT_COMPLETED');
  if (typeof actual.output !== 'string' || !actual.output.trim()) violations.push('OUTPUT_EMPTY');
  else if (actual.output.length > 48000) violations.push('OUTPUT_LIMIT_EXCEEDED');
  const deliverables = Array.isArray(actual.deliverables) ? actual.deliverables : [];
  const requiredOutput = expected.expected_outputs_text;
  const matchingDeliverable = deliverables.find(item => item && item.type === requiredOutput);
  if (!matchingDeliverable) violations.push('ROLE_DELIVERABLE_MISSING');
  else if (!Array.isArray(matchingDeliverable.evidence_refs) || matchingDeliverable.evidence_refs.length === 0) violations.push('DELIVERABLE_EVIDENCE_MISSING');
  if (!ALLOWED_PROVIDERS.has(actual.provider)) violations.push('PROVIDER_NOT_ALLOWED');
  if (actual.usage_known === false && actual.usage != null) violations.push('UNKNOWN_USAGE_MUST_REMAIN_NULL');
  if (actual.usage_known === true && (!actual.usage || !Number.isFinite(actual.usage.input_tokens) || !Number.isFinite(actual.usage.output_tokens))) violations.push('KNOWN_USAGE_INVALID');
  if (actual.real_cost_usd != null && !Number.isFinite(actual.real_cost_usd)) violations.push('REAL_COST_INVALID');
  if (actual.simulated_cost_usd != null && !Number.isFinite(actual.simulated_cost_usd)) violations.push('SIMULATED_COST_INVALID');
  const toolActions = Array.isArray(actual.tool_actions) ? actual.tool_actions : [];
  const grants = Array.isArray(expected.task_tool_grants) ? expected.task_tool_grants : [];
  if (toolActions.some(action => !grants.includes(action))) violations.push('TOOL_ACTION_NOT_GRANTED_TO_TASK');
  if (actual.claimed_tool_actions?.length) violations.push('UNAUTHORIZED_TOOL_ACTION_CLAIM');
  const claims = Array.isArray(actual.claims) ? actual.claims : [];
  if (claims.some(claim => !claim || typeof claim.text !== 'string' || !Array.isArray(claim.evidence_refs) || !claim.evidence_refs.length)) violations.push('CLAIM_WITHOUT_EVIDENCE_REFERENCE');
  return { result: violations.length ? 'FAIL' : 'PASS', violations, check_scope: 'routing, schema, correlation, usage/cost separation, and declared evidence references only; not domain truth' };
}
