import { APICallError } from "ai";

// A short, friendly sentence for a failed chat request (D-036). HTTP errors
// carry a status code; errors inside the stream carry the server's code.
export function friendlyError(error: Error): string {
  const status = APICallError.isInstance(error) ? error.statusCode : undefined;
  if (status === 503) return "Chat is switched off on this server.";
  if (status === 429 || error.message === "rate_limited") return "Too many requests just now. Wait a moment and try again.";
  if (error.message === "overloaded") return "The model is busy right now. Try again in a minute.";
  if (status === 400) return "That request wasn’t valid. Reloading the page should fix it.";
  if (error instanceof TypeError) return "Couldn’t reach the server. Check your connection.";
  return "Something went wrong. Try again.";
}
