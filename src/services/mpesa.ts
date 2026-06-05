import axios from 'axios';

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

async function getAccessToken(): Promise<string> {
  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      auth: {
        username: MPESA_CONSUMER_KEY!,
        password: MPESA_CONSUMER_SECRET!,
      },
    }
  );
  return response.data['access_token'] as string;
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
  reference = 'Tax Payment'
): Promise<StkPushResult> {
  const formattedPhone = formatPhone(phone);
  const accessToken = await getAccessToken();

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - tzOffset);
  const timestamp = localDate.toISOString().replace(/[^0-9]/g, '').slice(0, 14);

  const password = Buffer.from(
    `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: MPESA_TRANSACTIONTYPE,
    Amount: Math.ceil(amount), // M-Pesa requires whole numbers
    PartyA: formattedPhone,
    PartyB: TILL_NO,
    PhoneNumber: formattedPhone,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: reference,
    TransactionDesc: reference,
  };

  const response = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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
}

function formatPhone(phone: string): string {
  if (phone.startsWith('+')) return phone.replace('+', '');
  if (phone.startsWith('0')) return '254' + phone.substring(1);
  return phone;
}
