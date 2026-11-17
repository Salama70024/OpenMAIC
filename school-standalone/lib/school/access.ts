import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SCHOOL_COOKIE = 'firdaws_school_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function configuredSecrets() {
  const code = process.env.SCHOOL_ACCESS_CODE;
  const secret = process.env.SCHOOL_AUTH_SECRET;
  return code && code.length >= 10 && secret && secret.length >= 32 ? { code, secret } : null;
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signature(expiry: number, code: string, secret: string) {
  const codeDigest = createHash('sha256').update(code).digest('hex');
  return createHmac('sha256', secret).update(`v1:${expiry}:${codeDigest}`).digest('base64url');
}

export function checkSchoolCode(candidate: unknown): boolean {
  const secrets = configuredSecrets();
  return !!secrets && typeof candidate === 'string' && candidate.length <= 128 && equal(candidate, secrets.code);
}

export function createSchoolSession() {
  const secrets = configuredSecrets();
  if (!secrets) throw new Error('School protection has not been configured.');
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return { value: `v1.${expiry}.${signature(expiry, secrets.code, secrets.secret)}`, maxAge: SESSION_SECONDS };
}

export function verifySchoolSession(cookie: string | undefined): boolean {
  const secrets = configuredSecrets();
  if (!secrets || !cookie || cookie.length > 256) return false;
  const match = /^v1\.(\d{10})\.([a-zA-Z0-9_-]{43})$/.exec(cookie);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry < Math.floor(Date.now() / 1000) || expiry > Math.floor(Date.now() / 1000) + SESSION_SECONDS) return false;
  return equal(match[2], signature(expiry, secrets.code, secrets.secret));
}
