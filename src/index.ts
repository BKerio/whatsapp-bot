import "dotenv/config";
import express from "express";
import { handleMessage } from "./bot/handler.js";
import { env } from "./env.js";
import { markAsRead } from "./whatsapp/client.js";
import type { IncomingMessage, WebhookPayload } from "./whatsapp/types.js";

const app = express();

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

function verifyWebhook(req: express.Request, res: express.Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode !== "subscribe") {
    res.sendStatus(403);
    return;
  }

  console.log("Webhook verification attempt:", { mode, tokenMatch: token === env.verifyToken });

  if (token === env.verifyToken && typeof challenge === "string") {
    console.log("Webhook verified");
    res.status(200).type("text/plain").send(challenge);
    return;
  }

  res.sendStatus(403);
}

async function receiveWebhook(req: express.Request, res: express.Response): Promise<void> {
  res.sendStatus(200);

  try {
    const body = req.body as WebhookPayload;
    console.log("Webhook POST received:", body.object ?? "unknown");

    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        if (value.statuses?.length) {
          console.log("Status update received, skipping");
          continue;
        }

        if (!value.messages?.length) {
          console.log("No messages in payload, skipping");
          continue;
        }

        for (const message of value.messages) {
          const sender = message.from;
          const text =
            message.type === "text" ? message.text.body : `[${message.type}]`;

          console.log(`Message from ${sender}: ${text}`);
          await markAsRead(message.id);
          await handleMessage(sender, message as IncomingMessage);
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
}

const webhookPaths = ["/webhook", "/api/whatsapp/webhook"];

for (const path of webhookPaths) {
  app.get(path, verifyWebhook);
  app.post(path, receiveWebhook);
}

app.get("/", (_req, res) => {
  res.json({
    service: "shuru-bot",
    message: "Use /api/whatsapp/webhook as the Meta callback URL",
    health: "/health",
    setup: "/setup",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "shuru-bot" });
});

app.get("/setup", (_req, res) => {
  res.json({
    service: "shuru-bot",
    steps: [
      "Run only ONE ngrok tunnel: ngrok http 3000",
      "Copy the https URL from ngrok (it changes every restart)",
      "In Meta -> WhatsApp -> Configuration -> Webhook, set Callback URL to: https://YOUR-NGROK-URL/api/whatsapp/webhook",
      "Set Verify token to the WHATSAPP_VERIFY_TOKEN value in .env",
      "Click Verify and save",
      "Click Manage on Webhook fields and subscribe to messages",
      "Send hi on WhatsApp, then check ngrok inspect at http://127.0.0.1:4040/inspect/http for a POST from facebookplatform",
    ],
    verifyTokenSet: Boolean(env.verifyToken),
    phoneNumberId: env.phoneNumberId,
  });
});

app.listen(env.port, () => {
  console.log(`Shuru bot listening on port ${env.port}`);
  console.log("");
  console.log("Meta webhook setup:");
  console.log("  1. Run: ngrok http 3000");
  console.log("  2. Callback URL: https://<ngrok-url>/api/whatsapp/webhook");
  console.log("  3. Verify token: (WHATSAPP_VERIFY_TOKEN from .env)");
  console.log("  4. Subscribe to the messages field");
  console.log("");
  console.log("Webhook path:");
  console.log(`  http://localhost:${env.port}/api/whatsapp/webhook`);
});
