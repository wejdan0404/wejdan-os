import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { makeScenario } from './run-role-acceptance.mjs';

const registry = JSON.parse(await readFile(resolve('roles/role_registry.json'), 'utf8'));
const role = id => registry.roles.find(item => item.role_id === id);
const cases = [
  ['PMO-QA', ['T-SYN-14', 'acceptance criteria are blank', 'reopen']],
  ['AI-QA', ['Synthetic AI behavior fixture', 'reproducible cases', 'AI-01']],
  ['QA-01', ['223/223 PASS', '16 primary/nested routes', 'NOT_RUN']],
  ['BE-QA', ['PASS 10/10', 'PASS 7/7', 'private-data export is prohibited']],
];
for (const [id, markers] of cases) {
  const prompt = makeScenario(role(id));
  assert(prompt.startsWith('SYNTHETIC LOCAL EVALUATION TASK'));
  for (const marker of markers) assert(prompt.includes(marker), `${id}: missing ${marker}`);
  assert(prompt.includes('Do not demand unavailable real-world evidence'));
  assert(prompt.includes('do not pass a draft that invents evidence'));
}
const unmodified = makeScenario(role('FE-03'));
assert(!unmodified.includes('T-SYN-14'));
console.log(JSON.stringify({ result: 'PASS', role_specific_contexts: cases.length, generic_role_prompt_unchanged: true, acceptance_criteria_changed: false }));
