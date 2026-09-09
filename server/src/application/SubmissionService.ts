import { IAttemptRepository } from "../domain/repositories/IAttemptRepository";
import { ISubmissionRepository } from "../domain/repositories/ISubmissionRepository";
import { Attempt } from "../domain/entities/Attempt";
import { Submission } from "../domain/entities/Submission";
import { AttemptStatus } from "../domain/enums/AttemptStatus";

export interface SubmitAttemptCommand {
  attemptId: string;
  assumptions: string;
  classDesign: string;
  explanation: string;
  code: string;
}

/**
 * SubmissionService — Application Layer
 *
 * Responsibility:
 *   1. Validate that the submission content is complete.
 *   2. Persist the submission document.
 *   3. Drive the Attempt domain entity through the IN_PROGRESS → SUBMITTED
 *      state transition and persist the updated status.
 *
 * Guarantee: Submission is ALWAYS persisted before any evaluation begins,
 * so an evaluation failure can never erase the learner's work.
 *
 * What it does NOT do:
 * - Does not start or run evaluation (EvaluationService concern)
 * - Does not parse HTTP request bodies (controller concern)
 * - Does not construct Mongoose queries (repository concern)
 */
export class SubmissionService {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly submissionRepo: ISubmissionRepository
  ) {}

  async submit(cmd: SubmitAttemptCommand): Promise<{ attempt: Attempt; submission: Submission }> {
    const attempt = await this.attemptRepo.findById(cmd.attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${cmd.attemptId}`);
    }

    // Guard: only IN_PROGRESS or FAILED attempts can be (re-)submitted
    if (
      attempt.status !== AttemptStatus.IN_PROGRESS &&
      attempt.status !== AttemptStatus.FAILED
    ) {
      throw new Error(
        `Cannot submit attempt in status '${attempt.status}'. ` +
        `Only IN_PROGRESS or FAILED attempts may be submitted.`
      );
    }

    // Guard: prevent duplicate submissions for the same attempt
    const existing = await this.submissionRepo.findByAttemptId(cmd.attemptId);
    if (existing && attempt.status === AttemptStatus.IN_PROGRESS) {
      // Update is not supported in MVP — reject to avoid inconsistency
      throw new Error(
        `A submission already exists for attempt '${cmd.attemptId}'. ` +
        `Start a new attempt to submit a revised design.`
      );
    }

    const submission = new Submission({
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attemptId: cmd.attemptId,
      assumptions: cmd.assumptions,
      classDesign: cmd.classDesign,
      explanation: cmd.explanation,
      code: cmd.code,
    });

    // Validate completeness via domain entity — throws if sections are missing
    attempt.submit(submission);

    // Persist submission FIRST — evaluation must never be triggered before this
    const savedSubmission = await this.submissionRepo.create(submission);

    // Persist the status transition to SUBMITTED
    await this.attemptRepo.updateStatus(cmd.attemptId, AttemptStatus.SUBMITTED);

    // Reload to get the fully hydrated domain object
    const updatedAttempt = await this.attemptRepo.findById(cmd.attemptId);

    return { attempt: updatedAttempt!, submission: savedSubmission };
  }

  async getSubmissionByAttemptId(attemptId: string): Promise<Submission | null> {
    return this.submissionRepo.findByAttemptId(attemptId);
  }
}
