// Limits on the public demo (D-061, D-062). The server enforces them; the chat
// UI mirrors the per-request ones so a visitor rarely meets a refusal.
export const MAX_MESSAGE_CHARS = 2000;
// Every message counts, the visitor's and Chartseer's.
export const MAX_CONVERSATION_MESSAGES = 40;
export const DAILY_MESSAGES_PER_IP = 3;
export const DAILY_MESSAGES_TOTAL = 500;

// Why the server refused a request, sent as `{ code }` in the response body.
export type LimitCode = "message_too_long" | "conversation_full" | "too_large" | "ip_daily_limit" | "daily_limit";
