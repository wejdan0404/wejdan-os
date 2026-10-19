import { createHash } from 'node:crypto';
import { mkdir, lstat, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

const MAX_READ_BYTES = 256_000;
const MAX_ARTIFACT_BYTES = 256_000;
const FORBIDDEN_SEGMENTS = new Set(['.git', '.codex', 'node_modules', 'credentials', 'secrets']);

export function safeRelativePath(value) {
  if (typeof value !== 'string' || !value || value.length > 240 || value.includes('\0') || isAbsolute(value) || /^[a-zA-Z]:/.test(value)) throw new Error('INVALID_PROJECT_RELATIVE_PATH');
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[<>:"|?*]/.test(part) || /[. ]$/.test(part) || FORBIDDEN_SEGMENTS.has(part.toLowerCase()) || /^\.env($|\.)/i.test(part) || /(secret|credential|token|password)/i.test(part) || /\.(pem|key|p12|pfx)$/i.test(part))) throw new Error('INVALID_PROJECT_RELATIVE_PATH');
  if (parts.some(part => /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(part))) throw new Error('INVALID_PROJECT_RELATIVE_PATH');
  return parts;
}

function contained(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

async function assertNoSymlinkPath(root, parts, includeLeaf = true) {
  let cursor = root;
  const limit = includeLeaf ? parts.length : Math.max(0, parts.length - 1);
  for (let index = 0; index < limit; index++) {
    cursor = join(cursor, parts[index]);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink()) throw new Error('SYMLINK_PATH_DENIED');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function canonicalRoot(projectRoot) {
  const root = await realpath(resolve(projectRoot));
  const info = await lstat(root);
  if (!info.isDirectory()) throw new Error('PROJECT_ROOT_NOT_DIRECTORY');
  return root;
}

export function createScopedProjectTools({ projectRoot, taskId, traceId, roleId, allowedReadPaths = [], writeEnabled = false, provider = 'unknown', model = null } = {}) {
  if (!/^task_[a-zA-Z0-9_-]{1,96}$/.test(taskId || '') || !/^trace_[a-zA-Z0-9_-]{1,96}$/.test(traceId || '') || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(roleId || '')) throw new Error('INVALID_TOOL_PROVENANCE');
  if (!Array.isArray(allowedReadPaths)) throw new Error('INVALID_READ_ALLOWLIST');
  const readAllowlist = new Set(allowedReadPaths.map(path => safeRelativePath(path).join('/')));

  async function readProjectFile(relativePath) {
    const parts = safeRelativePath(relativePath);
    const normalized = parts.join('/');
    if (!readAllowlist.has(normalized)) throw new Error('PROJECT_READ_NOT_ALLOWLISTED');
    const root = await canonicalRoot(projectRoot);
    await assertNoSymlinkPath(root, parts);
    const candidate = resolve(root, ...parts);
    if (!contained(root, candidate)) throw new Error('PROJECT_PATH_ESCAPE_DENIED');
    const info = await lstat(candidate);
    if (!info.isFile() || info.size > MAX_READ_BYTES) throw new Error('PROJECT_READ_SIZE_OR_TYPE_DENIED');
    const actual = await realpath(candidate);
    if (!contained(root, actual)) throw new Error('PROJECT_PATH_ESCAPE_DENIED');
    const content = await readFile(actual, 'utf8');
    return { content, relative_path: normalized, bytes: info.size, task_id: taskId, trace_id: traceId };
  }

  async function writeArtifact({ filename, content, artifactType = 'text/markdown' } = {}) {
    if (!writeEnabled) throw new Error('ARTIFACT_WRITE_NOT_GRANTED');
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_ARTIFACT_BYTES) throw new Error('ARTIFACT_CONTENT_LIMIT');
    if (!['text/markdown', 'application/json'].includes(artifactType)) throw new Error('ARTIFACT_TYPE_NOT_ALLOWED');
    const parts = safeRelativePath(filename);
    if (parts.length !== 1 || !/\.(md|json)$/i.test(parts[0])) throw new Error('ARTIFACT_FILENAME_NOT_ALLOWED');
    const root = await canonicalRoot(projectRoot);
    const artifactParts = ['ops', 'local-live', 'artifacts', taskId];
    await assertNoSymlinkPath(root, artifactParts, false);
    const outputDir = resolve(root, ...artifactParts);
    if (!contained(root, outputDir)) throw new Error('ARTIFACT_PATH_ESCAPE_DENIED');
    await mkdir(outputDir, { recursive: true });
    await assertNoSymlinkPath(root, artifactParts, true);
    const outputPath = resolve(outputDir, parts[0]);
    if (!contained(outputDir, outputPath)) throw new Error('ARTIFACT_PATH_ESCAPE_DENIED');
    const provenance = { schema_version: 'local-artifact-provenance.v1', task_id: taskId, trace_id: traceId, role_id: roleId, provider, model, artifact_type: artifactType, created_at: new Date().toISOString() };
    const safeMeta = value => String(value ?? 'unknown').replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 100);
    const serialized = artifactType === 'application/json'
      ? JSON.stringify({ schema_version: 'local-artifact.v1', provenance, content }, null, 2)
      : `<!-- Wejdan local artifact · task=${taskId} · trace=${traceId} · role=${roleId} · provider=${safeMeta(provider)} · model=${safeMeta(model)} -->\n\n${content}`;
    const bytes = Buffer.byteLength(serialized, 'utf8');
    if (bytes > MAX_ARTIFACT_BYTES) throw new Error('ARTIFACT_CONTENT_LIMIT');
    let handle;
    try { handle = await open(outputPath, 'wx'); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('ARTIFACT_ALREADY_EXISTS'); throw error; }
    try { await handle.writeFile(serialized, 'utf8'); await handle.sync(); }
    catch (error) { await handle.close(); throw error; }
    await handle.close();
    const finalInfo = await lstat(outputPath);
    if (!finalInfo.isFile() || finalInfo.isSymbolicLink()) throw new Error('ARTIFACT_FINAL_TYPE_INVALID');
    return { path: relative(root, outputPath).split(sep).join('/'), bytes, sha256: createHash('sha256').update(serialized).digest('hex'), provenance };
  }

  return Object.freeze({ readProjectFile, writeArtifact, policy: { project_root_only: true, read_allowlist: [...readAllowlist], artifact_directory: `ops/local-live/artifacts/${taskId}`, write_enabled: Boolean(writeEnabled), shell_tool: false, external_tools: false } });
}

export const __limits = { MAX_READ_BYTES, MAX_ARTIFACT_BYTES };
