export interface EvaluationCriterionProps {
  key: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export class EvaluationCriterion {
  public readonly key: string;
  public readonly name: string;
  public readonly description: string;
  public readonly weight: number;
  public readonly maxScore: number;

  constructor(props: EvaluationCriterionProps) {
    if (!props.key || props.key.trim() === "") {
      throw new Error("EvaluationCriterion key cannot be empty.");
    }
    if (!props.name || props.name.trim() === "") {
      throw new Error("EvaluationCriterion name cannot be empty.");
    }
    if (props.maxScore <= 0) {
      throw new Error("EvaluationCriterion maxScore must be greater than zero.");
    }
    if (props.weight < 0) {
      throw new Error("EvaluationCriterion weight cannot be negative.");
    }

    this.key = props.key;
    this.name = props.name;
    this.description = props.description;
    this.weight = props.weight;
    this.maxScore = props.maxScore;
  }

  toJSON(): Record<string, any> {
    return {
      key: this.key,
      name: this.name,
      description: this.description,
      weight: this.weight,
      maxScore: this.maxScore,
    };
  }
}
