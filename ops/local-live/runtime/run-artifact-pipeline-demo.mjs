import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { compileRoleCapabilityRegistry, getRoleCapability, authorizeTaskTools } from './role-capabilities.mjs';
import { createScopedProjectTools } from './scoped-artifact-tools.mjs';
import { createArtifactPipeline } from './artifact-pipeline.mjs';
import { inferOllamaLocal } from './ollama-local-inference.mjs';

const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const capabilityRegistry = compileRoleCapabilityRegistry(registry);
const taskId = `task_${randomUUID()}`;
const traceId = `trace_${randomUUID()}`;
const specialistRoleId = 'PMO-01';
const grants = authorizeTaskTools({ capability: getRoleCapability(capabilityRegistry, specialistRoleId), requestedGrants: ['artifact.write'], approvedGrants: ['artifact.write'] });
const tools = createScopedProjectTools({ projectRoot: process.cwd(), taskId, traceId, roleId: specialistRoleId, writeEnabled: grants.grants.includes('artifact.write'), provider: 'ollama-local', model: 'qwen3:8b' });
const run = createArtifactPipeline({ roles: registry.roles, infer: inferOllamaLocal, writeArtifact: tools.writeArtifact });
const result = await run({
  taskId,
  traceId,
  specialistRoleId,
  request: 'Synthetic delivery request: write a concise English implementation note about the current Codex adapter hardening work. Use only these supplied facts: the application Codex provider is disabled pending separate owner approval; tests use fake CLI subprocesses; Ollama remains the local default; no live Codex call, paid API call, or n8n run occurred in this delivery. Clearly state that the currently running API process still needs a restart to load changed source. Do not invent a release, external action, test count, or completed milestone. Include scope, verified facts, and next step.',
});
const artifactReadback = await createScopedProjectTools({ projectRoot: process.cwd(), taskId, traceId, roleId: specialistRoleId, allowedReadPaths: [result.artifact.path], provider: 'ollama-local', model: 'qwen3:8b' }).readProjectFile(result.artifact.path);
if (!artifactReadback.content.includes(taskId) || !artifactReadback.content.includes(traceId)) throw new Error('ARTIFACT_PROVENANCE_READBACK_FAILED');
const evidence = {
  schema_version: 'll12-ollama-artifact-demo.v1',
  verified_at: new Date().toISOString(),
  status: 'PREPARATORY_EVIDENCE_NOT_GATE_COMPLETE',
  task_id: taskId,
  trace_id: traceId,
  roles: { planner: result.planner, specialist: result.specialist, reviewer: result.reviewer },
  artifact: result.artifact,
  artifact_readback_bytes: artifactReadback.bytes,
  revision_count: result.revision_count,
  review: result.review,
  review_scope: result.review_scope,
  stages: result.stages,
  local_inference_calls: result.stages.length,
  input_tokens_reported: result.stages.reduce((sum, stage) => sum + (stage.usage?.input_tokens || 0), 0),
  output_tokens_reported: result.stages.reduce((sum, stage) => sum + (stage.usage?.output_tokens || 0), 0),
  real_cost_usd: null,
  simulated_cost_usd: null,
  provider_cost_status: 'local electricity unmeasured',
  live_codex_calls: 0,
  paid_api_calls: 0,
  n8n_runs: 0,
  limitation: 'This pipeline demo is not integrated with the persistent task database; LL09 runtime activation and LL10 remain incomplete. Same local model was invoked separately in planner/reviewer roles; this is not an independent model or human factual review.',
};
await writeFile(`ops/evidence/LL12_ollama_artifact_demo_${taskId}.json`, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ result: 'PASS', status: evidence.status, task_id: taskId, trace_id: traceId, roles: evidence.roles, artifact: result.artifact, stages: result.stages.length, revision_count: result.revision_count, local_inference_calls: evidence.local_inference_calls, paid_api_calls: 0, live_codex_calls: 0, n8n_runs: 0 }));
