import axios, { isAxiosError } from "axios";
import { env } from "@/env";
import type { ListRow, ReplyButton } from "@/whatsapp/types";

const API_BASE = `https://graph.facebook.com/v20.0/${env.phoneNumberId}`;

type OutgoingMessage =
  | { type: "text"; text: string }
  | { type: "buttons"; text: string; buttons: ReplyButton[] }
  | { type: "list"; text: string; buttonLabel: string; rows: ListRow[] };

async function postMessage(to: string, body: Record<string, unknown>): Promise<void> {
  try {
    const res = await axios.post(
      `${API_BASE}/messages`,
      { messaging_product: "whatsapp", to, ...body },
      {
        headers: {
          Authorization: `Bearer ${env.token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Reply sent to ${to}:`, res.data);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error("WhatsApp API error:", err.response?.data ?? err.message);
    } else {
      console.error("WhatsApp API error:", err);
    }
  }
}

function buildPayload(message: OutgoingMessage): Record<string, unknown> {
  if (message.type === "text") {
    return { type: "text", text: { body: message.text } };
  }

  if (message.type === "buttons") {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.text },
        action: {
          buttons: message.buttons.map((button) => ({
            type: "reply",
            reply: { id: button.id, title: button.title },
          })),
        },
      },
    };
  }

  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: message.text },
      action: {
        button: message.buttonLabel,
        sections: [{ title: "Services", rows: message.rows }],
      },
    },
  };
}

export async function sendMessage(to: string, message: OutgoingMessage): Promise<void> {
  await postMessage(to, buildPayload(message));
}

export async function markAsRead(messageId: string): Promise<void> {
  try {
    await axios.post(
      `${API_BASE}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${env.token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    // Non-critical; ignore read receipt failures.
  }
}
