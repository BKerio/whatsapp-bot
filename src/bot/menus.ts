import { COMPANY } from "@/bot/company";
import type { ListRow, ReplyButton } from "@/whatsapp/types";

export const MENU_TRIGGERS = new Set([
  "hi",
  "hello",
  "hey",
  "start",
  "menu",
  "0",
  "help",
]);

export const MAIN_MENU_TEXT =
  `Welcome to *${COMPANY.name}* 👋\n\n` +
  `${COMPANY.tagline}\n\n` +
  "Your customer support assistant. Select an option below to get started.";

export const MAIN_MENU_ROWS: ListRow[] = [
  {
    id: "register",
    title: "Register",
    description: "Create or update your profile",
  },
  {
    id: "services",
    title: "Our Services",
    description: "Explore IT solutions we offer",
  },
  {
    id: "payments",
    title: "Make Payment",
    description: "Pay via M-Pesa STK push",
  },
  {
    id: "support",
    title: "Support Request",
    description: "Log a technical support ticket",
  },
  {
    id: "contact",
    title: "Contact Us",
    description: "Office details and channels",
  },
  {
    id: "team",
    title: "Our Team",
    description: "Meet the Millenium team",
  },
  {
    id: "company_profile",
    title: "Company Profile",
    description: "Request our business profile PDF",
  },
  {
    id: "agent",
    title: "Talk to Agent",
    description: "Speak with our support team",
  },
  {
    id: "help",
    title: "Help",
    description: "How to use this assistant",
  },
];

export const BACK_BUTTON: ReplyButton = { id: "main_menu", title: "Main Menu" };
export const YES_NO_BUTTONS: ReplyButton[] = [
  { id: "confirm_yes", title: "Yes, Submit" },
  { id: "confirm_no", title: "Cancel" },
  BACK_BUTTON,
];

export const HELP_TEXT =
  `📋 *How to use ${COMPANY.name} Support*\n\n` +
  "• Type *menu* or *hi* anytime to see options\n" +
  "• *Register* to save your profile for faster support\n" +
  "• *Our Services* to learn what we offer\n" +
  "• *Make Payment* to pay for services via M-Pesa\n" +
  "• *Support Request* to log a ticket\n" +
  "• *Contact Us* for office details\n" +
  "• *Our Team* to meet our staff\n" +
  "• *Company Profile* to receive our PDF brochure\n" +
  "• Type *back* or *cancel* to return to the main menu\n\n" +
  `🌐 ${COMPANY.website}`;
