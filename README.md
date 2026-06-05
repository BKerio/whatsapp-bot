# Shuru Bot 🤖

> A WhatsApp chatbot for KRA tax and compliance services — with M-Pesa STK Push payments, real-time Socket.IO updates, and MongoDB persistence. Built with the Meta Cloud API, Express, and TypeScript.

---

## Overview

**Shuru** is a conversational WhatsApp bot that guides users through common Kenya Revenue Authority (KRA) tax self-service tasks. It connects to the [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) via webhooks and supports fully guided, multi-step conversation flows. Payments are handled via the [Safaricom Daraja (M-Pesa) API](https://developer.safaricom.co.ke/) with real-time callback notifications pushed to clients over Socket.IO.

### Available Bot Services

| Service | Description |
|---|---|
| 📄 **File Returns** | Guided nil return filing with KRA PIN + OTP verification |
| 🔍 **Check PIN Status** | Look up a KRA PIN by National ID number |
| 💳 **Payments** | Generate an M-Pesa STK Push payment for Income Tax, VAT, or PAYE |
| ✅ **Tax Compliance (TCC)** | Check compliance status and retrieve a Tax Compliance Certificate |
| 👤 **Talk to Agent** | Add yourself to the human support queue |
| 📋 **Help** | Usage instructions for the bot |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 5 |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 8 |
| Real-time | Socket.IO 4 |
| HTTP Client | Axios |
| Dev Server | `tsx --watch` |
| Build | `tsc` + `tsc-alias` |

---

## Project Structure

```
src/
├── index.ts              # Server entry — Express, Socket.IO, MongoDB, routes
├── env.ts                # Typed environment variable loader (WhatsApp vars)
├── bot/
│   ├── handler.ts        # WhatsApp message routing & conversation flow logic
│   ├── menus.ts          # Menu content, labels, and button definitions
│   └── session.ts        # In-memory session state per phone number
├── whatsapp/
│   ├── client.ts         # WhatsApp Cloud API (send messages, mark as read)
│   └── types.ts          # TypeScript types for webhooks & messages
├── routes/
│   └── mpesa.ts          # M-Pesa STK Push, callback, status & transaction routes
└── models/
    └── Payments.ts       # Mongoose model for M-Pesa payment transactions
```

---

## Prerequisites

- Node.js ≥ 18
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A [Meta Developer Account](https://developers.facebook.com/) with a WhatsApp Business App
- A [Safaricom Daraja Account](https://developer.safaricom.co.ke/) (sandbox is fine)
- [ngrok](https://ngrok.com/) (for local webhook exposure)

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
# WhatsApp
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token

# Server
PORT=3000
CLIENT_ORIGIN=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/shuru-bot

# M-Pesa (Daraja API)
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
TILL_NO=your_till_number
MPESA_TRANSACTIONTYPE=CustomerBuyGoodsOnline
MPESA_CALLBACK_URL=https://your-ngrok-url/api/stkpush/callback
```

### 3. Start the dev server

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

---

## WhatsApp Webhook Setup

1. **Expose your local server** using ngrok:
   ```bash
   ngrok http 3000
   ```
2. In the [Meta Developer Portal](https://developers.facebook.com/), go to **WhatsApp → Configuration → Webhook** and set:
   - **Callback URL**: `https://<ngrok-url>/api/whatsapp/webhook`
   - **Verify Token**: your `WHATSAPP_VERIFY_TOKEN`
3. Click **Verify and Save**, then subscribe to the `messages` webhook field.
4. Send `hi` on WhatsApp — Shuru will respond with the main menu.

> 💡 Visit `http://localhost:3000/setup` for a step-by-step reminder directly from the running server.

---

## M-Pesa Integration

### STK Push Flow

```
Client → POST /api/stkpush  →  Daraja API (STK Push)
                                      ↓ (user pays on phone)
Daraja → POST /api/stkpush/callback
              ↓
         Save to MongoDB
              ↓
         io.emit('transaction_update') → Client room
```

### Real-time Updates with Socket.IO

After initiating an STK Push, the client should:

1. Connect to the Socket.IO server
2. Emit `join_checkout` with the `checkoutRequestId` returned from the STK push
3. Listen for `transaction_update` events

```js
const socket = io('http://localhost:3000');

socket.emit('join_checkout', { checkoutRequestId: 'ws_xxxxxxxx' });

socket.on('transaction_update', (data) => {
  console.log(data.status); // 'success' | 'cancelled' | 'timeout' | 'failure' ...
  console.log(data.receipt);
  console.log(data.amount);
});
```

### Transaction Status Values

| Status | Meaning |
|---|---|
| `success` | Payment completed (ResultCode 0) |
| `cancelled` | User cancelled on phone (ResultCode 1032) |
| `timeout` | Session timed out (ResultCode 1037) |
| `wrong_pin` | Wrong M-Pesa PIN entered |
| `insufficient_funds` | Insufficient balance |
| `failure` | Any other failure |

---

## API Endpoints

### WhatsApp

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/whatsapp/webhook` | Meta webhook verification |
| `POST` | `/api/whatsapp/webhook` | Incoming WhatsApp messages |

### M-Pesa

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/stkpush` | Initiate M-Pesa STK Push — body: `{ phone, amount }` |
| `POST` | `/api/stkpush/callback` | Safaricom callback (set as `MPESA_CALLBACK_URL`) |
| `GET` | `/api/stkpush/status/:checkoutRequestId` | Poll transaction status |
| `GET` | `/api/transactions` | List last 50 transactions |

### Utility

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check (includes DB status) |
| `GET` | `/setup` | Webhook setup instructions |

---

## Conversation Flows (WhatsApp Bot)

Shuru uses an in-memory finite-state machine keyed by phone number:

```
idle
 ├── file_returns → file_returns_pin → file_returns_otp → file_returns_period → [confirm] → idle
 ├── pin_status   → pin_check_id → idle
 ├── payments     → payments_amount (tax type) → payments_amount (amount) → idle
 └── tcc          → tcc_pin → idle
```

**Trigger words** (work from any state):

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

### WhatsApp

| Variable | Required | Description |
|---|---|---|
| `WHATSAPP_TOKEN` | ✅ | Meta API bearer token |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | Webhook verification secret |

### Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ❌ | `3000` | HTTP server port |
| `CLIENT_ORIGIN` | ❌ | `*` | Allowed CORS origin for Socket.IO |

### MongoDB

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |

### M-Pesa

| Variable | Required | Description |
|---|---|---|
| `MPESA_BASE_URL` | ✅ | `https://sandbox.safaricom.co.ke` or production URL |
| `MPESA_CONSUMER_KEY` | ✅ | Daraja app consumer key |
| `MPESA_CONSUMER_SECRET` | ✅ | Daraja app consumer secret |
| `MPESA_SHORTCODE` | ✅ | Business shortcode |
| `MPESA_PASSKEY` | ✅ | Lipa Na M-Pesa passkey |
| `TILL_NO` | ✅ | Till/PayBill number (PartyB) |
| `MPESA_TRANSACTIONTYPE` | ✅ | `CustomerBuyGoodsOnline` or `CustomerPayBillOnline` |
| `MPESA_CALLBACK_URL` | ✅ | Public URL Safaricom will POST results to |

---

## Notes & Limitations

- **Session storage is in-memory** — WhatsApp sessions are lost on server restart. Replace the `Map` in `session.ts` with Redis or a DB store for production.
- **Demo data** — PIN lookups and TCC responses return mock data. Integrate real KRA APIs to go live.
- **OTP verification** — OTP sending is simulated. Integrate an SMS gateway (e.g., Africa's Talking) for real delivery.
- **M-Pesa sandbox** — Daraja sandbox uses test credentials and simulated payments. Switch `MPESA_BASE_URL` to `https://api.safaricom.co.ke` for production.
- **Callback URL must be public** — Safaricom cannot reach `localhost`. Always use an ngrok URL (or deployed server) for `MPESA_CALLBACK_URL`.

---

## License

ISC
