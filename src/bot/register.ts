import { saveUser, findUserByPhone } from "@/models/user.js";
import { sendMessage } from "@/whatsapp/client.js";
import { YES_NO_BUTTONS } from "@/bot/menus.js";
import { getSession, resetSession, setData, setFlow } from "@/bot/session.js";

export async function startRegister(to: string): Promise<void> {
  const existing = await findUserByPhone(to);

  if (existing) {
    resetSession(to);
    await sendMessage(to, {
      type: "text",
      text:
        "ℹ️ *Already Registered*\n\n" +
        `Name: *${existing.name}*\n` +
        `Phone: *${existing.phone}*\n` +
        `ID Number: *${existing.idNumber}*\n\n` +
        "To update your details, start registration again and confirm the new info.",
    });
    setFlow(to, "register_name");
    await sendMessage(to, {
      type: "text",
      text: "Enter your *full name* to update your profile:",
    });
    return;
  }

  setFlow(to, "register_name");
  await sendMessage(to, {
    type: "text",
    text:
      "📝 *Register*\n\n" +
      "Let's set up your profile.\n\n" +
      "Enter your *full name* as it appears on your ID.\n\n" +
      "Type *back* to return to the main menu.",
  });
}

export async function handleRegisterFlow(
  to: string,
  input: string,
  normalized: string
): Promise<boolean> {
  const session = getSession(to);

  if (session.flow === "register_name") {
    if (input.length < 2) {
      await sendMessage(to, {
        type: "text",
        text: "Please enter your full name (at least 2 characters).",
      });
      return false;
    }

    setData(to, "name", input);
    setFlow(to, "register_id");
    await sendMessage(to, {
      type: "text",
      text:
        `Thanks, *${input}*.\n\n` +
        "Now enter your *National ID number*.\n\n" +
        "Type *back* to return to the main menu.",
    });
    return false;
  }

  if (session.flow === "register_id") {
    if (!/^\d{6,8}$/.test(input)) {
      await sendMessage(to, {
        type: "text",
        text: "Please enter a valid National ID number (6–8 digits).",
      });
      return false;
    }

    setData(to, "idNumber", input);
    setFlow(to, "register_confirm");
    const name = session.data.name ?? "—";

    await sendMessage(to, {
      type: "buttons",
      text:
        "📋 *Confirm Registration*\n\n" +
        `Name: *${name}*\n` +
        `Phone: *${to}*\n` +
        `ID Number: *${input}*\n\n` +
        "Save this information?",
      buttons: YES_NO_BUTTONS,
    });
    return false;
  }

  if (session.flow === "register_confirm") {
    if (normalized === "confirm_yes") {
      const name = session.data.name;
      const idNumber = session.data.idNumber;

      if (!name || !idNumber) {
        await startRegister(to);
        return false;
      }

      await saveUser({ phone: to, name, idNumber });
      resetSession(to);

      await sendMessage(to, {
        type: "text",
        text:
          "✅ *Registration complete!*\n\n" +
          `Welcome, *${name}*.\n` +
          "Your profile has been saved. You can now use all Shuru services.",
      });
      return true;
    }

    if (normalized === "confirm_no" || normalized === "main_menu") {
      resetSession(to);
      await sendMessage(to, {
        type: "text",
        text: "Registration cancelled.",
      });
      return true;
    }
  }

  return false;
}
