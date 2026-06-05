import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { handleMessage } from '@/bot/handler.js';
import { connectDb } from '@/db/connect.js';
import { env } from '@/env.js';
import { markAsRead } from '@/whatsapp/client.js';
import type { IncomingMessage, WebhookPayload } from '@/whatsapp/types.js';
import mpesaRoutes from '@/routes/mpesa.js';
import { COMPANY } from '@/bot/company.js';

const app = express();

// ─── HTTP server + Socket.IO ────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Expose io instance to route handlers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_checkout', ({ checkoutRequestId }: { checkoutRequestId: string }) => {
    if (checkoutRequestId) {
      socket.join(checkoutRequestId);
      console.log(`Socket ${socket.id} joined room ${checkoutRequestId}`);
    }
  });

  socket.on('disconnect', (reason: string) => {
    console.log('Socket disconnected:', socket.id, reason);
  });
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── WhatsApp Webhook ────────────────────────────────────────────────────────
function verifyWebhook(req: express.Request, res: express.Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe') {
    res.sendStatus(403);
    return;
  }

  console.log('Webhook verification attempt:', { mode, tokenMatch: token === env.verifyToken });

  if (token === env.verifyToken && typeof challenge === 'string') {
    console.log('Webhook verified');
    res.status(200).type('text/plain').send(challenge);
    return;
  }

  res.sendStatus(403);
}

async function receiveWebhook(req: express.Request, res: express.Response): Promise<void> {
  res.sendStatus(200);

  try {
    const body = req.body as WebhookPayload;
    console.log('Webhook POST received:', body.object ?? 'unknown');

    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        if (value.statuses?.length) {
          console.log('Status update received, skipping');
          continue;
        }

        if (!value.messages?.length) {
          console.log('No messages in payload, skipping');
          continue;
        }

        for (const message of value.messages) {
          const sender = message.from;
          const text =
            message.type === 'text' ? message.text.body : `[${message.type}]`;

          console.log(`Message from ${sender}: ${text}`);
          await markAsRead(message.id);
          await handleMessage(sender, message as IncomingMessage);
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
}

const webhookPaths = ['/webhook', '/api/whatsapp/webhook'];
for (const path of webhookPaths) {
  app.get(path, verifyWebhook);
  app.post(path, receiveWebhook);
}

// ─── M-Pesa Routes ───────────────────────────────────────────────────────────
app.use('/api', mpesaRoutes);

// ─── Utility Routes ──────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'millenium-support',
    company: COMPANY.name,
    message: 'Millenium Solutions EA Ltd — WhatsApp Customer Support',
    health: '/health',
    setup: '/setup',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'millenium-support',
    company: COMPANY.name,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/setup', (_req, res) => {
  res.json({
    service: 'millenium-support',
    company: COMPANY.name,
    steps: [
      'Run only ONE ngrok tunnel: ngrok http 3000',
      'Copy the https URL from ngrok (it changes every restart)',
      'In Meta -> WhatsApp -> Configuration -> Webhook, set Callback URL to: https://YOUR-NGROK-URL/api/whatsapp/webhook',
      'Set Verify token to the WHATSAPP_VERIFY_TOKEN value in .env',
      'Click Verify and save',
      'Click Manage on Webhook fields and subscribe to messages',
      'Send hi on WhatsApp, then check ngrok inspect at http://127.0.0.1:4040/inspect/http for a POST from facebookplatform',
    ],
    verifyTokenSet: Boolean(env.verifyToken),
    phoneNumberId: env.phoneNumberId,
    mpesaCallbackUrl: process.env.MPESA_CALLBACK_URL || 'not set',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDb();

  server.listen(env.port, () => {
    console.log('=========================================');
    console.log(`${COMPANY.name} support bot listening on port ${env.port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('WhatsApp webhook:');
    console.log(`  GET/POST http://localhost:${env.port}/api/whatsapp/webhook`);
    console.log('');
    console.log('M-Pesa endpoints:');
    console.log(`  POST http://localhost:${env.port}/api/stkpush`);
    console.log(`  POST http://localhost:${env.port}/api/stkpush/callback`);
    console.log(`  GET  http://localhost:${env.port}/api/stkpush/status/:id`);
    console.log(`  GET  http://localhost:${env.port}/api/transactions`);
    console.log('');
    console.log(`M-Pesa Callback URL: ${process.env.MPESA_CALLBACK_URL || '(not set)'}`);
    console.log('=========================================');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
