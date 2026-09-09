import mongoose, { Schema } from "mongoose";

export interface IAttemptDocument {
  _id: string;
  userId: string;
  problemId: string;
  status: string;
  errorMessage?: string;
  startedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
}

const AttemptSchema = new Schema<IAttemptDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    problemId: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["IN_PROGRESS", "SUBMITTED", "EVALUATING", "COMPLETED", "FAILED"],
      default: "IN_PROGRESS",
    },
    errorMessage: { type: String },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true, _id: false }
);

AttemptSchema.index({ userId: 1, problemId: 1 });

export const AttemptModel = mongoose.model<IAttemptDocument>("Attempt", AttemptSchema);
