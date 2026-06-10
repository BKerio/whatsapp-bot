import { findUserByPhone } from "@/models/user";
import { handleRegisterFlow, startRegister } from "@/bot/register";
import { sendCompanyProfile } from "@/bot/profile";
import {
  COMPANY,
  PAYMENT_CATEGORIES,
  PAYMENT_LABELS,
  SERVICE_CATALOG,
  SERVICE_DETAILS,
  SUPPORT_CATEGORIES,
  SUPPORT_LABELS,
  TEAM_BY_DEPARTMENT,
  TEAM_DEPARTMENT_TITLES,
  TEAM_DEPARTMENTS,
  formatFullTeamDirectory,
  formatTeamList,
} from "@/bot/company";
import { sendMessage } from "@/whatsapp/client";
import type { IncomingMessage } from "@/whatsapp/types";
import {
  BACK_BUTTON,
  HELP_TEXT,
  MAIN_MENU_ROWS,
  MAIN_MENU_TEXT,
  MENU_TRIGGERS,
  YES_NO_BUTTONS,
} from "@/bot/menus";
import { getSession, resetSession, setData, setFlow } from "@/bot/session";
import { initiateStkPush } from "@/services/mpesa";
import { registerPendingPayment } from "@/bot/mpesa-bridge";

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
    ? `Welcome back, *${user.name}* 👋\n\n*${COMPANY.name}* Customer Support\n${COMPANY.tagline}\n\nHow can we help you today?`
    : MAIN_MENU_TEXT;

  await sendMessage(to, {
    type: "list",
    text,
    buttonLabel: "View Options",
    rows: MAIN_MENU_ROWS,
  });
}

async function showHelp(to: string): Promise<void> {
  await sendMessage(to, { type: "text", text: HELP_TEXT });
  await sendMessage(to, {
    type: "list",
    text: "Need anything else?",
    buttonLabel: "View Options",
    rows: MAIN_MENU_ROWS,
  });
}

async function showServices(to: string): Promise<void> {
  resetSession(to);
  await sendMessage(to, {
    type: "list",
    text:
      "🛠️ *Our Solutions*\n\n" +
      "Millenium Solutions delivers transformative IT services across East Africa. Select a service to learn more:",
    buttonLabel: "View Services",
    rows: SERVICE_CATALOG,
  });
}

async function showServiceDetail(to: string, serviceId: string): Promise<void> {
  const detail = SERVICE_DETAILS[serviceId];
  if (!detail) {
    await showServices(to);
    return;
  }

  await sendMessage(to, { type: "text", text: detail });
  await sendMessage(to, {
    type: "buttons",
    text: "Would you like to request support or speak with our team?",
    buttons: [
      { id: "support", title: "Support Request" },
      { id: "agent", title: "Talk to Agent" },
      BACK_BUTTON,
    ],
  });
}

async function showTeam(to: string): Promise<void> {
  resetSession(to);
  await sendMessage(to, {
    type: "list",
    text:
      "👥 *Our Team*\n\n" +
      "Meet the people behind Millenium Solutions EA Ltd. Select a department:",
    buttonLabel: "View Team",
    rows: TEAM_DEPARTMENTS,
  });
}

async function showTeamDepartment(to: string, departmentId: string): Promise<void> {
  if (departmentId === "team_all") {
    const messages = formatFullTeamDirectory();
    for (const text of messages) {
      await sendMessage(to, { type: "text", text });
    }
    await sendMessage(to, {
      type: "buttons",
      text: "Would you like to speak with our team?",
      buttons: [
        { id: "agent", title: "Talk to Agent" },
        { id: "support", title: "Support Request" },
        BACK_BUTTON,
      ],
    });
    return;
  }

  const members = TEAM_BY_DEPARTMENT[departmentId];
  const title = TEAM_DEPARTMENT_TITLES[departmentId];
  if (!members || !title) {
    await showTeam(to);
    return;
  }

  await sendMessage(to, { type: "text", text: formatTeamList(title, members) });
  await sendMessage(to, {
    type: "buttons",
    text: "Browse more departments or get in touch:",
    buttons: [
      { id: "team", title: "Our Team" },
      { id: "agent", title: "Talk to Agent" },
      BACK_BUTTON,
    ],
  });
}

