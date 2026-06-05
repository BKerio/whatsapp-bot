import { findUserByPhone } from "@/models/user.js";
import { handleRegisterFlow, startRegister } from "@/bot/register.js";
import { sendMessage } from "@/whatsapp/client.js";
import type { IncomingMessage } from "@/whatsapp/types.js";
import {
  BACK_BUTTON,
  HELP_TEXT,
  MAIN_MENU_ROWS,
  MAIN_MENU_TEXT,
  MENU_TRIGGERS,
  PAYMENT_TYPES,
  TAX_PERIODS,
  YES_NO_BUTTONS,
} from "@/bot/menus.js";
import { getSession, resetSession, setData, setFlow } from "@/bot/session.js";
import { initiateStkPush } from "@/services/mpesa.js";
import { registerPendingPayment } from "@/bot/mpesa-bridge.js";

function extractInput(message: IncomingMessage): string {
  if (message.type === "text") {
    return message.text.body.trim();
  }

  if (message.type === "interactive") {
    if (message.interactive.button_reply) {
      return message.interactive.button_reply.id;
    }
    if (message.interactive.list_reply) {
      return message.interactive.list_reply.id;
    }
  }

  if (message.type === "button") {
    return message.button.payload;
  }

  return "";
}

function normalizeText(input: string): string {
  return input.toLowerCase().trim();
}

async function showMainMenu(to: string): Promise<void> {
  resetSession(to);
  const user = await findUserByPhone(to);
  const text = user
    ? `Welcome back, *${user.name}* 👋\n\nYour virtual assistant for tax and compliance services.\n\nSelect a service below to get started.`
    : MAIN_MENU_TEXT;

  await sendMessage(to, {
    type: "list",
    text,
    buttonLabel: "View Services",
    rows: MAIN_MENU_ROWS,
  });
}

async function showHelp(to: string): Promise<void> {
  await sendMessage(to, { type: "text", text: HELP_TEXT });
  await sendMessage(to, {
    type: "list",
    text: "Need anything else?",
    buttonLabel: "View Services",
    rows: MAIN_MENU_ROWS,
  });
}

async function startFileReturns(to: string): Promise<void> {
  setFlow(to, "file_returns_pin");
  await sendMessage(to, {
    type: "text",
    text:
      "📄 *File Returns*\n\n" +
      "Enter your *KRA PIN* to begin filing.\n\n" +
      "_Example: A012345678X_\n" +
      "Type *back* to return to the main menu.",
  });
}

async function startPinCheck(to: string): Promise<void> {
  setFlow(to, "pin_check_id");
  await sendMessage(to, {
    type: "text",
    text:
      "🔍 *Check PIN Status*\n\n" +
      "Enter your *National ID number* to look up your KRA PIN.\n\n" +
      "Type *back* to return to the main menu.",
  });
}

async function startPayments(to: string): Promise<void> {
  setFlow(to, "payments_amount");
  await sendMessage(to, {
    type: "list",
    text: "💳 *Payments*\n\nSelect the tax type you want to pay:",
    buttonLabel: "Select Tax Type",
    rows: PAYMENT_TYPES,
  });
}

async function startTcc(to: string): Promise<void> {
  setFlow(to, "tcc_pin");
  await sendMessage(to, {
    type: "text",
    text:
      "✅ *Tax Compliance Certificate*\n\n" +
      "Enter your *KRA PIN* to check compliance status and download your TCC.\n\n" +
      "Type *back* to return to the main menu.",
  });
}

async function connectAgent(to: string): Promise<void> {
  resetSession(to);
  await sendMessage(to, {
    type: "text",
    text:
      "👤 *Talk to Agent*\n\n" +
      "You have been added to the support queue.\n" +
      "A support officer will respond shortly during business hours (8am–5pm EAT).\n\n" +
      "Your reference: *#" + to.slice(-6) + "*",
  });
  await sendMessage(to, {
    type: "buttons",
    text: "While you wait, you can browse other services:",
    buttons: [BACK_BUTTON],
  });
}

async function handleServiceSelection(to: string, serviceId: string): Promise<void> {
  switch (serviceId) {
    case "register":
      await startRegister(to);
      break;
    case "file_returns":
      await startFileReturns(to);
      break;
    case "pin_status":
      await startPinCheck(to);
      break;
    case "payments":
      await startPayments(to);
      break;
    case "tcc":
      await startTcc(to);
      break;
    case "agent":
      await connectAgent(to);
      break;
    case "help":
      await showHelp(to);
      break;
    case "main_menu":
      await showMainMenu(to);
      break;
    default:
      await sendMessage(to, {
        type: "text",
        text: "I didn't recognize that option. Please choose from the menu.",
      });
      await showMainMenu(to);
  }
}

