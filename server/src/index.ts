import { createApp } from "./app";
import { config } from "./config/env";
import { connectDB } from "./config/db";
import { seedProblems } from "./infrastructure/database/seed";

async function bootstrap() {
  await connectDB();

  // Seed sample practice problems
  await seedProblems();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`[Server] LLD Practice Platform Backend running on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${config.nodeEnv}`);
  });
}

bootstrap().catch((err) => {
  console.error("[Server] Fatal bootstrap error:", err);
});
