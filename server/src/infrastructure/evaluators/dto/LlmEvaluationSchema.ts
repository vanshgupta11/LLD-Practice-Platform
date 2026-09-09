import { z } from "zod";

/**
 * Criterion Result Schema
 *
 * Strict validation of each individual rubric dimension returned by the LLM.
 */
export const LlmCriterionResultSchema = z.object({
  criterionKey: z.string().min(1, "criterionKey is required"),
  criterionName: z.string().min(1, "criterionName is required"),
  score: z
    .number({ invalid_type_error: "score must be a number" })
    .int("score must be an integer")
    .nonnegative("score cannot be negative"),
  maxScore: z
    .number({ invalid_type_error: "maxScore must be a number" })
    .int("maxScore must be an integer")
    .positive("maxScore must be greater than zero"),
  evidence: z
    .string()
    .min(1, "evidence must not be empty and must reference the submission"),
  concern: z.string().default("No critical concerns detected."),
  suggestion: z.string().default("Continue refining design modularity."),
  confidence: z
    .number()
    .min(0.0, "confidence must be between 0.0 and 1.0")
    .max(1.0, "confidence must be between 0.0 and 1.0")
    .default(0.9),
});

/**
 * Complete LLM Evaluation Response Schema
 *
 * Validates the full structured JSON payload returned by OpenAI before domain mapping.
 */
export const LlmEvaluationResponseSchema = z.object({
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters long providing an architectural overview"),
  criteriaResults: z
    .array(LlmCriterionResultSchema)
    .min(1, "At least one criterion evaluation result is required"),
});

export type LlmCriterionResultDto = z.infer<typeof LlmCriterionResultSchema>;
export type LlmEvaluationResponseDto = z.infer<typeof LlmEvaluationResponseSchema>;
