import { razorpayProvider } from "./razorpay";
export function getPaymentProvider(name = "razorpay") {
  if (name !== "razorpay") throw new Error(`Unsupported payment provider: ${name}`);
  return razorpayProvider;
}
export function isRazorpayConfigured() { return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET); }
