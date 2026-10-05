import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LimitStore, hashIp, memoryStore } from "@/lib/ai/rate-limit";
import { DAILY_MESSAGES_PER_IP, gelatoSummary } from "@/lib/spec";

// No Redis and no model: the store is in memory, and the model must never be reached.
const mocks = vi.hoisted(() => ({ store: null as LimitStore | null, streamChart: vi.fn() }));

vi.mock("@/lib/ai/rate-limit", async (original) => ({
  ...(await original<typeof import("@/lib/ai/rate-limit")>()),
  limitStore: () => mocks.store,
}));
vi.mock("@/lib/ai/chat", async (original) => ({
  ...(await original<typeof import("@/lib/ai/chat")>()),
  streamChart: mocks.streamChart,
}));

const { POST } = await import("./route");

const body = {
  messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Scoops by shop" }] }],
  dataset: gelatoSummary,
  currentSpec: null,
};

function post(payload: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.7" },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.stubEnv("CHARTSEER_CHAT_ENABLED", "true");
    mocks.store = memoryStore();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    mocks.streamChart.mockReset();
  });

  it("is off unless switched on, before touching the store or the model", async () => {
    vi.stubEnv("CHARTSEER_CHAT_ENABLED", "");
    const take = vi.spyOn(mocks.store as LimitStore, "take");
    const response = await post(body);
    expect(response.status).toBe(503);
    expect(take).not.toHaveBeenCalled();
    expect(mocks.streamChart).not.toHaveBeenCalled();
  });

  it("stays off without a rate-limit store", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.store = null;
    expect((await post(body)).status).toBe(503);
    expect(mocks.streamChart).not.toHaveBeenCalled();
  });

  it("refuses a body over 256 KB", async () => {
    const response = await post({ ...body, padding: "x".repeat(300 * 1024) });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: "too_large" });
  });

  it("refuses a message that is too long without using a daily slot", async () => {
    const take = vi.spyOn(mocks.store as LimitStore, "take");
    const response = await post({ ...body, messages: [{ ...body.messages[0], parts: [{ type: "text", text: "x".repeat(2001) }] }] });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "message_too_long" });
    expect(take).not.toHaveBeenCalled();
  });

  it("refuses a visitor over their daily limit with a 429 and its code", async () => {
    for (let i = 0; i < DAILY_MESSAGES_PER_IP; i++) await mocks.store?.take(`ip:${await hashIp("203.0.113.7")}`, DAILY_MESSAGES_PER_IP);
    const response = await post(body);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ code: "ip_daily_limit" });
    expect(mocks.streamChart).not.toHaveBeenCalled();
  });
});

