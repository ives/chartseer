import { APICallError } from "ai";
import { DAILY_MESSAGES_PER_IP, type LimitCode, MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_CHARS } from "@/lib/spec";

// A limit the visitor has reached, or the demo being out of credit. These are
// notices, not errors: trying again can't help (D-063).
export type Limit = LimitCode | "unavailable";

const BUSY_DAY = "The demo has had a busy day — try again tomorrow.";

const LIMIT_MESSAGES: Record<Limit, string> = {
  daily_limit: BUSY_DAY,
  unavailable: BUSY_DAY,
  ip_daily_limit: `You’ve used today’s ${DAILY_MESSAGES_PER_IP} messages — try again tomorrow.`,
  conversation_full: `This chat has reached ${MAX_CONVERSATION_MESSAGES} messages. Start a new chat to continue.`,
  message_too_long: `That message is over ${MAX_MESSAGE_CHARS.toLocaleString("en-GB")} characters. Shorten it and try again.`,
  too_large: "That conversation is too large to send. Start a new chat to continue.",
};

// The limit behind a failed request: a `code` in the server's refusal, or
// "unavailable" from inside the stream.
export function limitOf(error: Error): Limit | null {
  if (error.message === "unavailable") return "unavailable";
  if (!APICallError.isInstance(error) || !error.responseBody) return null;
  try {
    const body: unknown = JSON.parse(error.responseBody);
    const code = typeof body === "object" && body !== null && "code" in body ? body.code : undefined;
    return typeof code === "string" && code in LIMIT_MESSAGES ? (code as Limit) : null;
  } catch {
    return null;
  }
}

export function limitMessage(limit: Limit): string {
  return LIMIT_MESSAGES[limit];
}

// A short, friendly sentence for a failed chat request (D-036). HTTP errors
// carry a status code; errors inside the stream carry the server's code. A
// failed fetch is either this device being offline or the server being out
// of reach, and the fix differs (D-047).
export function friendlyError(error: Error, online = true): string {
  const limit = limitOf(error);
  if (limit) return LIMIT_MESSAGES[limit];
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (status === 503) return "Chat is switched off on this server.";
  if (status === 429 || error.message === "rate_limited") return "Too many requests just now. Wait a moment and try again.";
  if (error.message === "overloaded") return "The model is busy right now. Try again in a minute.";
  if (status === 400) return "That request wasn’t valid. Reloading the page should fix it.";
  if (status === 500 || status === 502 || status === 504) return "The Chartseer server isn’t responding. Try again in a moment.";
  if (error instanceof TypeError) {
    return online
      ? "Couldn’t reach the Chartseer server. Try again in a moment."
      : "You’re offline. Check your connection, then try again.";
  }
  return "Something went wrong. Try again.";
}
