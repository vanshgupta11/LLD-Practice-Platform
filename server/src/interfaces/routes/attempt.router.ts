import { Router } from "express";
import { AttemptController } from "../controllers/AttemptController";

export function createAttemptRouter(controller: AttemptController): Router {
  const router = Router();

  // Attempt Lifecycle Endpoints
  router.post("/", controller.start);
  router.get("/", controller.list);
  // NOTE: static segments MUST come before dynamic /:id to avoid shadowing
  router.get("/user/:userId", controller.getUserHistory);
  router.get("/:id", controller.getById);

  // Solution Submission Endpoint
  router.post("/:id/submit", controller.submit);

  // Evaluation & Retry Endpoints
  router.get("/:id/evaluation", controller.getEvaluation);
  router.post("/:id/evaluation/retry", controller.retryEvaluation);

  // Delete Attempt Endpoint
  router.delete("/:id", controller.delete);

  return router;
}
