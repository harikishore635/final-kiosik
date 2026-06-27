// Simulated UPI payment service for the kiosk demo.
//
// No real money moves. `verifyPayment` auto-confirms after a short delay so the
// kiosk flow (fare -> pay -> ticket) can be demonstrated end to end without a
// payment provider. The seam is shaped like a real PSP integration
// (createPaymentSession -> render QR -> verifyPayment) so a live gateway
// (Razorpay / Cashfree / UPI collect) can replace the body later without
// touching the UI.

const PAYEE_VPA = 'suvidha.assam@upi';
const PAYEE_NAME = 'SUVIDHA Govt of Assam';

// Build a UPI intent string + a local order id. A real PSP would return an
// order id and a signed QR payload from its order API instead.
export function createPaymentSession({ amount, note = 'SUVIDHA Kiosk Payment' }) {
  const orderId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const params = new URLSearchParams({
    pa: PAYEE_VPA,
    pn: PAYEE_NAME,
    am: String(amount ?? ''),
    cu: 'INR',
    tn: `${note} ${orderId}`,
  });
  return {
    orderId,
    amount,
    payeeVpa: PAYEE_VPA,
    payeeName: PAYEE_NAME,
    upiUri: `upi://pay?${params.toString()}`,
  };
}

// Resolves with a success result after `delayMs` (simulating the kiosk polling
// the PSP until the citizen completes payment on their phone). Honors an
// AbortSignal so the UI can cancel an in-flight verification.
export function verifyPayment(orderId, { delayMs = 5000, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('cancelled')); return; }
    const timer = setTimeout(() => {
      resolve({ status: 'success', orderId, txnId: `T${Date.now().toString().slice(-10)}` });
    }, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('cancelled'));
    }, { once: true });
  });
}

export const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay' },
  { id: 'phonepe', name: 'PhonePe' },
  { id: 'paytm', name: 'Paytm' },
  { id: 'bhim', name: 'BHIM' },
];
