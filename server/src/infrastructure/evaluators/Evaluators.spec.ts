import {
  Problem,
  Rubric,
  EvaluationCriterion,
  Submission,
  DifficultyLevel,
} from "../../domain/index";
import { RuleBasedEvaluator } from "./RuleBasedEvaluator";
import { LlmEvaluator } from "./LlmEvaluator";
import { ILlmClient, LlmCompletionOptions } from "../llm/ILlmClient";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

function makeProblem(): Problem {
  return new Problem({
    id: "prob-1",
    slug: "parking-lot",
    title: "Design a Parking Lot",
    description: "Design a multi-floor parking lot system.",
    requirements: ["Support multiple vehicle types", "Calculate fees"],
    assumptions: ["Single entrance"],
    difficulty: DifficultyLevel.MEDIUM,
    rubric: new Rubric({
      id: "rubric-1",
      problemId: "prob-1",
      criteria: [
        new EvaluationCriterion({ key: "REQUIREMENT_ALIGNMENT", name: "Requirement Alignment", description: "Covers all requirements", weight: 20, maxScore: 20 }),
        new EvaluationCriterion({ key: "SOLID_ABSTRACTION",     name: "SOLID Abstraction",    description: "SOLID principles",       weight: 20, maxScore: 20 }),
        new EvaluationCriterion({ key: "DESIGN_PATTERNS",       name: "Design Patterns",      description: "Pattern usage",          weight: 20, maxScore: 20 }),
        new EvaluationCriterion({ key: "EDGE_CASES",            name: "Edge Cases",           description: "Thread safety etc.",     weight: 20, maxScore: 20 }),
        new EvaluationCriterion({ key: "EXPLANATION_QUALITY",   name: "Explanation Quality",  description: "Explanation clarity",    weight: 20, maxScore: 20 }),
      ],
    }),
  });
}

function makeRichSubmission(overrides: Partial<ConstructorParameters<typeof Submission>[0]> = {}): Submission {
  return new Submission({
    id: "sub-1",
    attemptId: "att-1",
    assumptions: "Single entrance/exit. Supports Two-Wheeler, Car, Truck, EV. Strategy pattern for spot allocation.",
    classDesign:
      "interface ParkingStrategy { findSpot(floors, type): Spot; }\n" +
      "class NearestFirstStrategy implements ParkingStrategy {}\n" +
      "class ParkingLot { private strategy: ParkingStrategy; parkVehicle(v: Vehicle): Ticket; }",
    explanation:
      "Used Strategy pattern for spot allocation and pricing to satisfy Open/Closed Principle. " +
      "Single Responsibility: Floor manages spot inventory, ParkingLot coordinates workflows. " +
      "Concurrency: synchronized locks on spot collections prevent race conditions.",
    code:
      "export enum VehicleType { CAR, TRUCK, EV }\n" +
      "export interface ParkingStrategy { findSpot(floors: any[], type: VehicleType): any; }\n" +
      "export class ParkingLot { constructor(private strategy: ParkingStrategy) {} }",
    ...overrides,
  });
}

function makeMinimalSubmission(): Submission {
  return new Submission({
    id: "sub-min",
    attemptId: "att-1",
    assumptions: "Basic assumptions about the system",
    classDesign: "class ParkingLot { }",
    explanation: "Simple explanation of the design choices made",
    code: "class ParkingLot {}",
  });
}

// ─── RuleBasedEvaluator ───────────────────────────────────────────────────────

