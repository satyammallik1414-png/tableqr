"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const [restaurant, setRestaurant] = useState({
    name: "SmartServe AI",
    email: "admin@smartserve.ai",
    phone: "+91 98765 43210",
    address: "123, Restaurant Street, Mumbai - 400001",
    gst: "00AAAAA0000A1Z5",
  });

  const [tax, setTax] = useState({
    cgst: 2.5,
    sgst: 2.5,
    serviceCharge: 10,
  });

  const [prefs, setPrefs] = useState({
    notifications: true,
    loyaltyProgram: true,
    autoDeduct: false,
  });

  const [payment, setPayment] = useState({
    collectPaymentUpfront: true,
    upiEnabled: true,
    upiId: "smartserve@upi",
    payeeName: "SmartServe Restaurant",
    qrImageUrl: "",
    qrDisplayMode: "DYNAMIC",
    cashEnabled: true,
    cardEnabled: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.restaurant) {
            setRestaurant((prev) => ({
              ...prev,
              name: json.data.restaurant.name || prev.name,
              email: json.data.restaurant.email || prev.email,
              phone: json.data.restaurant.phone || prev.phone,
              address: json.data.restaurant.address || prev.address,
              gst: json.data.restaurant.gstNumber || prev.gst,
            }));
          }
          if (json.data.tax) setTax(json.data.tax);
          if (json.data.prefs) setPrefs(json.data.prefs);
          if (json.data.payment) {
            setPayment((prev) => ({
              ...prev,
              ...json.data.payment,
              qrImageUrl: json.data.payment.qrImageUrl || "",
              qrDisplayMode: json.data.payment.qrDisplayMode || "DYNAMIC",
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("QR Code image must be smaller than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress/resize canvas image to max 800x800 for optimal performance
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/png", 0.9);
          setPayment((prev) => ({
            ...prev,
            qrImageUrl: compressedDataUrl,
          }));
          toast.success("Payment QR Code uploaded successfully!");
        } else {
          const rawBase64 = event.target?.result as string;
          setPayment((prev) => ({
            ...prev,
            qrImageUrl: rawBase64,
          }));
          toast.success("Payment QR Code uploaded successfully!");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrImage = () => {
    setPayment((prev) => ({
      ...prev,
      qrImageUrl: "",
    }));
    if (qrFileInputRef.current) {
      qrFileInputRef.current.value = "";
    }
    toast.success("Payment QR code image removed");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant,
          tax,
          prefs,
          payment,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save settings");
      }
      toast.success("Settings and payment methods saved successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureGuard featureKey="SETTINGS">
      <div className="space-y-6 max-w-4xl pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">Restaurant Settings</h1>
            <p className="text-sm text-slate-500">
              Configure restaurant profile, taxes, preferences, and payment collection methods
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 cursor-pointer shadow-xs"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>

        {/* Payment Methods & Customer Checkout */}
        <Card className="border-emerald-200/80 shadow-xs overflow-hidden">
          <CardHeader className="bg-emerald-50/60 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-slate-900">Payment Methods & Customer Checkout</CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    Collect order money from customers before order confirmation
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                Customer Checkout
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            {/* Main Toggle: Collect Payment Upfront */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Collect Payment Before Place Order
                </Label>
                <p className="text-xs text-slate-600">
                  When enabled, customers see the Payment screen before placing order. Once paid, the order confirmation screen opens.
                </p>
              </div>
              <Switch
                checked={payment.collectPaymentUpfront}
                onCheckedChange={(v) => setPayment({ ...payment, collectPaymentUpfront: v })}
              />
            </div>

            {/* Payment Method Options */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enabled Payment Methods for Customers
              </h4>

              {/* 1. UPI / QR Payment */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="font-bold text-slate-900 text-sm">UPI / QR Code Payment</Label>
                      <p className="text-xs text-slate-500">
                        Generates a dynamic QR code or displays your custom uploaded payment QR standee
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={payment.upiEnabled}
                    onCheckedChange={(v) => setPayment({ ...payment, upiEnabled: v })}
                  />
                </div>

                {payment.upiEnabled && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">
                          Restaurant UPI ID / VPA <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="e.g. restaurantname@okhdfcbank"
                          value={payment.upiId}
                          onChange={(e) => setPayment({ ...payment, upiId: e.target.value })}
                          className="text-xs h-9 font-mono"
                        />
                        <p className="text-[11px] text-slate-400">
                          Customer payments will be directed straight to this UPI address.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">Payee / Business Name</Label>
                        <Input
                          placeholder="e.g. SmartServe Restaurant"
                          value={payment.payeeName}
                          onChange={(e) => setPayment({ ...payment, payeeName: e.target.value })}
                          className="text-xs h-9"
                        />
                        <p className="text-[11px] text-slate-400">
                          Displays in UPI apps as the merchant recipient name.
                        </p>
                      </div>
                    </div>

                    {/* Custom Payment QR Code Upload Option */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                            Upload Custom Payment QR Code (Static Standee / Scanner)
                          </Label>
                          <p className="text-[11px] text-slate-500">
                            Upload your official QR code image (GPay, PhonePe, Paytm, BharatPe). Customers can scan this image during checkout.
                          </p>
                        </div>
                        <input
                          type="file"
                          ref={qrFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrUpload}
                        />
                      </div>

                      {payment.qrImageUrl ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
                          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs flex items-center justify-center">
                            <img
                              src={payment.qrImageUrl}
                              alt="Uploaded Payment QR Code"
                              className="h-full w-full object-contain rounded-lg"
                            />
                          </div>
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                                QR Image Uploaded
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">
                              Your uploaded payment QR image is saved and ready for customer checkout.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => qrFileInputRef.current?.click()}
                                className="h-8 text-xs font-medium gap-1.5 border-slate-300 bg-white hover:bg-slate-50"
                              >
                                <Upload className="h-3.5 w-3.5 text-slate-600" />
                                Change Image
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveQrImage}
                                className="h-8 text-xs font-medium gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove Image
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => qrFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer group"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                            <FileUp className="h-5 w-5" />
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <p className="text-xs font-bold text-slate-700">Click to upload Payment QR Code image</p>
                            <p className="text-[11px] text-slate-400">Supports GPay, PhonePe, Paytm, BHIM QR codes (PNG, JPG up to 5MB)</p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-3 text-xs h-8 font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs group-hover:border-blue-300"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                            Upload Payment QR
                          </Button>
                        </div>
                      )}

                      {/* Display Mode Switcher */}
                      {payment.qrImageUrl && (
                        <div className="space-y-1.5 pt-2">
                          <Label className="text-xs font-semibold text-slate-700">Customer Checkout View Mode</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPayment({ ...payment, qrDisplayMode: "DYNAMIC" })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                                payment.qrDisplayMode === "DYNAMIC" || !payment.qrDisplayMode
                                  ? "bg-blue-50 border-blue-400 text-blue-800 font-bold shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              Dynamic QR (Auto Amount)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayment({ ...payment, qrDisplayMode: "CUSTOM" })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                                payment.qrDisplayMode === "CUSTOM"
                                  ? "bg-blue-50 border-blue-400 text-blue-800 font-bold shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              Uploaded QR Standee
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayment({ ...payment, qrDisplayMode: "BOTH" })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                                payment.qrDisplayMode === "BOTH"
                                  ? "bg-blue-50 border-blue-400 text-blue-800 font-bold shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              Both (Tabbed View)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Cash on Counter */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="font-bold text-slate-900 text-sm">Cash on Counter / Pay at Cashier</Label>
                      <p className="text-xs text-slate-500">
                        Allow customers to choose cash payment and settle bill at the restaurant counter
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={payment.cashEnabled}
                    onCheckedChange={(v) => setPayment({ ...payment, cashEnabled: v })}
                  />
                </div>
              </div>

              {/* 3. Card Payment */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="font-bold text-slate-900 text-sm">Card Payment (Debit / Credit)</Label>
                      <p className="text-xs text-slate-500">
                        Allow card swipe / POS machine at table or checkout counter
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={payment.cardEnabled}
                    onCheckedChange={(v) => setPayment({ ...payment, cardEnabled: v })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Restaurant Profile</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Basic contact and identity details shown on the customer menu and bills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Restaurant Name</Label>
                <Input
                  value={restaurant.name}
                  onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={restaurant.email}
                  onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={restaurant.phone}
                  onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input
                  value={restaurant.gst}
                  onChange={(e) => setRestaurant({ ...restaurant, gst: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={restaurant.address}
                onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Tax & Charges Configuration</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Rates automatically calculated on customer orders
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>CGST (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={tax.cgst}
                onChange={(e) => setTax({ ...tax, cgst: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>SGST (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={tax.sgst}
                onChange={(e) => setTax({ ...tax, sgst: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Charge (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={tax.serviceCharge}
                onChange={(e) => setTax({ ...tax, serviceCharge: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Preferences</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Notifications and automation options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-slate-500">Receive notifications for new orders</p>
              </div>
              <Switch
                checked={prefs.notifications}
                onCheckedChange={(v) => setPrefs({ ...prefs, notifications: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Loyalty Program</Label>
                <p className="text-xs text-slate-500">Enable customer loyalty points and tiers</p>
              </div>
              <Switch
                checked={prefs.loyaltyProgram}
                onCheckedChange={(v) => setPrefs({ ...prefs, loyaltyProgram: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Deduct Inventory</Label>
                <p className="text-xs text-slate-500">Automatically deduct stock when order is completed</p>
              </div>
              <Switch
                checked={prefs.autoDeduct}
                onCheckedChange={(v) => setPrefs({ ...prefs, autoDeduct: v })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 cursor-pointer shadow-md"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? "Saving Settings..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </FeatureGuard>
  );
}
