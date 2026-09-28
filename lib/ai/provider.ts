import { anthropic } from "@ai-sdk/anthropic";

// The one place the model is chosen (D-004).
export function getModel() {
  return anthropic(process.env.CHARTSEER_MODEL || "claude-sonnet-5");
}
