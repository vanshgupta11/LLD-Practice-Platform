import mongoose, { Schema } from "mongoose";

export interface IEvaluationDocument {
  _id: string;
  attemptId: string;
  evaluatorType: string;
  status: string;
  overallScore: number;
  summary: string;
  criteriaResults: Array<{
    criterionKey: string;
    criterionName: string;
    score: number;
    maxScore: number;
    evidence: string;
    concern: string;
    suggestion: string;
    confidence: number;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

const CriterionResultSchema = new Schema({
  criterionKey: { type: String, required: true },
  criterionName: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  evidence: { type: String, default: "" },
  concern: { type: String, default: "" },
  suggestion: { type: String, default: "" },
  confidence: { type: Number, default: 0.9 },
});

const EvaluationSchema = new Schema<IEvaluationDocument>(
  {
    _id: { type: String, required: true },
    attemptId: { type: String, required: true, index: true },
    evaluatorType: { type: String, required: true },
    status: { type: String, required: true, default: "PENDING" },
    overallScore: { type: Number, default: 0 },
    summary: { type: String, default: "" },
    criteriaResults: [CriterionResultSchema],
    completedAt: { type: Date },
  },
  { timestamps: true, _id: false }
);

export const EvaluationModel = mongoose.model<IEvaluationDocument>("Evaluation", EvaluationSchema);
