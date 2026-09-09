import { Request, Response, NextFunction } from "express";
import { SubmissionService } from "../../application/SubmissionService";
import { CreateSubmissionSchema } from "../dto/schemas";

export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateSubmissionSchema.parse(req.body);
      const result = await this.submissionService.submit({
        attemptId: parsed.attemptId,
        assumptions: parsed.assumptions,
        classDesign: parsed.classDesign,
        explanation: parsed.explanation,
        code: parsed.code,
      });

      res.status(201).json({
        success: true,
        data: {
          attempt: result.attempt.toJSON(),
          submission: {
            id: result.submission.id,
            attemptId: result.submission.attemptId,
            assumptions: result.submission.assumptions,
            classDesign: result.submission.classDesign,
            explanation: result.submission.explanation,
            code: result.submission.code,
            submittedAt: result.submission.submittedAt,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getByAttemptId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const submission = await this.submissionService.getSubmissionByAttemptId(attemptId);
      if (!submission) {
        res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: `No submission found for attempt ${attemptId}`,
        });
        return;
      }
      res.json({
        success: true,
        data: {
          id: submission.id,
          attemptId: submission.attemptId,
          assumptions: submission.assumptions,
          classDesign: submission.classDesign,
          explanation: submission.explanation,
          code: submission.code,
          submittedAt: submission.submittedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
