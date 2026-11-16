import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const passwordBytes = 64;
const tokenLifetimeSeconds = 15 * 60;

export type AccessClaims = { sub: string; sid: string; iat: number; exp: number };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derived = await derivePassword(password, salt, passwordBytes);
  return `scrypt$16384$${salt}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, cost, salt, expectedText] = encoded.split('$');
  if (algorithm !== 'scrypt' || cost !== '16384' || !salt || !expectedText) return false;
  try {
    const expected = Buffer.from(expectedText, 'base64url');
    const actual = await derivePassword(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function issueAccessToken(subject: string, sessionId: string, secret: string, now = Date.now()): { token: string; expiresIn: number; expiresAt: Date } {
  const issuedAt = Math.floor(now / 1000);
  const expiresAtSeconds = issuedAt + tokenLifetimeSeconds;
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({ sub: subject, sid: sessionId, iat: issuedAt, exp: expiresAtSeconds });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return { token: `${unsigned}.${signature}`, expiresIn: tokenLifetimeSeconds, expiresAt: new Date(expiresAtSeconds * 1000) };
}

export function verifyAccessToken(token: string, secret: string, now = Date.now()): AccessClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid access token.');
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  const header = decodeJson<{ alg?: string; typ?: string }>(headerPart);
  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Unsupported access token.');
  const expected = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest();
  const actual = Buffer.from(signaturePart, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid access token signature.');
  const claims = decodeJson<Partial<AccessClaims>>(payloadPart);
  const nowSeconds = Math.floor(now / 1000);
  if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string' || typeof claims.exp !== 'number' || claims.exp <= nowSeconds) {
    throw new Error('Expired or invalid access token.');
  }
  return claims as AccessClaims;
}

export function validateJwtSecret(secret: string | undefined): string {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('JWT_SECRET must contain at least 32 characters before starting the API.');
  return secret;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

function derivePassword(password: string, salt: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}