async function showContact(to: string): Promise<void> {
  resetSession(to);
  await sendMessage(to, {
    type: "text",
    text:
      `📍 *Contact ${COMPANY.name}*\n\n` +
      `📧 Email: ${COMPANY.email}\n` +
      `📞 Phone: ${COMPANY.phone}\n` +
      `🏢 Address: ${COMPANY.address}\n` +
      `🌐 Website: ${COMPANY.website}\n` +
      `🕐 Hours: ${COMPANY.hours}\n\n` +
      `${COMPANY.motto}`,
  });
  await sendMessage(to, {
    type: "buttons",
    text: "How would you like to proceed?",
    buttons: [
      { id: "support", title: "Support Request" },
      { id: "agent", title: "Talk to Agent" },
      BACK_BUTTON,
    ],
  });
}

async function startSupport(to: string): Promise<void> {
  setFlow(to, "support_category");
  await sendMessage(to, {
    type: "list",
    text: "🎫 *Support Request*\n\nSelect the category that best describes your issue:",
    buttonLabel: "Select Category",
    rows: SUPPORT_CATEGORIES,
  });
}

async function startPayments(to: string): Promise<void> {
  setFlow(to, "payments_amount");
  await sendMessage(to, {
    type: "list",
    text: "💳 *Make Payment*\n\nSelect the service you are paying for:",
    buttonLabel: "Select Service",
    rows: PAYMENT_CATEGORIES,
  });
}

async function connectAgent(to: string): Promise<void> {
  resetSession(to);
  const user = await findUserByPhone(to);
  const nameLine = user ? `Name: *${user.name}*\n` : "";

  await sendMessage(to, {
    type: "text",
    text:
      "👤 *Talk to an Agent*\n\n" +
      "You have been added to the Millenium Solutions support queue.\n" +
      "A support officer will respond during business hours.\n\n" +
      nameLine +
      `Reference: *#${to.slice(-6)}*\n` +
      `Hours: ${COMPANY.hours}`,
  });
  await sendMessage(to, {
    type: "buttons",
    text: "While you wait, you can browse other options:",
    buttons: [BACK_BUTTON],
  });
}

