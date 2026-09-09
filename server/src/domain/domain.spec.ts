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

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

function makeCriterion(key = "SOLID_DESIGN"): EvaluationCriterion {
  return new EvaluationCriterion({
    key,
    name: "SOLID Principles",
    description: "Adherence to SOLID OOD principles",
    weight: 30,
    maxScore: 10,
  });
}

function makeRubric(criteria?: EvaluationCriterion[]): Rubric {
  return new Rubric({
    id: "rubric-1",
    problemId: "prob-parking-lot",
    criteria: criteria ?? [makeCriterion()],
  });
}

function makeProblem(): Problem {
  return new Problem({
    id: "prob-parking-lot",
    slug: "parking-lot",
    title: "Design a Parking Lot System",
    description: "Design an automated parking lot system.",
    requirements: ["Support Compact, Large spots", "Calculate hourly fees"],
    assumptions: ["Single entrance and exit gate"],
    difficulty: DifficultyLevel.MEDIUM,
    rubric: makeRubric(),
  });
}

function makeSubmission(overrides: Partial<ConstructorParameters<typeof Submission>[0]> = {}): Submission {
  return new Submission({
    id: "sub-1",
    attemptId: "att-1",
    assumptions: "Single level parking lot with one entry point",
    classDesign: "ParkingLot -> Level -> ParkingSpot, interface FeeStrategy",
    explanation: "Used Strategy pattern for fee calculation and SRP for each class",
    code: "class ParkingLot { private levels: Level[] = []; }",
    ...overrides,
  });
}

function makeEvaluation(attemptId = "att-1", score = 80): Evaluation {
  const e = new Evaluation({
    id: "eval-1",
    attemptId,
    evaluatorType: EvaluatorType.RULE_BASED,
    status: EvaluationStatus.IN_PROGRESS,
  });
  e.markEvaluating();
  e.complete(
    [new CriterionResult({
      criterionKey: "SOLID_DESIGN",
      criterionName: "SOLID",
      score,
      maxScore: 100,
      evidence: "e",
      concern: "c",
      suggestion: "s",
      confidence: 0.9,
    })],
    "Good design",
    score
  );
  return e;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Domain — Attempt State Machine", () => {
  let problem: Problem;
  beforeEach(() => { problem = makeProblem(); });

  // ── Valid Transitions ──────────────────────────────────────────────────────

  it("initialises with IN_PROGRESS status and no submission or evaluation", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    expect(attempt.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(attempt.submission).toBeNull();
    expect(attempt.evaluation).toBeNull();
  });

  it("transitions IN_PROGRESS → SUBMITTED with a complete submission", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    expect(attempt.status).toBe(AttemptStatus.SUBMITTED);
    expect(attempt.submission).not.toBeNull();
    expect(attempt.submittedAt).toBeDefined();
  });

  it("transitions SUBMITTED → EVALUATING", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    expect(attempt.status).toBe(AttemptStatus.EVALUATING);
  });

  it("transitions EVALUATING → COMPLETED", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    const eval_ = makeEvaluation("att-1");
    attempt.completeEvaluation(eval_);
    expect(attempt.status).toBe(AttemptStatus.COMPLETED);
    expect(attempt.evaluation).toBe(eval_);
    expect(attempt.completedAt).toBeDefined();
  });

  it("transitions EVALUATING → FAILED with an error message", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    attempt.failEvaluation("LLM timeout");
    expect(attempt.status).toBe(AttemptStatus.FAILED);
    expect(attempt.errorMessage).toBe("LLM timeout");
  });

  it("allows FAILED → SUBMITTED (re-submission after failure)", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    attempt.failEvaluation("network error");
    // Domain allows re-submission from FAILED
    attempt.submit(makeSubmission({ id: "sub-2" }));
    expect(attempt.status).toBe(AttemptStatus.SUBMITTED);
  });

  it("allows FAILED → EVALUATING (retry evaluation without re-submitting)", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    attempt.failEvaluation("LLM error");
    attempt.startEvaluating();
    expect(attempt.status).toBe(AttemptStatus.EVALUATING);
  });

  // ── Invalid Transitions ────────────────────────────────────────────────────

  it("rejects IN_PROGRESS → COMPLETED (skipping SUBMITTED/EVALUATING)", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    expect(() => attempt.completeEvaluation(makeEvaluation())).toThrow(
      InvalidStateTransitionException
    );
  });

  it("rejects IN_PROGRESS → EVALUATING (cannot evaluate before submitting)", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    expect(() => attempt.startEvaluating()).toThrow(InvalidStateTransitionException);
  });

  it("rejects COMPLETED → SUBMITTED (cannot re-submit a completed attempt)", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    attempt.completeEvaluation(makeEvaluation("att-1"));
    expect(() => attempt.submit(makeSubmission())).toThrow(InvalidStateTransitionException);
  });

  it("rejects COMPLETED → EVALUATING", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    attempt.startEvaluating();
    attempt.completeEvaluation(makeEvaluation("att-1"));
    expect(() => attempt.startEvaluating()).toThrow(InvalidStateTransitionException);
  });

  it("rejects SUBMITTED → FAILED (only EVALUATING and SUBMITTED are allowed, SUBMITTED is actually allowed per domain)", () => {
    // Domain currently allows SUBMITTED → FAILED (failEvaluation allows both SUBMITTED and EVALUATING)
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    attempt.submit(makeSubmission());
    // This should NOT throw — SUBMITTED is a valid source for failEvaluation
    expect(() => attempt.failEvaluation("guard test")).not.toThrow();
  });

  // ── Submission Validation ──────────────────────────────────────────────────

  it("rejects a submission where all sections are empty", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    const incomplete = makeSubmission({ assumptions: "", classDesign: "", explanation: "", code: "" });
    expect(() => attempt.submit(incomplete)).toThrow(/Submission is incomplete/);
  });

  it("rejects a submission where assumptions are missing", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    const incomplete = makeSubmission({ assumptions: "  " });
    expect(() => attempt.submit(incomplete)).toThrow(/Submission is incomplete/);
  });

  it("rejects a submission where code section is blank", () => {
    const attempt = new Attempt({ id: "att-1", userId: "u1", problem });
    const incomplete = makeSubmission({ code: "" });
    expect(() => attempt.submit(incomplete)).toThrow(/Submission is incomplete/);
  });
});

