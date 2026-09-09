import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[API Error]", err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Invalid request payload.",
      details: err.errors,
    });
    return;
  }

  const message = err.message || "Internal Server Error";

  if (message.toLowerCase().includes("not found")) {
    res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      message,
    });
    return;
  }

  if (
    message.toLowerCase().includes("cannot") ||
    message.toLowerCase().includes("already") ||
    message.toLowerCase().includes("invalid")
  ) {
    res.status(400).json({
      success: false,
      error: "BAD_REQUEST",
      message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message,
  });
}
