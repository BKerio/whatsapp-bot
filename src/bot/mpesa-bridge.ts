/**
 * mpesa-bridge.ts
 *
 * In-memory registry that links an M-Pesa CheckoutRequestID back to the
 * WhatsApp phone number that initiated the payment.  When the Daraja
 * callback arrives, the route looks up this map, sends a WhatsApp result
 * message, and removes the entry.
 */

export interface PendingPayment {
  /** WhatsApp sender number (e.g. 254712345678) */
  phone: string;
  taxType: string;
  amount: number;
}

const pendingPayments = new Map<string, PendingPayment>();

/** Register a pending STK Push so the callback can notify the user. */
export function registerPendingPayment(
  checkoutRequestId: string,
  phone: string,
  taxType: string,
  amount: number
): void {
  pendingPayments.set(checkoutRequestId, { phone, taxType, amount });
}

/**
 * Retrieve and remove a pending payment entry.
 * Returns `undefined` if no entry exists (e.g. payment not from the bot).
 */
export function resolvePendingPayment(
  checkoutRequestId: string
): PendingPayment | undefined {
  const entry = pendingPayments.get(checkoutRequestId);
  if (entry) pendingPayments.delete(checkoutRequestId);
  return entry;
}
