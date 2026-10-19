const SENSITIVE_ACTIONS = Object.freeze(['spend', 'purchase', 'publish', 'deploy', 'external_message', 'production_data', 'permission_change', 'irreversible_change']);
const LOCAL_TASK_TOOLS = Object.freeze(['project.read', 'artifact.write']);

export function compileRoleCapabilityRegistry(registry) {
  if (!registry || registry.role_count !== 85 || !Array.isArray(registry.roles) || registry.roles.length !== 85) throw new Error('CANONICAL_ROLE_REGISTRY_MUST_HAVE_85_ROLES');
  const seen = new Set();
  const roles = registry.roles.map(role => {
    if (!role.role_id || seen.has(role.role_id)) throw new Error('INVALID_OR_DUPLICATE_ROLE_ID');
    seen.add(role.role_id);
    return {
      role_id: role.role_id,
      contract_id: role.contract_id,
      team_id: role.team_id,
      task_domain_tag: `team:${role.team_id}`,
      input_policy: { kind: 'text', max_chars: 12000, untrusted_user_content: true, personal_data_allowed: false },
      output_policy: { formats: ['text/markdown', 'application/json'], max_chars: 48000, provenance_required: true },
      default_tool_grants: [],
      task_scoped_tools: [...LOCAL_TASK_TOOLS],
      sensitive_actions_always_require_owner: [...SENSITIVE_ACTIONS],
      registry_tool_authority: 'none-by-default',
      registry_forbidden_actions: Array.isArray(role.forbidden_actions) ? [...role.forbidden_actions] : [],
    };
  });
  return { schema_version: 'role-capability-registry.v1', source_registry: 'roles/role_registry.json', role_count: roles.length, policy: 'deny-by-default; tools require explicit task packet scope; sensitive actions remain owner-only', roles };
}

export function getRoleCapability(capabilityRegistry, roleId) {
  const role = capabilityRegistry?.roles?.find(item => item.role_id === roleId);
  if (!role) throw new Error('ROLE_NOT_IN_CAPABILITY_REGISTRY');
  return role;
}

export function authorizeTaskTools({ capability, requestedGrants = [], approvedGrants = [] }) {
  if (!capability || !Array.isArray(requestedGrants) || !Array.isArray(approvedGrants)) throw new Error('INVALID_TASK_TOOL_PACKET');
  const requested = [...new Set(requestedGrants)];
  const approved = new Set(approvedGrants);
  const denied = requested.filter(tool => !capability.task_scoped_tools.includes(tool) || !approved.has(tool));
  if (denied.length) throw new Error(`TASK_TOOL_GRANT_DENIED:${denied.join(',')}`);
  return { role_id: capability.role_id, grants: requested, authority_source: 'explicit-task-packet', sensitive_actions: 'owner-approval-required' };
}

export function assertNoSensitiveToolGrant(toolName) {
  const normalized = String(toolName).toLowerCase();
  if (SENSITIVE_ACTIONS.some(action => normalized.includes(action))) throw new Error('SENSITIVE_ACTION_REQUIRES_OWNER_APPROVAL');
}
