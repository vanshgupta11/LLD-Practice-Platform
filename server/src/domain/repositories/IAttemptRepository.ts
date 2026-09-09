import { Attempt } from "../entities/Attempt";
import { AttemptStatus } from "../enums/AttemptStatus";

export interface IAttemptRepository {
  create(attempt: Attempt): Promise<Attempt>;
  findById(id: string): Promise<Attempt | null>;
  updateStatus(id: string, status: AttemptStatus, errorMessage?: string): Promise<Attempt | null>;
  findByUser(userId: string): Promise<Attempt[]>;
  findByUserAndProblem(userId: string, problemId: string): Promise<Attempt[]>;
  delete(id: string): Promise<boolean>;
}
