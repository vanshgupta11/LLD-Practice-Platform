import { EvaluationCriterion } from "./EvaluationCriterion";

export interface RubricProps {
  id: string;
  problemId: string;
  criteria: EvaluationCriterion[];
}

export class Rubric {
  public readonly id: string;
  public readonly problemId: string;
  private readonly _criteria: Map<string, EvaluationCriterion>;

  constructor(props: RubricProps) {
    if (!props.id) throw new Error("Rubric id is required.");
    if (!props.problemId) throw new Error("Rubric problemId is required.");
    if (!props.criteria || props.criteria.length === 0) {
      throw new Error("Rubric must contain at least one EvaluationCriterion.");
    }

    this.id = props.id;
    this.problemId = props.problemId;
    this._criteria = new Map<string, EvaluationCriterion>();

    for (const criterion of props.criteria) {
      this._criteria.set(criterion.key, criterion);
    }
  }

  get criteria(): EvaluationCriterion[] {
    return Array.from(this._criteria.values());
  }

  getCriterion(key: string): EvaluationCriterion | undefined {
    return this._criteria.get(key);
  }

  getTotalMaxScore(): number {
    let total = 0;
    for (const c of this._criteria.values()) {
      total += c.maxScore;
    }
    return total;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      problemId: this.problemId,
      totalMaxScore: this.getTotalMaxScore(),
      criteria: this.criteria.map((c) => c.toJSON()),
    };
  }
}
