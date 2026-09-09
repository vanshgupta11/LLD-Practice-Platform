import { IAttemptRepository } from "../domain/repositories/IAttemptRepository";
import { IProblemRepository } from "../domain/repositories/IProblemRepository";
import { Attempt } from "../domain/entities/Attempt";
import { AttemptStatus } from "../domain/enums/AttemptStatus";

export interface StartAttemptCommand {
  userId: string;
  problemId: string;
}

/**
 * AttemptService — Application Layer
 *
 * Responsibility: Manage the lifecycle of a learner's practice attempt —
 * creation, retrieval, deletion, and history queries.
 */
export class AttemptService {
  constructor(
    private readonly attemptRepo: IAttemptRepository,
    private readonly problemRepo: IProblemRepository
  ) {}

  async startAttempt(cmd: StartAttemptCommand): Promise<Attempt> {
    const problem = await this.problemRepo.findById(cmd.problemId);
    if (!problem) {
      throw new Error(`Problem not found: ${cmd.problemId}`);
    }

    // Resume the most recent IN_PROGRESS attempt rather than creating a duplicate
    const existing = await this.attemptRepo.findByUserAndProblem(cmd.userId, cmd.problemId);
    const active = existing.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    if (active) {
      return active;
    }

    const attempt = new Attempt({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: cmd.userId,
      problem,
    });

    return this.attemptRepo.create(attempt);
  }

  async getAttempt(attemptId: string): Promise<Attempt> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }
    return attempt;
  }

  async getUserHistory(userId: string): Promise<Attempt[]> {
    return this.attemptRepo.findByUser(userId);
  }

  async listAttempts(userId?: string): Promise<Attempt[]> {
    if (userId) {
      return this.attemptRepo.findByUser(userId);
    }
    return [];
  }

  async getUserProblemHistory(userId: string, problemId: string): Promise<Attempt[]> {
    return this.attemptRepo.findByUserAndProblem(userId, problemId);
  }

  async deleteAttempt(attemptId: string): Promise<boolean> {
    const attempt = await this.attemptRepo.findById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }
    return this.attemptRepo.delete(attemptId);
  }
}
