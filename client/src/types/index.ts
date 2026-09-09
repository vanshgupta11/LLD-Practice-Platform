export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EVALUATING" | "COMPLETED" | "FAILED";

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  architecture: string;
}

export interface EvaluationCriterion {
  key: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface Rubric {
  id: string;
  problemId: string;
  totalMaxScore: number;
  criteria: EvaluationCriterion[];
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string;
  requirements: string[];
  assumptions: string[];
  difficulty: DifficultyLevel;
  rubric: Rubric;
}

export interface CriterionResult {
  criterionKey: string;
  criterionName: string;
  score: number;
  maxScore: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

export interface Evaluation {
  id: string;
  attemptId: string;
  evaluatorType: string;
  status: string;
  criteriaResults: CriterionResult[];
  overallScore: number;
  summary: string;
  createdAt: string;
  completedAt?: string;
}

export interface Submission {
  id: string;
  attemptId: string;
  assumptions: string;
  classDesign: string;
  explanation: string;
  code: string;
  submittedAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  problem: Problem;
  status: AttemptStatus;
  submission?: Submission | null;
  evaluation?: Evaluation | null;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}
