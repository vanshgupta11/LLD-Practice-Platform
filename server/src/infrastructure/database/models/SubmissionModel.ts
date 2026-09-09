import mongoose, { Schema } from "mongoose";

export interface ISubmissionDocument {
  _id: string;
  attemptId: string;
  assumptions: string;
  classDesign: string;
  explanation: string;
  code: string;
  submittedAt: Date;
}

const SubmissionSchema = new Schema<ISubmissionDocument>(
  {
    _id: { type: String, required: true },
    attemptId: { type: String, required: true, index: true },
    assumptions: { type: String, default: "" },
    classDesign: { type: String, default: "" },
    explanation: { type: String, default: "" },
    code: { type: String, default: "" },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, _id: false }
);

export const SubmissionModel = mongoose.model<ISubmissionDocument>("Submission", SubmissionSchema);
