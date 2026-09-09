import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoAttemptRepository } from "../infrastructure/repositories/MongoAttemptRepository";
import { MongoSubmissionRepository } from "../infrastructure/repositories/MongoSubmissionRepository";
import { MongoEvaluationRepository } from "../infrastructure/repositories/MongoEvaluationRepository";
import { SubmissionService } from "./SubmissionService";
import { EvaluationService } from "./EvaluationService";
import { AttemptService } from "./AttemptService";
import { MongoProblemRepository } from "../infrastructure/repositories/MongoProblemRepository";
import { seedProblems } from "../infrastructure/database/seed";
import { IEvaluator } from "../domain/interfaces/IEvaluator";
import { Problem } from "../domain/entities/Problem";
import { Submission } from "../domain/entities/Submission";
import { Rubric } from "../domain/entities/Rubric";
import { Evaluation } from "../domain/entities/Evaluation";
import { EvaluatorType } from "../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../domain/enums/EvaluationStatus";
import { CriterionResult } from "../domain/value-objects/CriterionResult";
import { MockEvaluator } from "../infrastructure/evaluators/MockEvaluator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePassingEvaluation(attemptId: string): Evaluation {
  const e = new Evaluation({
    id: `eval-test-${Date.now()}`,
    attemptId,
    evaluatorType: EvaluatorType.RULE_BASED,
    status: EvaluationStatus.IN_PROGRESS,
  });
  e.markEvaluating();
  e.complete(
    [new CriterionResult({ criterionKey: "K", criterionName: "N", score: 8, maxScore: 10, evidence: "e", concern: "c", suggestion: "s", confidence: 0.9 })],
    "Good design",
    80
  );
  return e;
}

/** Fake evaluator that always succeeds */
class AlwaysPassEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.RULE_BASED;
  async evaluate(_: Problem, submission: Submission, __: Rubric, attemptId?: string): Promise<Evaluation> {
    return makePassingEvaluation(attemptId ?? submission.attemptId);
  }
}

/** Fake evaluator that always throws */
class AlwaysFailEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.LLM;
  async evaluate(): Promise<Evaluation> {
    throw new Error("Simulated LLM failure");
  }
}

/** Spy evaluator — counts invocations */
class SpyEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.RULE_BASED;
  public callCount = 0;
  async evaluate(_: Problem, submission: Submission, __: Rubric, attemptId?: string): Promise<Evaluation> {
    this.callCount++;
    return makePassingEvaluation(attemptId ?? submission.attemptId);
  }
}

// ─── Suite Setup ─────────────────────────────────────────────────────────────

