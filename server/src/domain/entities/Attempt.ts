import { AttemptStatus } from "../enums/AttemptStatus";
import { Problem } from "./Problem";
import { Submission } from "./Submission";
import { Evaluation } from "./Evaluation";
import { InvalidStateTransitionException } from "../exceptions/InvalidStateTransitionException";

export interface AttemptProps {
  id: string;
  userId: string;
  problem: Problem;
  status?: AttemptStatus;
  submission?: Submission | null;
  evaluation?: Evaluation | null;
  errorMessage?: string;
  startedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
}

export class Attempt {
  public readonly id: string;
  public readonly userId: string;
  public readonly problem: Problem;
  private _status: AttemptStatus;
  private _submission: Submission | null;
  private _evaluation: Evaluation | null;
  private _errorMessage?: string;
  public readonly startedAt: Date;
  private _submittedAt?: Date;
  private _completedAt?: Date;

  constructor(props: AttemptProps) {
    if (!props.id) throw new Error("Attempt id is required.");
    if (!props.userId) throw new Error("Attempt userId is required.");
    if (!props.problem) throw new Error("Attempt problem is required.");

    this.id = props.id;
    this.userId = props.userId;
    this.problem = props.problem;
    this._status = props.status || AttemptStatus.IN_PROGRESS;
    this._submission = props.submission || null;
    this._evaluation = props.evaluation || null;
    this._errorMessage = props.errorMessage;
    this.startedAt = props.startedAt || new Date();
    this._submittedAt = props.submittedAt;
    this._completedAt = props.completedAt;
  }

  get status(): AttemptStatus {
    return this._status;
  }

  get submission(): Submission | null {
    return this._submission;
  }

  get evaluation(): Evaluation | null {
    return this._evaluation;
  }

  get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  get submittedAt(): Date | undefined {
    return this._submittedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  /**
   * Transition: IN_PROGRESS / FAILED → SUBMITTED
   */
  submit(submission: Submission): void {
    if (
      this._status !== AttemptStatus.IN_PROGRESS &&
      this._status !== AttemptStatus.FAILED
    ) {
      throw new InvalidStateTransitionException(
        this._status,
        AttemptStatus.SUBMITTED,
        `Cannot submit attempt in state '${this._status}'. Attempt must be in IN_PROGRESS or FAILED state.`
      );
    }

    const validation = submission.validateCompleteness();
    if (!validation.isValid) {
      throw new Error(
        `Submission is incomplete. Missing required sections: ${validation.missingSections.join(
          ", "
        )}`
      );
    }

    this._submission = submission;
    this._status = AttemptStatus.SUBMITTED;
    this._submittedAt = new Date();
    this._errorMessage = undefined;
  }

  /**
   * Transition: SUBMITTED / FAILED → EVALUATING
   */
  startEvaluating(): void {
    if (
      this._status !== AttemptStatus.SUBMITTED &&
      this._status !== AttemptStatus.FAILED
    ) {
      throw new InvalidStateTransitionException(
        this._status,
        AttemptStatus.EVALUATING,
        `Cannot start evaluation for attempt in state '${this._status}'. Attempt must be SUBMITTED or FAILED.`
      );
    }

    this._status = AttemptStatus.EVALUATING;
    this._errorMessage = undefined;
  }

  /**
   * Transition: EVALUATING → COMPLETED
   */
  completeEvaluation(evaluation: Evaluation): void {
    if (this._status !== AttemptStatus.EVALUATING) {
      throw new InvalidStateTransitionException(
        this._status,
        AttemptStatus.COMPLETED,
        `Cannot complete evaluation for attempt in state '${this._status}'. Must be in EVALUATING state.`
      );
    }

    this._evaluation = evaluation;
    this._status = AttemptStatus.COMPLETED;
    this._completedAt = new Date();
    this._errorMessage = undefined;
  }

  /**
   * Transition: EVALUATING / SUBMITTED → FAILED
   */
  failEvaluation(reason: string): void {
    if (
      this._status !== AttemptStatus.EVALUATING &&
      this._status !== AttemptStatus.SUBMITTED
    ) {
      throw new InvalidStateTransitionException(
        this._status,
        AttemptStatus.FAILED,
        `Cannot fail evaluation for attempt in state '${this._status}'.`
      );
    }

    this._status = AttemptStatus.FAILED;
    this._errorMessage = reason;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      problem: this.problem.toJSON(),
      status: this._status,
      submission: this._submission ? this._submission.toJSON() : null,
      evaluation: this._evaluation ? this._evaluation.toJSON() : null,
      startedAt: this.startedAt,
      completedAt: this._completedAt,
      errorMessage: this._errorMessage,
    };
  }
}
