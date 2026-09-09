import { IProblemRepository } from "../../domain/repositories/IProblemRepository";
import { Problem } from "../../domain/entities/Problem";
import { Rubric } from "../../domain/entities/Rubric";
import { EvaluationCriterion } from "../../domain/entities/EvaluationCriterion";
import { DifficultyLevel } from "../../domain/enums/DifficultyLevel";
import { ProblemModel, IProblemDocument } from "../database/models/ProblemModel";

export class MongoProblemRepository implements IProblemRepository {
  async findAll(): Promise<Problem[]> {
    const docs = await ProblemModel.find().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findById(id: string): Promise<Problem | null> {
    const doc = await ProblemModel.findOne({ _id: id }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  private toDomain(doc: IProblemDocument): Problem {
    const criteria = (doc.rubric.criteria || []).map(
      (c) =>
        new EvaluationCriterion({
          key: c.key,
          name: c.name,
          description: c.description,
          weight: c.weight,
          maxScore: c.maxScore,
        })
    );

    const rubric = new Rubric({
      id: doc.rubric.id,
      problemId: doc.rubric.problemId,
      criteria,
    });

    return new Problem({
      id: doc._id,
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      requirements: doc.requirements,
      assumptions: doc.assumptions,
      difficulty: doc.difficulty as DifficultyLevel,
      rubric,
    });
  }
}
