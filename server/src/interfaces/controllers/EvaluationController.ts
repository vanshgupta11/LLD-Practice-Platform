import { Request, Response, NextFunction } from "express";
import { EvaluationService } from "../../application/EvaluationService";
import { CreateEvaluationSchema } from "../dto/schemas";

export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  evaluate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CreateEvaluationSchema.parse(req.body);
      const evaluation = await this.evaluationService.evaluate(parsed.attemptId);
      res.status(200).json({
        success: true,
        data: evaluation.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };

  getByAttemptId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attemptId } = req.params;
      const evaluation = await this.evaluationService.getEvaluationByAttemptId(attemptId);
      if (!evaluation) {
        res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: `No evaluation found for attempt ${attemptId}`,
        });
        return;
      }
      res.json({
        success: true,
        data: evaluation.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };
}
