import { Request, Response, NextFunction } from "express";
import { AttemptService } from "../../application/AttemptService";
import { SubmissionService } from "../../application/SubmissionService";
import { EvaluationService } from "../../application/EvaluationService";
import {
  CreateAttemptSchema,
  SubmitSolutionSchema,
  ListAttemptsQuerySchema,
} from "../dto/schemas";
import { Attempt } from "../../domain/entities/Attempt";

/**
 * AttemptController — Thin HTTP Interface Component
 *
 * Responsibilities:
 * - Parse HTTP request params, query, and body.
 * - Validate request payloads using Zod schemas.
 * - Delegate strictly to application services (AttemptService, SubmissionService, EvaluationService).
 * - Return clean, formatted API DTOs (never internal database objects).
 * - Throw errors down the Express pipeline to the central errorHandler middleware.
 *
 * Rule: NO business logic or domain rules reside here.
 */
export class AttemptController {
  constructor(
    private readonly attemptService: AttemptService,
    private readonly submissionService: SubmissionService,
    private readonly evaluationService: EvaluationService
  ) {}

  /**
   * POST /api/attempts
   * Starts or resumes a practice attempt.
   */
  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateAttemptSchema.parse(req.body);
      const attempt = await this.attemptService.startAttempt({
        userId: parsed.userId,
        problemId: parsed.problemId,
      });
      res.status(201).json({
        success: true,
        data: attempt.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/attempts/:id
   * Retrieves single attempt details by ID.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const attempt = await this.attemptService.getAttempt(id);
      res.status(200).json({
        success: true,
        data: attempt.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/attempts
   * Lists attempts, optionally filtered by ?userId=
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ListAttemptsQuerySchema.parse(req.query);
      const attempts = await this.attemptService.listAttempts(query.userId);
      res.status(200).json({
        success: true,
        data: attempts.map((a: Attempt) => a.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/attempts/:id/submit
   * Submits design solution components for an attempt and transitions status to SUBMITTED.
   */
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const parsed = SubmitSolutionSchema.parse(req.body);

      const result = await this.submissionService.submit({
        attemptId: id,
        assumptions: parsed.assumptions,
        classDesign: parsed.classDesign,
        explanation: parsed.explanation,
        code: parsed.code,
      });

      res.status(201).json({
        success: true,
        data: {
          attempt: result.attempt.toJSON(),
          submission: result.submission.toJSON(),
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/attempts/:id/evaluation
   * Retrieves the evaluation scorecard for an attempt.
   */
  getEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const evaluation = await this.evaluationService.getEvaluationByAttemptId(id);
      if (!evaluation) {
        res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: `No evaluation found for attempt ${id}`,
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: evaluation.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/attempts/:id/evaluation/retry
   * Evaluates or retries evaluation of an attempt.
   */
  retryEvaluation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const evaluation = await this.evaluationService.evaluate(id);
      res.status(200).json({
        success: true,
        data: evaluation.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/attempts/user/:userId
   * Helper route for user attempt history.
   */
  getUserHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const attempts = await this.attemptService.getUserHistory(userId);
      res.status(200).json({
        success: true,
        data: attempts.map((a: Attempt) => a.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/attempts/:id
   * Deletes an attempt and its associated submission and evaluation records.
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.attemptService.deleteAttempt(id);
      res.status(200).json({
        success: true,
        message: `Attempt '${id}' deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  };
}

