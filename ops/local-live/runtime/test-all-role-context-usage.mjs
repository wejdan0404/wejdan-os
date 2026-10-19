import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assembleRoleContext } from './role-context.mjs';

const root = process.cwd();
const registry = JSON.parse(await readFile(resolve(root, 'roles/role_registry.json'), 'utf8'));
const bindings = JSON.parse(await readFile(resolve(root, 'agents/registry.json'), 'utf8'));
const bindingById = new Map(bindings.roles.map(item => [item.role_id, item]));
const skillText = async path => readFile(resolve(root, path.replaceAll('\\', '/')), 'utf8');
const results = [];
for (const role of registry.roles) {
  const binding = bindingById.get(role.role_id);
  assert.ok(binding, `missing binding ${role.role_id}`);
  const card = await skillText(binding.role_card);
  const projectContext = await skillText(binding.shared_context_ref);
  const skills = await Promise.all((binding.skills || []).map(async path => ({ path, text: await skillText(path) })));
  const knowledge = await Promise.all((binding.knowledge_refs || []).filter(path => !path.endsWith('/README.md')).map(async path => ({ path, text: await skillText(path), reason: 'bound project knowledge' })));
  const packet = assembleRoleContext({ role, card, projectContext, knowledge, skills, memory: { agent: [], project: [] }, taskInput: `Produce the ${role.role_id} role deliverable using the assigned role skills.` });
  assert.ok(packet.systemPrompt.length <= 7900, `${role.role_id} exceeded prompt budget`);
  const includedSkills = packet.manifest.sources.filter(source => source.scope === 'role-skill' && source.status.startsWith('included'));
  assert.ok(includedSkills.length > 0, `${role.role_id} did not use any assigned skill`);
  assert.ok(includedSkills.some(source => (binding.skills || []).some(path => source.id === path)), `${role.role_id} used an unassigned skill`);
  assert.ok(packet.manifest.sources.some(source => source.scope === 'role' && source.status.startsWith('included')), `${role.role_id} did not use its role card`);
  assert.ok(packet.manifest.sources.every(source => source.sha256 && source.scope && source.reason), `${role.role_id} has incomplete provenance`);
  results.push({ role_id: role.role_id, assigned_skills: binding.skills.length, included_skills: includedSkills.length, prompt_chars: packet.systemPrompt.length });
}
assert.equal(results.length, 85);
console.log(JSON.stringify({ result: 'PASS', roles_tested: results.length, checks: ['role card used', 'at least one assigned skill used per role', 'prompt budget', 'source provenance'], sample: results.slice(0, 3) }));
