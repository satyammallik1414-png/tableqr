"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Receipt,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import { FeatureGuard } from "@/components/shared/FeatureGuard";

const reportTypes = [
  {
    id: "SALES",
    label: "Sales Report",
    description: "Daily, weekly, or monthly sales summary with totals",
    icon: Receipt,
    color: "bg-gray-100",
    formats: ["PDF", "EXCEL"],
  },
  {
    id: "TAX",
    label: "Tax Report (GST)",
    description: "GST summary with CGST/SGST breakdown",
    icon: FileText,
    color: "bg-gray-100",
    formats: ["PDF"],
  },
  {
    id: "INVENTORY",
    label: "Inventory Report",
    description: "Current stock levels and consumption data",
    icon: Package,
    color: "bg-gray-100",
    formats: ["PDF", "EXCEL"],
  },
  {
    id: "CUSTOMER",
    label: "Customer Report",
    description: "Customer data, visits, and spending patterns",
    icon: Users,
    color: "bg-gray-100",
    formats: ["EXCEL"],
  },
];

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const handleDownload = (type: string, format: string) => {
    toast.success(
      `Downloading ${type} report as ${format}... (Demo feature)`,
    );
  };

  return (
    <FeatureGuard featureKey="REPORTS">
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Reports</h1>
        <p className="text-sm text-gray-500">
          Generate and download business reports
        </p>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reportTypes.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${report.color}`}
                  >
                    <report.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold">
                      {report.label}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {report.description}
                    </p>
                    <div className="mt-4 flex gap-2">
                      {report.formats.map((format) => (
                        <Button
                          key={format}
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(report.id, format)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          {format === "PDF" ? (
                            <FileText className="mr-1 h-3 w-3" />
                          ) : (
                            <FileSpreadsheet className="mr-1 h-3 w-3" />
                          )}
                          {format}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
    </FeatureGuard>
  );
}
