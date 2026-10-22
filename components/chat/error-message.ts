import { APICallError } from "ai";
import { DAILY_MESSAGES_PER_IP, type LimitCode, MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_CHARS } from "@/lib/spec";

// A limit the visitor has reached, or the demo being out of credit. These are
// notices, not errors: trying again can't help (D-063).
export type Limit = LimitCode | "unavailable";

const BUSY_DAY = "The demo has had a busy day — try again tomorrow.";

// Daily counts restart at midnight UTC (D-061). Visitors elsewhere also get
// it in their own time, e.g. "midnight UTC (1am your time)".
export function resetTime(now: Date, timeZone?: string): string {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const local = midnight
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })
    .replace(":00", "")
    .replace(/\s/g, "");
  return local === "12am" ? "midnight UTC" : `midnight UTC (${local} your time)`;
}

// The heads-up once a visitor is down to their last few messages (D-071).
export function lowMessagesNotice(remaining: number, now = new Date(), timeZone?: string): string {
  const messages = remaining === 1 ? "1 message" : `${remaining} messages`;
  return (
    `Heads up - you’ve got ${messages} left today. Your allowance tops up at ${resetTime(now, timeZone)}. ` +
    `Can’t wait? Hop onto another network and you’ll get a fresh ${DAILY_MESSAGES_PER_IP}.`
  );
}

const LIMIT_MESSAGES: Record<Limit, string | ((now: Date) => string)> = {
  daily_limit: BUSY_DAY,
  unavailable: BUSY_DAY,
  ip_daily_limit: (now) =>
    `That’s your ${DAILY_MESSAGES_PER_IP} for today — nice work. More at ${resetTime(now)}, or try from another network.`,
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

export function limitMessage(limit: Limit, now = new Date()): string {
  const message = LIMIT_MESSAGES[limit];
  return typeof message === "string" ? message : message(now);
}

// A short, friendly sentence for a failed chat request (D-036). HTTP errors
// carry a status code; errors inside the stream carry the server's code. A
// failed fetch is either this device being offline or the server being out
// of reach, and the fix differs (D-047).
export function friendlyError(error: Error, online = true): string {
  const limit = limitOf(error);
  if (limit) return limitMessage(limit);
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
