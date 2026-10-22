import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { friendlyError, lowMessagesNotice, resetTime } from "./error-message";

const http = (statusCode: number, responseBody?: string) =>
  new APICallError({ message: '{"error":"raw body"}', url: "/api/chat", requestBodyValues: undefined, statusCode, responseBody });
const refusal = (statusCode: number, code: string) => http(statusCode, JSON.stringify({ code }));
const BUSY_DAY = "The demo has had a busy day — try again tomorrow.";

describe("friendlyError", () => {
  it.each([
    ["the 503 switch", http(503), "Chat is switched off on this server."],
    ["an HTTP rate limit", http(429), "Too many requests just now. Wait a moment and try again."],
    ["a rate limit in the stream", new Error("rate_limited"), "Too many requests just now. Wait a moment and try again."],
    ["an overloaded model", new Error("overloaded"), "The model is busy right now. Try again in a minute."],
    ["a rejected request", http(400), "That request wasn’t valid. Reloading the page should fix it."],
    ["an unreachable server", new TypeError("Failed to fetch"), "Couldn’t reach the Chartseer server. Try again in a moment."],
    ["a failed stream", new Error("failed"), "Something went wrong. Try again."],
    ["a server error", http(500), "The Chartseer server isn’t responding. Try again in a moment."],
    ["a bad gateway", http(502), "The Chartseer server isn’t responding. Try again in a moment."],
    ["a gateway timeout", http(504), "The Chartseer server isn’t responding. Try again in a moment."],
    ["the demo's daily limit", refusal(429, "daily_limit"), BUSY_DAY],
    ["running out of credit", new Error("unavailable"), BUSY_DAY],
    ["a full chat", refusal(400, "conversation_full"), "This chat has reached 40 messages. Start a new chat to continue."],
    ["a long message", refusal(400, "message_too_long"), "That message is over 2,000 characters. Shorten it and try again."],
    ["an oversized request", refusal(413, "too_large"), "That conversation is too large to send. Start a new chat to continue."],
    ["a 429 with an unknown code", refusal(429, "nonsense"), "Too many requests just now. Wait a moment and try again."],
  ])("explains %s", (_name, error, message) => {
    expect(friendlyError(error)).toBe(message);
  });

  it("tells a visitor over their daily limit when it resets, and the way round it", () => {
    expect(friendlyError(refusal(429, "ip_daily_limit"))).toMatch(
      /^That’s your 30 for today — nice work\. More at midnight UTC.*, or try from another network\.$/,
    );
  });

  it("says when this device is offline", () => {
    expect(friendlyError(new TypeError("Failed to fetch"), false)).toBe(
      "You’re offline. Check your connection, then try again.",
    );
  });
});

describe("resetTime", () => {
  const evening = new Date(Date.UTC(2026, 9, 22, 18, 30));

  it("adds the visitor's own time for the midnight UTC reset", () => {
    expect(resetTime(evening, "Europe/London")).toBe("midnight UTC (1am your time)");
    expect(resetTime(evening, "America/New_York")).toBe("midnight UTC (8pm your time)");
    expect(resetTime(evening, "Asia/Kolkata")).toBe("midnight UTC (5:30am your time)");
  });

  it("says only midnight UTC where that is local midnight", () => {
    expect(resetTime(evening, "UTC")).toBe("midnight UTC");
  });
});

describe("lowMessagesNotice", () => {
  const evening = new Date(Date.UTC(2026, 9, 22, 18, 30));

  it("counts what is left, when it resets and how to keep going", () => {
    expect(lowMessagesNotice(5, evening, "Europe/London")).toBe(
      "Heads up — you’ve got 5 messages left today. Your allowance tops up at midnight UTC (1am your time). " +
        "Can’t wait? Hop onto another network and you’ll get a fresh 30.",
    );
  });

  it("says message, not messages, for the last one", () => {
    expect(lowMessagesNotice(1, evening, "UTC")).toMatch(/^Heads up — you’ve got 1 message left today\./);
  });
});
