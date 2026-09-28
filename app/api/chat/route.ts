import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { chatErrorCode, parseChatRequest, streamChart } from "@/lib/ai/chat";

export async function POST(request: Request) {
  // Off unless switched on, so production stays dark until M6 (D-034).
  if (process.env.CHARTSEER_CHAT_ENABLED !== "true") {
    return Response.json({ error: "Chat is switched off." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ errors: ["(root): the body must be JSON"] }, { status: 400 });
  }
  const parsed = await parseChatRequest(body);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });

  const result = await streamChart(parsed.request);
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, onError: chatErrorCode }),
  });
}
