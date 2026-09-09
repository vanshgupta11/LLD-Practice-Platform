import { IEvaluationRepository } from "../../domain/repositories/IEvaluationRepository";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";
import { EvaluationModel, IEvaluationDocument } from "../database/models/EvaluationModel";

export class MongoEvaluationRepository implements IEvaluationRepository {
  async create(evaluation: Evaluation): Promise<Evaluation> {
    const doc = await EvaluationModel.create({
      _id: evaluation.id,
      attemptId: evaluation.attemptId,
      evaluatorType: evaluation.evaluatorType,
      status: evaluation.status,
      overallScore: evaluation.overallScore,
      summary: evaluation.summary,
      criteriaResults: evaluation.criteriaResults.map((cr) => ({
        criterionKey: cr.criterionKey,
        criterionName: cr.criterionName,
        score: cr.score,
        maxScore: cr.maxScore,
        evidence: cr.evidence,
        concern: cr.concern,
        suggestion: cr.suggestion,
        confidence: cr.confidence,
      })),
      completedAt: evaluation.completedAt,
    });

    return this.toDomain(doc);
  }

  async findByAttemptId(attemptId: string): Promise<Evaluation | null> {
    const doc = await EvaluationModel.findOne({ attemptId }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async update(evaluation: Evaluation): Promise<Evaluation | null> {
    const doc = await EvaluationModel.findOneAndUpdate(
      { _id: evaluation.id },
      {
        status: evaluation.status,
        overallScore: evaluation.overallScore,
        summary: evaluation.summary,
        criteriaResults: evaluation.criteriaResults.map((cr) => ({
          criterionKey: cr.criterionKey,
          criterionName: cr.criterionName,
          score: cr.score,
          maxScore: cr.maxScore,
          evidence: cr.evidence,
          concern: cr.concern,
          suggestion: cr.suggestion,
          confidence: cr.confidence,
        })),
        completedAt: evaluation.completedAt,
      },
      { new: true }
    ).exec();

    if (!doc) return null;
    return this.toDomain(doc);
  }

  async deleteByAttemptId(attemptId: string): Promise<boolean> {
    const result = await EvaluationModel.deleteMany({ attemptId }).exec();
    return (result.deletedCount || 0) > 0;
  }

  private toDomain(doc: IEvaluationDocument): Evaluation {
    const criteriaResults = (doc.criteriaResults || []).map(
      (cr) =>
        new CriterionResult({
          criterionKey: cr.criterionKey,
          criterionName: cr.criterionName,
          score: cr.score,
          maxScore: cr.maxScore,
          evidence: cr.evidence,
          concern: cr.concern,
          suggestion: cr.suggestion,
          confidence: cr.confidence,
        })
    );

    return new Evaluation({
      id: doc._id,
      attemptId: doc.attemptId,
      evaluatorType: doc.evaluatorType as EvaluatorType,
      status: doc.status as EvaluationStatus,
      overallScore: doc.overallScore,
      summary: doc.summary,
      criteriaResults,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    });
  }
}
