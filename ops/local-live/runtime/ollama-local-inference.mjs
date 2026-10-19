const LOOPBACK_CHAT = 'http://127.0.0.1:11434/api/chat';
const APPROVED_MODEL = 'qwen3:8b';

export async function inferOllamaLocal({ prompt, role_id, stage, task_id, trace_id, signal } = {}) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 48000) throw new Error('INVALID_LOCAL_INFERENCE_PROMPT');
  if (typeof role_id !== 'string' || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(role_id)) throw new Error('INVALID_LOCAL_ROLE');
  const started = performance.now();
  const structured = ['planner', 'reviewer', 'final_review'].includes(stage);
  const response = await fetch(LOOPBACK_CHAT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: APPROVED_MODEL, stream: false, think: false, format: structured ? 'json' : undefined, messages: [{ role: 'user', content: prompt }], options: { temperature: 0.2, num_predict: 512 }, keep_alive: '5m' }),
    signal: signal || AbortSignal.timeout(180000),
  });
  if (!response.ok) throw new Error(`OLLAMA_LOCAL_HTTP_${response.status}`);
  const data = await response.json();
  if (data.model !== APPROVED_MODEL || typeof data.message?.content !== 'string' || !data.message.content.trim()) throw new Error('OLLAMA_LOCAL_INVALID_RESPONSE');
  const usage = Number.isFinite(data.prompt_eval_count) && Number.isFinite(data.eval_count) ? { input_tokens: data.prompt_eval_count, output_tokens: data.eval_count } : null;
  return { output: data.message.content.trim(), provider: 'ollama-local', model: data.model, elapsed_ms: Math.round(performance.now() - started), usage, task_id, trace_id, stage };
}
