import axios, { isAxiosError } from "axios";

interface SendSmsParams {
  mobilePhone: string;
  smsText: string;
}

export async function sendSMS({ mobilePhone, smsText }: SendSmsParams): Promise<void> {
  const smsUrl = process.env.ADVANTA_SMS_URL;
  const apiKey = process.env.ADVANTA_API_KEY;
  const partnerId = process.env.ADVANTA_PARTNER_ID;
  const shortcode = process.env.ADVANTA_SHORTCODE;

  if (!smsUrl || !apiKey) {
    throw new Error("Missing SMS configuration (ADVANTA_SMS_URL or ADVANTA_API_KEY)");
  }

  const isTiara =
    smsUrl.toLowerCase().includes("tiara") || !partnerId || partnerId.trim() === "";

  try {
    if (isTiara) {
      await axios.post(
        smsUrl,
        { from: shortcode, to: mobilePhone, message: smsText },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      return;
    }

    await axios.post(
      smsUrl,
      {
        apikey: apiKey,
        partnerID: partnerId,
        message: smsText,
        shortcode: shortcode,
        mobile: mobilePhone,
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error("SMS send error:", err.response?.data ?? err.message);
    }
    throw err;
  }
}
