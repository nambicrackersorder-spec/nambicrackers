import React, { useState, useMemo } from "react";
import {
  ShoppingBag,
  RefreshCw,
  Search,
  CheckCircle2,
  Truck,
  Clock,
  Mail,
  Phone,
  Printer,
  FileText,
  X,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Ban,
} from "lucide-react";
import { SHOP } from "@/config";
import type { OrderRecord } from "./AdminDashboardTab";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import { useSettings } from "@/lib/catalog-store";

interface AdminOrdersTabProps {
  orders: OrderRecord[];
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
  dataUpdatedAt: number;
  onUpdateOrderStatus?: (orderIdentifier: string | number, newStatus: string, order?: OrderRecord) => void;
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

export function AdminOrdersTab({
  orders,
  isLoading,
  isFetching,
  error,
  refetch,
  dataUpdatedAt,
  onUpdateOrderStatus,
}: AdminOrdersTabProps) {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Active vs Delivered counts
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "Confirmed").toLowerCase();
      return !s.includes("deliver") && !s.includes("cancel");
    }).length;
  }, [orders]);

  const deliveredOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "").toLowerCase();
      return s.includes("deliver");
    }).length;
  }, [orders]);

  // Filtered orders
  const q = searchQuery.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.mobile && o.mobile.includes(q)) ||
        (o.orderId && o.orderId.toLowerCase().includes(q)) ||
        (o.district && o.district.toLowerCase().includes(q)) ||
        (o.state && o.state.toLowerCase().includes(q)) ||
        (o.items && o.items.toLowerCase().includes(q));

      const status = (o.status || "Confirmed").toLowerCase();

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = !status.includes("deliver") && !status.includes("cancel");
      } else if (statusFilter === "delivered") {
        matchesStatus = status.includes("deliver");
      } else if (statusFilter === "all") {
        matchesStatus = true;
      } else {
        const target = statusFilter.toLowerCase();
        matchesStatus =
          status === target ||
          (target.includes("payment") && status.includes("pack")) ||
          (target.includes("pack") && status.includes("payment")) ||
          (target.includes("ship") && (status.includes("dispatch") || status.includes("transit"))) ||
          (target.includes("dispatch") && status.includes("ship"));
      }

      return matchesSearch && matchesStatus;
    });
  }, [orders, q, statusFilter]);

  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  const handleDownloadInvoice = (order: OrderRecord) => {
    const rawLines = order.items ? order.items.split("\n") : [];
    const invoiceLines = rawLines.map((line) => ({
      name: line,
      unit: "Pkt",
      qty: 1,
      price: 0,
      rate: 0,
    }));

    const netVal = Number(String(order.totalAmount).replace(/[^\d.]/g, "")) || 0;
    const invData: InvoiceData = {
      orderId: order.orderId || `NC-${Date.now().toString().slice(-4)}`,
      date: order.timestamp || new Date().toLocaleString("en-IN"),
      name: order.name,
      mobile: order.mobile,
      email: order.email,
      address: order.address,
      city: order.district || "",
      district: order.district || "",
      state: order.state || "",
      pincode: order.pincode || "",
      lines: invoiceLines,
      mrpTotal: Math.round(netVal * 10),
      discount: Math.round(netVal * 9),
      netTotal: netVal,
      totalQty: Number(order.totalQty) || rawLines.length || 1,
    };

    downloadInvoice(invData);
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("deliver")) return "bg-green-100 text-green-800 border-green-300";
    if (s.includes("transit") || s.includes("dispatch") || s.includes("ship"))
      return "bg-amber-100 text-amber-800 border-amber-300";
    if (s.includes("pack") || s.includes("payment"))
      return "bg-indigo-100 text-indigo-800 border-indigo-300";
    if (s.includes("cancel")) return "bg-red-100 text-red-800 border-red-300";
    return "bg-blue-100 text-blue-800 border-blue-300";
  };

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display text-primary sm:text-2xl">
              Live Customer Orders
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active in-progress orders auto-remove upon delivery &middot;
            {dataUpdatedAt > 0 &&
              ` Last synchronized at ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN")}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-gold hover:btn-gold-hover px-4 py-2.5 text-xs flex items-center gap-1.5 shadow disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>{isFetching ? "Syncing..." : "Refresh Orders"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gold/60 bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
            <span>Active Live Orders</span>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            {activeOrdersCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">In-progress orders</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
            <span>Delivered / Done</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-emerald-700">
            {deliveredOrdersCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Completed orders</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Filtered Revenue
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {filteredOrders.length} orders shown
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total in Database
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            {orders.length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {orders.reduce((sum, o) => sum + (Number(o.totalQty) || 0), 0)} items total
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-sm space-y-3">
        {/* Quick View Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "border-input bg-background hover:bg-muted text-muted-foreground"
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
                : "border-input bg-background hover:bg-muted text-muted-foreground"
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
                : "border-input bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, mobile number, district, or order items..."
              className="w-full rounded-md border border-input bg-background px-3.5 py-2 pl-9 text-sm outline-none focus:border-accent"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Specific Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((status) => {
              const active = statusFilter.toLowerCase() === status.toLowerCase();
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "border-input bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {Boolean(error) && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Could not sync live orders:</strong> Make sure the Google Apps Script Web App URL
          is correctly deployed.
          <div className="text-xs opacity-80 mt-1">{String(error)}</div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
          Fetching live orders from Google Apps Script...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredOrders.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          No orders found matching the filter or search query.
        </div>
      )}

      {/* Orders List */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-3.5">
          {filteredOrders.map((o, idx) => {
            const status = o.status || "Confirmed";

            const waText = encodeURIComponent(
              `Vanakkam ${o.name}! 🙏 This is ${settings.name} (Sivakasi). We received your order of ₹${o.totalAmount} (${o.totalQty} items). We are processing your order. Thank you!`,
            );
            const waLink = o.mobile ? `https://wa.me/${waNumber(o.mobile)}?text=${waText}` : null;

            const mailSubject = encodeURIComponent(
              `${settings.name} — Order Confirmation (₹${o.totalAmount})`,
            );
            const mailBody = encodeURIComponent(
              `Vanakkam ${o.name},\n\nThank you for your enquiry with ${settings.name}.\n\nOrder Items:\n${o.items}\n\nTotal Items: ${o.totalQty}\nTotal Amount: ₹${o.totalAmount}\n\nDelivery Address:\n${o.address}, ${o.district}, ${o.state} - ${o.pincode}\n\n— ${settings.name}`,
            );
            const mailLink = o.email
              ? `mailto:${o.email}?subject=${mailSubject}&body=${mailBody}`
              : null;

            return (
              <div
                key={`${o.timestamp}-${idx}`}
                className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-gold/60"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-base sm:text-lg text-primary">
                        {o.name || "Customer"}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-accent/20 text-accent-foreground border border-gold/40">
                        ₹{o.totalAmount}
                      </span>
                      {o.orderId && (
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          ({o.orderId})
                        </span>
                      )}
                      {o.isDemo && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                      <span>📅 {o.timestamp}</span>
                      <span>&middot;</span>
                      <span>📦 {o.totalQty} items ordered</span>
                    </div>
                  </div>

                  {/* Status dropdown & direct actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={status}
                      onChange={(e) => {
                        if (onUpdateOrderStatus) {
                          const orderKey = o.orderId || `${o.timestamp}-${idx}`;
                          onUpdateOrderStatus(orderKey, e.target.value, o);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold border outline-none cursor-pointer ${getStatusBadgeStyle(
                        status,
                      )}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-[#25D366] text-white hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {mailLink && (
                      <a
                        href={mailLink}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(o)}
                      className="px-3 py-1.5 text-xs font-semibold rounded border border-input bg-secondary hover:bg-muted text-foreground flex items-center gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5 text-primary" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* Customer Information */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">{o.mobile || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{o.email || "—"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">
                        {o.address}, {o.district}, {o.state} - {o.pincode}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="rounded-lg bg-secondary/80 border border-border p-2.5">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/60 text-[11px] font-bold text-primary uppercase tracking-wide">
                      <span>Ordered Items</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 lowercase"
                      >
                        expand view <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 max-h-24 overflow-y-auto leading-relaxed">
                      {o.items}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Order Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 overflow-y-auto"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gold/60 bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-display font-bold text-lg text-primary">
                  Order Details — {selectedOrder.name}
                </h3>
                <p className="text-xs text-muted-foreground">{selectedOrder.timestamp}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-gold/60 bg-secondary p-3.5 flex justify-between items-center">
                <div>
                  <div className="text-muted-foreground text-[11px] uppercase">
                    Total Order Value
                  </div>
                  <div className="text-2xl font-bold font-display text-primary">
                    ₹{selectedOrder.totalAmount}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground text-[11px] uppercase">Total Quantity</div>
                  <div className="text-lg font-bold text-foreground">
                    {selectedOrder.totalQty} items
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-1">Customer & Delivery Info</h4>
                <p>
                  <strong>Mobile:</strong> {selectedOrder.mobile}
                </p>
                <p>
                  <strong>Email:</strong> {selectedOrder.email}
                </p>
                <p>
                  <strong>Address:</strong> {selectedOrder.address}, {selectedOrder.district},{" "}
                  {selectedOrder.state} - {selectedOrder.pincode}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-1">Full Items Breakdown</h4>
                <pre className="whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs border border-border leading-relaxed">
                  {selectedOrder.items}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadInvoice(selectedOrder)}
                className="btn-gold hover:btn-gold-hover px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Download Invoice PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
