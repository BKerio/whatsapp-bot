import path from "path";
import { access } from "fs/promises";
import { COMPANY, COMPANY_PROFILE_FILENAME } from "@/bot/company";
import { sendDocument } from "@/whatsapp/media";
import { sendMessage } from "@/whatsapp/client";

export async function resolveCompanyProfilePath(): Promise<string> {
  const filePath = path.join(process.cwd(), "src", COMPANY_PROFILE_FILENAME);
  await access(filePath);
  return filePath;
}

export async function sendCompanyProfile(to: string): Promise<boolean> {
  await sendMessage(to, {
    type: "text",
    text:
      "📄 *Company Profile*\n\n" +
      `Preparing the ${COMPANY.name} business profile for you…`,
  });

  try {
    const filePath = await resolveCompanyProfilePath();
    await sendDocument(
      to,
      filePath,
      "Millenium_Solutions_Business_Profile.pdf",
      `${COMPANY.name} - Company Profile`
    );

    await sendMessage(to, {
      type: "text",
      text:
        "✅ *Profile Sent*\n\n" +
        "Please find our company profile attached above.\n\n" +
        `For more information, visit ${COMPANY.website} or email ${COMPANY.email}.`,
    });

    return true;
  } catch (err) {
    console.error("Failed to send company profile:", err);
    await sendMessage(to, {
      type: "text",
      text:
        "❌ *Unable to send profile*\n\n" +
        "We could not deliver the company profile right now.\n" +
        "Please try again later or contact us directly.",
    });
    return false;
  }
}
