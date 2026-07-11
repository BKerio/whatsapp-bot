# Millenium Solutions EA Ltd - WhatsApp Support Bot

> A WhatsApp customer support bot for Millenium Solutions - with service inquiries, M-Pesa STK Push payments, user registration, team directory, and real-time Socket.IO updates. Built with the Meta Cloud API, Express, MongoDB, and TypeScript.

---

## Overview

**Millenium Bot** is a conversational WhatsApp assistant that provides customer support for Millenium Solutions EA Ltd. It connects to the [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) via webhooks and guides users through service inquiries, payments, registration, and team contact information. Payments are handled via the [Safaricom Daraja (M-Pesa) API](https://developer.safaricom.co.ke/) with real-time callback notifications pushed to clients over Socket.IO.

### Available Bot Services

| Service | Description |
|---|---|
| 📋 **Service Catalog** | Browse and inquire about software dev, IT infrastructure, networking, cybersecurity, ERP, IoT, drone mapping, and tower solutions |
| 👤 **User Registration** | Register phone number, name, company, and industry |
| 💳 **Payments** | Generate M-Pesa STK Push for software dev, IT support, infrastructure, and other services |
| 👥 **Team Directory** | View sales, support, and technical team members with contact info |
| 🏢 **Company Profile** | Download company profile PDF and contact details |
| 📞 **Support Queue** | Get routed to live support team members by department |
| 📋 **Help** | Bot usage instructions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 5.8 |
| Framework | Express 5.2 |
| Database | MongoDB via Mongoose 8.24 |
| Real-time | Socket.IO 4.8 |
| HTTP Client | Axios 1.17 |
| Dev Server | `tsx watch` |
| Build | `tsc` + `tsc-alias` |

---

## Project Structure

```
src/
├── index.ts              # Server entry - Express, Socket.IO, MongoDB, routes
├── env.ts                # Typed environment variable loader
├── db/
│   └── connect.ts        # MongoDB connection setup
├── bot/
│   ├── handler.ts        # WhatsApp message routing & conversation flows
│   ├── session.ts        # In-memory session state per phone number
│   ├── menus.ts          # Menu content and button definitions
│   ├── company.ts        # Company info, services, payments, team data
│   ├── register.ts       # User registration flow
│   ├── profile.ts        # Company profile sharing
│   └── mpesa-bridge.ts   # M-Pesa payment flow integration
├── whatsapp/
│   ├── client.ts         # WhatsApp Cloud API (send messages, mark as read)
│   ├── types.ts          # TypeScript types for webhooks & messages
│   └── media.ts          # Media handling (files, PDFs)
├── services/
│   ├── mpesa.ts          # M-Pesa STK Push implementation
│   ├── otp.ts            # OTP/SMS service
│   └── sms.ts            # SMS integration
├── routes/
│   └── mpesa.ts          # M-Pesa endpoints (push, callback, status, transactions)
└── models/
    ├── Payments.ts       # Mongoose model for M-Pesa transactions
    ├── user.ts           # Mongoose model for users
    ├── session.ts        # Mongoose model for sessions
    └── otp.ts            # Mongoose model for OTP records
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
git clone https://github.com/BKerio/bot.git
cd bot
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
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/millenium-bot

# M-Pesa (Daraja API)
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
TILL_NO=your_till_number
MPESA_TRANSACTIONTYPE=CustomerBuyGoodsOnline
MPESA_CALLBACK_URL=https://your-ngrok-url/api/stkpush/callback

# SMS/OTP (optional)
SMS_GATEWAY_KEY=optional_sms_gateway_key
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
2. In the [Meta Developer Portal](https://developers.facebook.com/), go to **WhatsApp - Configuration - Webhook** and set:
   - **Callback URL**: `https://<ngrok-url>/api/whatsapp/webhook`
   - **Verify Token**: your `WHATSAPP_VERIFY_TOKEN`
3. Click **Verify and Save**, then subscribe to the `messages` webhook field.
4. Send `hi` on WhatsApp - the bot will respond with the main menu.

> 💡 Visit `http://localhost:3000/setup` for a step-by-step reminder directly from the running server.

---

## M-Pesa Integration

### STK Push Flow

```
Client - POST /api/stkpush  -  Daraja API (STK Push)
                                      ↓ (user pays on phone)
Daraja - POST /api/stkpush/callback
              ↓
         Save to MongoDB
              ↓
         io.emit('transaction_update') - Client room
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
| `POST` | `/api/stkpush` | Initiate M-Pesa STK Push - body: `{ phone, amount }` |
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

The bot uses an in-memory finite-state machine keyed by phone number to track user conversations:

```
idle (main menu)
 ├── register         - register_company - register_industry - register_name - idle
 ├── services        - service_details - [service inquiry] - idle
 ├── payments        - payment_category - payment_amount - [M-Pesa STK] - idle
 ├── team            - team_department - [team list] - idle
 ├── profile         - [download PDF] - idle
 └── support         - [queue/redirect] - idle
```

**Trigger words** (work from any state):

| Keyword | Action |
|---|---|
| `hi`, `hello`, `hey`, `start`, `menu`, `0` | Show main menu |
| `help` | Show bot usage instructions |
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

## Company Profile

**Millenium Solutions EA Ltd** - "Your Technology Partner"

- 📍 **Address**: Manga House - Ground Floor Wing B, 5 Kiambere Road, Upper Hill, Nairobi, Kenya
- 📧 **Email**: info@millenium.co.ke
- 📞 **Phone**: +254716774477
- 🌐 **Website**: https://www.millenium.co.ke
- ⏰ **Hours**: Monday–Friday, 8:00am–5:00pm EAT

### Services Offered

- 💻 **Software & Databases** - Custom apps and database solutions
- 🖥️ **IT Infrastructure** - Compute, storage and hardware
- 🌐 **Networking** - WAN/LAN and connectivity solutions
- 🔒 **Cybersecurity** - Threat protection and data safety
- 📊 **ERP Solutions** - SAP, Microsoft Navision and more
- 📡 **IoT & Smart Solutions** - Connected device platforms
- 🛸 **Drone Mapping** - Aerial surveying and geospatial data
- 📶 **Comm Towers** - Tower construction and network infra

---

## Notes & Limitations

- **Session storage is in-memory** - WhatsApp sessions are lost on server restart. For production, migrate to Redis or a database store.
- **User registration & profile data** - Stored in MongoDB but may need sync with CRM systems.
- **OTP/SMS delivery** - Simulated or integrated with SMS gateways (e.g., Africa's Talking). Configure via `SMS_GATEWAY_KEY`.
- **M-Pesa sandbox** - Daraja sandbox uses test credentials and simulated payments. Switch `MPESA_BASE_URL` to `https://api.safaricom.co.ke` for production.
- **Callback URL must be public** - Safaricom cannot reach `localhost`. Always use an ngrok URL (or deployed server) for `MPESA_CALLBACK_URL`.
- **PDF delivery** - Company profile PDF is sent via WhatsApp. Ensure the file exists at the configured path.
- **Real team data** - Team directory and contact info are managed in `bot/company.ts`. Update this file to reflect actual team members.

---

## License

ISC
