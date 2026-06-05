export type FlowStep =
  | "idle"
  | "register_name"
  | "register_id"
  | "register_confirm"
  | "file_returns_pin"
  | "file_returns_otp"
  | "file_returns_period"
  | "pin_check_id"
  | "payments_amount"
  | "tcc_pin";

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
