import express, { Request, Response } from 'express';
import axios from 'axios';
import MpesaPayment from '@/models/Payments';
import { resolvePendingPayment } from '@/bot/mpesa-bridge';
import { sendMessage } from '@/whatsapp/client';
import 'dotenv/config';

const router = express.Router();

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  TILL_NO,
  MPESA_TRANSACTIONTYPE,
  MPESA_CALLBACK_URL,
  MPESA_BASE_URL,
} = process.env;

const formatPhoneNumber = (phone: string): string => {
  if (phone.startsWith('+')) return phone.replace('+', '');
  if (phone.startsWith('0')) return '254' + phone.substring(1);
  return phone;
};

const getAccessToken = async (): Promise<string> => {
  try {
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
  } catch (err: unknown) {
    const e = err as { response?: { data: unknown }; message: string };
    console.error('Failed to generate M-Pesa access token:', e?.response?.data || e.message);
    throw err;
  }
};

// POST /api/stkpush
router.post('/stkpush', async (req: Request, res: Response) => {
  console.log('--- STK Push Initiated ---');
  console.log('Sending with Callback URL:', MPESA_CALLBACK_URL);
  const { phone, amount } = req.body as { phone: string; amount: number };

  try {
    const formattedPhone = formatPhoneNumber(phone);
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
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: TILL_NO,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: 'Online Payment',
      TransactionDesc: 'Online Payment',
    };

    const stkResponse = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(stkResponse.data);
  } catch (error: unknown) {
    const e = error as { response?: { data: unknown }; message: string };
    console.error('STK Push Error:', e?.response?.data || e.message);
    res.status(500).json({
      error: 'STK Push failed',
      details: e.response?.data || e.message,
    });
  }
});

// POST /api/stkpush/callback
router.post('/stkpush/callback', async (req: Request, res: Response) => {
  console.log('>>> Incoming M-Pesa Callback:', JSON.stringify(req.body, null, 2));
  const callback = req.body?.Body?.stkCallback;

  if (!callback) {
    res.status(400).json({ message: 'Invalid callback payload' });
    return;
  }

  const {
    MerchantRequestID,
    CheckoutRequestID,
    ResultCode,
    ResultDesc,
    CallbackMetadata,
  } = callback as {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResultCode: number;
    ResultDesc: string;
    CallbackMetadata?: { Item: { Name: string; Value: unknown }[] };
  };

  const toStatus = (): string => {
    const desc = (ResultDesc || '').toLowerCase();
    if (ResultCode === 0) return 'success';
    if (ResultCode === 1032 || desc.includes('cancel')) return 'cancelled';
    if (ResultCode === 1037 || desc.includes('timeout')) return 'timeout';
    if (desc.includes('wrong pin') || desc.includes('pin')) return 'wrong_pin';
    if (desc.includes('insufficient') || desc.includes('less than')) return 'insufficient_funds';
    return 'failure';
  };

  const statusStr = toStatus();

  let amount = 0;
  let receipt = 'N/A';
  let phone = 'N/A';

  if (ResultCode === 0 && CallbackMetadata?.Item) {
    const metadata: Record<string, unknown> = {};
    CallbackMetadata.Item.forEach((item) => {
      metadata[item.Name] = item.Value;
    });
    amount = (metadata.Amount as number) || 0;
    receipt = (metadata.MpesaReceiptNumber as string) || 'N/A';
    phone = String(metadata.PhoneNumber ?? 'N/A');
  }

  try {
    const transaction = new MpesaPayment({
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount: amount,
      MpesaReceiptNumber: receipt,
      TransactionDate: new Date(),
      PhoneNumber: phone,
    });

    await transaction.save();

    // Notify the originating WhatsApp user if this payment came from the bot
    const pending = resolvePendingPayment(CheckoutRequestID);
    if (pending) {
      if (statusStr === 'success') {
        await sendMessage(pending.phone, {
          type: 'text',
          text:
            '✅ *Payment Successful!*\n\n' +
            `Service: *${pending.taxType}*\n` +
            `Amount: *KES ${pending.amount.toLocaleString()}*\n` +
            `M-Pesa Receipt: *${receipt}*\n\n` +
            'Thank you! Your payment has been received.',
        });
      } else {
        const friendlyReason: Record<string, string> = {
          cancelled: 'You cancelled the payment request.',
          timeout: 'The payment request timed out.',
          wrong_pin: 'Incorrect M-Pesa PIN entered.',
          insufficient_funds: 'Insufficient M-Pesa balance.',
          failure: ResultDesc || 'An unexpected error occurred.',
        };
        await sendMessage(pending.phone, {
          type: 'text',
          text:
            '❌ *Mpesa Payment Failed*\n\n' +
            `${friendlyReason[statusStr] ?? ResultDesc}\n\n` +
            'Type *menu* to try again or select *Talk to Agent* for help.',
        });
      }
    }

    const io = req.app.get('io');
    if (io && CheckoutRequestID) {
      io.to(CheckoutRequestID).emit('transaction_update', {
        checkoutRequestId: CheckoutRequestID,
        merchantRequestId: MerchantRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        status: statusStr,
        amount,
        receipt,
        phone,
      });
    }
  } catch (err: unknown) {
    const e = err as { message: string; stack?: string };
    console.error('Error saving transaction to DB:', e.message);
    console.error('Stack:', e.stack);
  }

  res.status(200).json({ message: 'Callback received successfully' });
});

// GET /api/stkpush/status/:checkoutRequestId
router.get('/stkpush/status/:checkoutRequestId', async (req: Request, res: Response) => {
  try {
    const { checkoutRequestId } = req.params;
    const transaction = await MpesaPayment.findOne({ CheckoutRequestID: checkoutRequestId });

    if (transaction) {
      const desc = (transaction.ResultDesc || '').toLowerCase();
      let status = 'failure';
      if (transaction.ResultCode === 0) status = 'success';
      else if (transaction.ResultCode === 1032 || desc.includes('cancel')) status = 'cancelled';
      else if (transaction.ResultCode === 1037 || desc.includes('timeout')) status = 'timeout';
      else if (desc.includes('wrong pin') || desc.includes('pin')) status = 'wrong_pin';
      else if (desc.includes('insufficient') || desc.includes('less than')) status = 'insufficient_funds';

      res.json({
        status,
        resultCode: transaction.ResultCode,
        resultDesc: transaction.ResultDesc,
      });
    } else {
      res.status(404).json({ status: 'pending' }); // Not yet received
    }
  } catch {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// GET /api/transactions
router.get('/transactions', async (_req: Request, res: Response) => {
  try {
    const transactions = await MpesaPayment.find()
      .sort({ TransactionDate: -1 })
      .limit(50);

    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
