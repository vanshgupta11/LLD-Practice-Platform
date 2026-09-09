import { Evaluation } from "../entities/Evaluation";

export interface IEvaluationRepository {
  create(evaluation: Evaluation): Promise<Evaluation>;
  findByAttemptId(attemptId: string): Promise<Evaluation | null>;
  update(evaluation: Evaluation): Promise<Evaluation | null>;
  deleteByAttemptId(attemptId: string): Promise<boolean>;
}
