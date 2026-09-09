import { IEvaluator } from "../../domain/interfaces/IEvaluator";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";

/**
 * RuleBasedEvaluator — Deterministic Structural Verification
 *
 * Responsibility:
 *   Performs deterministic, rule-based structural checks:
 *   - Verifies all required sections exist (Assumptions, Class Design, Explanation, Code).
 *   - Verifies minimum completeness thresholds.
 *   - Verifies structural syntax patterns (e.g. class / interface declarations).
 *
 * Explicit Limitation:
 *   This evaluator does NOT pretend to judge semantic design quality, SOLID adherence,
 *   or architectural elegance. Judgment-heavy concerns are handled by LLM or Human evaluators.
 */
export class RuleBasedEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.RULE_BASED;

  async evaluate(
    _problem: Problem,
    submission: Submission,
    rubric: Rubric,
    attemptId?: string
  ): Promise<Evaluation> {
    const checks = {
      hasAssumptions: submission.assumptions.trim().length >= 20,
      hasClassDesign: submission.classDesign.trim().length >= 30,
      hasExplanation: submission.explanation.trim().length >= 30,
      hasCode: submission.code.trim().length >= 30,
      hasInterfaceKeyword: /(interface|abstract|class)/i.test(submission.classDesign + submission.code),
    };

    const criteriaResults: CriterionResult[] = rubric.criteria.map((crit) => {
      let scoreFraction = 0;
      let evidence = "";
      let concern = "";
      let suggestion = "";

      switch (crit.key) {
        case "REQUIREMENT_ALIGNMENT":
          if (checks.hasAssumptions && checks.hasCode) {
            scoreFraction = 0.85;
            evidence = "Structural check passed: Assumptions and implementation code sections are populated.";
            concern = "Rule engine cannot verify whether all domain edge cases are fully satisfied.";
            suggestion = "Ensure every stated requirement is explicitly linked to a class method.";
          } else {
            scoreFraction = 0.40;
            evidence = "Missing either assumptions or implementation code section.";
            concern = "One or more foundational sections are incomplete.";
            suggestion = "Provide comprehensive assumptions and code implementations.";
          }
          break;

        case "SOLID_ABSTRACTION":
          if (checks.hasInterfaceKeyword) {
            scoreFraction = 0.80;
            evidence = "Structural check passed: Detected 'class' or 'interface' declarations.";
            concern = "Rule engine cannot judge SRP or Liskov Substitution compliance.";
            suggestion = "Verify interfaces are granular (ISP) and abstractions decouple callers (DIP).";
          } else {
            scoreFraction = 0.30;
            evidence = "No explicit interface or abstract class declarations detected.";
            concern = "Design appears tightly coupled to concrete classes.";
            suggestion = "Define abstract interfaces for your primary domain components.";
          }
          break;

        case "DESIGN_PATTERNS":
          const hasPatternKeywords = /(strategy|factory|observer|state|singleton|adapter|facade)/i.test(
            submission.explanation + submission.classDesign
          );
          if (hasPatternKeywords) {
            scoreFraction = 0.80;
            evidence = "Structural check passed: Recognized design pattern keywords in explanation/design.";
            concern = "Rule engine cannot verify if the pattern is appropriate for this problem.";
            suggestion = "Ensure pattern choice is justified in your design rationale.";
          } else {
            scoreFraction = 0.50;
            evidence = "No standard design pattern names referenced in explanation.";
            concern = "Design may lack reusable architectural patterns.";
            suggestion = "Consider applying Strategy, Factory, or State patterns where appropriate.";
          }
          break;

        case "EDGE_CASES":
          const hasConcurrencyKeywords = /(thread|lock|synchronized|atomic|race|concurrent|volatile)/i.test(
            submission.explanation + submission.code
          );
          if (hasConcurrencyKeywords) {
            scoreFraction = 0.80;
            evidence = "Structural check passed: Concurrency keywords identified in submission.";
            concern = "Rule engine cannot verify deadlock freedom or thread-safety invariants.";
            suggestion = "Detail synchronization strategy and lock granularity in notes.";
          } else {
            scoreFraction = 0.50;
            evidence = "No explicit concurrency or thread-safety keywords found.";
            concern = "Multi-threaded safety is unverified.";
            suggestion = "Document how concurrent operations are handled safely.";
          }
          break;

        default:
          const completenessCount = [
            checks.hasAssumptions,
            checks.hasClassDesign,
            checks.hasExplanation,
            checks.hasCode,
          ].filter(Boolean).length;
          scoreFraction = completenessCount / 4;
          evidence = `Structural check passed: ${completenessCount}/4 required submission sections present.`;
          concern = "Structural rule checks provide syntactic verification only.";
          suggestion = "Submit for LLM or peer review for deep qualitative evaluation.";
          break;
      }

      const score = Math.round(crit.maxScore * scoreFraction);

      return new CriterionResult({
        criterionKey: crit.key,
        criterionName: crit.name,
        score,
        maxScore: crit.maxScore,
        evidence,
        concern,
        suggestion,
        confidence: 0.70, // Deterministic rule confidence
      });
    });

    const totalEarned = criteriaResults.reduce((sum, r) => sum + r.score, 0);
    const totalMax = criteriaResults.reduce((sum, r) => sum + r.maxScore, 0);
    const overallScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

    const evaluation = new Evaluation({
      id: `eval-rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attemptId: attemptId || submission.attemptId,
      evaluatorType: EvaluatorType.RULE_BASED,
      status: EvaluationStatus.IN_PROGRESS,
    });

    evaluation.markEvaluating();
    evaluation.complete(
      criteriaResults,
      `Deterministic rule-based structural validation complete. All required submission sections were checked for presence and completeness. (Note: Qualitative design judgment requires LLM or Human review).`,
      overallScore
    );

    return evaluation;
  }
}
