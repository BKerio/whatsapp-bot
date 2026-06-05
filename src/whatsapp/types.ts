export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string;
  value: WebhookValue;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: Array<{ id: string; status: string; recipient_id: string }>;
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export type IncomingMessage =
  | TextMessage
  | InteractiveMessage
  | ButtonMessage;

interface BaseMessage {
  from: string;
  id: string;
  timestamp: string;
}

export interface TextMessage extends BaseMessage {
  type: "text";
  text: { body: string };
}

export interface InteractiveMessage extends BaseMessage {
  type: "interactive";
  interactive: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface ButtonMessage extends BaseMessage {
  type: "button";
  button: { payload: string; text: string };
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ReplyButton {
  id: string;
  title: string;
}
