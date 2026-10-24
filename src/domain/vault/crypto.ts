/**
 * On-device crypto for the app lock (Web Crypto only — nothing here touches the network).
 *
 * Envelope: one random 256-bit DATA KEY encrypts every record. The data key is stored wrapped twice
 * (AES-GCM) — once under a key derived from the password, once under a key derived from the recovery
 * code — each with its own random salt (PBKDF2-HMAC-SHA256, kKdfIterations). So changing the password
 * re-wraps 32 bytes and never re-encrypts the data. The password, the recovery code and the data key
 * are never stored; in memory the data key is a NON-EXTRACTABLE CryptoKey.
 *
 * Nothing in this module logs.
 */
export const kKdfIterations = 310_000;
const KDF = 'PBKDF2-SHA256';
const enc = new TextEncoder();
const dec = new TextDecoder();
const VERIFIER_TEXT = 'wejdan-vault-ok';

/** Unambiguous alphabet (no 0/O/1/I): 32 symbols → 5 bits each, 16 symbols = 80 bits. */
export const kRecoveryAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const kRecoveryLength = 16;

export class BadSecretError extends Error {
  constructor() {
    super('bad-secret');
  }
}
export class TamperError extends Error {
  constructor() {
    super('tampered-or-wrong-key');
  }
}

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Web Crypto unavailable');
  return s;
};

export function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}
export function toB64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
// Web Crypto wants BufferSource; Uint8Array<ArrayBufferLike> needs this narrowing under TS 5.7+.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

export interface WrappedKey {
  salt: string;
  iv: string;
  wrapped: string;
}
export interface KeyEnvelope {
  v: 1;
  kdf: typeof KDF;
  iterations: number;
  pw: WrappedKey;
  rc: WrappedKey;
  /** The known token encrypted with the data key — a second, independent check after unwrapping. */
  verifier: { iv: string; ct: string };
}

export function newRecoveryCode(): string {
  let out = '';
  while (out.length < kRecoveryLength) {
    for (const b of randomBytes(32)) {
      out += kRecoveryAlphabet[b & 31]; // 256 % 32 === 0 → no modulo bias
      if (out.length === kRecoveryLength) break;
    }
  }
  return out;
}
/** `K7QM4WXD9PTR2HVC` → `K7QM 4WXD 9PTR 2HVC`. */
export const formatRecoveryCode = (c: string): string => c.replace(/(.{4})(?=.)/g, '$1 ');
/** Accepts spaces/dashes/lowercase; returns the 16-symbol code or null. */
export function normalizeRecoveryCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, '');
  return c.length === kRecoveryLength && [...c].every((ch) => kRecoveryAlphabet.includes(ch)) ? c : null;
}

async function deriveWrapKey(secret: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', enc.encode(secret.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bs(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

async function wrapWith(secret: string, dataKey: CryptoKey, iterations: number): Promise<WrappedKey> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wk = await deriveWrapKey(secret, salt, iterations);
  const wrapped = await subtle().wrapKey('raw', dataKey, wk, { name: 'AES-GCM', iv: bs(iv) });
  return { salt: toB64(salt), iv: toB64(iv), wrapped: toB64(new Uint8Array(wrapped)) };
}

async function unwrapWith(secret: string, w: WrappedKey, iterations: number, extractable: boolean): Promise<CryptoKey> {
  const wk = await deriveWrapKey(secret, fromB64(w.salt), iterations);
  try {
    return await subtle().unwrapKey(
      'raw', bs(fromB64(w.wrapped)), wk, { name: 'AES-GCM', iv: bs(fromB64(w.iv)) },
      { name: 'AES-GCM' }, extractable, ['encrypt', 'decrypt'],
    );
  } catch {
    throw new BadSecretError();
  }
}

async function makeVerifier(key: CryptoKey): Promise<KeyEnvelope['verifier']> {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: bs(iv), additionalData: bs(enc.encode('verifier')) }, key, enc.encode(VERIFIER_TEXT));
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}
async function checkVerifier(key: CryptoKey, v: KeyEnvelope['verifier']): Promise<boolean> {
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: bs(fromB64(v.iv)), additionalData: bs(enc.encode('verifier')) }, key, bs(fromB64(v.ct)));
    return dec.decode(pt) === VERIFIER_TEXT;
  } catch {
    return false;
  }
}

function validEnvelope(e: unknown): e is KeyEnvelope {
  const x = e as KeyEnvelope | null;
  const w = (k: WrappedKey | undefined) => !!k && typeof k.salt === 'string' && typeof k.iv === 'string' && typeof k.wrapped === 'string';
  return !!x && x.v === 1 && x.kdf === KDF && Number.isInteger(x.iterations) && x.iterations >= 1000 && w(x.pw) && w(x.rc) && !!x.verifier && typeof x.verifier.ct === 'string';
}

export interface CreatedVault {
  envelope: KeyEnvelope;
  /** Non-extractable, memory only. */
  key: CryptoKey;
  recoveryCode: string;
}

/** New data key wrapped under [password] and a fresh recovery code. */
export async function createEnvelope(password: string, iterations = kKdfIterations): Promise<CreatedVault> {
  const dataKey = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const recoveryCode = newRecoveryCode();
  const pw = await wrapWith(password, dataKey, iterations);
  const rc = await wrapWith(recoveryCode, dataKey, iterations);
  const envelope: KeyEnvelope = { v: 1, kdf: KDF, iterations, pw, rc, verifier: await makeVerifier(dataKey) };
  const key = await unwrapWith(password, pw, iterations, false);
  return { envelope, key, recoveryCode };
}

