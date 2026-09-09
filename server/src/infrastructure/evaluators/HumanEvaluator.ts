import { IEvaluator } from "../../domain/interfaces/IEvaluator";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";

export interface IReviewQueueService {
  enqueueReview(item: {
    attemptId: string;
    problemId: string;
    submissionSummary: string;
  }): Promise<string>;
}

/**
 * HumanEvaluator — Demonstrates Extensibility for Manual Peer/Expert Review
 *
 * Responsibility:
 *   Submits the attempt to an asynchronous Human Review Queue (e.g. Mentor/Interviewer dashboard)
 *   and creates an Evaluation in PENDING/IN_PROGRESS state awaiting human submission.
 *
 * Architectural Verification:
 *   Adding HumanEvaluator requires ZERO changes to AttemptService, SubmissionService,
 *   EvaluationService, or any HTTP controllers. It purely implements IEvaluator.
 */
export class HumanEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.HUMAN;

  constructor(private readonly reviewQueueService?: IReviewQueueService) {}

  async evaluate(
    problem: Problem,
    submission: Submission,
    _rubric: Rubric,
    attemptId?: string
  ): Promise<Evaluation> {
    const targetAttemptId = attemptId || submission.attemptId;

    if (this.reviewQueueService) {
      await this.reviewQueueService.enqueueReview({
        attemptId: targetAttemptId,
        problemId: problem.id,
        submissionSummary: submission.toFormattedSummary(),
      });
    }

    const evaluation = new Evaluation({
      id: `eval-human-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attemptId: targetAttemptId,
      evaluatorType: EvaluatorType.HUMAN,
      status: EvaluationStatus.IN_PROGRESS,
    });

    evaluation.markEvaluating();
    return evaluation;
  }
}
