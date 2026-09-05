"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  Printer,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  ExternalLink,
  Power,
  Eye,
  Scan,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface QRCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "RESTAURANT_MENU" | "TABLE";
  branchId: string;
  tableId?: string;
  tableName?: string;
}

export function QRCodeManager({
  open,
  onOpenChange,
  type,
  branchId,
  tableId,
  tableName,
}: QRCodeManagerProps) {
  const [loading, setLoading] = useState(false);
  const [qrRecord, setQrRecord] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate or fetch the existing QR code
  const fetchOrGenerateQR = async (regenerate = false) => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          branchId,
          tableId,
          tableName,
          regenerate,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to generate QR code");
      }

      setQrRecord(json.data);
      if (regenerate) {
        toast.success("New secure QR token generated!");
      }
    } catch (err: unknown) {
      console.error("QR load error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load QR code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOrGenerateQR(false);
    }
  }, [open, branchId, tableId, type]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullOrderUrl = qrRecord ? `${origin}${qrRecord.orderUrl}` : "";

  const handleCopyLink = () => {
    if (!fullOrderUrl) return;
    navigator.clipboard.writeText(fullOrderUrl);
    setCopied(true);
    toast.success("Order link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async (newActive: boolean) => {
    if (!qrRecord) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/qr/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: qrRecord.id,
          active: newActive,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setQrRecord((prev: any) => ({ ...prev, active: newActive }));
      toast.success(newActive ? "QR Code activated" : "QR Code deactivated");
    } catch (err: unknown) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadPNG = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const canvasSize = 400;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        ctx.drawImage(img, 25, 25, 350, 350);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const title = type === "TABLE" ? tableName || "Table-QR" : "Menu-QR";
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const svg = qrRef.current?.querySelector("svg")?.outerHTML;
    if (!svg) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const displayName = type === "TABLE" ? tableName || "Table QR" : "Complete Restaurant Menu";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${displayName} — QR Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 95vh;
              margin: 0;
              color: #0f172a;
              text-align: center;
            }
            .standee {
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 40px;
              max-width: 380px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .title {
              font-size: 26px;
              font-weight: 800;
              margin-bottom: 6px;
              color: #0f172a;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 16px;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
            }
            .instructions {
              margin-top: 20px;
              font-size: 15px;
              font-weight: 600;
              color: #1e293b;
            }
            .footer {
              margin-top: 8px;
              font-size: 12px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="standee">
            <div class="title">${displayName}</div>
            <div class="subtitle">SmartServe AI Digital Ordering</div>
            <div class="qr-wrapper">
              ${svg}
            </div>
            <div class="instructions">Scan camera to view menu & order</div>
            <div class="footer">No app required • Instant service</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const dialogTitle = type === "TABLE" ? `Table QR — ${tableName || "Table"}` : "Restaurant Menu QR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base font-bold text-navy-900">
            <span className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-navy-900" />
              {dialogTitle}
            </span>
            {qrRecord && (
              <Badge
                variant={qrRecord.active ? "default" : "destructive"}
                className={`text-xs ${qrRecord.active ? "bg-emerald-600" : ""}`}
              >
                {qrRecord.active ? "Active" : "Deactivated"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {type === "TABLE"
              ? "Customers scanning this QR code will have this table automatically selected."
              : "Customers scanning this QR code can browse the full menu and select their table or takeaway."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-navy-900 border-t-transparent" />
          </div>
        ) : qrRecord ? (
          <div className="space-y-4 pt-1">
            {/* QR SVG Preview Card */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div ref={qrRef} className="rounded-xl border border-slate-100 bg-white p-3 shadow-inner">
                <QRCodeSVG
                  value={fullOrderUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Stats & Details */}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Scan className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Scans: <strong className="text-slate-800">{qrRecord.scanCount || 0}</strong>
                  </span>
                </div>
                <div>•</div>
                <div className="flex items-center gap-1">
                  <span>Token: </span>
                  <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700 font-mono">
                    {qrRecord.secureToken.slice(0, 10)}...
                  </code>
                </div>
              </div>
            </div>

            {/* URL Display with Copy & Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Customer Order URL</Label>
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={fullOrderUrl}
                  className="h-8 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-600 select-all font-mono focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-8 px-2.5 text-xs gap-1 border-slate-300"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <a href={fullOrderUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-8 px-2 border-slate-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Quick Actions: Print, Download, Regenerate */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPNG}
                className="gap-2 text-xs font-semibold border-slate-300 hover:bg-slate-50 text-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Download PNG
              </Button>
              <Button
                size="sm"
                onClick={printQR}
                className="gap-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Standee
              </Button>
            </div>

            {/* Controls: Active switch & Regenerate token */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <Switch
                  checked={qrRecord.active}
                  onCheckedChange={handleToggleActive}
                  disabled={isUpdating}
                  id="qr-active-switch"
                />
                <Label htmlFor="qr-active-switch" className="text-xs cursor-pointer">
                  {qrRecord.active ? "QR Active" : "QR Disabled"}
                </Label>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Regenerating this QR code will invalidate any printed codes. Continue?")) {
                    fetchOrGenerateQR(true);
                  }
                }}
                className="h-7 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 gap-1 px-2"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate Token
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
