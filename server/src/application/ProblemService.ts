import { IProblemRepository } from "../domain/repositories/IProblemRepository";
import { Problem } from "../domain/entities/Problem";

/**
 * ProblemService — Application Layer
 *
 * Responsibility: Retrieve problems from the repository and present them
 * to callers (controllers). Contains no business logic of its own;
 * problems are read-only in the MVP.
 *
 * What it does NOT do:
 * - Does not validate HTTP requests (controller concern)
 * - Does not construct Mongoose queries (repository concern)
 * - Does not evaluate submissions (evaluation concern)
 */
export class ProblemService {
  constructor(private readonly problemRepo: IProblemRepository) {}

  async listProblems(): Promise<Problem[]> {
    return this.problemRepo.findAll();
  }

  async getProblem(id: string): Promise<Problem> {
    const problem = await this.problemRepo.findById(id);
    if (!problem) {
      throw new Error(`Problem not found: ${id}`);
    }
    return problem;
  }

  async getProblemById(id: string): Promise<Problem> {
    return this.getProblem(id);
  }
}