describe("Application Services — Submission & Evaluation (in-memory DB)", () => {
  let mongoServer: MongoMemoryServer;
  let attemptService: AttemptService;
  let submissionService: SubmissionService;
  let attemptRepo: MongoAttemptRepository;
  let submissionRepo: MongoSubmissionRepository;
  let evaluationRepo: MongoEvaluationRepository;

  const USER_ID = "svc-test-user";
  const PROBLEM_ID = "prob-parking-lot";

  const VALID_SUBMISSION = {
    assumptions: "Single entrance/exit with automated ticketing system.",
    classDesign: "class ParkingLot { floors: Floor[]; strategy: ParkingStrategy; parkVehicle(v: Vehicle): Ticket; }",
    explanation: "Used Strategy pattern for fee calculation and SRP to isolate concerns per class.",
    code: "export class ParkingLot { constructor(private strategy: ParkingStrategy) {} }",
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedProblems();

    attemptRepo = new MongoAttemptRepository();
    submissionRepo = new MongoSubmissionRepository();
    evaluationRepo = new MongoEvaluationRepository();
    const problemRepo = new MongoProblemRepository();

    attemptService = new AttemptService(attemptRepo, problemRepo);
    submissionService = new SubmissionService(attemptRepo, submissionRepo);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // ── SubmissionService ──────────────────────────────────────────────────────

  describe("SubmissionService", () => {
    it("saves submission and transitions attempt to SUBMITTED", async () => {
      const attempt = await attemptService.startAttempt({ userId: USER_ID, problemId: PROBLEM_ID });
      const result = await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      expect(result.attempt.status).toBe("SUBMITTED");
      expect(result.submission.id).toBeDefined();
      expect(result.submission.assumptions).toBe(VALID_SUBMISSION.assumptions);

      // Submission must be persisted before any evaluation
      const persisted = await submissionRepo.findByAttemptId(attempt.id);
      expect(persisted).not.toBeNull();
      expect(persisted!.code).toBe(VALID_SUBMISSION.code);
    });

    it("rejects submission when all fields are empty", async () => {
      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-2`, problemId: PROBLEM_ID });
      await expect(
        submissionService.submit({
          attemptId: attempt.id,
          assumptions: "",
          classDesign: "",
          explanation: "",
          code: "",
        })
      ).rejects.toThrow(/Submission is incomplete/);

      // Attempt must remain IN_PROGRESS when submission is rejected
      const reloaded = await attemptRepo.findById(attempt.id);
      expect(reloaded!.status).toBe("IN_PROGRESS");
    });

    it("rejects a second submission to the same IN_PROGRESS attempt (duplicate guard)", async () => {
      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-dup`, problemId: PROBLEM_ID });
      await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      await expect(
        submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION })
      ).rejects.toThrow(/submission already exists|Only IN_PROGRESS or FAILED/i);
    });

    it("throws when submitting to a non-existent attempt", async () => {
      await expect(
        submissionService.submit({ attemptId: "nonexistent-att", ...VALID_SUBMISSION })
      ).rejects.toThrow(/Attempt not found/);
    });
  });

  // ── EvaluationService ──────────────────────────────────────────────────────

  describe("EvaluationService", () => {
    it("transitions SUBMITTED → EVALUATING → COMPLETED on success", async () => {
      const evaluator = new AlwaysPassEvaluator();
      const svc = new EvaluationService(attemptRepo, evaluationRepo, evaluator);

      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-eval-ok`, problemId: PROBLEM_ID });
      await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      const evaluation = await svc.evaluate(attempt.id);

      expect(evaluation.status).toBe("COMPLETED");
      expect(evaluation.overallScore).toBeGreaterThan(0);
      expect(evaluation.criteriaResults.length).toBeGreaterThan(0);

      const reloadedAttempt = await attemptRepo.findById(attempt.id);
      expect(reloadedAttempt!.status).toBe("COMPLETED");
    });

    it("transitions SUBMITTED → EVALUATING → FAILED when evaluator throws", async () => {
      const evaluator = new AlwaysFailEvaluator();
      const svc = new EvaluationService(attemptRepo, evaluationRepo, evaluator);

      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-eval-fail`, problemId: PROBLEM_ID });
      await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      await expect(svc.evaluate(attempt.id)).rejects.toThrow(/Evaluation failed/);

      // Attempt must be FAILED
      const reloadedAttempt = await attemptRepo.findById(attempt.id);
      expect(reloadedAttempt!.status).toBe("FAILED");

      // Submission must still be persisted after failure (invariant)
      const sub = await submissionRepo.findByAttemptId(attempt.id);
      expect(sub).not.toBeNull();
      expect(sub!.code).toBe(VALID_SUBMISSION.code);
    });

    it("does not call evaluator a second time for a COMPLETED attempt (idempotency)", async () => {
      const spy = new SpyEvaluator();
      const svc = new EvaluationService(attemptRepo, evaluationRepo, spy);

      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-idem`, problemId: PROBLEM_ID });
      await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      await svc.evaluate(attempt.id); // first call — evaluator invoked
      await svc.evaluate(attempt.id); // second call — must return cached evaluation

      expect(spy.callCount).toBe(1);
    });

    it("rejects evaluation of an attempt that was never submitted", async () => {
      const evaluator = new AlwaysPassEvaluator();
      const svc = new EvaluationService(attemptRepo, evaluationRepo, evaluator);

      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-no-sub`, problemId: PROBLEM_ID });

      await expect(svc.evaluate(attempt.id)).rejects.toThrow(
        /Cannot evaluate attempt in status 'IN_PROGRESS'/
      );
    });

    it("allows retry evaluation after FAILED (submission preserved)", async () => {
      const failEvaluator = new AlwaysFailEvaluator();
      const passingEvaluator = new AlwaysPassEvaluator();
      const failSvc = new EvaluationService(attemptRepo, evaluationRepo, failEvaluator);
      const retryEvalSvc = new EvaluationService(attemptRepo, evaluationRepo, passingEvaluator);

      const attempt = await attemptService.startAttempt({ userId: `${USER_ID}-retry`, problemId: PROBLEM_ID });
      await submissionService.submit({ attemptId: attempt.id, ...VALID_SUBMISSION });

      // First attempt fails
      await expect(failSvc.evaluate(attempt.id)).rejects.toThrow(/Evaluation failed/);

      // Submission must survive failure
      const sub = await submissionRepo.findByAttemptId(attempt.id);
      expect(sub).not.toBeNull();

      // Retry succeeds
      const eval_ = await retryEvalSvc.evaluate(attempt.id);
      expect(eval_.status).toBe("COMPLETED");

      const reloaded = await attemptRepo.findById(attempt.id);
      expect(reloaded!.status).toBe("COMPLETED");
    });
  });
});
