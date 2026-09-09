import mongoose from "mongoose";
import { config } from "./env";

export async function connectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    await mongoose.connect(config.mongoUri);
    console.log(`[Database] MongoDB connected successfully to ${config.mongoUri}`);
  } catch (error) {
    console.error("[Database] MongoDB connection error:", error);
    // Don't crash process in dev mode if local MongoDB is not running yet
    if (config.nodeEnv === "production") {
      process.exit(1);
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