async function open(env: KeyEnvelope, secret: string, which: 'pw' | 'rc', extractable: boolean): Promise<CryptoKey> {
  if (!validEnvelope(env)) throw new TamperError();
  const key = await unwrapWith(secret, env[which], env.iterations, extractable);
  if (!(await checkVerifier(key, env.verifier))) throw new TamperError();
  return key;
}

/** Data key (non-extractable) or null for a wrong password / damaged envelope. */
export async function unlockWithPassword(env: KeyEnvelope, password: string): Promise<CryptoKey | null> {
  try {
    return await open(env, password, 'pw', false);
  } catch {
    return null;
  }
}
export async function unlockWithRecovery(env: KeyEnvelope, code: string): Promise<CryptoKey | null> {
  const c = normalizeRecoveryCode(code);
  if (!c) return null;
  try {
    return await open(env, c, 'rc', false);
  } catch {
    return null;
  }
}

/** Same data key, new password (data is NOT re-encrypted). Null if [current] is wrong. */
export async function changePasswordEnvelope(env: KeyEnvelope, current: string, next: string): Promise<KeyEnvelope | null> {
  try {
    const dk = await open(env, current, 'pw', true);
    return { ...env, pw: await wrapWith(next, dk, env.iterations) };
  } catch {
    return null;
  }
}
/** Same data key, brand-new recovery code (the old one stops working). Null if [password] is wrong. */
export async function rotateRecoveryEnvelope(env: KeyEnvelope, password: string): Promise<{ envelope: KeyEnvelope; recoveryCode: string } | null> {
  try {
    const dk = await open(env, password, 'pw', true);
    const recoveryCode = newRecoveryCode();
    return { envelope: { ...env, rc: await wrapWith(recoveryCode, dk, env.iterations) }, recoveryCode };
  } catch {
    return null;
  }
}
/** Forgot-password: recovery code → new password AND a new recovery code, same data key. */
export async function resetWithRecoveryEnvelope(
  env: KeyEnvelope, code: string, newPassword: string,
): Promise<{ envelope: KeyEnvelope; key: CryptoKey; recoveryCode: string } | null> {
  const c = normalizeRecoveryCode(code);
  if (!c) return null;
  try {
    const dk = await open(env, c, 'rc', true);
    const recoveryCode = newRecoveryCode();
    const envelope: KeyEnvelope = {
      ...env,
      pw: await wrapWith(newPassword, dk, env.iterations),
      rc: await wrapWith(recoveryCode, dk, env.iterations),
    };
    const key = await open(envelope, newPassword, 'pw', false);
    return { envelope, key, recoveryCode };
  } catch {
    return null;
  }
}

// ---- record encryption ----------------------------------------------------------------------

export interface SealedValue {
  e: 1;
  iv: string;
  ct: string;
}
export const isSealed = (v: unknown): v is SealedValue =>
  !!v && typeof v === 'object' && (v as SealedValue).e === 1 && typeof (v as SealedValue).iv === 'string' && typeof (v as SealedValue).ct === 'string';

/** AES-GCM, fresh random IV; the row address (box + id) is authenticated so rows can't be swapped. */
export async function sealValue(key: CryptoKey, aad: string, value: unknown): Promise<SealedValue> {
  const iv = randomBytes(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: bs(iv), additionalData: bs(enc.encode(aad)) }, key, enc.encode(JSON.stringify(value)));
  return { e: 1, iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}
export async function openValue(key: CryptoKey, aad: string, sealed: unknown): Promise<Record<string, unknown>> {
  if (!isSealed(sealed)) throw new TamperError();
  try {
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: bs(fromB64(sealed.iv)), additionalData: bs(enc.encode(aad)) }, key, bs(fromB64(sealed.ct)));
    return JSON.parse(dec.decode(pt)) as Record<string, unknown>;
  } catch {
    throw new TamperError();
  }
}

// ---- encrypted export file ------------------------------------------------------------------

export interface EncryptedBackupFile {
  format: 'wejdan-encrypted-backup';
  v: 1;
  kdf: typeof KDF;
  iterations: number;
  salt: string;
  iv: string;
  ct: string;
}
export const isEncryptedBackup = (x: unknown): x is EncryptedBackupFile =>
  !!x && typeof x === 'object' && (x as EncryptedBackupFile).format === 'wejdan-encrypted-backup';

async function fileKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: bs(salt), iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptBackup(data: unknown, password: string, iterations = kKdfIterations): Promise<EncryptedBackupFile> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await fileKey(password, salt, iterations);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: bs(iv), additionalData: bs(enc.encode('wejdan-encrypted-backup/1')) }, key, enc.encode(JSON.stringify(data)));
  return { format: 'wejdan-encrypted-backup', v: 1, kdf: KDF, iterations, salt: toB64(salt), iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}
/** Throws BadSecretError for a wrong password or a modified file. */
export async function decryptBackup(file: EncryptedBackupFile, password: string): Promise<unknown> {
  try {
    if (file.v !== 1 || file.kdf !== KDF || !Number.isInteger(file.iterations) || file.iterations < 1000) throw new BadSecretError();
    const key = await fileKey(password, fromB64(file.salt), file.iterations);
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: bs(fromB64(file.iv)), additionalData: bs(enc.encode('wejdan-encrypted-backup/1')) }, key, bs(fromB64(file.ct)));
    return JSON.parse(dec.decode(pt));
  } catch {
    throw new BadSecretError();
  }
}
