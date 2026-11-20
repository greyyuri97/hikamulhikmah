import "server-only";

/**
 * Small in-memory fixed-window limiter for the admin login.
 * On Vercel each warm serverless instance keeps its own map, so this is "best effort" — combined
 * with the per-attempt delay it turns a 4-digit PIN brute force from seconds into many hours.
 */
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  const e = buckets.get(key);
  if (!e || e.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  e.count++;
  return { allowed: e.count <= limit, remaining: Math.max(0, limit - e.count), retryAfter: Math.ceil((e.resetAt - now) / 1000) };
}

export function clear(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim();
}
