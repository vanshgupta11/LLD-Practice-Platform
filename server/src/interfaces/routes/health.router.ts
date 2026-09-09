import { Router, Request, Response } from "express";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "OK",
      service: "cipher-lld-server",
      timestamp: new Date().toISOString(),
      architecture: "Modular Monolith (Layered)",
    });
  });

  return router;
}
