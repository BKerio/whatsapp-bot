import mongoose, { type InferSchemaType } from "mongoose";

/**
 * Session doc keeps conversational state per WhatsApp phone number.
 * We use a TTL index so stale sessions auto-expire.
 */
const sessionSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    flow: { type: String, required: true, default: "idle" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete sessions when expiresAt < now
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SessionModel = mongoose.model("Session", sessionSchema);

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export function nextExpiry(now = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS);
}

