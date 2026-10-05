import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { chatErrorCode, parseChatRequest, streamChart } from "@/lib/ai/chat";
import { checkDailyLimits, limitStore } from "@/lib/ai/rate-limit";

// About 3.5 times the largest demo conversation (D-062).
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: Request) {
  // Off unless switched on, so the demo can be turned off in seconds (D-034).
  if (process.env.CHARTSEER_CHAT_ENABLED !== "true") {
    return Response.json({ error: "Chat is switched off." }, { status: 503 });
  }
  const store = limitStore();
  if (!store) {
    console.error("[chat] refusing: no rate-limit store is configured");
    return Response.json({ error: "Chat is switched off." }, { status: 503 });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return Response.json({ code: "too_large", errors: ["(root): the body is too large"] }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ errors: ["(root): the body must be JSON"] }, { status: 400 });
  }
  // Invalid requests are refused before they use up a daily slot.
  const parsed = await parseChatRequest(body);
  if (!parsed.ok) return Response.json({ code: parsed.code, errors: parsed.errors }, { status: 400 });

  const limits = await checkDailyLimits(request, store);
  if (!limits.ok) return Response.json({ code: limits.code }, { status: 429 });

  const result = await streamChart(parsed.request);
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, onError: chatErrorCode }),
  });
}
