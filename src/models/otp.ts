import mongoose, { type InferSchemaType } from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Otp = InferSchemaType<typeof otpSchema> & { _id: mongoose.Types.ObjectId };

export const OtpModel = mongoose.model("Otp", otpSchema);

const OTP_TTL_MS = 10 * 60 * 1000;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(phone: string): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await OtpModel.deleteMany({ phone });
  await OtpModel.create({ phone, code, expiresAt });

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<"valid" | "invalid" | "expired"> {
  const record = await OtpModel.findOne({ phone, code });
  if (!record) return "invalid";

  if (record.expiresAt < new Date()) {
    await OtpModel.deleteOne({ _id: record._id });
    return "expired";
  }

  await OtpModel.deleteOne({ _id: record._id });
  return "valid";
}
