import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Store,
  RefreshCw,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Printer,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { APPS_SCRIPT_URL, SHOP } from "@/config";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import { useOrderStatusMap, useSettings, filterRealOrders } from "@/lib/catalog-store";
import { useAdminAuth } from "@/lib/admin-auth";
import { AdminLoginPage } from "@/components/admin/AdminLoginPage";

export const Route = createFileRoute("/orders-nambi2026")({
  head: () => ({
    meta: [
      { title: "Live Orders Dashboard — Nambi Crackers" },
      {
        name: "description",
        content: "Live view of all Nambi Crackers orders received from the website.",
      },
      { property: "og:title", content: "Live Orders Dashboard — Nambi Crackers" },
      {
        property: "og:description",
        content: "Live view of all Nambi Crackers orders received from the website.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersDashboard,
});

type Order = {
  timestamp: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  items: string;
  totalQty: string;
  totalAmount: string;
  status?: string;
  orderId?: string;
};

async function fetchOrders(scriptUrl: string): Promise<Order[]> {
  const url = scriptUrl || APPS_SCRIPT_URL;
  const res = await fetch(`${url}?action=list`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to load orders");
  return data.orders as Order[];
}

function waNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

const STATUS_OPTIONS = [
  "Confirmed",
  "Payment Completed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function OrdersDashboard() {
  const { isAuthenticated, logout } = useAdminAuth();
  const { settings } = useSettings();
  const { statusMap, setOrderStatus } = useOrderStatusMap();
  const [statusFilter, setStatusFilter] = useState<"active" | "delivered" | "all">("active");

  const {
    data: fetchedOrders,
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["orders", settings.scriptUrl],
    queryFn: () => fetchOrders(settings.scriptUrl),
    refetchInterval: 30000,
  });

  const rawOrders: Order[] = (fetchedOrders ?? []).map((o, idx) => {
    const key = o.orderId || `${o.timestamp}-${idx}`;
    return {
      ...o,
      status:
        statusMap[key] ||
        (o.orderId && statusMap[o.orderId]) ||
        (o.timestamp && statusMap[`${o.timestamp}-${o.name || ""}`]) ||
        statusMap[String(idx)] ||
        o.status ||
        "Confirmed",
    };
  });

  const orders: Order[] = filterRealOrders(rawOrders);

  const activeOrdersCount = useMemo(() => {
    return (orders ?? []).filter((o) => {
      const s = (o.status || "Confirmed").toLowerCase();
      return !s.includes("deliver") && !s.includes("cancel");
    }).length;
  }, [orders]);

  const deliveredOrdersCount = useMemo(() => {
    return (orders ?? []).filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s.includes("deliver");
    }).length;
  }, [orders]);

  const displayedOrders = useMemo(() => {
    return (orders ?? []).filter((o) => {
      const s = (o.status || "Confirmed").toLowerCase();
      if (statusFilter === "active") return !s.includes("deliver") && !s.includes("cancel");
      if (statusFilter === "delivered") return s.includes("deliver");
      return true;
    });
  }, [orders, statusFilter]);

  const totalRevenue = (orders ?? []).reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  const handleUpdateStatus = async (key: string, newStatus: string, order: Order) => {
    const orderId = order.orderId || key;
    if (settings.scriptUrl && orderId) {
      try {
        const url = `${settings.scriptUrl}?action=updateStatus&orderId=${encodeURIComponent(String(orderId))}&status=${encodeURIComponent(newStatus)}`;
        await fetch(url);
      } catch (err) {
        console.warn("Could not sync order status to Apps Script", err);
      }
    }

    if (order.orderId) setOrderStatus(order.orderId, newStatus);
    if (order.timestamp) setOrderStatus(`${order.timestamp}-${order.name || ""}`, newStatus);
    setOrderStatus(key, newStatus);
  };

  const handleDownloadInvoice = (o: Order) => {
    const rawLines = o.items ? o.items.split("\n") : [];
    const invoiceLines = rawLines.map((line) => ({
      name: line,
      unit: "Pkt",
      qty: 1,
      price: 0,
      rate: 0,
    }));

    const netVal = Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0;
    const invData: InvoiceData = {
      orderId: o.orderId || `NC-${Date.now().toString().slice(-4)}`,
      date: o.timestamp || new Date().toLocaleString("en-IN"),
      name: o.name,
      mobile: o.mobile,
      email: o.email,
      address: o.address,
      city: o.district || "",
      district: o.district || "",
      state: o.state || "",
      pincode: o.pincode || "",
      lines: invoiceLines,
      mrpTotal: Math.round(netVal * 10),
      discount: Math.round(netVal * 9),
      netTotal: netVal,
      totalQty: Number(o.totalQty) || rawLines.length || 1,
    };

    downloadInvoice(invData);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("deliver")) {
      return "bg-green-100 text-green-700 border-green-300";
    }
    if (s.includes("transit") || s.includes("dispatch") || s.includes("ship")) {
      return "bg-amber-100 text-amber-700 border-amber-300";
    }
    if (s.includes("pack") || s.includes("payment")) {
      return "bg-indigo-100 text-indigo-700 border-indigo-300";
    }
    if (s.includes("cancel")) {
      return "bg-red-100 text-red-700 border-red-300";
    }
    return "bg-blue-100 text-blue-700 border-blue-300";
  };

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with surface-royal matching brand identity */}
      <header className="surface-royal sticky top-0 z-20 shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Nambi Crackers logo"
              className="h-9 w-9 rounded-full object-contain border border-gold/40"
            />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-wide text-white uppercase">
                Live Orders — {settings.name}
              </h1>
              <p className="text-[11px] text-amber-200">
                Auto-refreshes every 30s
                {dataUpdatedAt > 0 &&
                  ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="btn-gold hover:btn-gold-hover px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Full Admin Portal</span>
            </Link>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-white/30 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              <span>{isFetching ? "Refreshing…" : "Refresh"}</span>
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-white/30 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
            >
              <Store className="h-3 w-3" />
              <span>Shop</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-destructive/40 bg-destructive/20 hover:bg-destructive/30 text-white flex items-center gap-1 transition-colors"
              title="Logout Admin"
            >
              <LogOut className="h-3 w-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Banner recommending Unified Admin */}
      <div className="bg-secondary border-b border-border py-2 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold text-[10px]">
              NEW
            </span>
            <span className="text-muted-foreground">
              Manage complete catalogue, product prices, categories, analytics & settings in the new
              Admin Control Panel.
            </span>
          </div>
          <Link
            to="/admin"
            className="text-primary font-bold hover:underline self-start sm:self-auto"
          >
            Open Admin Dashboard →
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* KPI Metrics */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold font-display text-primary">{orders?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Orders</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold font-display text-primary">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Value</p>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm sm:col-span-1">
            <p className="text-2xl font-bold font-display text-primary">
              ₹
              {orders && orders.length
                ? Math.round(totalRevenue / orders.length).toLocaleString("en-IN")
                : 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg. Order Value</p>
          </div>
        </div>

        {isLoading && (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            Loading live orders…
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load orders. Make sure the Google Apps Script Web App is deployed and
            accessible.
            <br />
            <span className="text-xs opacity-80">{String(error)}</span>
          </div>
        )}

        {/* Quick View Filter Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "border-input bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Active Live Orders ({activeOrdersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("delivered")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              statusFilter === "delivered"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                : "border-input bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Completed / Delivered ({deliveredOrdersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "border-input bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>

        {/* Empty State for Filter */}
        {!isLoading && displayedOrders.length === 0 && (
          <div className="py-16 text-center text-muted-foreground rounded-xl border border-border bg-card">
            {statusFilter === "active"
              ? "No active live orders right now. All received orders have been completed or delivered."
              : statusFilter === "delivered"
                ? "No delivered orders yet."
                : "No orders found."}
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {(displayedOrders ?? []).map((o, i) => {
            const waText = encodeURIComponent(
              `Vanakkam ${o.name}! 🙏 This is ${settings.name} (Sivakasi). We received your order of ₹${o.totalAmount} (${o.totalQty} items). We will confirm delivery shortly. Thank you!`,
            );
            const waLink = o.mobile ? `https://wa.me/${waNumber(o.mobile)}?text=${waText}` : null;
            const mailSubject = encodeURIComponent(
              `${settings.name} — Order Confirmation (₹${o.totalAmount})`,
            );
            const mailBody = encodeURIComponent(
              `Vanakkam ${o.name},\n\nThank you for your order with ${settings.name}.\n\nOrder Items:\n${o.items}\n\nTotal Qty: ${o.totalQty}\nTotal Amount: ₹${o.totalAmount}\n\nDelivery Address:\n${o.address}, ${o.district}, ${o.state} - ${o.pincode}\n\nWe will contact you shortly to confirm.\n\n— ${settings.name}\n${settings.address}\nPh: ${settings.phoneDisplay}`,
            );
            const mailLink = o.email
              ? `mailto:${o.email}?subject=${mailSubject}&body=${mailBody}`
              : null;

            const status = o.status || "Confirmed";
            const orderKey = o.orderId || `${o.timestamp}-${i}`;

            return (
              <article
                key={`${o.timestamp}-${i}`}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-gold/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold font-display text-primary">
                        {o.name || "Customer"}
                      </h2>
                      <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent-foreground border border-gold/40">
                        ₹{o.totalAmount}
                      </span>
                      {o.orderId && (
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          ({o.orderId})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.timestamp}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) => handleUpdateStatus(orderKey, e.target.value, o)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border outline-none cursor-pointer ${getStatusBadge(
                          status,
                        )}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        WhatsApp
                      </a>
                    )}
                    {mailLink && (
                      <a
                        href={mailLink}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(o)}
                      className="rounded-md border border-input bg-secondary hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      <Printer className="h-3 w-3 text-primary" />
                      Invoice
                    </button>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1.5 text-xs">
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-primary" />
                      <span className="font-semibold">{o.mobile || "—"}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">{o.email || "—"}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {o.address}, {o.district}, {o.state} - {o.pincode}
                      </span>
                    </p>
                    <p className="font-bold text-foreground pt-1">
                      Total Items: <span className="text-primary">{o.totalQty}</span>
                    </p>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-lg bg-secondary/80 border border-border p-3 font-sans text-xs leading-relaxed max-h-32 overflow-y-auto">
                    {o.items}
                  </pre>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
