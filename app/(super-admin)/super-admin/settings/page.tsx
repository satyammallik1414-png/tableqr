"use client";

import { useEffect, useState } from "react";
import { Settings, Save, ShieldCheck, Globe, DollarSign, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "SmartServe AI",
    supportEmail: "support@smartserve.ai",
    defaultCurrency: "INR",
    taxPercentageDefault: "5",
    maintenanceMode: false,
    autoApproveRegistrations: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/settings");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const map: any = {};
        json.data.forEach((s: any) => {
          map[s.key] = s.value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch {
      toast.error("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: any, description: string) => {
    try {
      setSaving(true);
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, description }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Setting '${key}' saved`);
      } else {
        toast.error(json.error || "Failed to save setting");
      }
    } catch {
      toast.error("Error saving setting");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await Promise.all([
        handleSaveSetting("platformName", settings.platformName, "Platform display name"),
        handleSaveSetting("supportEmail", settings.supportEmail, "Platform support contact email"),
        handleSaveSetting("defaultCurrency", settings.defaultCurrency, "Default currency code"),
        handleSaveSetting("taxPercentageDefault", settings.taxPercentageDefault, "Default GST/Tax percentage"),
        handleSaveSetting("maintenanceMode", settings.maintenanceMode, "Enable system maintenance mode"),
        handleSaveSetting("autoApproveRegistrations", settings.autoApproveRegistrations, "Auto-approve new business accounts"),
      ]);
      toast.success("All platform settings updated!");
    } catch {
      toast.error("Failed to update all settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h2>
          <p className="text-sm text-gray-500">Configure global platform defaults, branding, and maintenance mode.</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving} className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-xs font-medium">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Card 1: Branding & Support */}
      <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" /> Platform Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Platform Name</Label>
            <Input
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Support Contact Email</Label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Default Currency</Label>
              <Input
                value={settings.defaultCurrency}
                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Default Tax Rate (%)</Label>
              <Input
                type="number"
                value={settings.taxPercentageDefault}
                onChange={(e) => setSettings({ ...settings, taxPercentageDefault: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Security & Operations */}
      <Card className="rounded-2xl border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" /> System Operations & Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Auto-Approve Registrations</p>
              <p className="text-xs text-gray-500">Automatically activate newly registered restaurant accounts.</p>
            </div>
            <Switch
              checked={settings.autoApproveRegistrations}
              onCheckedChange={(val) => setSettings({ ...settings, autoApproveRegistrations: val })}
            />
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <div>
              <p className="font-semibold text-sm text-amber-600">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Restrict access to non-Super Admin users during system upgrades.</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(val) => setSettings({ ...settings, maintenanceMode: val })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
