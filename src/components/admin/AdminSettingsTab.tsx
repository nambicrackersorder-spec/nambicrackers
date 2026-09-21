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
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Loader2,
} from "lucide-react";
import { SHOP, APPS_SCRIPT_URL, CLOUDINARY_CLOUD_NAME } from "@/config";
import type { OrderRecord } from "./AdminDashboardTab";
import { useCatalog, useSettings } from "@/lib/catalog-store";
import { useAdminAuth } from "@/lib/admin-auth";

interface AdminSettingsTabProps {
  orders: OrderRecord[];
  onResetDemoData?: () => {
    removedDemoProducts: number;
    removedDemoCategories: number;
    removedDemoStatuses: number;
    removedDemoOrders?: number;
  };
}

export function AdminSettingsTab({ orders, onResetDemoData }: AdminSettingsTabProps) {
  const { products, categories, resetDemoData } = useCatalog();
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

  const { adminId, changeCredentials } = useAdminAuth();

  // Change credentials state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminId, setNewAdminId] = useState(adminId || "admin@nambicrackers.com");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccess, setCredSuccess] = useState<string | null>(null);

  // Sync adminId if updated externally
  React.useEffect(() => {
    if (adminId) {
      setNewAdminId(adminId);
    }
  }, [adminId]);

  // Reset demo data modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    setCredSuccess(null);

    if (!currentPassword) {
      setCredError("Please enter your current password.");
      return;
    }
    if (!newAdminId.trim()) {
      setCredError("Please enter a valid new Admin ID / Email.");
      return;
    }
    if (!newPassword) {
      setCredError("Please enter your new password.");
      return;
    }
    if (newPassword.length < 6) {
      setCredError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setCredError("New Password and Confirm New Password do not match.");
      return;
    }

    setCredSubmitting(true);
    try {
      const res = await changeCredentials(currentPassword, newAdminId.trim(), newPassword);
      if (res.success) {
        setCredSuccess(
          "Admin credentials updated successfully! New login credentials are now active and old credentials have been invalidated.",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setTimeout(() => setCredSuccess(null), 8000);
      } else {
        setCredError(res.error || "Failed to update credentials.");
      }
    } catch (err) {
      setCredError("An unexpected error occurred while updating credentials.");
    } finally {
      setCredSubmitting(false);
    }
  };

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

  const handleConfirmResetDemo = () => {
    const handler = onResetDemoData || resetDemoData;
    const result = handler();
    setIsResetModalOpen(false);
    const orderText = result.removedDemoOrders ? `, ${result.removedDemoOrders} demo orders` : "";
    setResetSuccessMessage(
      `Admin demo data reset successfully! Cleaned ${result.removedDemoProducts} demo products, ${result.removedDemoCategories} demo categories${orderText}, and refreshed live calculations. Real products, categories, and customer orders remain 100% safe.`,
    );
    setTimeout(() => setResetSuccessMessage(null), 6000);
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

      {resetSuccessMessage && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{resetSuccessMessage}</span>
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

        {/* Change Admin Credentials Section */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-base text-primary">
                Change Admin Credentials
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-amber-700" />
              PBKDF2 Protected
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Update your Admin ID/Email and secure password. Old credentials will be immediately invalidated and replaced with encrypted credentials.
          </p>

          {credSuccess && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{credSuccess}</span>
            </div>
          )}

          {credError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{credError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Current Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm outline-none focus:border-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                New Admin ID / Email <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newAdminId}
                onChange={(e) => setNewAdminId(e.target.value)}
                placeholder="e.g. admin@nambicrackers.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                New Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm outline-none focus:border-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Confirm New Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-md border border-input bg-background pl-3 pr-9 py-2 text-sm outline-none focus:border-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleChangeCredentials}
              disabled={credSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-gold/40 bg-amber-500 hover:bg-amber-600 text-ink flex items-center gap-1.5 shadow transition-colors disabled:opacity-70"
            >
              {credSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Update Admin Credentials</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Admin Demo Data Reset Section */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-700" />
              <h3 className="font-display font-bold text-base text-amber-900">
                Admin Demo Data & Testing Controls
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
              Protected Catalog Mode
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-amber-950/90 max-w-xl">
              <p className="font-semibold text-foreground">Reset Admin Demo Data</p>
              <p className="text-muted-foreground">
                Cleans temporary test/demo data, resets demo statistics, and refreshes live calculations. Real products, real categories, and real customer orders are strictly protected and will never be deleted.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-lg border border-amber-400 bg-amber-500 hover:bg-amber-600 text-ink font-bold text-xs flex items-center justify-center gap-2 shrink-0 shadow-sm transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Admin Demo Data</span>
            </button>
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

      {/* Reset Admin Demo Data Confirmation Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/60 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-primary">
                  Reset Admin Demo Data?
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  This will remove only Admin demo/test data. Existing products, categories, customer data, real orders, cart, checkout, and payment data will not be affected.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/80 border border-border p-3 text-xs text-foreground/80 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Protected: Real products & categories preserved</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Protected: Real customer orders preserved</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDemo}
                className="btn-gold hover:btn-gold-hover px-5 py-2 text-xs font-bold shadow"
              >
                Yes, Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
