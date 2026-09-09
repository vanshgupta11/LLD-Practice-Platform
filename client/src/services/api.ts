import axios, { AxiosError } from "axios";
import { Problem, Attempt, Submission, Evaluation, HealthStatus } from "../types";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Surface backend error messages instead of generic axios strings
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string; error?: string }>) => {
    const backendMessage = err.response?.data?.message;
    if (backendMessage) {
      const enhanced = new Error(backendMessage) as any;
      enhanced.status = err.response?.status;
      enhanced.response = err.response;
      return Promise.reject(enhanced);
    }
    return Promise.reject(err);
  }
);

export const api = {
  // Health
  checkHealth: async (): Promise<HealthStatus> => {
    const res = await client.get("/health");
    return res.data;
  },

  // Problems
  getProblems: async (): Promise<Problem[]> => {
    const res = await client.get("/problems");
    return res.data.data;
  },

  getProblem: async (id: string): Promise<Problem> => {
    const res = await client.get(`/problems/${id}`);
    return res.data.data;
  },

  // Attempts
  startAttempt: async (userId: string, problemId: string): Promise<Attempt> => {
    const res = await client.post("/attempts", { userId, problemId });
    return res.data.data;
  },

  getAttempt: async (id: string): Promise<Attempt> => {
    const res = await client.get(`/attempts/${id}`);
    return res.data.data;
  },

  listAttempts: async (userId?: string): Promise<Attempt[]> => {
    const res = await client.get("/attempts", { params: { userId } });
    return res.data.data;
  },

  getUserAttempts: async (userId: string): Promise<Attempt[]> => {
    const res = await client.get(`/attempts/user/${userId}`);
    return res.data.data;
  },

  deleteAttempt: async (attemptId: string): Promise<void> => {
    await client.delete(`/attempts/${attemptId}`);
  },

  // Submissions
  submitSolution: async (payload: {
    attemptId: string;
    assumptions: string;
    classDesign: string;
    explanation: string;
    code: string;
  }): Promise<{ attempt: Attempt; submission: Submission }> => {
    const res = await client.post(`/attempts/${payload.attemptId}/submit`, {
      assumptions: payload.assumptions,
      classDesign: payload.classDesign,
      explanation: payload.explanation,
      code: payload.code,
    });
    return res.data.data;
  },

  getSubmission: async (attemptId: string): Promise<Submission | null> => {
    try {
      const res = await client.get(`/submissions/attempt/${attemptId}`);
      return res.data.data;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  // Evaluations

  /** Fetch the stored evaluation result for an attempt (null if not yet evaluated). */
  getEvaluation: async (attemptId: string): Promise<Evaluation | null> => {
    try {
      const res = await client.get(`/attempts/${attemptId}/evaluation`);
      return res.data.data;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  /** Trigger or retry evaluation for a SUBMITTED or FAILED attempt. */
  retryEvaluation: async (attemptId: string): Promise<Evaluation> => {
    const res = await client.post(`/attempts/${attemptId}/evaluation/retry`);
    return res.data.data;
  },
};
