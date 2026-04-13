import { Context, Next } from 'hono';
import type { Env } from '../index';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const WINDOW_MS = 15 * 60 * 1000;

const PATIENT_LIMITS: RateLimitConfig = {
  maxRequests: 100,
  windowMs: WINDOW_MS,
};

const ADMIN_LIMITS: RateLimitConfig = {
  maxRequests: 300,
  windowMs: WINDOW_MS,
};

function getClientIP(c: Context<{ Bindings: Env }>): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const ip = getClientIP(c);
  const key = `ratelimit:${ip}:${c.req.path}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const stored = await c.env.RATE_LIMIT.get(key);
  let requests: number[] = stored ? JSON.parse(stored) : [];

  requests = requests.filter((timestamp: number) => timestamp > windowStart);

  if (requests.length >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: requests[0] + config.windowMs,
    };
  }

  requests.push(now);

  await c.env.RATE_LIMIT.put(key, JSON.stringify(requests), {
    expirationTtl: Math.ceil(config.windowMs / 1000),
  });

  return {
    allowed: true,
    remaining: config.maxRequests - requests.length,
    resetAt: now + config.windowMs,
  };
}

export async function rateLimitPatient(c: Context<{ Bindings: Env }>, next: Next) {
  const result = await checkRateLimit(c, PATIENT_LIMITS);

  c.header('X-RateLimit-Limit', PATIENT_LIMITS.maxRequests.toString());
  c.header('X-RateLimit-Remaining', result.remaining.toString());
  c.header('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    c.header('Retry-After', retryAfter.toString());
    return c.json(
      { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
      429
    );
  }

  await next();
}

export async function rateLimitAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const result = await checkRateLimit(c, ADMIN_LIMITS);

  c.header('X-RateLimit-Limit', ADMIN_LIMITS.maxRequests.toString());
  c.header('X-RateLimit-Remaining', result.remaining.toString());
  c.header('X-RateLimit-Reset', result.resetAt.toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    c.header('Retry-After', retryAfter.toString());
    return c.json(
      { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
      429
    );
  }

  await next();
}
