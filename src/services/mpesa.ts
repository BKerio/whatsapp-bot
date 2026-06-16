import axios, { isAxiosError } from "axios";

const {
  MPESA_BASE_URL,
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  TILL_NO,
  MPESA_TRANSACTIONTYPE,
  MPESA_CALLBACK_URL,
} = process.env;

export interface StkPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
  responseDescription: string;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  const baseUrl = requireEnv("MPESA_BASE_URL", MPESA_BASE_URL);
  const consumerKey = requireEnv("MPESA_CONSUMER_KEY", MPESA_CONSUMER_KEY);
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET", MPESA_CONSUMER_SECRET);

  try {
    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        auth: {
          username: consumerKey,
          password: consumerSecret,
        },
      }
    );
    return response.data["access_token"] as string;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error("M-Pesa token error:", err.response?.data ?? err.message);
    } else {
      console.error("M-Pesa token error:", err);
    }
    throw err;
  }
}

/**
 * Initiates an M-Pesa STK Push (Lipa Na M-Pesa Online).
 *
 * @param phone - Phone number in any Kenyan format (07xx, +2547xx, 2547xx)
 * @param amount - Amount in KES (whole number)
 * @param reference - Optional account reference shown on the M-Pesa prompt
 */
export async function initiateStkPush(
  phone: string,
  amount: number,
  reference = "Millenium Payment"
): Promise<StkPushResult> {
  const baseUrl = requireEnv("MPESA_BASE_URL", MPESA_BASE_URL);
  const shortcode = requireEnv("MPESA_SHORTCODE", MPESA_SHORTCODE);
  const passkey = requireEnv("MPESA_PASSKEY", MPESA_PASSKEY);
  const tillNo = requireEnv("TILL_NO", TILL_NO);
  const transactionType = requireEnv("MPESA_TRANSACTIONTYPE", MPESA_TRANSACTIONTYPE);
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL", MPESA_CALLBACK_URL);

  const formattedPhone = formatPhone(phone);
  const accessToken = await getAccessToken();

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - tzOffset);
  const timestamp = localDate.toISOString().replace(/[^0-9]/g, '').slice(0, 14);

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: transactionType,
    Amount: Math.ceil(amount), // M-Pesa requires whole numbers
    PartyA: formattedPhone,
    PartyB: tillNo,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: reference,
    TransactionDesc: reference,
  };

  try {
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data as {
      CheckoutRequestID: string;
      MerchantRequestID: string;
      ResponseDescription: string;
    };

    return {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      responseDescription: data.ResponseDescription,
    };
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      console.error("M-Pesa STK error:", err.response?.data ?? err.message);
    } else {
      console.error("M-Pesa STK error:", err);
    }
    throw err;
  }
}

function formatPhone(phone: string): string {
  if (phone.startsWith('+')) return phone.replace('+', '');
  if (phone.startsWith('0')) return '254' + phone.substring(1);
  return phone;
}
