import { LlmEvaluator } from "./LlmEvaluator";
import { ILlmClient } from "../llm/ILlmClient";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { EvaluationCriterion } from "../../domain/entities/EvaluationCriterion";
import { DifficultyLevel } from "../../domain/enums/DifficultyLevel";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { EvaluationService } from "../../application/EvaluationService";
import { Attempt } from "../../domain/entities/Attempt";
import { AttemptStatus } from "../../domain/enums/AttemptStatus";
import { IAttemptRepository } from "../../domain/repositories/IAttemptRepository";
import { IEvaluationRepository } from "../../domain/repositories/IEvaluationRepository";

describe("LlmEvaluator & OpenAI Client Integration", () => {
  const criteria = [
    new EvaluationCriterion({
      key: "REQUIREMENT_UNDERSTANDING",
      name: "Requirement Understanding",
      description: "Understands core problem domain and functional expectations.",
      weight: 0.15,
      maxScore: 15,
    }),
    new EvaluationCriterion({
      key: "CLASS_RESPONSIBILITIES",
      name: "Class Responsibilities",
      description: "Enforces Single Responsibility Principle per class.",
      weight: 0.15,
      maxScore: 15,
    }),
    new EvaluationCriterion({
      key: "COUPLING_COHESION",
      name: "Coupling / Cohesion",
      description: "Low coupling across modules, high cohesion within domain entities.",
      weight: 0.15,
      maxScore: 15,
    }),
    new EvaluationCriterion({
      key: "ENCAPSULATION_INTERFACES",
      name: "Encapsulation / Interfaces",
      description: "Proper use of interface contracts and private state.",
      weight: 0.15,
      maxScore: 15,
    }),
    new EvaluationCriterion({
      key: "ABSTRACTION_PATTERNS",
      name: "Abstraction / Patterns",
      description: "Justified application of GoF design patterns.",
      weight: 0.15,
      maxScore: 15,
    }),
    new EvaluationCriterion({
      key: "EXTENSIBILITY",
      name: "Extensibility",
      description: "Open for extension, closed for modification (OCP).",
      weight: 0.1,
      maxScore: 10,
    }),
    new EvaluationCriterion({
      key: "EDGE_CASES_TESTABILITY",
      name: "Edge Cases / Testability",
      description: "Concurrency, race condition prevention, and test seams.",
      weight: 0.1,
      maxScore: 10,
    }),
    new EvaluationCriterion({
      key: "QUALITY_OF_EXPLANATION",
      name: "Quality of Explanation",
      description: "Clear architectural rationale and trade-off justification.",
      weight: 0.05,
      maxScore: 5,
    }),
  ];

  const rubric = new Rubric({
    id: "rubric-comprehensive",
    problemId: "prob-parking-lot",
    criteria,
  });

  const problem = new Problem({
    id: "prob-parking-lot",
    slug: "parking-lot",
    title: "Multi-Floor Parking Lot",
    description: "Design an automated multi-floor parking lot.",
    requirements: ["Multiple vehicle types", "Dynamic ticket pricing", "Thread-safe spot allocation"],
    assumptions: ["Single entrance/exit per zone"],
    difficulty: DifficultyLevel.MEDIUM,
    rubric,
  });

  const submission = new Submission({
    id: "sub-100",
    attemptId: "att-100",
    assumptions: "Standard passenger vehicles. Time-based pricing.",
    classDesign: "interface ParkingStrategy { findSpot(): Spot; } class ParkingLot { ... }",
    explanation: "Used Strategy pattern for pricing and spot allocation to enforce OCP.",
    code: "export class ParkingLot { private strategy: ParkingStrategy; }",
  });

  describe("Structured JSON Output & Zod Validation", () => {
    it("should successfully validate and map a valid LLM response matching the 8 rubric dimensions", async () => {
      const mockLlmClient: ILlmClient = {
        generateJson: async <T>() =>
          ({
            summary:
              "Strong object-oriented architecture with clean separation of concerns and Strategy Pattern usage.",
            criteriaResults: [
              {
                criterionKey: "REQUIREMENT_UNDERSTANDING",
                criterionName: "Requirement Understanding",
                score: 14,
                maxScore: 15,
                evidence: "Candidate models vehicle types and ticketing flows accurately.",
                concern: "Surge pricing scenarios are not fully discussed.",
                suggestion: "Enumerate holiday and weekend pricing rules.",
                confidence: 0.95,
              },
              {
                criterionKey: "CLASS_RESPONSIBILITIES",
                criterionName: "Class Responsibilities",
                score: 13,
                maxScore: 15,
                evidence: "ParkingLot acts as a high-level orchestrator; Floor manages spots.",
                concern: "ParkingLot directly manages payment status.",
                suggestion: "Extract PaymentProcessor into a separate service.",
                confidence: 0.9,
              },
              {
                criterionKey: "COUPLING_COHESION",
                criterionName: "Coupling / Cohesion",
                score: 13,
                maxScore: 15,
                evidence: "Strategies are decoupled via interfaces.",
                concern: "Tight coupling between Ticket and Floor.",
                suggestion: "Introduce a SpotIdentifier value object.",
                confidence: 0.88,
              },
              {
                criterionKey: "ENCAPSULATION_INTERFACES",
                criterionName: "Encapsulation / Interfaces",
                score: 14,
                maxScore: 15,
                evidence: "Fields are marked private and exposed through getter methods.",
                concern: "List of spots is returned directly rather than an unmodifiable list.",
                suggestion: "Return defensive copies of collections.",
                confidence: 0.92,
              },
              {
                criterionKey: "ABSTRACTION_PATTERNS",
                criterionName: "Abstraction / Patterns",
                score: 14,
                maxScore: 15,
                evidence: "Strategy Pattern applied to ParkingStrategy.",
                concern: "Factory Pattern for vehicle creation is omitted.",
                suggestion: "Introduce VehicleFactory for extensibility.",
                confidence: 0.94,
              },
              {
                criterionKey: "EXTENSIBILITY",
                criterionName: "Extensibility",
                score: 9,
                maxScore: 10,
                evidence: "New parking strategies can be added without modifying ParkingLot.",
                concern: "New spot types require editing the enum.",
                suggestion: "Use polymorphic spot classes.",
                confidence: 0.9,
              },
              {
                criterionKey: "EDGE_CASES_TESTABILITY",
                criterionName: "Edge Cases / Testability",
                score: 8,
                maxScore: 10,
                evidence: "Concurrent spot reservation is guarded with locks.",
                concern: "Deadlock under high exit traffic not analyzed.",
                suggestion: "Document lock ordering protocol.",
                confidence: 0.85,
              },
              {
                criterionKey: "QUALITY_OF_EXPLANATION",
                criterionName: "Quality of Explanation",
                score: 5,
                maxScore: 5,
                evidence: "Clear trade-off discussion justifying the chosen patterns.",
                concern: "None.",
                suggestion: "Maintain this level of documentation.",
                confidence: 0.98,
              },
            ],
          } as unknown as T),
      };

      const evaluator = new LlmEvaluator({ llmClient: mockLlmClient, fallbackToRuleBased: false });
      const evaluation = await evaluator.evaluate(problem, submission, rubric, "att-100");

      expect(evaluation).toBeDefined();
      expect(evaluation.evaluatorType).toBe(EvaluatorType.LLM);
      expect(evaluation.status).toBe(EvaluationStatus.COMPLETED);
      expect(evaluation.overallScore).toBe(90);
      expect(evaluation.criteriaResults.length).toBe(8);
      expect(evaluation.criteriaResults[0].evidence).toContain("Candidate models vehicle types");
    });

    it("should reject invalid LLM output with Zod and allow EvaluationService to transition to FAILED state", async () => {
      // Mock LLM returning malformed output (negative score and empty evidence)
      const malformedLlmClient: ILlmClient = {
        generateJson: async <T>() =>
          ({
            summary: "Too short",
            criteriaResults: [
              {
                criterionKey: "REQUIREMENT_UNDERSTANDING",
                criterionName: "Requirement Understanding",
                score: -5, // Invalid: negative
                maxScore: 15,
                evidence: "", // Invalid: empty
              },
            ],
          } as unknown as T),
      };

      const evaluator = new LlmEvaluator({ llmClient: malformedLlmClient, fallbackToRuleBased: false });

      // Mock Repositories to verify EvaluationService failure transition
      let attemptStatus: AttemptStatus = AttemptStatus.SUBMITTED;
      let attemptFailureReason: string | undefined = undefined;

      const mockAttemptRepo: IAttemptRepository = {
        create: async (a) => a,
        findById: async () => {
          const att = new Attempt({ id: "att-err", userId: "u1", problem });
          att.submit(submission);
          return att;
        },
        updateStatus: async (_id, status, reason) => {
          attemptStatus = status;
          attemptFailureReason = reason;
          return null;
        },
        findByUser: async () => [],
        findByUserAndProblem: async () => [],
        delete: async () => true,
      };

      const mockEvalRepo: IEvaluationRepository = {
        create: async (e) => e,
        findByAttemptId: async () => null,
        update: async (e) => e,
        deleteByAttemptId: async () => true,
      };

      const evaluationService = new EvaluationService(mockAttemptRepo, mockEvalRepo, evaluator);

      // Verify that evaluating throws an error and sets status to FAILED
      await expect(evaluationService.evaluate("att-err")).rejects.toThrow(
        /LLM evaluation/
      );

      expect(attemptStatus).toBe(AttemptStatus.FAILED);
      expect(attemptFailureReason).toContain("failed schema validation");
    });
  });
});
