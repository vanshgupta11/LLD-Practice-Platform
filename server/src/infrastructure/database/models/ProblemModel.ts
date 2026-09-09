import mongoose, { Schema } from "mongoose";

export interface IProblemDocument {
  _id: string;
  slug: string;
  title: string;
  description: string;
  requirements: string[];
  assumptions: string[];
  difficulty: string;
  rubric: {
    id: string;
    problemId: string;
    criteria: Array<{
      key: string;
      name: string;
      description: string;
      weight: number;
      maxScore: number;
    }>;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const EvaluationCriterionSchema = new Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  weight: { type: Number, required: true, default: 20 },
  maxScore: { type: Number, required: true, default: 100 },
});

const RubricSchema = new Schema({
  id: { type: String, required: true },
  problemId: { type: String, required: true },
  criteria: [EvaluationCriterionSchema],
});

const ProblemSchema = new Schema<IProblemDocument>(
  {
    _id: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String, required: true }],
    assumptions: [{ type: String }],
    difficulty: { type: String, required: true, enum: ["EASY", "MEDIUM", "HARD"] },
    rubric: { type: RubricSchema, required: true },
  },
  { timestamps: true, _id: false }
);

export const ProblemModel = mongoose.model<IProblemDocument>("Problem", ProblemSchema);