async function handleFileReturnsFlow(
  to: string,
  input: string,
  normalized: string
): Promise<void> {
  const session = getSession(to);

  if (session.flow === "file_returns_pin") {
    if (!/^[A-Za-z]\d{9}[A-Za-z]$/.test(input)) {
      await sendMessage(to, {
        type: "text",
        text: "That doesn't look like a valid KRA PIN. Please enter it in the format *A012345678X*.",
      });
      return;
    }

    setData(to, "pin", input.toUpperCase());
    setFlow(to, "file_returns_otp");
    await sendMessage(to, {
      type: "text",
      text:
        `✅ PIN *${input.toUpperCase()}* received.\n\n` +
        "We sent a 6-digit OTP to your registered mobile number.\n" +
        "Enter the OTP to continue.",
    });
    return;
  }

  if (session.flow === "file_returns_otp") {
    if (!/^\d{6}$/.test(input)) {
      await sendMessage(to, {
        type: "text",
        text: "Please enter the 6-digit OTP sent to your phone.",
      });
      return;
    }

    setData(to, "otp", input);
    setFlow(to, "file_returns_period");
    await sendMessage(to, {
      type: "list",
      text: "OTP verified ✅\n\nSelect the tax period to file:",
      buttonLabel: "Select Year",
      rows: TAX_PERIODS,
    });
    return;
  }

  if (session.flow === "file_returns_period") {
    if (normalized === "main_menu") {
      await showMainMenu(to);
      return;
    }

    const year = input.replace("period_", "");
    setData(to, "period", year);
    const pin = session.data.pin ?? "—";

    await sendMessage(to, {
      type: "buttons",
      text:
        "📋 *Confirm Filing*\n\n" +
        `PIN: *${pin}*\n` +
        `Period: *${year}*\n` +
        `Return type: *Nil Return*\n\n` +
        "Submit this return?",
      buttons: YES_NO_BUTTONS,
    });
    return;
  }

  if (normalized === "confirm_yes") {
    const pin = session.data.pin ?? "—";
    const period = session.data.period ?? "—";
    resetSession(to);
    await sendMessage(to, {
      type: "text",
      text:
        "🎉 *Return filed successfully!*\n\n" +
        `PIN: *${pin}*\n` +
        `Period: *${period}*\n` +
        `Acknowledgement: *ACK-${Date.now().toString().slice(-8)}*\n\n` +
        "Your nil return has been submitted. You will receive a confirmation shortly.",
    });
    await showMainMenu(to);
    return;
  }

  if (normalized === "confirm_no" || normalized === "main_menu") {
    await showMainMenu(to);
  }
}

async function handlePinCheckFlow(to: string, input: string): Promise<void> {
  if (!/^\d{6,8}$/.test(input)) {
    await sendMessage(to, {
      type: "text",
      text: "Please enter a valid National ID number (6–8 digits).",
    });
    return;
  }

  resetSession(to);
  await sendMessage(to, {
    type: "text",
    text:
      "🔍 *PIN Lookup Result*\n\n" +
      `ID: *${input}*\n` +
      "Name: *Demo Taxpayer*\n" +
      "KRA PIN: *A012345678X*\n" +
      "Status: *Active*\n\n" +
      "_This is demo data. Connect real KRA APIs for live lookups._",
  });
  await showMainMenu(to);
}

