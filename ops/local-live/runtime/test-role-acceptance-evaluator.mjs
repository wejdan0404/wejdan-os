import assert from 'node:assert/strict';
import { artifactFilename, evaluateSpecialist, reviewerForRole } from './run-role-acceptance.mjs';
import { safeRelativePath } from './scoped-artifact-tools.mjs';

const taskId = 'task_synthetic_evaluator';
const traceId = 'trace_synthetic_evaluator';
const executionIds = ['101', '102'];
const role = {
  role_id: 'D-00',
  expected_outputs: 'Initiative brief, dependency overview, weekly evidence-based status, escalate spend legal public-release decisions to Wejdan.',
};
const request = 'Create an initiative brief for a one-week planning exercise. Unknown staffing and budget must remain pending.';
const makeOutput = ({ duration = 'one-week', staff = 'Product lead: owner pending assignment.' } = {}) => `# Initiative Brief (Draft - Pending Wejdan Sign-Off)

## Dependency Overview
- Product lead: ${staff}
- Dependencies and owners are unknown pending confirmation.

## Involved Team Leads
- ${staff}

## Weekly Evidence-Based Status
- No execution evidence was supplied; status is not started.

## Escalation
- Escalate spend, legal, and public-release decisions to Wejdan.
- Schedule: ${duration} planning window as specified by the requester.

## Evidence and assumptions
- No evidence supplied.

## Boundaries and unknowns
- Staffing and budget remain unknown.
`;
const makeResult = output => ({
  task_id: taskId,
  trace_id: traceId,
  role_id: role.role_id,
  provider: 'ollama-local',
  model: 'qwen3:8b',
  status: 'completed',
  output,
  steps: [
    { task_id: taskId, trace_id: traceId, role_id: 'D-00', n8n_execution_id: executionIds[0] },
    { task_id: taskId, trace_id: traceId, role_id: 'QA-01', n8n_execution_id: executionIds[1] },
  ],
});
const makeStoredSteps = () => [
  { task_id: taskId, trace_id: traceId, role_id: 'D-00', step_type: 'producer', status: 'completed', n8n_execution_id: executionIds[0] },
  { task_id: taskId, trace_id: traceId, role_id: 'QA-01', step_type: 'reviewer', status: 'completed', n8n_execution_id: executionIds[1] },
];

const valid = evaluateSpecialist(role, makeResult(makeOutput()), makeStoredSteps(), request);
assert.equal(valid.status, 'PASS', JSON.stringify(valid.failures));

const genericRoleStaffing = evaluateSpecialist(role, makeResult(makeOutput({ staff: 'Testing Lead: owner pending assignment.' })), makeStoredSteps(), request);
assert.equal(genericRoleStaffing.status, 'PASS', JSON.stringify(genericRoleStaffing.failures));

const inventedDuration = evaluateSpecialist(role, makeResult(makeOutput({ duration: 'four-week' })), makeStoredSteps(), request);
assert.ok(inventedDuration.failures.includes('UNSUPPORTED_SCHEDULE_ESTIMATE'));

const inventedStaff = evaluateSpecialist(role, makeResult(makeOutput({ staff: 'Jane Doe, Engineering lead.' })), makeStoredSteps(), request);
assert.ok(inventedStaff.failures.includes('UNSUPPORTED_NAMED_STAFFING'));

console.log(JSON.stringify({ result: 'PASS', checks: ['valid bounded Program Director draft accepted', 'generic role labels allowed without implying named staff', 'unsupported four-week estimate rejected against one-week request', 'invented named staffing rejected'], cases: 4 }));

const secretsFilename = artifactFilename({ role_id: 'SEC-07', name_en: 'Secrets/Supply Chain Engineer' });
assert.equal(secretsFilename, 'sec-07-security-supply-chain-engineer-acceptance.md');
assert.deepEqual(safeRelativePath(secretsFilename), [secretsFilename]);
console.log(JSON.stringify({ result: 'PASS', check: 'sensitive role name generates a safe artifact filename', filename: secretsFilename }));
assert.equal(reviewerForRole('QA-01'), 'QA-02');
assert.equal(reviewerForRole('QA-02'), 'QA-01');
console.log(JSON.stringify({ result: 'PASS', check: 'QA-01 is reviewed by distinct QA-02; other roles retain QA-01 reviewer' }));
