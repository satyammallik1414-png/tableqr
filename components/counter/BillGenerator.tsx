"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Printer,
  Download,
  Receipt,
  Percent,
  Users,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, calculateGST, generateBillNumber } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { ApiResponse, Bill, Order, PaymentMethod } from "@/types";

interface BillGeneratorProps {
  order: Order;
  tableNumber: number;
  onBillGenerated: () => void;
}

export function BillGenerator({
  order,
  tableNumber,
  onBillGenerated,
}: BillGeneratorProps) {
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FLAT">("FLAT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [splitCount, setSplitCount] = useState(1);
  const [showInvoice, setShowInvoice] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);

  const subtotal = order.subtotal;
  const { cgst, sgst, totalTax } = calculateGST(subtotal);
  const discountAmount = discountType === "PERCENTAGE" ? (subtotal * discount) / 100 : discount;
  const platformFee = Math.max(0, order.serviceCharge || 0);
  const total = subtotal + totalTax + platformFee - discountAmount;
  const perPerson = splitCount > 1 ? total / splitCount : total;

  const generateBillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          discount: discountAmount,
          discountType,
          serviceCharge: platformFee,
          paymentMethod,
          splitCount,
        }),
      });
      const data: ApiResponse<Bill> = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data!;
    },
    onSuccess: (data) => {
      setBill(data);
      setShowInvoice(true);
      toast.success("Bill generated successfully!");
    },
    onError: () => {
      toast.error("Failed to generate bill");
    },
  });

  const handlePrint = () => window.print();

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">
              Table #{tableNumber}
            </h2>
            <p className="text-sm text-gray-500">
              Order #{order.id.slice(-6).toUpperCase()}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {order.items.length} items
          </Badge>
        </div>

        {/* Order Items */}
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  {item.quantity}x
                </span>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.variants && item.variants.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {item.variants[0].name}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Billing Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Discount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="flex-1"
                min={0}
              />
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "PERCENTAGE" | "FLAT")}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">
                    <Percent className="mr-1 h-3 w-3 inline" />
                    Flat
                  </SelectItem>
                  <SelectItem value="PERCENTAGE">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platform Fee per Order</Label>
            <Input
              type="number"
              value={platformFee}
              readOnly
              disabled
            />
            <p className="text-xs text-gray-500">Set by Super Admin</p>
          </div>

          <div className="space-y-2">
            <Label>Split Bill</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
              >
                -
              </Button>
              <div className="flex items-center gap-1 rounded-xl border px-3 py-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{splitCount}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSplitCount(splitCount + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 space-y-2 rounded-2xl bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">CGST (2.5%)</span>
            <span>{formatCurrency(cgst)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">SGST (2.5%)</span>
            <span>{formatCurrency(sgst)}</span>
          </div>
          {platformFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee</span>
              <span>{formatCurrency(platformFee)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount</span>
              <span className="text-danger-500">
                -{formatCurrency(discountAmount)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-heading text-xl font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {splitCount > 1 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Per person</span>
              <span>{formatCurrency(perPerson)}</span>
            </div>
          )}
        </div>

        <Button
          className="mt-6 w-full py-6 text-base"
          onClick={() => generateBillMutation.mutate()}
          disabled={generateBillMutation.isPending}
        >
          <Receipt className="mr-2 h-5 w-5" />
          {generateBillMutation.isPending ? "Generating..." : "Generate Bill"}
        </Button>
      </div>

      {/* Invoice Modal */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-md print:shadow-none print:border-none">
          <DialogHeader>
            <DialogTitle className="text-center">Tax Invoice</DialogTitle>
          </DialogHeader>
          {bill && (
            <div className="space-y-4 print:p-0">
              {/* Restaurant Header */}
              <div className="text-center">
                <h3 className="font-heading text-xl font-bold">SmartServe AI</h3>
                <p className="text-xs text-gray-500">Restaurant Management System</p>
                <p className="text-xs text-gray-500">GST: 00AAAAA0000A1Z5</p>
              </div>

              <div className="flex justify-between text-xs">
                <div>
                  <p>Bill #: {bill.billNumber}</p>
                  <p>Date: {new Date(bill.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p>Table #: {tableNumber}</p>
                  <p>Time: {new Date(bill.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-1 text-sm">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%)</span>
                  <span>{formatCurrency(bill.taxAmount / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%)</span>
                  <span>{formatCurrency(bill.taxAmount / 2)}</span>
                </div>
                {bill.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span>{formatCurrency(bill.serviceCharge)}</span>
                  </div>
                )}
                {bill.discount > 0 && (
                  <div className="flex justify-between text-danger-500">
                    <span>Discount</span>
                    <span>-{formatCurrency(bill.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-heading text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(bill.total)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-xs text-gray-500">
                <span>Payment: {bill.paymentMethod}</span>
                <span>Status: {bill.paymentStatus}</span>
              </div>

              {splitCount > 1 && (
                <p className="text-center text-xs text-gray-500">
                  Split into {splitCount} &middot; {formatCurrency(bill.total / splitCount)} each
                </p>
              )}

              <p className="text-center text-xs text-gray-400">
                Thank you for dining with us!
              </p>

              {/* Action buttons (hidden when printing) */}
              <div className="flex gap-2 no-print">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    toast.success("Invoice downloaded");
                    onBillGenerated();
                    setShowInvoice(false);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
