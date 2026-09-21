import React, { useState } from "react";
import {
  Settings,
  Store,
  Phone,
  Mail,
  MapPin,
  Percent,
  Coins,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Sparkles,
  Save,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { OrderRecord } from "./AdminDashboardTab";
import { useCatalog, useSettings } from "@/lib/catalog-store";

interface AdminSettingsTabProps {
  orders: OrderRecord[];
}

export function AdminSettingsTab({ orders }: AdminSettingsTabProps) {
  const { products } = useCatalog();
  const { settings, updateSettings } = useSettings();

  const [shopName, setShopName] = useState(settings.name);
  const [phone, setPhone] = useState(settings.phone);
  const [phoneDisplay, setPhoneDisplay] = useState(settings.phoneDisplay);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [minOrder, setMinOrder] = useState(settings.minOrder);
  const [discount, setDiscount] = useState(settings.discount);
  const [scriptUrl, setScriptUrl] = useState(settings.scriptUrl);

  // Sync state if settings update externally
  React.useEffect(() => {
    setShopName(settings.name);
    setPhone(settings.phone);
    setPhoneDisplay(settings.phoneDisplay);
    setEmail(settings.email);
    setAddress(settings.address);
    setMinOrder(settings.minOrder);
    setDiscount(settings.discount);
    setScriptUrl(settings.scriptUrl);
  }, [settings]);

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch(`${scriptUrl}?action=list`);
      const data = await res.json();
      if (data.success) {
        setTestStatus("success");
        setTestMessage(
          `Successfully connected! Received ${data.orders?.length ?? 0} live orders from Google Sheet.`,
        );
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Connection responded with an error.");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(`Failed to reach endpoint: ${String(err)}`);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      name: shopName.trim(),
      phone: phone.trim(),
      phoneDisplay: phoneDisplay.trim(),
      email: email.trim(),
      address: address.trim(),
      minOrder: Number(minOrder) || 0,
      discount: Number(discount) || 0,
      scriptUrl: scriptUrl.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      alert("No orders to export.");
      return;
    }

    const headers = [
      "Timestamp",
      "Name",
      "Mobile",
      "Email",
      "Address",
      "District",
      "State",
      "Pincode",
      "TotalQty",
      "TotalAmount",
      "Status",
    ];

    const rows = orders.map((o) => [
      `"${o.timestamp}"`,
      `"${o.name.replace(/"/g, '""')}"`,
      `"${o.mobile}"`,
      `"${o.email}"`,
      `"${o.address.replace(/"/g, '""')}"`,
      `"${o.district}"`,
      `"${o.state}"`,
      `"${o.pincode}"`,
      `"${o.totalQty}"`,
      `"${o.totalAmount}"`,
      `"${o.status || "Confirmed"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `nambi-crackers-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProductsJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `nambi-crackers-catalog-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-primary sm:text-2xl">
          Store & System Configuration
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure shop details, minimum order thresholds, Google Apps Script endpoint, backup data, and demo management.
        </p>
      </div>

      {isSaved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Settings saved and synchronized live to the Customer Website!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Shop Information Card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base text-primary">
              Shop Information & Branding
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                WhatsApp Phone (10 digits)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone Display Text
              </label>
              <input
                type="text"
                value={phoneDisplay}
                onChange={(e) => setPhoneDisplay(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Sivakasi Shop Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Pricing Rules & Discounts */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Percent className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base text-primary">
              Order Thresholds & Discount Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-border bg-secondary/50">
              <label className="block text-xs font-bold text-foreground mb-1">
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                min={0}
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base font-bold text-primary outline-none focus:border-accent"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Customers cannot place orders below this value in the cart.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-secondary/50">
              <label className="block text-xs font-bold text-foreground mb-1">
                Default Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base font-bold text-primary outline-none focus:border-accent"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Standard factory price calculation discount (90% off MRP).
              </p>
            </div>
          </div>
        </div>

        {/* Google Apps Script Integration Card */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-base text-primary">
                Google Apps Script Web App Integration
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              Google Sheets Database
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Web App Deployment URL
              </label>
              <input
                type="url"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono outline-none focus:border-accent"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Receives enquiries, stores orders in Google Sheets, and provides tracking data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-secondary hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`}
                />
                <span>{testStatus === "testing" ? "Testing..." : "Test Connection"}</span>
              </button>

              {testStatus === "success" && (
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{testMessage}</span>
                </div>
              )}

              {testStatus === "error" && (
                <div className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Backup & Export */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Download className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-base text-primary">
              Data Backup & Export Tools
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={exportOrdersCSV}
              className="p-3 rounded-lg border border-border bg-secondary hover:bg-muted text-left flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-foreground">Export Orders (CSV)</div>
                <div className="text-[11px] text-muted-foreground">
                  Download full order records as Excel-compatible CSV
                </div>
              </div>
              <Download className="h-4 w-4 text-primary shrink-0" />
            </button>

            <button
              type="button"
              onClick={exportProductsJSON}
              className="p-3 rounded-lg border border-border bg-secondary hover:bg-muted text-left flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-foreground">Export Catalogue (JSON)</div>
                <div className="text-[11px] text-muted-foreground">
                  Download all {products.length} products and pricing data
                </div>
              </div>
              <Download className="h-4 w-4 text-primary shrink-0" />
            </button>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-gold hover:btn-gold-hover px-6 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

    </div>
  );
}
