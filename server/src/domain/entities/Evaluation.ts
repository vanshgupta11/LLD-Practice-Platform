import { EvaluatorType } from "../enums/EvaluatorType";
import { EvaluationStatus } from "../enums/EvaluationStatus";
import { CriterionResult } from "../value-objects/CriterionResult";
import { InvalidStateTransitionException } from "../exceptions/InvalidStateTransitionException";

export interface EvaluationProps {
  id: string;
  attemptId: string;
  evaluatorType: EvaluatorType;
  status?: EvaluationStatus;
  criteriaResults?: CriterionResult[];
  overallScore?: number;
  summary?: string;
  createdAt?: Date;
  completedAt?: Date;
}

export class Evaluation {
  public readonly id: string;
  public readonly attemptId: string;
  public readonly evaluatorType: EvaluatorType;
  private _status: EvaluationStatus;
  private _criteriaResults: CriterionResult[];
  private _overallScore: number;
  private _summary: string;
  public readonly createdAt: Date;
  private _completedAt?: Date;

  constructor(props: EvaluationProps) {
    if (!props.id) throw new Error("Evaluation id is required.");
    if (!props.attemptId) throw new Error("Evaluation attemptId is required.");

    this.id = props.id;
    this.attemptId = props.attemptId;
    this.evaluatorType = props.evaluatorType;
    this._status = props.status || EvaluationStatus.PENDING;
    this._criteriaResults = props.criteriaResults ? [...props.criteriaResults] : [];
    this._overallScore = props.overallScore ?? 0;
    this._summary = props.summary || "";
    this.createdAt = props.createdAt || new Date();
    this._completedAt = props.completedAt;
  }

  get status(): EvaluationStatus {
    return this._status;
  }

  get criteriaResults(): CriterionResult[] {
    return [...this._criteriaResults];
  }

  get overallScore(): number {
    return this._overallScore;
  }

  get summary(): string {
    return this._summary;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  markEvaluating(): void {
    if (this._status !== EvaluationStatus.PENDING && this._status !== EvaluationStatus.FAILED && this._status !== EvaluationStatus.IN_PROGRESS) {
      throw new InvalidStateTransitionException(this._status, EvaluationStatus.IN_PROGRESS);
    }
    this._status = EvaluationStatus.IN_PROGRESS;
  }

  complete(results: CriterionResult[], summary: string, overallScore?: number): void {
    if (this._status !== EvaluationStatus.IN_PROGRESS) {
      throw new InvalidStateTransitionException(this._status, EvaluationStatus.COMPLETED);
    }

    this._criteriaResults = [...results];
    this._summary = summary;

    if (overallScore !== undefined) {
      this._overallScore = overallScore;
    } else {
      // Calculate weighted overall score
      let totalEarned = 0;
      let totalMax = 0;
      for (const r of results) {
        totalEarned += r.score;
        totalMax += r.maxScore;
      }
      this._overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    }

    this._status = EvaluationStatus.COMPLETED;
    this._completedAt = new Date();
  }

  fail(reason: string): void {
    this._status = EvaluationStatus.FAILED;
    this._summary = `Evaluation failed: ${reason}`;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      attemptId: this.attemptId,
      evaluatorType: this.evaluatorType,
      status: this._status,
      criteriaResults: this._criteriaResults.map((c) => ({
        criterionKey: c.criterionKey,
        criterionName: c.criterionName,
        score: c.score,
        maxScore: c.maxScore,
        evidence: c.evidence,
        concern: c.concern,
        suggestion: c.suggestion,
        confidence: c.confidence,
      })),
      overallScore: this._overallScore,
      summary: this._summary,
      createdAt: this.createdAt,
      completedAt: this._completedAt,
    };
  }
}
