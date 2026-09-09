import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../../app";
import { MockEvaluator } from "../../infrastructure/evaluators/MockEvaluator";
import { IEvaluator } from "../../domain/interfaces/IEvaluator";
import { Problem } from "../../domain/entities/Problem";
import { Submission } from "../../domain/entities/Submission";
import { Rubric } from "../../domain/entities/Rubric";
import { Evaluation } from "../../domain/entities/Evaluation";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";
import { seedProblems } from "../../infrastructure/database/seed";

// ─── Evaluator Fakes ─────────────────────────────────────────────────────────

class AlwaysFailEvaluator implements IEvaluator {
  readonly evaluatorType = EvaluatorType.LLM;
  async evaluate(_: Problem, sub: Submission, __: Rubric, attemptId?: string): Promise<Evaluation> {
    throw new Error("Simulated LLM failure");
  }
}

// ─── Shared Submission Body ───────────────────────────────────────────────────

const VALID_BODY = {
  assumptions: "Single entrance/exit per zone. Standard vehicle classifications.",
  classDesign:
    "class ParkingLot {\n  - floors: List<Floor>\n  - spotStrategy: ParkingStrategy\n  + parkVehicle(v: Vehicle): Ticket\n}\n" +
    "interface ParkingStrategy { + findSpot(floors, v): Spot }",
  explanation: "Applied Strategy pattern to adhere to the Open/Closed principle and SRP.",
  code: "public class ParkingLot {\n  private ParkingStrategy strategy;\n  public Ticket park(Vehicle v) { return strategy.findSpot(floors, v).toTicket(); }\n}",
};

// ─── Suite Setup ─────────────────────────────────────────────────────────────

