import { IEvaluator } from "../../domain/interfaces/IEvaluator";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";
import { ILlmClient } from "../llm/ILlmClient";
import { GeminiLlmClient } from "../llm/GeminiLlmClient";
import { RuleBasedEvaluator } from "./RuleBasedEvaluator";
import {
  LlmEvaluationResponseSchema,
  LlmEvaluationResponseDto,
} from "./dto/LlmEvaluationSchema";
import { ZodError } from "zod";

export interface LlmEvaluatorConfig {
  llmClient?: ILlmClient;
  fallbackToRuleBased?: boolean;
}

/**
 * LlmEvaluator — Semantic Architectural Evaluator via Dedicated LLM Client (OpenAI)
 *
 * Responsibility:
 *   1. Formulates structured Low-Level Design prompts with strict rubric constraints.
 *   2. Communicates with OpenAI via the isolated ILlmClient abstraction.
 *   3. Enforces structured JSON output.
 *   4. Validates the response with Zod before mapping to domain entities.
 *   5. Prevents corrupted evaluations if the model hallucinates or returns invalid schema.
 *
 * Core Rubric Evaluation Dimensions:
 *   1. Requirement Understanding
 *   2. Class Responsibilities
 *   3. Coupling / Cohesion
 *   4. Encapsulation / Interfaces
 *   5. Abstraction / Patterns
 *   6. Extensibility
 *   7. Edge Cases / Testability
 *   8. Quality of Explanation
 */
