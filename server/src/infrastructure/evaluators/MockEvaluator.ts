import { IEvaluator } from "../../domain/interfaces/IEvaluator";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";

/**
 * MockEvaluator for development and testing.
 * Produces realistic-looking structured feedback without calling any LLM.
 * Drop-in replacement for the real Gemini/LLM evaluator via the IEvaluator interface.
 */
export class MockEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.COMPOSITE;

  async evaluate(
    _problem: Problem,
    submission: Submission,
    rubric: Rubric,
    attemptId?: string
  ): Promise<Evaluation> {
    const criteria = rubric.criteria;

    // Simulate lightweight analysis of the submission text
    const text = submission.toFormattedSummary().toLowerCase();
    const hasInterfaces = /(interface|abstract)/i.test(text);
    const hasPatterns = /(strategy|factory|state|observer|singleton|command)/i.test(text);
    const hasSolidKeywords = /(single responsibility|open.closed|liskov|dependency inversion|interface segregation)/i.test(text);
    const hasConcurrency = /(thread|synchronized|lock|atomic|concurrent|race condition)/i.test(text);

    const criteriaResults: CriterionResult[] = criteria.map((crit) => {
      let score = Math.round(crit.maxScore * 0.70); // base: 70%
      let evidence = "Submission provides a structured class breakdown.";
      let concern = "Design could be more explicit about dependency boundaries.";
      let suggestion = "Extract interfaces for each major abstraction to enforce DIP.";

      switch (crit.key) {
        case "REQUIREMENT_ALIGNMENT":
          score = Math.round(crit.maxScore * 0.80);
          evidence = "Submission addresses the stated functional requirements.";
          concern = "Edge cases like concurrent request handling are not explicitly discussed.";
          suggestion = "Enumerate preconditions and failure modes for each requirement.";
          break;
        case "SOLID_ABSTRACTION":
          if (hasInterfaces && hasSolidKeywords) {
            score = Math.round(crit.maxScore * 0.90);
            evidence = "Submission references SOLID principles and defines interfaces.";
            concern = "SRP may be violated if the Manager class owns both state and strategy.";
            suggestion = "Separate state management from business logic into distinct classes.";
          } else if (hasInterfaces) {
            score = Math.round(crit.maxScore * 0.78);
            evidence = "Interfaces are defined, but SOLID principles are not explicitly applied.";
            concern = "Open/Closed principle not demonstrated for extension scenarios.";
            suggestion = "Show how adding a new vehicle type does not require modifying existing classes.";
          }
          break;
        case "DESIGN_PATTERNS":
          if (hasPatterns) {
            score = Math.round(crit.maxScore * 0.88);
            evidence = "Submission references one or more recognized design patterns.";
            concern = "Pattern motivation is not explicitly justified with requirements.";
            suggestion = "For each pattern, explain the specific design problem it solves.";
          }
          break;
        case "EDGE_CASES":
          if (hasConcurrency) {
            score = Math.round(crit.maxScore * 0.92);
            evidence = "Concurrency concerns are explicitly addressed.";
            concern = "Deadlock scenarios under high load are not discussed.";
            suggestion = "Analyze lock acquisition order and consider optimistic locking alternatives.";
          }
          break;
        case "COUPLING_COHESION":
          score = Math.round(crit.maxScore * 0.74);
          evidence = "Classes show reasonable cohesion within defined modules.";
          concern = "Cross-module coupling is not explicitly minimized.";
          suggestion = "Introduce a Facade or Mediator to reduce direct dependencies between subsystems.";
          break;
      }

      return new CriterionResult({
        criterionKey: crit.key,
        criterionName: crit.name,
        score,
        maxScore: crit.maxScore,
        evidence,
        concern,
        suggestion,
        confidence: 0.92,
      });
    });

    const totalEarned = criteriaResults.reduce((sum, r) => sum + r.score, 0);
    const totalMax = criteriaResults.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    const evaluation = new Evaluation({
      id: `eval-mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attemptId: attemptId || submission.attemptId,
      evaluatorType: EvaluatorType.COMPOSITE,
      status: EvaluationStatus.IN_PROGRESS,
    });

    evaluation.markEvaluating();
    evaluation.complete(
      criteriaResults,
      overallScore >= 75
        ? "Strong object-oriented design with clear class responsibilities. Minor improvements in dependency management and edge-case coverage recommended."
        : "Design demonstrates foundational OOD understanding. Focus on applying SOLID principles more explicitly and justifying pattern choices.",
      overallScore
    );

    return evaluation;
  }
}
