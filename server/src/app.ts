import express, { Express } from "express";
import cors from "cors";

// Repositories
import { MongoProblemRepository } from "./infrastructure/repositories/MongoProblemRepository";
import { MongoAttemptRepository } from "./infrastructure/repositories/MongoAttemptRepository";
import { MongoSubmissionRepository } from "./infrastructure/repositories/MongoSubmissionRepository";
import { MongoEvaluationRepository } from "./infrastructure/repositories/MongoEvaluationRepository";

// Evaluators
import { LlmEvaluator } from "./infrastructure/evaluators/LlmEvaluator";
import { IEvaluator } from "./domain/interfaces/IEvaluator";

// Application Services
import { ProblemService } from "./application/ProblemService";
import { AttemptService } from "./application/AttemptService";
import { SubmissionService } from "./application/SubmissionService";
import { EvaluationService } from "./application/EvaluationService";

// Controllers
import { ProblemController } from "./interfaces/controllers/ProblemController";
import { AttemptController } from "./interfaces/controllers/AttemptController";
import { SubmissionController } from "./interfaces/controllers/SubmissionController";
import { EvaluationController } from "./interfaces/controllers/EvaluationController";

// Routers
import { createHealthRouter } from "./interfaces/routes/health.router";
import { createProblemRouter } from "./interfaces/routes/problem.router";
import { createAttemptRouter } from "./interfaces/routes/attempt.router";
import { createSubmissionRouter } from "./interfaces/routes/submission.router";
import { createEvaluationRouter } from "./interfaces/routes/evaluation.router";

// Middleware
import { errorHandler } from "./interfaces/middleware/errorHandler";

export interface AppDependencies {
  problemService?: ProblemService;
  attemptService?: AttemptService;
  submissionService?: SubmissionService;
  evaluationService?: EvaluationService;
  evaluator?: IEvaluator;
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Dependency Resolution
  const problemRepo = new MongoProblemRepository();
  const attemptRepo = new MongoAttemptRepository();
  const submissionRepo = new MongoSubmissionRepository();
  const evaluationRepo = new MongoEvaluationRepository();

  const evaluator = deps.evaluator || new LlmEvaluator({ fallbackToRuleBased: true });

  const problemService = deps.problemService || new ProblemService(problemRepo);
  const attemptService = deps.attemptService || new AttemptService(attemptRepo, problemRepo);
  const submissionService = deps.submissionService || new SubmissionService(attemptRepo, submissionRepo);
  const evaluationService = deps.evaluationService || new EvaluationService(attemptRepo, evaluationRepo, evaluator);

  // Controllers
  const problemController = new ProblemController(problemService);
  const attemptController = new AttemptController(attemptService, submissionService, evaluationService);
  const submissionController = new SubmissionController(submissionService);
  const evaluationController = new EvaluationController(evaluationService);

  // Mount Routers
  app.use("/api", createHealthRouter());
  app.use("/api/problems", createProblemRouter(problemController));
  app.use("/api/attempts", createAttemptRouter(attemptController));
  app.use("/api/submissions", createSubmissionRouter(submissionController));
  app.use("/api/evaluations", createEvaluationRouter(evaluationController));

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
