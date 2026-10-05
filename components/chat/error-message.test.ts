import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { friendlyError } from "./error-message";

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
    ["a visitor's daily limit", refusal(429, "ip_daily_limit"), "You’ve used today’s 30 messages — try again tomorrow."],
    ["a full chat", refusal(400, "conversation_full"), "This chat has reached 40 messages. Start a new chat to continue."],
    ["a long message", refusal(400, "message_too_long"), "That message is over 2,000 characters. Shorten it and try again."],
    ["an oversized request", refusal(413, "too_large"), "That conversation is too large to send. Start a new chat to continue."],
    ["a 429 with an unknown code", refusal(429, "nonsense"), "Too many requests just now. Wait a moment and try again."],
  ])("explains %s", (_name, error, message) => {
    expect(friendlyError(error)).toBe(message);
  });

  it("says when this device is offline", () => {
    expect(friendlyError(new TypeError("Failed to fetch"), false)).toBe(
      "You’re offline. Check your connection, then try again.",
    );
  });
});
