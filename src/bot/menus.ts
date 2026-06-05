import type { ListRow, ReplyButton } from "../whatsapp/types.js";

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
  "Welcome to *Shuru* 👋\n\nYour virtual assistant for tax and compliance services.\n\nSelect a service below to get started.";

export const MAIN_MENU_ROWS: ListRow[] = [
  {
    id: "file_returns",
    title: "File Returns",
    description: "File or submit a nil return",
  },
  {
    id: "pin_status",
    title: "Check PIN Status",
    description: "Look up your KRA PIN by ID",
  },
  {
    id: "payments",
    title: "Payments",
    description: "Generate a payment slip",
  },
  {
    id: "tcc",
    title: "Tax Compliance",
    description: "Download your TCC certificate",
  },
  {
    id: "agent",
    title: "Talk to Agent",
    description: "Connect with a support officer",
  },
  {
    id: "help",
    title: "Help",
    description: "How to use this bot",
  },
];

export const BACK_BUTTON: ReplyButton = { id: "main_menu", title: "Main Menu" };
export const YES_NO_BUTTONS: ReplyButton[] = [
  { id: "confirm_yes", title: "Yes, Submit" },
  { id: "confirm_no", title: "Cancel" },
  BACK_BUTTON,
];

export const PAYMENT_TYPES: ListRow[] = [
  { id: "pay_income", title: "Income Tax", description: "Pay individual income tax" },
  { id: "pay_vat", title: "VAT", description: "Pay value added tax" },
  { id: "pay_paye", title: "PAYE", description: "Pay as you earn" },
  { id: "main_menu", title: "Main Menu", description: "Go back to services" },
];

export const TAX_PERIODS: ListRow[] = [
  { id: "period_2025", title: "2025", description: "Tax year 2025" },
  { id: "period_2024", title: "2024", description: "Tax year 2024" },
  { id: "main_menu", title: "Main Menu", description: "Cancel and go back" },
];

export const HELP_TEXT =
  "📋 *How to use Shuru*\n\n" +
  "• Type *menu* or *hi* anytime to see services\n" +
  "• Tap a service from the list to start a guided flow\n" +
  "• Type *back* or *cancel* to return to the main menu\n" +
  "• Select *Talk to Agent* for human support\n\n" +
  "Available services: File Returns, PIN Status, Payments, TCC, and Help.";
