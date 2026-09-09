import {
  Attempt,
  Problem,
  Rubric,
  EvaluationCriterion,
  Submission,
  Evaluation,
  AttemptStatus,
  DifficultyLevel,
  EvaluatorType,
  EvaluationStatus,
  CriterionResult,
  InvalidStateTransitionException,
} from "./index";

describe("Domain Model Unit Tests", () => {
  let sampleProblem: Problem;
  let sampleCriterion: EvaluationCriterion;
  let sampleRubric: Rubric;

  beforeEach(() => {
    sampleCriterion = new EvaluationCriterion({
      key: "SOLID_DESIGN",
      name: "SOLID Principles",
      description: "Adherence to SOLID OOD principles",
      weight: 30,
      maxScore: 100,
    });

    sampleRubric = new Rubric({
      id: "rubric-1",
      problemId: "prob-parking-lot",
      criteria: [sampleCriterion],
    });

    sampleProblem = new Problem({
      id: "prob-parking-lot",
      slug: "parking-lot",
      title: "Design a Parking Lot System",
      description: "Design an automated parking lot system handling multiple vehicle types and spot allocation.",
      requirements: ["Support Compact, Large, and Handicapped spots", "Calculate hourly fees"],
      assumptions: ["Single entrance and exit gate"],
      difficulty: DifficultyLevel.MEDIUM,
      rubric: sampleRubric,
    });
  });

  describe("Attempt Lifecycle & State Machine Transitions", () => {
    it("should initialize attempt in IN_PROGRESS status", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      expect(attempt.status).toBe(AttemptStatus.IN_PROGRESS);
      expect(attempt.submission).toBeNull();
      expect(attempt.evaluation).toBeNull();
    });

    it("should allow valid transition IN_PROGRESS -> SUBMITTED when valid submission is provided", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      const submission = new Submission({
        id: "sub-1",
        attemptId: "att-1",
        assumptions: "Single level parking lot",
        classDesign: "ParkingLot -> Level -> ParkingSpot",
        explanation: "Used Strategy pattern for fee calculation",
        code: "public class ParkingLot { private List<Level> levels; }",
      });

      attempt.submit(submission);

      expect(attempt.status).toBe(AttemptStatus.SUBMITTED);
      expect(attempt.submission).toBe(submission);
      expect(attempt.submittedAt).toBeDefined();
    });

    it("should reject submission if submission is incomplete", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      const incompleteSubmission = new Submission({
        id: "sub-1",
        attemptId: "att-1",
        assumptions: "",
        classDesign: "",
        explanation: "",
        code: "",
      });

      expect(() => attempt.submit(incompleteSubmission)).toThrow(
        /Submission is incomplete/
      );
    });

    it("should allow state transitions: SUBMITTED -> EVALUATING -> COMPLETED", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      const submission = new Submission({
        id: "sub-1",
        attemptId: "att-1",
        assumptions: "Valid assumption",
        classDesign: "Valid design",
        explanation: "Valid rationale",
        code: "class ParkingLot {}",
      });

      attempt.submit(submission);
      expect(attempt.status).toBe(AttemptStatus.SUBMITTED);

      attempt.startEvaluating();
      expect(attempt.status).toBe(AttemptStatus.EVALUATING);

      const criterionResult = new CriterionResult({
        criterionKey: "SOLID_DESIGN",
        criterionName: "SOLID Principles",
        score: 85,
        maxScore: 100,
        evidence: "Interfaces defined for fee strategy",
        concern: "Tight coupling in manager",
        suggestion: "Use DI",
        confidence: 0.95,
      });

      const evaluation = new Evaluation({
        id: "eval-1",
        attemptId: "att-1",
        evaluatorType: EvaluatorType.COMPOSITE,
        status: EvaluationStatus.IN_PROGRESS,
      });

      evaluation.markEvaluating();
      evaluation.complete([criterionResult], "Great OOD solution overall", 85);

      attempt.completeEvaluation(evaluation);

      expect(attempt.status).toBe(AttemptStatus.COMPLETED);
      expect(attempt.evaluation).toBe(evaluation);
      expect(attempt.completedAt).toBeDefined();
    });

    it("should reject invalid transition IN_PROGRESS -> COMPLETED", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      const evaluation = new Evaluation({
        id: "eval-1",
        attemptId: "att-1",
        evaluatorType: EvaluatorType.LLM,
      });

      expect(() => attempt.completeEvaluation(evaluation)).toThrow(
        InvalidStateTransitionException
      );
    });

    it("should handle EVALUATING -> FAILED transition and allow retry", () => {
      const attempt = new Attempt({
        id: "att-1",
        userId: "user-101",
        problem: sampleProblem,
      });

      const submission = new Submission({
        id: "sub-1",
        attemptId: "att-1",
        assumptions: "Valid assumption",
        classDesign: "Valid design",
        explanation: "Valid rationale",
        code: "class ParkingLot {}",
      });

      attempt.submit(submission);
      attempt.startEvaluating();
      attempt.failEvaluation("LLM connection timeout");

      expect(attempt.status).toBe(AttemptStatus.FAILED);
      expect(attempt.errorMessage).toBe("LLM connection timeout");

      // Retry evaluation transition
      attempt.startEvaluating();
      expect(attempt.status).toBe(AttemptStatus.EVALUATING);
    });
  });
});
