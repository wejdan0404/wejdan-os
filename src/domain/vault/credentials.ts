/** Username / password rules and the strength hint (hints only — never a hard "weak" block beyond the length rule). */
export const kMinUsername = 3;
export const kMinPassword = 8;

const USERNAME_RE = /^[A-Za-z0-9._-]+$/;
export const normalizeUsername = (u: string): string => u.trim().toLowerCase();
export const isValidUsername = (u: string): boolean => {
  const n = u.trim();
  return n.length >= kMinUsername && n.length <= 32 && USERNAME_RE.test(n);
};
export const isValidPassword = (p: string): boolean => p.length >= kMinPassword;

/** 0 = empty, 1 = too short, 2 = ok, 3 = strong, 4 = very strong. Length matters most; a passphrase counts. */
export function passwordStrength(p: string): 0 | 1 | 2 | 3 | 4 {
  if (p.length === 0) return 0;
  if (p.length < kMinPassword) return 1;
  const classes = [/[a-z؀-ۿ]/, /[A-Z]/, /\d/, /[^A-Za-z0-9؀-ۿ\s]/].filter((r) => r.test(p)).length;
  const words = p.trim().split(/\s+/).filter((w) => w.length >= 2).length;
  if (new Set(p).size <= 3) return 1;
  if (p.length >= 16 || (words >= 3 && p.length >= 14) || (p.length >= 12 && classes >= 3)) return 4;
  if (p.length >= 12 || (p.length >= 10 && classes >= 3) || words >= 3) return 3;
  return 2;
}
