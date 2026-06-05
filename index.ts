import "dotenv/config";
import axios, { isAxiosError } from "axios";
import process from "process";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const TOKEN = requireEnv("WHATSAPP_TOKEN");
const PHONE_NUMBER_ID = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
const RECIPIENT = requireEnv("WHATSAPP_RECIPIENT");

async function sendMessage(): Promise<void> {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: RECIPIENT,
        type: "text",
        text: {
          body: "Hello, Andrej Karpathy! This is a message from the WhatsApp Business API.",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Message sent:", res.data);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error(err.response?.data ?? err.message);
    } else if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
  }
}

sendMessage();
