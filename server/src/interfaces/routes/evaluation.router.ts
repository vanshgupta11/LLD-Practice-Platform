import { Router } from "express";
import { EvaluationController } from "../controllers/EvaluationController";

export function createEvaluationRouter(controller: EvaluationController): Router {
  const router = Router();

  router.post("/", controller.evaluate);
  router.get("/attempt/:attemptId", controller.getByAttemptId);

  return router;
}
