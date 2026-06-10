import mongoose from "mongoose";
import { env } from "@/env";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected to MongoDB");
}
