export const AUTH_COOKIE = 'rivian_auth';
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || process.env.DASHBOARD_PASSWORD || '';
}

async function hmac(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return base64Url(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function authCookieMaxAge() {
  return AUTH_MAX_AGE_SECONDS;
}

export function authSecretConfigured() {
  return getAuthSecret().length > 0;
}

export async function createAuthToken(now = Date.now()) {
  const secret = getAuthSecret();
  if (!secret) throw new Error('AUTH_SECRET or DASHBOARD_PASSWORD is required');
  const expiresAt = now + AUTH_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyAuthToken(token?: string | null, now = Date.now()) {
  const secret = getAuthSecret();
  if (!secret || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await hmac(payload, secret);
  return constantTimeEqual(expected, parts[2]);
}
