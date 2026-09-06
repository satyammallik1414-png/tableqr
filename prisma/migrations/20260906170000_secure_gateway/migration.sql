ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'RAZORPAY';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "orders"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "paymentProvider" TEXT,
  ADD COLUMN "gatewayOrderId" TEXT,
  ADD COLUMN "gatewayPaymentId" TEXT,
  ADD COLUMN "paymentReceipt" TEXT,
  ADD COLUMN "paymentFailureReason" TEXT,
  ADD COLUMN "paymentInitiatedAt" TIMESTAMP(3),
  ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_gatewayOrderId_key" ON "orders"("gatewayOrderId");
CREATE UNIQUE INDEX "orders_gatewayPaymentId_key" ON "orders"("gatewayPaymentId");
