export type FlowStep =
  | "idle"
  | "register_name"
  | "register_id"
  | "register_otp"
  | "register_confirm"
  | "payments_amount"
  | "support_category"
  | "support_description"
  | "support_confirm";

export interface Session {
  flow: FlowStep;
  data: Record<string, string>;
}

import { SessionModel, nextExpiry } from "@/models/session";

async function getOrCreate(phone: string): Promise<Session> {
  const existing = await SessionModel.findOne({ phone }).lean<{
    flow?: FlowStep;
    data?: Record<string, string>;
  }>();

  if (existing?.flow && existing.data) {
    return { flow: existing.flow, data: existing.data };
  }

  await SessionModel.updateOne(
    { phone },
    { $set: { phone, flow: "idle", data: {}, expiresAt: nextExpiry() } },
    { upsert: true }
  );

  return { flow: "idle", data: {} };
}

export async function getSession(phone: string): Promise<Session> {
  return getOrCreate(phone);
}

export async function resetSession(phone: string): Promise<void> {
  await SessionModel.updateOne(
    { phone },
    { $set: { flow: "idle", data: {}, expiresAt: nextExpiry() } },
    { upsert: true }
  );
}

export async function setFlow(phone: string, flow: FlowStep): Promise<void> {
  await SessionModel.updateOne(
    { phone },
    { $set: { flow, expiresAt: nextExpiry() } },
    { upsert: true }
  );
}

export async function setData(phone: string, key: string, value: string): Promise<void> {
  await SessionModel.updateOne(
    { phone },
    { $set: { [`data.${key}`]: value, expiresAt: nextExpiry() } },
    { upsert: true }
  );
}
