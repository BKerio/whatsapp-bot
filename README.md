# Shuru Bot 🤖

> A WhatsApp chatbot for KRA tax and compliance services — built with the Meta Cloud API, Express, and TypeScript.

---

## Overview

**Shuru** is a conversational WhatsApp bot that guides users through common Kenya Revenue Authority (KRA) tax self-service tasks. It connects to the [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) via webhooks and supports fully guided, multi-step conversation flows.

### Available Services

| Service | Description |
|---|---|
| 📄 **File Returns** | Guided nil return filing with KRA PIN + OTP verification |
| 🔍 **Check PIN Status** | Look up a KRA PIN by National ID number |
| 💳 **Payments** | Generate an M-PESA payment slip for Income Tax, VAT, or PAYE |
| ✅ **Tax Compliance (TCC)** | Check compliance status and retrieve a Tax Compliance Certificate |
| 👤 **Talk to Agent** | Add yourself to the human support queue |
| 📋 **Help** | Usage instructions for the bot |

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript 5
- **Framework**: Express 5
- **HTTP Client**: Axios
- **Dev Server**: `tsx --watch`
- **Build**: `tsc` + `tsc-alias` (for path aliases)

---

## Project Structure

```
src/
├── index.ts              # Express server, webhook verification & routing
├── env.ts                # Typed environment variable loader
├── bot/
│   ├── handler.ts        # Message routing & conversation flow logic
│   ├── menus.ts          # Menu content, labels, and button definitions
│   └── session.ts        # In-memory session state per phone number
└── whatsapp/
    ├── client.ts         # WhatsApp Cloud API (send messages, mark as read)
    └── types.ts          # TypeScript types for webhooks & messages
```

---

## Prerequisites

- Node.js ≥ 18
- A [Meta Developer Account](https://developers.facebook.com/) with a WhatsApp Business App
- A WhatsApp Business phone number (test number is fine)
- [ngrok](https://ngrok.com/) (for local development)

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/BKerio/whatsapp-bot.git
cd whatsapp-bot
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
PORT=3000
```

| Variable | Where to find it |
|---|---|
| `WHATSAPP_TOKEN` | Meta App Dashboard → WhatsApp → API Setup → Temporary/Permanent Token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta App Dashboard → WhatsApp → API Setup → Phone Number ID |
| `WHATSAPP_VERIFY_TOKEN` | Any secret string you choose — used to verify your webhook with Meta |

### 3. Start the dev server

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

---

## Connecting to Meta (Webhook Setup)

1. **Expose your local server** using ngrok:
   ```bash
   ngrok http 3000
   ```
   Copy the `https://...ngrok-free.app` URL.

2. **Configure your webhook** in the [Meta Developer Portal](https://developers.facebook.com/):
   - Go to **WhatsApp → Configuration → Webhook**
   - Set **Callback URL** to:
     ```
     https://<your-ngrok-url>/api/whatsapp/webhook
     ```
   - Set **Verify Token** to your `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and Save**

3. **Subscribe to the `messages` webhook field** under Webhook Fields → Manage.

4. **Test it**: Send `hi` on WhatsApp to your test number — Shuru will respond with the main menu.

> 💡 Visit `http://localhost:3000/setup` for a step-by-step reminder directly from the server.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service info and quick links |
| `GET` | `/health` | Health check (`{"status":"ok"}`) |
| `GET` | `/setup` | Webhook setup instructions |
| `GET` | `/webhook` | Meta webhook verification |
| `POST` | `/webhook` | Incoming WhatsApp messages |
| `GET` | `/api/whatsapp/webhook` | Meta webhook verification (primary) |
| `POST` | `/api/whatsapp/webhook` | Incoming WhatsApp messages (primary) |

---

## Conversation Flows

Shuru uses a simple in-memory finite-state machine to track each user's conversation. Sessions are keyed by phone number and reset on completion or when the user types `back`, `cancel`, or `menu`.

```
idle
 ├── file_returns → file_returns_pin → file_returns_otp → file_returns_period → [confirm] → idle
 ├── pin_status   → pin_check_id → idle
 ├── payments     → payments_amount (tax type) → payments_amount (amount) → idle
 └── tcc          → tcc_pin → idle
```

### Trigger Words

The bot responds to these keywords from any state:

| Keyword | Action |
|---|---|
| `hi`, `hello`, `hey`, `start`, `menu`, `0` | Show main menu |
| `help` | Show help text |
| `back`, `cancel` | Return to main menu |

---

## Scripts

```bash
npm run dev     # Start dev server with hot reload (tsx --watch)
npm run build   # Compile TypeScript to dist/
npm start       # Run compiled output from dist/
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `WHATSAPP_TOKEN` | ✅ | — | Meta API bearer token |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | — | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | — | Webhook verification secret |
| `PORT` | ❌ | `3000` | HTTP server port |

---

## Notes & Limitations

- **Session storage is in-memory** — all sessions are lost on server restart. For production, replace the `Map` in `session.ts` with a Redis or database-backed store.
- **Demo data** — PIN lookups and TCC responses return mock data. Connect real KRA APIs to go live.
- **OTP verification** — OTP sending is simulated. Integrate an SMS gateway for real OTP delivery.
- **No persistence** — there is currently no logging, analytics, or message history store.

---

## License

ISC