async function handlePaymentsFlow(
  to: string,
  input: string,
  normalized: string
): Promise<void> {
  const session = getSession(to);

  if (normalized === "main_menu") {
    await showMainMenu(to);
    return;
  }

  if (!session.data.taxType) {
    const taxLabels: Record<string, string> = {
      pay_income: "Income Tax",
      pay_vat: "VAT",
      pay_paye: "PAYE",
    };

    if (!taxLabels[input]) {
      await startPayments(to);
      return;
    }

    setData(to, "taxType", taxLabels[input]);
    await sendMessage(to, {
      type: "text",
      text:
        `💳 *${taxLabels[input]} Payment*\n\n` +
        "Enter the *amount* you want to pay (in KES).\n\n" +
        "Type *back* to return to the main menu.",
    });
    return;
  }

  const amount = Number(input.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    await sendMessage(to, {
      type: "text",
      text: "Please enter a valid amount in KES (e.g. 5000).",
    });
    return;
  }

  const taxType = session.data.taxType;
  resetSession(to);

  // Notify immediately so the user knows something is happening
  await sendMessage(to, {
    type: "text",
    text:
      "📱 *M-Pesa Payment Request*\n\n" +
      `Tax type: *${taxType}*\n` +
      `Amount: *KES ${amount.toLocaleString()}*\n\n` +
      "An M-Pesa prompt has been sent to your phone.\n" +
      "Enter your *M-Pesa PIN* to complete the payment.\n\n" +
      "_You will receive a confirmation message here once done._",
  });

  try {
    const result = await initiateStkPush(to, amount, taxType);
    registerPendingPayment(result.checkoutRequestId, to, taxType, amount);
    console.log(`STK Push sent for ${to} — CheckoutRequestID: ${result.checkoutRequestId}`);
  } catch (err) {
    console.error("STK Push failed from bot handler:", err);
    await sendMessage(to, {
      type: "text",
      text:
        "❌ *Payment Request Failed*\n\n" +
        "We could not reach M-Pesa at this time.\n" +
        "Please try again or select *Talk to Agent* for help.",
    });
    await showMainMenu(to);
  }
}

async function handleTccFlow(to: string, input: string): Promise<void> {
  if (!/^[A-Za-z]\d{9}[A-Za-z]$/.test(input)) {
    await sendMessage(to, {
      type: "text",
      text: "That doesn't look like a valid KRA PIN. Please enter it in the format *A012345678X*.",
    });
    return;
  }

  resetSession(to);
  await sendMessage(to, {
    type: "text",
    text:
      "✅ *Compliance Status*\n\n" +
      `PIN: *${input.toUpperCase()}*\n` +
      "Status: *Compliant*\n" +
      "Outstanding liabilities: *None*\n\n" +
      "Your Tax Compliance Certificate is active.\n" +
      `Certificate ID: *TCC-${Date.now().toString().slice(-8)}*\n\n` +
      "_This is demo data. Connect real KRA APIs for live certificates._",
  });
  await showMainMenu(to);
}

async function handleActiveFlow(
  to: string,
  input: string,
  normalized: string
): Promise<void> {
  const { flow } = getSession(to);

  if (normalized === "back" || normalized === "cancel" || normalized === "main_menu") {
    await showMainMenu(to);
    return;
  }

  switch (flow) {
    case "register_name":
    case "register_id":
    case "register_confirm": {
      const done = await handleRegisterFlow(to, input, normalized);
      if (done) await showMainMenu(to);
      break;
    }
    case "file_returns_pin":
    case "file_returns_otp":
    case "file_returns_period":
      await handleFileReturnsFlow(to, input, normalized);
      break;
    case "pin_check_id":
      await handlePinCheckFlow(to, input);
      break;
    case "payments_amount":
      await handlePaymentsFlow(to, input, normalized);
      break;
    case "tcc_pin":
      await handleTccFlow(to, input);
      break;
    default:
      await showMainMenu(to);
  }
}

export async function handleMessage(
  to: string,
  message: IncomingMessage
): Promise<void> {
  const input = extractInput(message);
  if (!input) {
    await sendMessage(to, {
      type: "text",
      text: "I can only respond to text messages and menu selections for now.",
    });
    return;
  }

  const normalized = normalizeText(input);
  const session = getSession(to);

  if (MENU_TRIGGERS.has(normalized)) {
    if (normalized === "help") {
      await showHelp(to);
    } else {
      await showMainMenu(to);
    }
    return;
  }

  if (session.flow === "idle") {
    const serviceIds = new Set(MAIN_MENU_ROWS.map((row) => row.id));
    if (serviceIds.has(input) || input === "main_menu") {
      await handleServiceSelection(to, input);
      return;
    }

    const user = await findUserByPhone(to);
    const greeting = user
      ? `Hi *${user.name}*! 👋 Type *menu* or tap below to see available services.`
      : "Hi! 👋 Type *menu* or tap below to see available services.\n\n_New here? Select **Register** to create your profile._";

    await sendMessage(to, { type: "text", text: greeting });
    await showMainMenu(to);
    return;
  }

  await handleActiveFlow(to, input, normalized);
}
