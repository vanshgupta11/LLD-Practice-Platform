import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoProblemRepository } from "./MongoProblemRepository";
import { MongoAttemptRepository } from "./MongoAttemptRepository";
import { MongoSubmissionRepository } from "./MongoSubmissionRepository";
import { MongoEvaluationRepository } from "./MongoEvaluationRepository";
import { ProblemModel } from "../database/models/ProblemModel";
import { Problem } from "../../domain/entities/Problem";
import { Rubric } from "../../domain/entities/Rubric";
import { EvaluationCriterion } from "../../domain/entities/EvaluationCriterion";
import { Attempt } from "../../domain/entities/Attempt";
import { Submission } from "../../domain/entities/Submission";
import { Evaluation } from "../../domain/entities/Evaluation";
import { DifficultyLevel } from "../../domain/enums/DifficultyLevel";
import { AttemptStatus } from "../../domain/enums/AttemptStatus";
import { EvaluatorType } from "../../domain/enums/EvaluatorType";
import { EvaluationStatus } from "../../domain/enums/EvaluationStatus";
import { CriterionResult } from "../../domain/value-objects/CriterionResult";

describe("MongoDB Persistence Repositories Integration Tests", () => {
  let mongoServer: MongoMemoryServer;
  let problemRepo: MongoProblemRepository;
  let attemptRepo: MongoAttemptRepository;
  let submissionRepo: MongoSubmissionRepository;
  let evaluationRepo: MongoEvaluationRepository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    problemRepo = new MongoProblemRepository();
    submissionRepo = new MongoSubmissionRepository();
    evaluationRepo = new MongoEvaluationRepository();
    attemptRepo = new MongoAttemptRepository(problemRepo, submissionRepo, evaluationRepo);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it("should create and retrieve a Problem entity", async () => {
    await ProblemModel.create({
      _id: "prob-elevator",
      slug: "elevator-control-system",
      title: "Elevator Control System",
      description: "Design an elevator control system scheduling requests.",
      requirements: ["Handle request dispatching", "Support multi-elevator algorithm"],
      assumptions: ["10 floors", "3 elevator cars"],
      difficulty: "MEDIUM",
      rubric: {
        id: "rubric-elevator",
        problemId: "prob-elevator",
        criteria: [
          {
            key: "STATE_PATTERN",
            name: "State Pattern Usage",
            description: "Correct usage of state pattern for elevator states.",
            weight: 30,
            maxScore: 100,
          },
        ],
      },
    });

    const problems = await problemRepo.findAll();
    expect(problems.length).toBe(1);
    expect(problems[0]).toBeInstanceOf(Problem);
    expect(problems[0].title).toBe("Elevator Control System");

    const singleProb = await problemRepo.findById("prob-elevator");
    expect(singleProb).not.toBeNull();
    expect(singleProb?.slug).toBe("elevator-control-system");
  });

  it("should perform full CRUD operations on Attempt, Submission, and Evaluation", async () => {
    // 1. Seed Problem
    const criterion = new EvaluationCriterion({
      key: "SOLID_DESIGN",
      name: "SOLID Principles",
      description: "Adherence to SOLID OOD principles",
      weight: 30,
      maxScore: 100,
    });
    const rubric = new Rubric({
      id: "rub-1",
      problemId: "prob-parking",
      criteria: [criterion],
    });
    const problem = new Problem({
      id: "prob-parking",
      slug: "parking-lot",
      title: "Parking Lot",
      description: "Parking lot problem",
      requirements: ["Requirement 1"],
      assumptions: ["Assumption 1"],
      difficulty: DifficultyLevel.EASY,
      rubric,
    });

    await ProblemModel.create({
      _id: problem.id,
      slug: problem.slug,
      title: problem.title,
      description: problem.description,
      requirements: problem.requirements,
      assumptions: problem.assumptions,
      difficulty: problem.difficulty,
      rubric: {
        id: rubric.id,
        problemId: rubric.problemId,
        criteria: rubric.criteria.map((c) => ({
          key: c.key,
          name: c.name,
          description: c.description,
          weight: c.weight,
          maxScore: c.maxScore,
        })),
      },
    });

    // 2. Create Attempt
    const attempt = new Attempt({
      id: "att-100",
      userId: "user-alpha",
      problem,
    });

    const savedAttempt = await attemptRepo.create(attempt);
    expect(savedAttempt.id).toBe("att-100");
    expect(savedAttempt.status).toBe(AttemptStatus.IN_PROGRESS);

    // 3. Create Submission
    const submission = new Submission({
      id: "sub-100",
      attemptId: "att-100",
      assumptions: "Single entry gate",
      classDesign: "ParkingLot -> Level -> Spot",
      explanation: "Used Factory pattern",
      code: "class ParkingLot {}",
    });

    await submissionRepo.create(submission);
    const retrievedSub = await submissionRepo.findByAttemptId("att-100");
    expect(retrievedSub).not.toBeNull();
    expect(retrievedSub?.code).toBe("class ParkingLot {}");

    // 4. Update Attempt status to SUBMITTED
    const updatedAttempt = await attemptRepo.updateStatus("att-100", AttemptStatus.SUBMITTED);
    expect(updatedAttempt?.status).toBe(AttemptStatus.SUBMITTED);

    // 5. Create Evaluation
    const criterionResult = new CriterionResult({
      criterionKey: "SOLID_DESIGN",
      criterionName: "SOLID Principles",
      score: 90,
      maxScore: 100,
      evidence: "Defined clean interfaces",
      concern: "None",
      suggestion: "Maintain current design",
      confidence: 0.95,
    });

    const evaluation = new Evaluation({
      id: "eval-100",
      attemptId: "att-100",
      evaluatorType: EvaluatorType.COMPOSITE,
      status: EvaluationStatus.COMPLETED,
      criteriaResults: [criterionResult],
      overallScore: 90,
      summary: "Excellent work",
    });

    await evaluationRepo.create(evaluation);
    const retrievedEval = await evaluationRepo.findByAttemptId("att-100");
    expect(retrievedEval).not.toBeNull();
    expect(retrievedEval?.overallScore).toBe(90);

    // 6. Query Attempt by User & Problem
    const userAttempts = await attemptRepo.findByUser("user-alpha");
    expect(userAttempts.length).toBe(1);
    expect(userAttempts[0].submission?.id).toBe("sub-100");
    expect(userAttempts[0].evaluation?.id).toBe("eval-100");

    const userProblemAttempts = await attemptRepo.findByUserAndProblem("user-alpha", "prob-parking");
    expect(userProblemAttempts.length).toBe(1);
  });
});