async function handleServiceSelection(to: string, serviceId: string): Promise<void> {
  if (serviceId.startsWith("svc_")) {
    await showServiceDetail(to, serviceId);
    return;
  }

  if (serviceId.startsWith("team_")) {
    if (serviceId === "team") {
      await showTeam(to);
    } else {
      await showTeamDepartment(to, serviceId);
    }
    return;
  }

  switch (serviceId) {
    case "register":
      await startRegister(to);
      break;
    case "services":
      await showServices(to);
      break;
    case "payments":
      await startPayments(to);
      break;
    case "support":
      await startSupport(to);
      break;
    case "contact":
      await showContact(to);
      break;
    case "team":
      await showTeam(to);
      break;
    case "company_profile":
      resetSession(to);
      await sendCompanyProfile(to);
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

  if (!session.data.paymentCategory) {
    const label = PAYMENT_LABELS[input];
    if (!label) {
      await startPayments(to);
      return;
    }

    setData(to, "paymentCategory", label);
    await sendMessage(to, {
      type: "text",
      text:
        `💳 *${label} Payment*\n\n` +
        "Enter the *amount* in KES.\n\n" +
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

  const category = session.data.paymentCategory;
  resetSession(to);

  await sendMessage(to, {
    type: "text",
    text:
      "📱 *M-Pesa Payment Request*\n\n" +
      `Service: *${category}*\n` +
      `Amount: *KES ${amount.toLocaleString()}*\n\n` +
      "An M-Pesa prompt has been sent to your phone.\n" +
      "Enter your *M-Pesa PIN* to complete the payment.\n\n" +
      "_You will receive a confirmation message here once done._",
  });

  try {
    const result = await initiateStkPush(to, amount, category);
    registerPendingPayment(result.checkoutRequestId, to, category, amount);
    console.log(`STK Push sent for ${to} - CheckoutRequestID: ${result.checkoutRequestId}`);
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

async function handleSupportFlow(
  to: string,
  input: string,
  normalized: string
): Promise<void> {
  const session = getSession(to);

  if (session.flow === "support_category") {
    if (normalized === "main_menu") {
      await showMainMenu(to);
      return;
    }

    const label = SUPPORT_LABELS[input];
    if (!label) {
      await startSupport(to);
      return;
    }

    setData(to, "supportCategory", label);
    setFlow(to, "support_description");
    await sendMessage(to, {
      type: "text",
      text:
        `🎫 *${label}*\n\n` +
        "Please describe your issue or request in a few sentences.\n\n" +
        "Type *back* to return to the main menu.",
    });
    return;
  }

  if (session.flow === "support_description") {
    if (input.length < 10) {
      await sendMessage(to, {
        type: "text",
        text: "Please provide a bit more detail (at least 10 characters).",
      });
      return;
    }

    setData(to, "supportDescription", input);
    setFlow(to, "support_confirm");
    const category = session.data.supportCategory ?? "N/A";

    await sendMessage(to, {
      type: "buttons",
      text:
        "📋 *Confirm Support Request*\n\n" +
        `Category: *${category}*\n` +
        `Details: ${input}\n\n` +
        "Submit this request?",
      buttons: YES_NO_BUTTONS,
    });
    return;
  }

  if (session.flow === "support_confirm") {
    if (normalized === "confirm_yes") {
      const category = session.data.supportCategory ?? "General";
      const description = session.data.supportDescription ?? "N/A";
      const ticketId = `MS-${Date.now().toString().slice(-8)}`;
      resetSession(to);

      await sendMessage(to, {
        type: "text",
        text:
          "✅ *Support Request Submitted*\n\n" +
          `Ticket ID: *${ticketId}*\n` +
          `Category: *${category}*\n` +
          `Status: *Open*\n\n` +
          "Our team will review your request and respond during business hours.\n" +
          `For urgent matters, call ${COMPANY.phone}.`,
      });
      await showMainMenu(to);
      return;
    }

    if (normalized === "confirm_no" || normalized === "main_menu") {
      await showMainMenu(to);
    }
  }
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
    case "register_otp":
    case "register_confirm": {
      const done = await handleRegisterFlow(to, input, normalized);
      if (done) await showMainMenu(to);
      break;
    }
    case "payments_amount":
      await handlePaymentsFlow(to, input, normalized);
      break;
    case "support_category":
    case "support_description":
    case "support_confirm":
      await handleSupportFlow(to, input, normalized);
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
    const menuIds = new Set(MAIN_MENU_ROWS.map((row) => row.id));
    const serviceIds = new Set(SERVICE_CATALOG.map((row) => row.id));
    const teamIds = new Set(TEAM_DEPARTMENTS.map((row) => row.id));
    const allIds = new Set([...menuIds, ...serviceIds, ...teamIds, "main_menu", "team"]);

    if (allIds.has(input)) {
      await handleServiceSelection(to, input);
      return;
    }

    const user = await findUserByPhone(to);
    const greeting = user
      ? `Hi *${user.name}*! 👋 Welcome to *${COMPANY.name}* support.\n\nType *menu* or tap below to get started.`
      : `Hi! 👋 Welcome to *${COMPANY.name}*.\n\n${COMPANY.tagline}\n\nType *menu* or tap below.\n\n_New here? Select **Register** to create your profile._`;

    await sendMessage(to, { type: "text", text: greeting });
    await showMainMenu(to);
    return;
  }

  await handleActiveFlow(to, input, normalized);
}