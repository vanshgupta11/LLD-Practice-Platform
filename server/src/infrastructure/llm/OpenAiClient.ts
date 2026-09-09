import OpenAI from "openai";
import { ILlmClient, LlmCompletionOptions } from "./ILlmClient";

export interface OpenAiClientConfig {
  apiKey?: string;
  defaultModel?: string;
}

/**
 * OpenAiClient — Dedicated Infrastructure Component
 *
 * Responsibility:
 *   Handles all low-level HTTP communication, serialization, and error handling
 *   with the OpenAI API.
 *
 * Isolation:
 *   - EvaluationService and Domain entities NEVER interact with OpenAI directly.
 *   - LlmEvaluator interacts solely through the ILlmClient interface.
 */
export class OpenAiClient implements ILlmClient {
  private client: OpenAI | null = null;
  private defaultModel: string;

  constructor(config: OpenAiClientConfig = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.defaultModel = config.defaultModel || process.env.OPENAI_MODEL || "gpt-4o";

    if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_openai_api_key_here") {
      this.client = new OpenAI({ apiKey });
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async generateJson<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options: LlmCompletionOptions = {}
  ): Promise<T> {
    if (!this.client) {
      throw new Error(
        "OpenAI API key is missing or not configured. Set OPENAI_API_KEY in environment variables."
      );
    }

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.2;

    try {
      const response = await this.client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const choice = response.choices[0];
      const content = choice?.message?.content;

      if (!content || content.trim().length === 0) {
        throw new Error("OpenAI API returned an empty completion response.");
      }

      try {
        const parsed = JSON.parse(content);
        return parsed as T;
      } catch (parseError: any) {
        throw new Error(
          `OpenAI API returned non-parseable JSON content: ${parseError.message}. Content preview: ${content.slice(
            0,
            200
          )}`
        );
      }
    } catch (err: any) {
      // Re-throw with clear diagnostic context
      if (err.status === 401) {
        throw new Error("OpenAI API Authentication failed: Invalid API key.");
      }
      if (err.status === 429) {
        throw new Error("OpenAI API Rate Limit exceeded or insufficient quota.");
      }
      throw err;
    }
  }
}
