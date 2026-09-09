import { Request, Response, NextFunction } from "express";
import { ProblemService } from "../../application/ProblemService";

export class ProblemController {
  constructor(private readonly problemService: ProblemService) {}

  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const problems = await this.problemService.listProblems();
      res.json({
        success: true,
        data: problems.map((p) => p.toJSON()),
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const problem = await this.problemService.getProblemById(id);
      res.json({
        success: true,
        data: problem.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  };
}
