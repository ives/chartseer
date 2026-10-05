import {
  type LanguageModel,
  RetryError,
  type StepResult,
  type UIMessage,
  convertToModelMessages,
  isStepCount,
  safeValidateUIMessages,
  streamText,
} from "ai";
import { z } from "zod";
import {
  BackToEvent,
  ChartSpec,
  DatasetSummary,
  type LimitCode,
  MAX_CONVERSATION_MESSAGES,
  MAX_MESSAGE_CHARS,
} from "@/lib/spec";
import { MAX_ATTEMPTS, backToText, buildSystemPrompt } from "./prompt";
import { getModel } from "./provider";
import { createRenderChartTool } from "./tools";

// The body of a POST to /api/chat. Messages get a size check here and a full
// check from the SDK in parseChatRequest.
const ChatRequestBody = z.strictObject({
  messages: z.array(z.unknown()).min(1).max(MAX_CONVERSATION_MESSAGES),
  dataset: DatasetSummary,
  currentSpec: ChartSpec.nullable(),
});

export type ChatRequest = { messages: UIMessage[]; dataset: DatasetSummary; currentSpec: ChartSpec | null };

// A refusal the visitor can act on carries a code, which the chat turns into
// a friendly message (D-063).
export type ParseFailure = { ok: false; errors: string[]; code?: LimitCode };

export async function parseChatRequest(body: unknown): Promise<{ ok: true; request: ChatRequest } | ParseFailure> {
  if (isRecord(body) && Array.isArray(body.messages) && body.messages.length > MAX_CONVERSATION_MESSAGES) {
    return { ok: false, code: "conversation_full", errors: [`messages: at most ${MAX_CONVERSATION_MESSAGES} per conversation`] };
  }
  const parsed = ChatRequestBody.safeParse(body);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
  }
  // The one data part a client may send; any other is rejected (D-044).
  const messages = await safeValidateUIMessages({ messages: parsed.data.messages, dataSchemas: { "back-to": BackToEvent } });
  if (!messages.success) return { ok: false, errors: [`messages: ${messages.error.message}`] };
  // The system prompt is ours alone.
  if (messages.data.some((message) => message.role === "system")) {
    return { ok: false, errors: ["messages: only user and assistant messages are allowed"] };
  }
  const tooLong = messages.data.some(
    (message) => message.role === "user" && message.parts.some((part) => part.type === "text" && part.text.length > MAX_MESSAGE_CHARS),
  );
  if (tooLong) {
    return { ok: false, code: "message_too_long", errors: [`messages: at most ${MAX_MESSAGE_CHARS} characters per message`] };
  }
  return { ok: true, request: { ...parsed.data, messages: messages.data } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Per model call. The longest reply in the prompt check was 421 tokens (D-062).
export const MAX_OUTPUT_TOKENS = 1024;

const CACHE = { anthropic: { cacheControl: { type: "ephemeral" } } } as const;

export async function streamChart(request: ChatRequest, model: LanguageModel = getModel()) {
  const tools = { renderChart: createRenderChartTool(request.dataset) };
  type Steps = StepResult<typeof tools>[];
  const prompt = buildSystemPrompt(request.dataset, request.currentSpec);

  const results = (steps: Steps) =>
    steps.flatMap((step) => step.toolResults).flatMap((result) => (result.dynamic ? [] : [result.output]));
  const rendered = ({ steps }: { steps: Steps }) => results(steps).some((output) => output.ok);
  const failures = (steps: Steps) => results(steps).filter((output) => !output.ok).length;

  return streamText({
    model,
    // Anthropic caches everything up to each breakpoint: tools, then the
    // rules, then the dataset. The current spec changes every turn (D-033).
    instructions: [
      { role: "system", content: prompt.rules, providerOptions: CACHE },
      { role: "system", content: prompt.dataset, providerOptions: CACHE },
      { role: "system", content: prompt.currentSpec },
    ],
    // An undo travels as a data part on the user's message, so the model's
    // record of the conversation matches the screen (D-044).
    messages: await convertToModelMessages(request.messages, {
      convertDataPart: (part) =>
        part.type === "data-back-to" ? { type: "text", text: backToText(BackToEvent.parse(part.data)) } : undefined,
    }),
    tools,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // Stop once a chart is drawn. After the last failed attempt, the next step
    // can only be prose explaining the problem (D-032).
    stopWhen: [rendered, isStepCount(MAX_ATTEMPTS + 1)],
    prepareStep: ({ steps }) => (failures(steps) >= MAX_ATTEMPTS ? { toolChoice: "none" } : {}),
    onFinish: ({ steps, totalUsage }) => {
      if (process.env.NODE_ENV !== "development") return;
      const { inputTokens, inputTokenDetails, outputTokens } = totalUsage;
      console.log(
        `[chat] ${steps.length} step(s) · input ${inputTokens} (cache read ${inputTokenDetails.cacheReadTokens}, cache write ${inputTokenDetails.cacheWriteTokens}) · output ${outputTokens}`,
      );
    },
  });
}

// What the client is told when the stream fails: a stable code, never the
// provider's message, which can include request details (D-036).
export type ChatErrorCode = "rate_limited" | "overloaded" | "unavailable" | "failed";

export function chatErrorCode(error: unknown): ChatErrorCode {
  // After its own retries, the SDK wraps the last failure.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status =
    typeof cause === "object" && cause !== null && "statusCode" in cause && typeof cause.statusCode === "number"
      ? cause.statusCode
      : undefined;
  // Out of credit: to a visitor, the demo is simply done for the day (D-063).
  if (status === 402 || errorType(cause) === "billing_error") return "unavailable";
  if (status === 429) return "rate_limited";
  if (status === 529) return "overloaded";
  return "failed";
}

// The `error.type` in an Anthropic error body, e.g. "billing_error".
function errorType(cause: unknown): string | undefined {
  if (!isRecord(cause) || typeof cause.responseBody !== "string") return undefined;
  try {
    const body: unknown = JSON.parse(cause.responseBody);
    return isRecord(body) && isRecord(body.error) && typeof body.error.type === "string" ? body.error.type : undefined;
  } catch {
    return undefined;
  }
}
