import { DifficultyLevel } from "../enums/DifficultyLevel";
import { Rubric } from "./Rubric";

export interface ProblemProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  requirements: string[];
  assumptions: string[];
  difficulty: DifficultyLevel;
  rubric: Rubric;
}

export class Problem {
  public readonly id: string;
  public readonly slug: string;
  public readonly title: string;
  public readonly description: string;
  public readonly requirements: string[];
  public readonly assumptions: string[];
  public readonly difficulty: DifficultyLevel;
  public readonly rubric: Rubric;

  constructor(props: ProblemProps) {
    if (!props.id) throw new Error("Problem id is required.");
    if (!props.title || props.title.trim() === "") {
      throw new Error("Problem title cannot be empty.");
    }
    if (!props.description || props.description.trim() === "") {
      throw new Error("Problem description cannot be empty.");
    }
    if (!props.requirements || props.requirements.length === 0) {
      throw new Error("Problem must specify at least one requirement.");
    }

    this.id = props.id;
    this.slug = props.slug;
    this.title = props.title;
    this.description = props.description;
    this.requirements = [...props.requirements];
    this.assumptions = props.assumptions ? [...props.assumptions] : [];
    this.difficulty = props.difficulty;
    this.rubric = props.rubric;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      slug: this.slug,
      title: this.title,
      description: this.description,
      requirements: this.requirements,
      assumptions: this.assumptions,
      difficulty: this.difficulty,
      rubric: this.rubric ? this.rubric.toJSON() : null,
    };
  }
}
