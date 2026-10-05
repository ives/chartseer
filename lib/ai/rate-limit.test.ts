import { afterEach, describe, expect, it, vi } from "vitest";
import { DAILY_MESSAGES_PER_IP, DAILY_MESSAGES_TOTAL } from "@/lib/spec";
import { type LimitStore, checkDailyLimits, clientIp, hashIp, limitStore, memoryStore } from "./rate-limit";

function from(ip: string) {
  return new Request("http://localhost/api/chat", { method: "POST", headers: { "x-forwarded-for": ip } });
}

// Sends n messages from one address and returns the results.
async function send(store: LimitStore, ip: string, n: number) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(await checkDailyLimits(from(ip), store));
  return results;
}

describe("checkDailyLimits", () => {
  afterEach(() => vi.restoreAllMocks());

  it(`lets one address send ${DAILY_MESSAGES_PER_IP} messages a day, and no more`, async () => {
    const store = memoryStore();
    const results = await send(store, "203.0.113.7", DAILY_MESSAGES_PER_IP);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await checkDailyLimits(from("203.0.113.7"), store)).toEqual({ ok: false, code: "ip_daily_limit" });
    // Someone else is unaffected.
    expect(await checkDailyLimits(from("198.51.100.1"), store)).toEqual({ ok: true });
  });

  it(`stops everyone after ${DAILY_MESSAGES_TOTAL} messages in a day`, async () => {
    const store = memoryStore();
    // Spread across addresses, so no one reaches their own limit.
    for (let i = 0; i < DAILY_MESSAGES_TOTAL; i++) {
      expect(await checkDailyLimits(from(`10.0.${Math.floor(i / 10)}.${i % 10}`), store)).toEqual({ ok: true });
    }
    expect(await checkDailyLimits(from("192.0.2.1"), store)).toEqual({ ok: false, code: "daily_limit" });
  });

  it("checks the global cap before the visitor's, without using up either", async () => {
    const store = memoryStore();
    const peek = vi.spyOn(store, "peek").mockResolvedValue(0);
    const take = vi.spyOn(store, "take");
    expect(await checkDailyLimits(from("203.0.113.7"), store)).toEqual({ ok: false, code: "daily_limit" });
    expect(peek).toHaveBeenCalledWith("global", DAILY_MESSAGES_TOTAL);
    expect(take).not.toHaveBeenCalled();
  });

  it("doesn't let a blocked visitor use up everyone's messages", async () => {
    const store = memoryStore();
    await send(store, "203.0.113.7", DAILY_MESSAGES_PER_IP + 50);
    // Only the visitor's 30 allowed messages counted against the 500.
    expect(await store.peek("global", DAILY_MESSAGES_TOTAL)).toBe(DAILY_MESSAGES_TOTAL - DAILY_MESSAGES_PER_IP);
  });

  it("refuses when another request takes the last global message after the peek", async () => {
    const store = memoryStore();
    vi.spyOn(store, "peek").mockResolvedValue(1);
    const take = store.take.bind(store);
    vi.spyOn(store, "take").mockImplementation(async (key, limit) => (key === "global" ? false : take(key, limit)));
    expect(await checkDailyLimits(from("203.0.113.7"), store)).toEqual({ ok: false, code: "daily_limit" });
  });

  it("starts afresh at UTC midnight", async () => {
    let now = Date.UTC(2026, 9, 2, 23, 59);
    const store = memoryStore(() => now);
    await send(store, "203.0.113.7", DAILY_MESSAGES_PER_IP);
    expect((await checkDailyLimits(from("203.0.113.7"), store)).ok).toBe(false);
    now += 2 * 60 * 1000;
    expect((await checkDailyLimits(from("203.0.113.7"), store)).ok).toBe(true);
  });

  it("refuses when the store fails or doesn't answer, rather than letting requests through", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing: LimitStore = { peek: () => Promise.reject(new Error("down")), take: () => Promise.reject(new Error("down")) };
    expect(await checkDailyLimits(from("203.0.113.7"), failing)).toEqual({ ok: false, code: "daily_limit" });
    const silent: LimitStore = { peek: () => new Promise(() => {}), take: () => new Promise(() => {}) };
    expect(await checkDailyLimits(from("203.0.113.7"), silent, 10)).toEqual({ ok: false, code: "daily_limit" });
  });

  it("keys visitors by a hash of their address, never the address itself", async () => {
    const store = memoryStore();
    const take = vi.spyOn(store, "take");
    await checkDailyLimits(from("203.0.113.7"), store);
    const key = take.mock.calls[0]?.[0];
    expect(key).toBe(`ip:${await hashIp("203.0.113.7")}`);
    expect(key).not.toContain("203.0.113.7");
    expect(key).toMatch(/^ip:[0-9a-f]{64}$/);
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

  it("takes the client, the first address in x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to one shared key", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
    expect(clientIp(request({}))).toBe("unknown");
  });
});

describe("limitStore", () => {
  it("has no store in production without Upstash settings, so the chat stays off", () => {
    expect(limitStore({ NODE_ENV: "production" })).toBeNull();
  });

  it("counts in memory in development without Upstash settings", () => {
    expect(limitStore({ NODE_ENV: "development" })).not.toBeNull();
  });

  it("uses Upstash when either naming of its settings is present", () => {
    for (const env of [
      { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" },
      { NODE_ENV: "production", KV_REST_API_URL: "https://example.upstash.io", KV_REST_API_TOKEN: "t" },
    ]) {
      expect(limitStore(env)).not.toBeNull();
    }
  });
});
