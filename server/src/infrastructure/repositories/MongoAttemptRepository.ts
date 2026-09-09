import { IAttemptRepository } from "../../domain/repositories/IAttemptRepository";
import { Attempt } from "../../domain/entities/Attempt";
import { AttemptStatus } from "../../domain/enums/AttemptStatus";
import { IProblemRepository } from "../../domain/repositories/IProblemRepository";
import { ISubmissionRepository } from "../../domain/repositories/ISubmissionRepository";
import { IEvaluationRepository } from "../../domain/repositories/IEvaluationRepository";
import { AttemptModel, IAttemptDocument } from "../database/models/AttemptModel";
import { MongoProblemRepository } from "./MongoProblemRepository";
import { MongoSubmissionRepository } from "./MongoSubmissionRepository";
import { MongoEvaluationRepository } from "./MongoEvaluationRepository";

export class MongoAttemptRepository implements IAttemptRepository {
  constructor(
    private problemRepo: IProblemRepository = new MongoProblemRepository(),
    private submissionRepo: ISubmissionRepository = new MongoSubmissionRepository(),
    private evaluationRepo: IEvaluationRepository = new MongoEvaluationRepository()
  ) {}

  async create(attempt: Attempt): Promise<Attempt> {
    const doc = await AttemptModel.create({
      _id: attempt.id,
      userId: attempt.userId,
      problemId: attempt.problem.id,
      status: attempt.status,
      errorMessage: attempt.errorMessage,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      completedAt: attempt.completedAt,
    });

    if (attempt.submission) {
      await this.submissionRepo.create(attempt.submission);
    }
    if (attempt.evaluation) {
      await this.evaluationRepo.create(attempt.evaluation);
    }

    return (await this.findById(doc._id))!;
  }

  async findById(id: string): Promise<Attempt | null> {
    const doc = await AttemptModel.findOne({ _id: id }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async updateStatus(
    id: string,
    status: AttemptStatus,
    errorMessage?: string
  ): Promise<Attempt | null> {
    const updateData: any = { status };
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    if (status === AttemptStatus.SUBMITTED) {
      updateData.submittedAt = new Date();
    } else if (status === AttemptStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const doc = await AttemptModel.findOneAndUpdate({ _id: id }, updateData, {
      new: true,
    }).exec();

    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByUser(userId: string): Promise<Attempt[]> {
    const docs = await AttemptModel.find({ userId }).sort({ startedAt: -1 }).exec();
    const attempts = await Promise.all(docs.map((doc) => this.toDomain(doc)));
    return attempts;
  }

  async findByUserAndProblem(userId: string, problemId: string): Promise<Attempt[]> {
    const docs = await AttemptModel.find({ userId, problemId })
      .sort({ startedAt: -1 })
      .exec();
    const attempts = await Promise.all(docs.map((doc) => this.toDomain(doc)));
    return attempts;
  }

  async delete(id: string): Promise<boolean> {
    // Delete associated submissions and evaluations
    await Promise.all([
      this.submissionRepo.deleteByAttemptId(id),
      this.evaluationRepo.deleteByAttemptId(id),
      AttemptModel.deleteOne({ _id: id }).exec(),
    ]);
    return true;
  }

  private async toDomain(doc: IAttemptDocument): Promise<Attempt> {
    const problem = await this.problemRepo.findById(doc.problemId);
    if (!problem) {
      throw new Error(`Problem not found for attempt: ${doc.problemId}`);
    }

    const submission = await this.submissionRepo.findByAttemptId(doc._id);
    const evaluation = await this.evaluationRepo.findByAttemptId(doc._id);

    return new Attempt({
      id: doc._id,
      userId: doc.userId,
      problem,
      status: doc.status as AttemptStatus,
      submission,
      evaluation,
      errorMessage: doc.errorMessage,
      startedAt: doc.startedAt,
      submittedAt: doc.submittedAt,
      completedAt: doc.completedAt,
    });
  }
}
