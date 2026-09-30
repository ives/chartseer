import { APICallError } from "ai";

// A short, friendly sentence for a failed chat request (D-036). HTTP errors
// carry a status code; errors inside the stream carry the server's code. A
// failed fetch is either this device being offline or the server being out
// of reach, and the fix differs (D-047).
export function friendlyError(error: Error, online = true): string {
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
