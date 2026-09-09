import { Submission } from "../entities/Submission";

export interface ISubmissionRepository {
  create(submission: Submission): Promise<Submission>;
  findByAttemptId(attemptId: string): Promise<Submission | null>;
  deleteByAttemptId(attemptId: string): Promise<boolean>;
}
