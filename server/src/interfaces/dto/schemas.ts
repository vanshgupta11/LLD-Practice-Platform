import { z } from "zod";

export const CreateAttemptSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  problemId: z.string().min(1, "Problem ID is required"),
});

export const SubmitSolutionSchema = z
  .object({
    assumptions: z.string().default(""),
    classDesign: z.string().default(""),
    explanation: z.string().default(""),
    code: z.string().default(""),
  })
  .refine(
    (data) =>
      data.assumptions.trim().length > 0 ||
      data.classDesign.trim().length > 0 ||
      data.explanation.trim().length > 0 ||
      data.code.trim().length > 0,
    {
      message: "Submission must contain at least one section (Assumptions, Class Design, Explanation, or Code).",
    }
  );

export const CreateSubmissionSchema = z
  .object({
    attemptId: z.string().min(1, "Attempt ID is required"),
    assumptions: z.string().default(""),
    classDesign: z.string().default(""),
    explanation: z.string().default(""),
    code: z.string().default(""),
  })
  .refine(
    (data) =>
      data.assumptions.trim().length > 0 ||
      data.classDesign.trim().length > 0 ||
      data.explanation.trim().length > 0 ||
      data.code.trim().length > 0,
    {
      message: "Submission must contain at least one section (Assumptions, Class Design, Explanation, or Code).",
    }
  );

export const CreateEvaluationSchema = z.object({
  attemptId: z.string().min(1, "Attempt ID is required"),
});

export const ListAttemptsQuerySchema = z.object({
  userId: z.string().optional(),
});

export type CreateAttemptInput = z.infer<typeof CreateAttemptSchema>;
export type SubmitSolutionInput = z.infer<typeof SubmitSolutionSchema>;
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;
export type CreateEvaluationInput = z.infer<typeof CreateEvaluationSchema>;
export type ListAttemptsQuery = z.infer<typeof ListAttemptsQuerySchema>;
