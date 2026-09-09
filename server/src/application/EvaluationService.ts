import { IAttemptRepository } from "../domain/repositories/IAttemptRepository";
import { IEvaluationRepository } from "../domain/repositories/IEvaluationRepository";
import { IEvaluator } from "../domain/interfaces/IEvaluator";
import { Evaluation } from "../domain/entities/Evaluation";
import { AttemptStatus } from "../domain/enums/AttemptStatus";

/**
 * EvaluationService — Application Layer
 *
 * Responsibility:
 *   1. Guard against duplicate or invalid evaluation requests.
 *   2. Drive the Attempt through SUBMITTED → EVALUATING → COMPLETED/FAILED.
 *   3. Delegate all scoring logic to an IEvaluator implementation — this
 *      service does not know whether evaluation is done by OpenAI, a rule
 *      engine, or a human reviewer.
 *   4. Persist the Evaluation result to the repository.
 *   5. Update the Attempt status in the database.
 *
 * What it does NOT do:
 * - Does not contain any scoring/feedback logic (evaluator concern)
 * - Does not touch or modify the Submission (already persisted, immutable)
 * - Does not parse HTTP requests (controller concern)
 * - Does not interact with MongoDB directly (repository concern)
 */
export class EvaluationService {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly evaluationRepo: IEvaluationRepository,
    private readonly evaluator: IEvaluator
  ) {}

  async evaluate(attemptId: string): Promise<Evaluation> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }

    // Guard: only SUBMITTED (or FAILED retry) can start evaluation
    if (
      attempt.status !== AttemptStatus.SUBMITTED &&
      attempt.status !== AttemptStatus.FAILED &&
      attempt.status !== AttemptStatus.COMPLETED
    ) {
      throw new Error(
        `Cannot evaluate attempt in status '${attempt.status}'. ` +
        `Attempt must be SUBMITTED or FAILED (for retry).`
      );
    }

    // Guard: prevent duplicate evaluations — idempotent for COMPLETED attempts too
    const existingEvaluation = await this.evaluationRepo.findByAttemptId(attemptId);
    if (existingEvaluation) {
      return existingEvaluation;
    }

    // A COMPLETED attempt should always have an evaluation — if missing, something is wrong
    if (attempt.status === AttemptStatus.COMPLETED) {
      throw new Error(
        `Attempt '${attemptId}' is COMPLETED but has no persisted evaluation. Data inconsistency detected.`
      );
    }

    if (!attempt.submission) {
      throw new Error(
        `Attempt '${attemptId}' has no submission. Submit a solution before requesting evaluation.`
      );
    }

    // Transition: SUBMITTED → EVALUATING
    attempt.startEvaluating();
    await this.attemptRepo.updateStatus(attemptId, AttemptStatus.EVALUATING);

    let evaluation: Evaluation;

    try {
      // Delegate entirely to the injected evaluator abstraction: evaluate(problem, submission, rubric, attemptId)
      evaluation = await this.evaluator.evaluate(
        attempt.problem,
        attempt.submission,
        attempt.problem.rubric,
        attempt.id
      );

      // Persist the completed evaluation
      const savedEvaluation = await this.evaluationRepo.create(evaluation);

      // Transition: EVALUATING → COMPLETED
      attempt.completeEvaluation(evaluation);
      await this.attemptRepo.updateStatus(attemptId, AttemptStatus.COMPLETED);

      return savedEvaluation;
    } catch (err: any) {
      const reason = err?.message || "Evaluation failed due to an unexpected error.";

      // Transition: EVALUATING → FAILED
      // Submission is safe — it was persisted independently before this block
      attempt.failEvaluation(reason);
      await this.attemptRepo.updateStatus(attemptId, AttemptStatus.FAILED, reason);

      throw new Error(`Evaluation failed for attempt '${attemptId}': ${reason}`);
    }
  }

  async getEvaluationByAttemptId(attemptId: string): Promise<Evaluation | null> {
    return this.evaluationRepo.findByAttemptId(attemptId);
  }
}
