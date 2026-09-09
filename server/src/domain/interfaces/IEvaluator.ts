import { Problem } from "../entities/Problem";
import { Submission } from "../entities/Submission";
import { Rubric } from "../entities/Rubric";
import { Evaluation } from "../entities/Evaluation";
import { EvaluatorType } from "../enums/EvaluatorType";

/**
 * Core Evaluator Strategy Contract.
 *
 * All evaluation implementations (RuleBased, LLM, Human) adhere to this contract.
 * The practice flow, AttemptService, SubmissionService, EvaluationService, and Controllers
 * depend ONLY on this abstraction.
 */
export interface IEvaluator {
  readonly evaluatorType: EvaluatorType;

  /**
   * Evaluates a submission against a problem and rubric.
   *
   * @param problem The problem definition and requirements.
   * @param submission The learner's submitted design components.
   * @param rubric The evaluation criteria and score weights.
   * @param attemptId Optional attempt ID to bind the evaluation entity.
   */
  evaluate(
    problem: Problem,
    submission: Submission,
    rubric: Rubric,
    attemptId?: string
  ): Promise<Evaluation>;
}
