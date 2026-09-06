"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QRGeneratorProps {
  value: string;
  title?: string;
  size?: number;
}

export function QRGenerator({
  value,
  title,
  size = 200,
}: QRGeneratorProps) {
  const downloadQR = () => {
    try {
      const svg = document.getElementById("qr-code-svg") as unknown as SVGElement;
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (typeof window === "undefined") return;
      const img = new window.Image();

      img.onerror = () => {
        console.error("Failed to load SVG for QR download");
      };

      img.onload = () => {
        try {
          canvas.width = size;
          canvas.height = size;
          ctx?.drawImage(img, 0, 0);
          const png = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `qr-${title?.toLowerCase().replace(/\s+/g, "-") || "code"}.png`;
          link.href = png;
          link.click();
        } catch (canvasErr) {
          console.error("Canvas draw error:", canvasErr);
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error("Download QR error:", err);
    }
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = document.getElementById("qr-code-svg")?.outerHTML;
    if (!svg) return;
    printWindow.document.write(`
      <html>
        <head><title>Print QR</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
          ${svg}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="w-fit">
      <CardHeader className="pb-3">
        {title && (
          <CardTitle className="text-sm text-center">{title}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-inner">
          <QRCodeSVG
            id="qr-code-svg"
            value={value}
            size={size}
            level="H"
            includeMargin
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadQR}
          >
            <Download className="mr-1 h-4 w-4" /> Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={printQR}
          >
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