describe("RuleBasedEvaluator", () => {
  const evaluator = new RuleBasedEvaluator();
  let problem: Problem;

  beforeEach(() => { problem = makeProblem(); });

  it("returns a COMPLETED evaluation with all rubric criteria covered", async () => {
    const sub = makeRichSubmission();
    const eval_ = await evaluator.evaluate(problem, sub, problem.rubric, "att-1");

    expect(eval_.status).toBe(EvaluationStatus.COMPLETED);
    expect(eval_.criteriaResults).toHaveLength(problem.rubric.criteria.length);
    expect(eval_.overallScore).toBeGreaterThanOrEqual(0);
    expect(eval_.overallScore).toBeLessThanOrEqual(100);
    expect(eval_.summary).toBeTruthy();
    expect(eval_.attemptId).toBe("att-1");
  });

  it("scores a rich submission higher than a minimal one", async () => {
    const richEval = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");
    const minEval  = await evaluator.evaluate(problem, makeMinimalSubmission(), problem.rubric, "att-2");
    expect(richEval.overallScore).toBeGreaterThanOrEqual(minEval.overallScore);
  });

  it("detects interface/class keywords and assigns SOLID_ABSTRACTION score", async () => {
    const sub = makeRichSubmission();
    const eval_ = await evaluator.evaluate(problem, sub, problem.rubric, "att-1");
    const solidResult = eval_.criteriaResults.find(r => r.criterionKey === "SOLID_ABSTRACTION");
    expect(solidResult).toBeDefined();
    expect(solidResult!.score).toBeGreaterThan(0);
  });

  it("detects pattern keywords and awards a DESIGN_PATTERNS score", async () => {
    const sub = makeRichSubmission(); // explanation contains 'Strategy'
    const eval_ = await evaluator.evaluate(problem, sub, problem.rubric, "att-1");
    const patternResult = eval_.criteriaResults.find(r => r.criterionKey === "DESIGN_PATTERNS");
    expect(patternResult!.score).toBeGreaterThan(0);
  });

  it("detects concurrency keywords and awards EDGE_CASES score", async () => {
    const sub = makeRichSubmission(); // explanation mentions 'synchronized locks'
    const eval_ = await evaluator.evaluate(problem, sub, problem.rubric, "att-1");
    const edgeResult = eval_.criteriaResults.find(r => r.criterionKey === "EDGE_CASES");
    expect(edgeResult!.score).toBeGreaterThan(0);
  });

  it("uses submission.attemptId as fallback when attemptId param is omitted", async () => {
    const sub = makeRichSubmission({ attemptId: "fallback-att" });
    const eval_ = await evaluator.evaluate(problem, sub, problem.rubric);
    expect(eval_.attemptId).toBe("fallback-att");
  });

  it("enforces score bounds: no criterion score exceeds its maxScore", async () => {
    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");
    for (const r of eval_.criteriaResults) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(r.maxScore);
    }
  });

  it("every criterion result contains non-empty evidence, concern, and suggestion", async () => {
    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");
    for (const r of eval_.criteriaResults) {
      expect(r.evidence.trim().length).toBeGreaterThan(0);
      expect(r.concern.trim().length).toBeGreaterThan(0);
      expect(r.suggestion.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── LlmEvaluator (with mocked ILlmClient) ───────────────────────────────────

describe("LlmEvaluator — mocked ILlmClient", () => {
  let problem: Problem;

  beforeEach(() => { problem = makeProblem(); });

  function makeMockLlmResponse(overrides: Partial<any> = {}) {
    return {
      summary: "The candidate produced a well-structured design with clear separation of concerns.",
      criteriaResults: problem.rubric.criteria.map(c => ({
        criterionKey: c.key,
        criterionName: c.name,
        score: Math.round(c.maxScore * 0.8),
        maxScore: c.maxScore,
        evidence: "Observed relevant patterns in the submission.",
        concern: "Minor coupling detected.",
        suggestion: "Consider extracting interfaces.",
        confidence: 0.9,
      })),
      ...overrides,
    };
  }

  function makeMockClient(response: object): ILlmClient {
    return {
      generateJson: jest.fn().mockResolvedValue(response),
    };
  }

  it("returns a COMPLETED evaluation from a valid LLM response", async () => {
    const mockClient = makeMockClient(makeMockLlmResponse());
    const evaluator = new LlmEvaluator({ llmClient: mockClient, fallbackToRuleBased: false });

    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");

    expect(eval_.status).toBe(EvaluationStatus.COMPLETED);
    expect(eval_.summary).toContain("well-structured");
    expect(eval_.criteriaResults).toHaveLength(problem.rubric.criteria.length);
    expect((mockClient.generateJson as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it("clamps score to [0, maxScore] for out-of-range values returned by LLM", async () => {
    const exaggerated = makeMockLlmResponse({
      criteriaResults: problem.rubric.criteria.map(c => ({
        criterionKey: c.key,
        criterionName: c.name,
        score: 999,          // deliberately out-of-bounds
        maxScore: c.maxScore,
        evidence: "e",
        concern: "c",
        suggestion: "s",
        confidence: 0.9,
      })),
    });
    const mockClient = makeMockClient(exaggerated);
    const evaluator = new LlmEvaluator({ llmClient: mockClient, fallbackToRuleBased: false });

    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");

    for (const r of eval_.criteriaResults) {
      expect(r.score).toBeLessThanOrEqual(r.maxScore);
    }
  });

  it("falls back to RuleBasedEvaluator when LLM client throws and fallback is enabled", async () => {
    const errorClient: ILlmClient = {
      generateJson: jest.fn().mockRejectedValue(new Error("API rate limit")),
    };
    const evaluator = new LlmEvaluator({ llmClient: errorClient, fallbackToRuleBased: true });

    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");

    // Fallback to RuleBased should still produce a COMPLETED evaluation
    expect(eval_.status).toBe(EvaluationStatus.COMPLETED);
  });

  it("throws when LLM client throws and fallback is disabled", async () => {
    const errorClient: ILlmClient = {
      generateJson: jest.fn().mockRejectedValue(new Error("Gemini unavailable")),
    };
    const evaluator = new LlmEvaluator({ llmClient: errorClient, fallbackToRuleBased: false });

    await expect(
      evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1")
    ).rejects.toThrow(/LLM evaluation/i);
  });

  it("throws when LLM returns a response that fails Zod schema validation (and fallback disabled)", async () => {
    const badResponse = { summary: "ok", criteriaResults: [{ score: "not-a-number" }] };
    const mockClient = makeMockClient(badResponse);
    const evaluator = new LlmEvaluator({ llmClient: mockClient, fallbackToRuleBased: false });

    await expect(
      evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1")
    ).rejects.toThrow();
  });

  it("fills missing criteria with a default result when LLM omits them", async () => {
    // Return only 2 of 5 criteria
    const partialResponse = makeMockLlmResponse({
      criteriaResults: [
        { criterionKey: "REQUIREMENT_ALIGNMENT", criterionName: "RA", score: 15, maxScore: 20, evidence: "e", concern: "c", suggestion: "s", confidence: 0.8 },
        { criterionKey: "SOLID_ABSTRACTION",     criterionName: "SA", score: 12, maxScore: 20, evidence: "e", concern: "c", suggestion: "s", confidence: 0.8 },
      ],
    });
    const mockClient = makeMockClient(partialResponse);
    const evaluator = new LlmEvaluator({ llmClient: mockClient, fallbackToRuleBased: false });

    const eval_ = await evaluator.evaluate(problem, makeRichSubmission(), problem.rubric, "att-1");

    // Must produce a result for ALL rubric criteria, not just the 2 returned
    expect(eval_.criteriaResults).toHaveLength(problem.rubric.criteria.length);
  });
});
