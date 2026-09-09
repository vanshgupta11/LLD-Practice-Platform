# AI Engineering Usage & Architectural Decision Record

This document records key engineering decisions where AI suggestions were evaluated, challenged, accepted, or rejected during the design and implementation of CipherLLD.

---

## Decision 1: Submission Persistence Prior to Evaluation Execution

### What AI Suggested
Initial AI scaffolding suggested combining solution submission and LLM evaluation into a single atomic service method:
```typescript
// Proposed by AI:
async function submitAndEvaluate(attemptId, solution) {
  const evaluation = await this.llmClient.evaluate(solution);
  await this.db.save({ solution, evaluation, status: "COMPLETED" });
}
```

### What was Rejected
- Coupling submission storage directly to LLM evaluation completion.
- Waiting for third-party LLM API responses before persisting the candidate's code to the database.

### Why
- LLM API calls have high variance in latency (2–10 seconds) and are prone to rate-limiting, network partitions, or model quota exhaustion.
- If the LLM call fails under the AI's proposed pattern, the candidate's entire solution (often 30+ minutes of manual design work) is lost in an uncommitted transaction.

### Final Engineering Decision
Split the workflow into two independent, sequential lifecycle phases:
1. **`SubmissionService.submit()`**: Validates completeness, persists the `Submission` entity to MongoDB, and moves the `Attempt` to `SUBMITTED`.
2. **`EvaluationService.evaluate()`**: Moves status to `EVALUATING`, calls the evaluator strategy, and transitions to `COMPLETED` on success or `FAILED` on error.
3. If evaluation fails, the submission remains permanently stored in MongoDB, allowing the candidate or system to trigger an idempotent evaluation retry at any time.

---

## Decision 2: Rubric-Constrained Dimension Evaluation vs. Single Open-Ended Score

### What AI Suggested
The AI proposed prompting the model to grade the candidate on a general 100-point scale with an open prompt:
> *"Rate this Low-Level Design submission from 1 to 100 and provide pros and cons."*

### What was Rejected
- Asking the model for an unconstrained holistic score.
- Using freeform text responses without strict JSON schema enforcement.

### Why
- Open-ended LLM evaluations suffer from severe score drift, hallucinations, and conversational sycophancy (e.g., awarding 90/100 to broken code because the explanation was polite).
- Candidates cannot understand *why* they lost points without clear dimensional scoring.

### Final Engineering Decision
1. Established 5 standardized evaluation dimensions: *Requirement Alignment*, *SOLID & Abstraction*, *Design Patterns*, *Edge Cases & Concurrency*, and *Coupling & Cohesion*.
2. Formatted prompts with explicit per-criterion point caps and required structured JSON output validated with Zod (`LlmEvaluationResponseSchema`).
3. Required the LLM to output four explicit fields per dimension: **score**, **evidence** (what was done well), **concern** (why it was an issue), and **suggestion** (how to fix it).

---

## Decision 3: Evaluator Strategy Pattern (`IEvaluator`) vs Direct LLM Client in EvaluationService

### What AI Suggested
The AI proposed injecting `GeminiLlmClient` directly into `EvaluationService`:
```typescript
// Proposed by AI:
export class EvaluationService {
  constructor(private readonly gemini: GeminiLlmClient) {}
}
```

### What was Rejected
- Binding the core application service directly to a specific LLM vendor.
- Making `EvaluationService` aware of prompting, token limits, or AI provider SDKs.

### Why
- Direct coupling violates the **Dependency Inversion Principle (DIP)** and **Open/Closed Principle (OCP)**.
- It prevents unit testing `EvaluationService` without mocking raw HTTP calls and makes it impossible to substitute a rule-based engine, human review, or alternative AI providers without rewriting the core service.

### Final Engineering Decision
1. Defined a pure domain abstraction:
   ```typescript
   export interface IEvaluator {
     readonly evaluatorType: EvaluatorType;
     evaluate(problem: Problem, submission: Submission, rubric: Rubric, attemptId?: string): Promise<Evaluation>;
   }
   ```
2. `EvaluationService` depends strictly on `IEvaluator`.
3. Created `RuleBasedEvaluator` and `LlmEvaluator` as interchangeable implementations, allowing `HumanEvaluator` to be added in the future with zero lines changed in `EvaluationService`.

---

## Decision 4: Deterministic Graceful Fallback on LLM Outages

### What AI Suggested
When designing error handling for the LLM evaluator, the AI suggested failing fast and returning a `500 Internal Server Error` whenever the LLM API key was missing or expired.

### What was Evaluated & Adjusted
- Failing fast is good for backend unit tests, but degrades candidate experience in local demo or offline environments where API keys are unavailable.

### Final Engineering Decision
1. Configured `LlmEvaluator` with an optional `fallbackToRuleBased` flag.
2. In production / integration tests with mocked LLM clients, failures transition to `FAILED` with explicit error reasons stored in the attempt record.
3. In local development or keyless environments, `LlmEvaluator` logs a warning and delegates to `RuleBasedEvaluator` to perform structural validation, ensuring candidates can still practice without platform lockouts.

---

## Decision 5: Client-Side Multi-Section Completion Tracking vs Monolithic Textarea

### What AI Suggested
The AI initially created a single Markdown textarea for the entire solution (mixing assumptions, classes, explanation, and code in one input).

### What was Rejected
- Single monolithic textarea.

### Why
- Candidates frequently forgot to provide assumptions or class diagrams when given an unguided blank box.
- Parsing mixed markdown headers on the backend is fragile and prone to user formatting discrepancies.

### Final Engineering Decision
1. Built a structured 4-tab practice workspace:
   - **Tab 1**: Assumptions & Non-functional Constraints
   - **Tab 2**: Class Models & Architecture
   - **Tab 3**: Design Rationale & Trade-offs
   - **Tab 4**: Implementation Code (Monaco Editor)
2. Implemented real-time section completion indicators (green status dots and `4/4 Ready` counters), giving candidates immediate visual feedback on their submission readiness.
