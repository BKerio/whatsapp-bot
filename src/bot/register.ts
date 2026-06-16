import { COMPANY } from "@/bot/company";
import { saveUser, findUserByPhone } from "@/models/user";
import { sendMessage } from "@/whatsapp/client";
import { YES_NO_BUTTONS } from "@/bot/menus";
import { getSession, resetSession, setData, setFlow } from "@/bot/session";
import {
  requestRegistrationOtp,
  verifyRegistrationOtp,
} from "@/services/otp";

async function sendOtpAndPrompt(to: string): Promise<boolean> {
  try {
    await requestRegistrationOtp(to);
    await setFlow(to, "register_otp");
    await sendMessage(to, {
      type: "text",
      text:
        "📲 *Phone Verification*\n\n" +
        `We sent a 6-digit verification code to *${to}* via SMS.\n\n` +
        "Enter the code to continue.\n\n" +
        "Type *back* to return to the main menu.",
    });
    return true;
  } catch (err) {
    console.error("Failed to send registration OTP:", err);
    await sendMessage(to, {
      type: "text",
      text:
        "❌ *OTP Not Sent*\n\n" +
        "We could not send a verification code to your phone.\n" +
        "Please try again in a moment or contact support.",
    });
    return false;
  }
}

async function showRegistrationConfirm(to: string): Promise<void> {
  const session = await getSession(to);
  const name = session.data.name ?? "N/A";
  const idNumber = session.data.idNumber ?? "N/A";

  await setFlow(to, "register_confirm");
  await sendMessage(to, {
    type: "buttons",
    text:
      "📋 *Confirm Registration*\n\n" +
      `Name: *${name}*\n` +
      `Phone: *${to}* ✅ verified\n` +
      `ID Number: *${idNumber}*\n\n` +
      "Save this information?",
    buttons: YES_NO_BUTTONS,
  });
}

export async function startRegister(to: string): Promise<void> {
  const existing = await findUserByPhone(to);

  if (existing) {
    await resetSession(to);
    await sendMessage(to, {
      type: "text",
      text:
        "ℹ️ *Already Registered*\n\n" +
        `Name: *${existing.name}*\n` +
        `Phone: *${existing.phone}*\n` +
        `ID Number: *${existing.idNumber}*\n\n` +
        "To update your details, complete registration again with OTP verification.",
    });
    await setFlow(to, "register_name");
    await sendMessage(to, {
      type: "text",
      text: "Enter your *full name* to update your profile:",
    });
    return;
  }

  await setFlow(to, "register_name");
  await sendMessage(to, {
    type: "text",
    text:
      `📝 *Register with ${COMPANY.name}*\n\n` +
      "Let's set up your customer profile for faster support.\n\n" +
      "Enter your *full name*.\n\n" +
      "Type *back* to return to the main menu.",
  });
}

export async function handleRegisterFlow(
  to: string,
  input: string,
  normalized: string
): Promise<boolean> {
  const session = await getSession(to);

  if (session.flow === "register_name") {
    if (input.length < 2) {
      await sendMessage(to, {
        type: "text",
        text: "Please enter your full name (at least 2 characters).",
      });
      return false;
    }

    await setData(to, "name", input);
    await setFlow(to, "register_id");
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

    await setData(to, "idNumber", input);
    await sendOtpAndPrompt(to);
    return false;
  }

  if (session.flow === "register_otp") {
    if (normalized === "resend") {
      await sendOtpAndPrompt(to);
      return false;
    }

    if (!/^\d{6}$/.test(input)) {
      await sendMessage(to, {
        type: "text",
        text: "Please enter the 6-digit code sent to your phone.",
      });
      return false;
    }

    const result = await verifyRegistrationOtp(to, input);

    if (result === "expired") {
      await sendMessage(to, {
        type: "text",
        text: "⏰ That code has expired. Reply *resend* to get a new OTP.",
      });
      return false;
    }

    if (result === "invalid") {
      await sendMessage(to, {
        type: "text",
        text: "❌ Invalid code. Please check and try again, or reply *resend* for a new OTP.",
      });
      return false;
    }

    await setData(to, "phoneVerified", "true");
    await showRegistrationConfirm(to);
    return false;
  }

  if (session.flow === "register_confirm") {
    if (normalized === "confirm_yes") {
      const name = session.data.name;
      const idNumber = session.data.idNumber;

      if (!name || !idNumber || session.data.phoneVerified !== "true") {
        await startRegister(to);
        return false;
      }

      await saveUser({ phone: to, name, idNumber });
      await resetSession(to);

      await sendMessage(to, {
        type: "text",
        text:
          "✅ *Registration complete!*\n\n" +
          `Welcome, *${name}*.\n` +
          `Your profile has been saved. You can now access all ${COMPANY.name} support services.`,
      });
      return true;
    }

    if (normalized === "confirm_no" || normalized === "main_menu") {
      await resetSession(to);
      await sendMessage(to, {
        type: "text",
        text: "Registration cancelled.",
      });
      return true;
    }
  }

  return false;
}