describe("API Integration Tests — Full Practice Loop", () => {
  let mongoServer: MongoMemoryServer;
  let happyApp: any;
  let failApp: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedProblems();

    happyApp = createApp({ evaluator: new MockEvaluator() });
    failApp  = createApp({ evaluator: new AlwaysFailEvaluator() });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // ── Health ─────────────────────────────────────────────────────────────────

  describe("GET /api/health", () => {
    it("returns 200 OK", async () => {
      const res = await request(happyApp).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status.toLowerCase()).toBe("ok");
    });
  });

  // ── Problems ───────────────────────────────────────────────────────────────

  describe("GET /api/problems", () => {
    it("returns the full seeded problem list", async () => {
      const res = await request(happyApp).get("/api/problems");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(4);
    });

    it("each problem has id, title, difficulty, requirements, and rubric", async () => {
      const res = await request(happyApp).get("/api/problems");
      for (const p of res.body.data) {
        expect(p.id).toBeDefined();
        expect(p.title).toBeDefined();
        expect(["EASY","MEDIUM","HARD"]).toContain(p.difficulty);
        expect(Array.isArray(p.requirements)).toBe(true);
        expect(p.rubric.criteria.length).toBeGreaterThan(0);
      }
    });
  });

  describe("GET /api/problems/:id", () => {
    it("returns a specific problem by id", async () => {
      const res = await request(happyApp).get("/api/problems/prob-parking-lot");
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("prob-parking-lot");
      expect(res.body.data.title).toContain("Parking Lot");
    });

    it("returns 404 for an unknown problem id", async () => {
      const res = await request(happyApp).get("/api/problems/does-not-exist");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Attempt Lifecycle ──────────────────────────────────────────────────────

  describe("Happy Path — POST attempt → submit → evaluate → feedback → history", () => {
    const USER = "api-test-happy";
    let attemptId: string;

    it("POST /api/attempts creates a new IN_PROGRESS attempt", async () => {
      const res = await request(happyApp)
        .post("/api/attempts")
        .send({ userId: USER, problemId: "prob-parking-lot" });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("IN_PROGRESS");
      expect(res.body.data.userId).toBe(USER);
      attemptId = res.body.data.id;
    });

    it("GET /api/attempts/:id returns the IN_PROGRESS attempt", async () => {
      const res = await request(happyApp).get(`/api/attempts/${attemptId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(attemptId);
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });

    it("POST /api/attempts/:id/submit stores submission and sets status SUBMITTED", async () => {
      const res = await request(happyApp)
        .post(`/api/attempts/${attemptId}/submit`)
        .send(VALID_BODY);

      expect(res.status).toBe(201);
      expect(res.body.data.attempt.status).toBe("SUBMITTED");
      expect(res.body.data.submission.id).toBeDefined();
      expect(res.body.data.submission.attemptId).toBe(attemptId);
    });

    it("POST /api/attempts/:id/evaluation/retry runs evaluation and sets status COMPLETED", async () => {
      const res = await request(happyApp).post(`/api/attempts/${attemptId}/evaluation/retry`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.overallScore).toBeGreaterThan(0);
      expect(res.body.data.criteriaResults.length).toBeGreaterThan(0);
      expect(res.body.data.summary).toBeDefined();
    });

    it("GET /api/attempts/:id/evaluation retrieves the stored evaluation", async () => {
      const res = await request(happyApp).get(`/api/attempts/${attemptId}/evaluation`);
      expect(res.status).toBe(200);
      expect(res.body.data.attemptId).toBe(attemptId);
      expect(res.body.data.status).toBe("COMPLETED");
    });

    it("GET /api/attempts/:id shows attempt as COMPLETED with embedded evaluation", async () => {
      const res = await request(happyApp).get(`/api/attempts/${attemptId}`);
      expect(res.body.data.status).toBe("COMPLETED");
      expect(res.body.data.evaluation).not.toBeNull();
    });

    it("GET /api/attempts/user/:userId (history) lists the completed attempt", async () => {
      const res = await request(happyApp).get(`/api/attempts/user/${USER}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((a: any) => a.id === attemptId);
      expect(found).toBeDefined();
      expect(found.status).toBe("COMPLETED");
    });

    it("POST /api/attempts for same user returns existing IN_PROGRESS or creates a new one", async () => {
      // Start a fresh attempt for same problem (should create new because previous is COMPLETED)
      const res = await request(happyApp)
        .post("/api/attempts")
        .send({ userId: USER, problemId: "prob-parking-lot" });
      expect(res.status).toBe(201);
      expect(res.body.data.id).not.toBe(attemptId); // New attempt
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });
  });

  // ── Submission Validation ──────────────────────────────────────────────────

  describe("POST /api/attempts/:id/submit — validation", () => {
    let attemptId: string;

    beforeEach(async () => {
      const res = await request(happyApp)
        .post("/api/attempts")
        .send({ userId: `submit-test-${Date.now()}`, problemId: "prob-parking-lot" });
      attemptId = res.body.data.id;
    });

    it("rejects a submission where all fields are empty strings", async () => {
      const res = await request(happyApp)
        .post(`/api/attempts/${attemptId}/submit`)
        .send({ assumptions: "", classDesign: "", explanation: "", code: "" });

      // Either Zod schema validation (422) or domain rejection (400/500)
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects a duplicate submission to the same attempt", async () => {
      await request(happyApp).post(`/api/attempts/${attemptId}/submit`).send(VALID_BODY);
      const res = await request(happyApp).post(`/api/attempts/${attemptId}/submit`).send(VALID_BODY);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 when submitting to a non-existent attempt", async () => {
      const res = await request(happyApp)
        .post("/api/attempts/nonexistent-att/submit")
        .send(VALID_BODY);
      expect(res.status).toBe(404);
    });
  });

  // ── Evaluation Guard ───────────────────────────────────────────────────────

  describe("POST /api/attempts/:id/evaluation/retry — guards", () => {
    it("returns 400 when attempting to evaluate an IN_PROGRESS (un-submitted) attempt", async () => {
      const startRes = await request(happyApp)
        .post("/api/attempts")
        .send({ userId: `eval-guard-${Date.now()}`, problemId: "prob-parking-lot" });
      const id = startRes.body.data.id;

      const res = await request(happyApp).post(`/api/attempts/${id}/evaluation/retry`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/IN_PROGRESS/);
    });

    it("is idempotent: retrying evaluation on COMPLETED returns the same evaluation", async () => {
      const userId = `eval-idem-${Date.now()}`;
      const startRes = await request(happyApp).post("/api/attempts").send({ userId, problemId: "prob-parking-lot" });
      const id = startRes.body.data.id;
      await request(happyApp).post(`/api/attempts/${id}/submit`).send(VALID_BODY);
      const first  = await request(happyApp).post(`/api/attempts/${id}/evaluation/retry`);
      const second = await request(happyApp).post(`/api/attempts/${id}/evaluation/retry`);

      expect(first.body.data.id).toBe(second.body.data.id); // same evaluation returned
    });

    it("GET /api/attempts/:id/evaluation returns 404 before evaluation runs", async () => {
      const startRes = await request(happyApp)
        .post("/api/attempts")
        .send({ userId: `no-eval-${Date.now()}`, problemId: "prob-parking-lot" });
      const id = startRes.body.data.id;
      await request(happyApp).post(`/api/attempts/${id}/submit`).send(VALID_BODY);

      // Evaluation hasn't been triggered yet
      const res = await request(happyApp).get(`/api/attempts/${id}/evaluation`);
      expect(res.status).toBe(404);
    });
  });

  // ── Failure Flow ───────────────────────────────────────────────────────────

  describe("FAILED Evaluation Flow", () => {
    const USER = "api-test-fail";
    let failAttemptId: string;

    it("transitions attempt to FAILED when evaluator throws", async () => {
      const startRes = await request(failApp)
        .post("/api/attempts")
        .send({ userId: USER, problemId: "prob-parking-lot" });
      failAttemptId = startRes.body.data.id;

      await request(failApp).post(`/api/attempts/${failAttemptId}/submit`).send(VALID_BODY);

      const evalRes = await request(failApp).post(`/api/attempts/${failAttemptId}/evaluation/retry`);
      expect(evalRes.status).toBeGreaterThanOrEqual(400);
      expect(evalRes.body.success).toBe(false);

      const attemptRes = await request(failApp).get(`/api/attempts/${failAttemptId}`);
      expect(attemptRes.body.data.status).toBe("FAILED");
      expect(attemptRes.body.data.errorMessage).toBeDefined();
    });

    it("preserves the original submission after evaluation failure", async () => {
      const subRes = await request(failApp).get(`/api/submissions/attempt/${failAttemptId}`);
      expect(subRes.status).toBe(200);
      expect(subRes.body.data.assumptions).toBe(VALID_BODY.assumptions);
    });

    it("FAILED attempt appears in user history with FAILED status", async () => {
      const histRes = await request(failApp).get(`/api/attempts/user/${USER}`);
      expect(histRes.status).toBe(200);
      const found = histRes.body.data.find((a: any) => a.id === failAttemptId);
      expect(found).toBeDefined();
      expect(found.status).toBe("FAILED");
    });
  });
});
