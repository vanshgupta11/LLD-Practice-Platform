export interface CriterionResultProps {
  criterionKey: string;
  criterionName: string;
  score: number;
  maxScore: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

export class CriterionResult {
  public readonly criterionKey: string;
  public readonly criterionName: string;
  public readonly score: number;
  public readonly maxScore: number;
  public readonly evidence: string;
  public readonly concern: string;
  public readonly suggestion: string;
  public readonly confidence: number;

  constructor(props: CriterionResultProps) {
    if (!props.criterionKey) throw new Error("CriterionResult criterionKey is required.");
    if (props.score < 0 || props.score > props.maxScore) {
      throw new Error(`Score (${props.score}) must be between 0 and maxScore (${props.maxScore}).`);
    }
    if (props.confidence < 0 || props.confidence > 1) {
      throw new Error(`Confidence (${props.confidence}) must be between 0.0 and 1.0.`);
    }

    this.criterionKey = props.criterionKey;
    this.criterionName = props.criterionName;
    this.score = props.score;
    this.maxScore = props.maxScore;
    this.evidence = props.evidence;
    this.concern = props.concern;
    this.suggestion = props.suggestion;
    this.confidence = props.confidence;
  }

  getScorePercentage(): number {
    return this.maxScore > 0 ? Math.round((this.score / this.maxScore) * 100) : 0;
  }
}
