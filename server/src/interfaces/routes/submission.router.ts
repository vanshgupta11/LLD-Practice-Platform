import { Router } from "express";
import { SubmissionController } from "../controllers/SubmissionController";

export function createSubmissionRouter(controller: SubmissionController): Router {
  const router = Router();

  router.post("/", controller.submit);
  router.get("/attempt/:attemptId", controller.getByAttemptId);

  return router;
}
