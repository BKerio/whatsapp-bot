export type FlowStep =
  | "idle"
  | "register_name"
  | "register_id"
  | "register_confirm"
  | "payments_amount"
  | "support_category"
  | "support_description"
  | "support_confirm";

export interface Session {
  flow: FlowStep;
  data: Record<string, string>;
}

const sessions = new Map<string, Session>();

export function getSession(phone: string): Session {
  const existing = sessions.get(phone);
  if (existing) return existing;

  const session: Session = { flow: "idle", data: {} };
  sessions.set(phone, session);
  return session;
}

export function resetSession(phone: string): void {
  sessions.set(phone, { flow: "idle", data: {} });
}

export function setFlow(phone: string, flow: FlowStep): void {
  const session = getSession(phone);
  session.flow = flow;
}

export function setData(phone: string, key: string, value: string): void {
  const session = getSession(phone);
  session.data[key] = value;
}