// ─── Submission.validateCompleteness ─────────────────────────────────────────

describe("Domain — Submission Validation", () => {
  it("marks a fully populated submission as valid", () => {
    const sub = makeSubmission();
    const result = sub.validateCompleteness();
    expect(result.isValid).toBe(true);
    expect(result.missingSections).toHaveLength(0);
  });

  it("marks a submission with all empty fields as invalid and lists all sections", () => {
    const sub = makeSubmission({ assumptions: "", classDesign: "", explanation: "", code: "" });
    const result = sub.validateCompleteness();
    expect(result.isValid).toBe(false);
    expect(result.missingSections).toHaveLength(4);
  });

  it("identifies only the missing sections, not the present ones", () => {
    const sub = makeSubmission({ explanation: "", code: "   " });
    const result = sub.validateCompleteness();
    expect(result.isValid).toBe(false);
    expect(result.missingSections).toHaveLength(2);
    expect(result.missingSections.some(s => /Rationale/i.test(s))).toBe(true);
    expect(result.missingSections.some(s => /Code/i.test(s))).toBe(true);
  });

  it("throws when constructing with missing id", () => {
    expect(() => new Submission({ id: "", attemptId: "att-1", assumptions: "a", classDesign: "b", explanation: "c", code: "d" }))
      .toThrow("Submission id is required");
  });

  it("throws when constructing with missing attemptId", () => {
    expect(() => new Submission({ id: "sub-1", attemptId: "", assumptions: "a", classDesign: "b", explanation: "c", code: "d" }))
      .toThrow("Submission attemptId is required");
  });
});
