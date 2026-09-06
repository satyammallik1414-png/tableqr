import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayOrder, PaymentProvider, VerifiedGatewayPayment } from "./types";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured on the server");
  return { keyId, keySecret };
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.description || "Payment gateway request failed");
  return body as T;
}

export const razorpayProvider: PaymentProvider = {
  async createOrder({ amountPaise, receipt, notes }) {
    return razorpayRequest<GatewayOrder>("/orders", { method: "POST", body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }) });
  },
  verifySignature({ orderId, paymentId, signature }) {
    const { keySecret } = credentials();
    const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  },
  async fetchPayment(paymentId) {
    const payment = await razorpayRequest<any>(`/payments/${encodeURIComponent(paymentId)}`);
    return { id: payment.id, orderId: payment.order_id, amount: payment.amount, status: payment.status };
  },
};
