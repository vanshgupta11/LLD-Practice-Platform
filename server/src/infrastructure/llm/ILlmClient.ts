export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ILlmClient {
  /**
   * Generates a structured JSON response from the LLM model.
   *
   * @param systemPrompt System level role instructions and constraints.
   * @param userPrompt The task prompt containing problem, submission, and rubric.
   * @param options Completion configuration.
   * @returns Raw parsed JSON object from model.
   */
  generateJson<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions
  ): Promise<T>;
}