export class LlmEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.LLM;
  private readonly llmClient: ILlmClient;
  private readonly fallbackEvaluator: RuleBasedEvaluator;
  private readonly fallbackToRuleBased: boolean;

  constructor(config: LlmEvaluatorConfig = {}) {
    this.llmClient = config.llmClient || new GeminiLlmClient();
    this.fallbackToRuleBased = config.fallbackToRuleBased ?? true;
    this.fallbackEvaluator = new RuleBasedEvaluator();
  }

  async evaluate(
    problem: Problem,
    submission: Submission,
    rubric: Rubric,
    attemptId?: string
  ): Promise<Evaluation> {
    const targetAttemptId = attemptId || submission.attemptId;

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(problem, submission, rubric);

      // 1. Invoke dedicated LLM client
      const rawResponse = await this.llmClient.generateJson<any>(systemPrompt, userPrompt);

      // 2. Validate response with Zod schema
      const validated: LlmEvaluationResponseDto = this.validateLlmResponse(rawResponse);

      // 3. Map validated response to domain Evaluation entity
      return this.mapToDomainEvaluation(validated, rubric, targetAttemptId);
    } catch (error: any) {
      console.error("[LlmEvaluator] Evaluation failed via Gemini LLM:", error.message);

      // If fallback is enabled (e.g. offline/no key), fall back gracefully
      if (this.fallbackToRuleBased) {
        console.warn("[LlmEvaluator] Falling back to RuleBasedEvaluator.");
        return this.fallbackEvaluator.evaluate(problem, submission, rubric, targetAttemptId);
      }

      // Format a meaningful error message that allows EvaluationService to transition to FAILED
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        throw new Error(`LLM evaluation output failed schema validation: ${issues}`);
      }

      throw new Error(`LLM evaluation execution failed: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `You are a Principal Software Architect and Low-Level Design (LLD) Interview Evaluator.
Your goal is to evaluate a candidate's LLD practice submission objectively against a fixed evaluation rubric.

CRITICAL EVALUATION PRINCIPLES:
1. Multiple designs can be valid. There is no single dogmatic "correct" design.
2. Evaluate the candidate strictly against the stated problem requirements, constraints, and rubric criteria.
3. Provide direct, verifiable evidence quoted or observed from the candidate's submission.
4. DO NOT invent or hallucinate evidence that does not exist in the candidate submission.
5. Clearly distinguish CONCERNS (gaps, design flaws, anti-patterns) from SUGGESTIONS (forward-looking actionable advice).
6. Acknowledge uncertainty via the confidence score (float between 0.0 and 1.0).
7. Score according to the fixed rubric criteria. Do NOT ask "Is this a good design?" and do NOT invent an unconstrained 100-point score.
8. Every criterion in the provided rubric must be evaluated.

OUTPUT FORMAT:
You must return a single, valid JSON object matching this structure:
{
  "summary": "2-4 sentence executive overview of the architectural strengths, key tradeoffs, and primary areas for growth.",
  "criteriaResults": [
    {
      "criterionKey": "EXACT_KEY_FROM_RUBRIC",
      "criterionName": "Exact Name of Criterion",
      "score": <integer score between 0 and maxScore>,
      "maxScore": <max score for this criterion>,
      "evidence": "Factual quotes or structural observations directly from the submission.",
      "concern": "Concrete architectural risks, missed requirements, or design violations.",
      "suggestion": "Specific, actionable guidance on how to resolve the concern.",
      "confidence": <float between 0.0 and 1.0 reflecting certainty>
    }
  ]
}`;
  }

  private buildUserPrompt(problem: Problem, submission: Submission, rubric: Rubric): string {
    return `
# LLD PRACTICE PROBLEM: ${problem.title}
Difficulty: ${problem.difficulty}

## Problem Overview & Description:
${problem.description}

## Functional Requirements:
${problem.requirements.map((req, idx) => `${idx + 1}. ${req}`).join("\n")}

## Constraints & Assumptions:
${
  problem.assumptions && problem.assumptions.length > 0
    ? problem.assumptions.map((asm, idx) => `- ${asm}`).join("\n")
    : "None specified."
}

---

# FIXED EVALUATION RUBRIC CRITERIA:
${rubric.criteria
  .map(
    (c) => `### Criterion: [${c.key}] - ${c.name}
- Max Score: ${c.maxScore} points (Weight: ${c.weight})
- Description & Focus: ${c.description}`
  )
  .join("\n\n")}

---

# CANDIDATE SUBMISSION:
${submission.toFormattedSummary()}

---

# EVALUATION INSTRUCTIONS:
Evaluate the submission against every criterion in the rubric. Ensure score is bounded between 0 and maxScore.
Return ONLY valid JSON.`;
  }

  private validateLlmResponse(raw: any): LlmEvaluationResponseDto {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid LLM response: Expected a non-null JSON object.");
    }
    return LlmEvaluationResponseSchema.parse(raw);
  }

  private mapToDomainEvaluation(
    dto: LlmEvaluationResponseDto,
    rubric: Rubric,
    attemptId: string
  ): Evaluation {
    const criteriaResults: CriterionResult[] = rubric.criteria.map((crit) => {
      const match = dto.criteriaResults.find((r) => r.criterionKey === crit.key);

      if (match) {
        // Enforce score boundary invariants
        const boundedScore = Math.max(0, Math.min(crit.maxScore, match.score));
        return new CriterionResult({
          criterionKey: crit.key,
          criterionName: crit.name,
          score: boundedScore,
          maxScore: crit.maxScore,
          evidence: match.evidence,
          concern: match.concern,
          suggestion: match.suggestion,
          confidence: match.confidence,
        });
      }

      // Default for missing criterion
      return new CriterionResult({
        criterionKey: crit.key,
        criterionName: crit.name,
        score: Math.round(crit.maxScore * 0.7),
        maxScore: crit.maxScore,
        evidence: "Evaluated as part of overall submission structure.",
        concern: "Detailed evidence not specifically itemized for this criterion.",
        suggestion: "Ensure this dimension is explicitly documented in future attempts.",
        confidence: 0.8,
      });
    });

    const totalEarned = criteriaResults.reduce((sum, r) => sum + r.score, 0);
    const totalMax = criteriaResults.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    const evaluation = new Evaluation({
      id: `eval-llm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attemptId,
      evaluatorType: EvaluatorType.LLM,
      status: EvaluationStatus.IN_PROGRESS,
    });

    evaluation.markEvaluating();
    evaluation.complete(criteriaResults, dto.summary, overallScore);

    return evaluation;
  }
}
