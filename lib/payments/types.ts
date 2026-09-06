export type GatewayOrder = { id: string; amount: number; currency: "INR"; receipt: string };
export type VerifiedGatewayPayment = { id: string; orderId: string; amount: number; status: string };

export interface PaymentProvider {
  createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<GatewayOrder>;
  verifySignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  fetchPayment(paymentId: string): Promise<VerifiedGatewayPayment>;
}
