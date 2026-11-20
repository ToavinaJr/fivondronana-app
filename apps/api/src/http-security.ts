export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

export class RequestRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  private checks = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxTrackedKeys = 10_000,
  ) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      !Number.isFinite(windowMs) ||
      windowMs < 1 ||
      !Number.isInteger(maxTrackedKeys) ||
      maxTrackedKeys < 1
    ) {
      throw new Error('Rate limit settings must be positive values.');
    }
  }

  check(key: string): RateLimitDecision {
    const current = this.now();
    this.checks += 1;
    if (this.checks % 100 === 0) {
      for (const [candidate, timestamps] of this.attempts) {
        if (!timestamps.some((timestamp) => timestamp > current - this.windowMs)) this.attempts.delete(candidate);
      }
    }
    const valid = (this.attempts.get(key) ?? []).filter((timestamp) => timestamp > current - this.windowMs);
    if (valid.length >= this.limit) {
      this.attempts.set(key, valid);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((valid[0] + this.windowMs - current) / 1000)) };
    }
    valid.push(current);
    if (!this.attempts.has(key) && this.attempts.size >= this.maxTrackedKeys) {
      const oldest = this.attempts.keys().next().value;
      if (oldest !== undefined) this.attempts.delete(oldest);
    }
    this.attempts.set(key, valid);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const configured = (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origins = configured.length === 0 && env.NODE_ENV !== 'production' ? ['http://localhost:5173'] : configured;
  if (env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must be configured in production.');
  }
  if (origins.some((origin) => origin === '*')) {
    throw new Error('Wildcard CORS origins are not allowed.');
  }
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('CORS_ALLOWED_ORIGINS must contain valid origins only.');
    }
    if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('Production CORS origins must use HTTPS.');
    }
  }
  return origins;
}

export function getPositiveInteger(value: string | undefined, fallback: number, setting: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${setting} must be a positive integer.`);
  return parsed;
}
