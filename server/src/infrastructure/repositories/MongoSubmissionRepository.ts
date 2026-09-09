import { ISubmissionRepository } from "../../domain/repositories/ISubmissionRepository";
import { Submission } from "../../domain/entities/Submission";
import { SubmissionModel, ISubmissionDocument } from "../database/models/SubmissionModel";

export class MongoSubmissionRepository implements ISubmissionRepository {
  async create(submission: Submission): Promise<Submission> {
    const doc = await SubmissionModel.create({
      _id: submission.id,
      attemptId: submission.attemptId,
      assumptions: submission.assumptions,
      classDesign: submission.classDesign,
      explanation: submission.explanation,
      code: submission.code,
      submittedAt: submission.submittedAt,
    });

    return this.toDomain(doc);
  }

  async findByAttemptId(attemptId: string): Promise<Submission | null> {
    const doc = await SubmissionModel.findOne({ attemptId }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async deleteByAttemptId(attemptId: string): Promise<boolean> {
    const result = await SubmissionModel.deleteMany({ attemptId }).exec();
    return (result.deletedCount || 0) > 0;
  }

  private toDomain(doc: ISubmissionDocument): Submission {
    return new Submission({
      id: doc._id,
      attemptId: doc.attemptId,
      assumptions: doc.assumptions,
      classDesign: doc.classDesign,
      explanation: doc.explanation,
      code: doc.code,
      submittedAt: doc.submittedAt,
    });
  }
}
