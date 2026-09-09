import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { ILlmClient, LlmCompletionOptions } from "./ILlmClient";

export interface GeminiLlmClientConfig {
  apiKey?: string;
  defaultModel?: string;
}

/**
 * GeminiLlmClient — Infrastructure Component
 *
 * Handles all low-level communication with the Google Gemini API.
 * Implements ILlmClient so evaluators remain decoupled from the concrete model.
 */
export class GeminiLlmClient implements ILlmClient {
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly defaultModel: string;

  constructor(config: GeminiLlmClientConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.defaultModel =
      config.defaultModel ||
      process.env.GEMINI_MODEL ||
      "gemini-2.0-flash";

    if (apiKey && apiKey.trim().length > 0 && apiKey !== "your_gemini_api_key_here") {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  get isConfigured(): boolean {
    return this.genAI !== null;
  }

  async generateJson<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options: LlmCompletionOptions = {}
  ): Promise<T> {
    if (!this.genAI) {
      throw new Error(
        "Gemini API key is missing or not configured. Set GEMINI_API_KEY in environment variables."
      );
    }

    const modelName = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.2;

    const model: GenerativeModel = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature,
      },
      systemInstruction: systemPrompt,
    });

    try {
      const result = await model.generateContent(userPrompt);
      const response = result.response;

      // Detect abnormal finish reasons before reading text
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(
          `Gemini model finished with unexpected reason: ${candidate.finishReason}. ` +
          `This may indicate a safety filter or empty output.`
        );
      }

      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error(
          "Gemini API returned an empty response. " +
          "Ensure the prompt is non-empty and the model name is valid."
        );
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError: any) {
        throw new Error(
          `Gemini API returned non-parseable JSON: ${parseError.message}. ` +
          `Content preview: ${text.slice(0, 200)}`
        );
      }
    } catch (err: any) {
      const msg: string = err.message || String(err);
      if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
        throw new Error("Gemini API authentication failed: Invalid API key.");
      }
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error("Gemini API rate limit exceeded or quota exhausted.");
      }
      if (msg.includes("404") || msg.includes("not found")) {
        throw new Error(
          `Gemini model "${modelName}" not found. ` +
          `Valid models: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro.`
        );
      }
      throw err;
    }
  }
}
