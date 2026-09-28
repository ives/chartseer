import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { friendlyError } from "./error-message";

const http = (statusCode: number) =>
  new APICallError({ message: '{"error":"raw body"}', url: "/api/chat", requestBodyValues: undefined, statusCode });

describe("friendlyError", () => {
  it.each([
    ["the 503 switch", http(503), "Chat is switched off on this server."],
    ["an HTTP rate limit", http(429), "Too many requests just now. Wait a moment and try again."],
    ["a rate limit in the stream", new Error("rate_limited"), "Too many requests just now. Wait a moment and try again."],
    ["an overloaded model", new Error("overloaded"), "The model is busy right now. Try again in a minute."],
    ["a rejected request", http(400), "That request wasn’t valid. Reloading the page should fix it."],
    ["a network failure", new TypeError("Failed to fetch"), "Couldn’t reach the server. Check your connection."],
    ["a failed stream", new Error("failed"), "Something went wrong. Try again."],
    ["a server error", http(500), "Something went wrong. Try again."],
  ])("explains %s", (_name, error, message) => {
    expect(friendlyError(error)).toBe(message);
  });
});
