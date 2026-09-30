import { z } from "zod";

// Conversation events the client records in a user message, as a data part
// (D-044). Defined here so the chat UI and /api/chat share one schema.

// The user undid back to an earlier chart before sending. Only the title
// travels; the server writes the words the model sees.
export const BackToEvent = z.strictObject({ title: z.string().min(1).max(200) });
export type BackToEvent = z.infer<typeof BackToEvent>;
