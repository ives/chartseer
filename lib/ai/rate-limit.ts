import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { DAILY_MESSAGES_PER_IP, DAILY_MESSAGES_TOTAL } from "@/lib/spec";

// Daily message counts for the public demo (D-061). A store counts messages
// per key per UTC day: `peek` says how many are left without using one, and
// `take` uses one if any are left.
export type LimitStore = {
  peek(key: string, limit: number): Promise<number>;
  take(key: string, limit: number): Promise<boolean>;
};

export type DailyLimitResult = { ok: true } | { ok: false; code: "daily_limit" | "ip_daily_limit" };

const DAY_MS = 24 * 60 * 60 * 1000;
const STORE_TIMEOUT_MS = 1000;

// The global cap is checked first, but only peeked at: a visitor already over
// their own limit mustn't use up everyone's. A store that fails or is slow
// refuses the request, so a broken limiter can't mean an unlimited bill.
export async function checkDailyLimits(
  request: Request,
  store: LimitStore,
  timeoutMs = STORE_TIMEOUT_MS,
): Promise<DailyLimitResult> {
  try {
    return await withTimeout(gate(request, store), timeoutMs);
  } catch (error) {
    console.error("[rate-limit] refusing: the store failed", error instanceof Error ? error.message : error);
    return { ok: false, code: "daily_limit" };
  }
}

async function gate(request: Request, store: LimitStore): Promise<DailyLimitResult> {
  if ((await store.peek("global", DAILY_MESSAGES_TOTAL)) <= 0) return { ok: false, code: "daily_limit" };
  const visitor = `ip:${await hashIp(clientIp(request))}`;
  if (!(await store.take(visitor, DAILY_MESSAGES_PER_IP))) return { ok: false, code: "ip_daily_limit" };
  // Another request may have taken the last one since the peek.
  if (!(await store.take("global", DAILY_MESSAGES_TOTAL))) return { ok: false, code: "daily_limit" };
  return { ok: true };
}

// Vercel puts the client first in x-forwarded-for.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

// Redis never holds a raw address. An unsalted hash of an IPv4 address can be
// reversed by brute force, so this is pseudonymous, and keys expire daily.
export async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Counts in memory, per UTC day. For tests, and for local development without
// Upstash settings.
export function memoryStore(now: () => number = Date.now): LimitStore {
  const counts = new Map<string, number>();
  const slot = (key: string) => `${key}@${Math.floor(now() / DAY_MS)}`;
  return {
    async peek(key, limit) {
      return Math.max(0, limit - (counts.get(slot(key)) ?? 0));
    },
    async take(key, limit) {
      const used = counts.get(slot(key)) ?? 0;
      if (used >= limit) return false;
      counts.set(slot(key), used + 1);
      return true;
    },
  };
}

// Upstash fixed windows of one day, which start at UTC midnight. Upstash's
// own timeout lets requests through, so it is off; checkDailyLimits applies a
// timeout that refuses instead.
function upstashStore(redis: Redis): LimitStore {
  const limiters = new Map<number, Ratelimit>();
  const limiter = (limit: number) => {
    let found = limiters.get(limit);
    if (!found) {
      found = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(limit, "1 d"), prefix: `chartseer:daily:${limit}`, timeout: 0 });
      limiters.set(limit, found);
    }
    return found;
  };
  return {
    async peek(key, limit) {
      return (await limiter(limit).getRemaining(key)).remaining;
    },
    async take(key, limit) {
      return (await limiter(limit).limit(key)).success;
    },
  };
}

let devStore: LimitStore | null = null;

// Upstash when it is configured. Without it, development counts in memory and
// production has no store, so the route refuses to run without limits.
export function limitStore(env: Record<string, string | undefined> = process.env): LimitStore | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (url && token) return upstashStore(new Redis({ url, token }));
  if (env.NODE_ENV === "production") return null;
  devStore ??= memoryStore();
  return devStore;
}
