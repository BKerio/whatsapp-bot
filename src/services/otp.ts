import { createOtp, verifyOtp as verifyOtpRecord } from "@/models/otp";
import { sendSMS } from "@/services/sms";

export async function requestRegistrationOtp(phone: string): Promise<void> {
  const code = await createOtp(phone);

  await sendSMS({
    mobilePhone: phone,
    smsText: `Your ${process.env.APP_NAME || "Millenium Solutions E.A Limited"} verification code is ${code}. Valid for 10 minutes.`,
  });
}

export async function verifyRegistrationOtp(
  phone: string,
  code: string
): Promise<"valid" | "invalid" | "expired"> {
  return verifyOtpRecord(phone, code);
}
