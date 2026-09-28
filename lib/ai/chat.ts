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
import { ChartSpec, DatasetSummary } from "@/lib/spec";
import { MAX_ATTEMPTS, buildSystemPrompt } from "./prompt";
import { getModel } from "./provider";
import { createRenderChartTool } from "./tools";

// The body of a POST to /api/chat. Messages get a size check here and a full
// check from the SDK in parseChatRequest.
const ChatRequestBody = z.strictObject({
  messages: z.array(z.unknown()).min(1).max(50),
  dataset: DatasetSummary,
  currentSpec: ChartSpec.nullable(),
});

export type ChatRequest = { messages: UIMessage[]; dataset: DatasetSummary; currentSpec: ChartSpec | null };

export async function parseChatRequest(
  body: unknown,
): Promise<{ ok: true; request: ChatRequest } | { ok: false; errors: string[] }> {
  const parsed = ChatRequestBody.safeParse(body);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`) };
  }
  const messages = await safeValidateUIMessages({ messages: parsed.data.messages });
  if (!messages.success) return { ok: false, errors: [`messages: ${messages.error.message}`] };
  // The system prompt is ours alone.
  if (messages.data.some((message) => message.role === "system")) {
    return { ok: false, errors: ["messages: only user and assistant messages are allowed"] };
  }
  return { ok: true, request: { ...parsed.data, messages: messages.data } };
}

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
    messages: await convertToModelMessages(request.messages),
    tools,
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
export type ChatErrorCode = "rate_limited" | "overloaded" | "failed";

export function chatErrorCode(error: unknown): ChatErrorCode {
  // After its own retries, the SDK wraps the last failure.
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status =
    typeof cause === "object" && cause !== null && "statusCode" in cause && typeof cause.statusCode === "number"
      ? cause.statusCode
      : undefined;
  if (status === 429) return "rate_limited";
  if (status === 529) return "overloaded";
  return "failed";
}
