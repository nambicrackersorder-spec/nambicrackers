import React, { useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Clock,
  ArrowRight,
  Sparkles,
  DollarSign,
  Truck,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { SHOP } from "@/config";
import type { AdminTab } from "./AdminLayout";
import { useCatalog, useSettings } from "@/lib/catalog-store";

export interface OrderRecord {
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
  isDemo?: boolean;
}

interface AdminDashboardTabProps {
  orders: OrderRecord[];
  isLoading: boolean;
  onNavigateTab: (tab: AdminTab) => void;
  onOpenAddProduct: () => void;
  onSelectOrder?: (order: OrderRecord) => void;
}

function waNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Check if format is like DD/MM/YYYY or contains today's date formatted
      const now = new Date();
      const todayString = now.toLocaleDateString("en-IN");
      return dateStr.includes(todayString);
    }
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

export function AdminDashboardTab({
  orders,
  isLoading,
  onNavigateTab,
  onOpenAddProduct,
  onSelectOrder,
}: AdminDashboardTabProps) {
  const { categories, products } = useCatalog();
  const { settings } = useSettings();

  // Total metrics from real database orders
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  // Today's metrics calculated from actual order timestamps
  const todayOrders = orders.filter((o) => isToday(o.timestamp));
  const todaySales = todayOrders.reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  // Status breakdown
  const liveOrders = orders.filter((o) => {
    const s = (o.status || "Order Confirmed").toLowerCase();
    return !s.includes("deliver") && !s.includes("cancel");
  });

  const pendingOrders = orders.filter((o) => {
    const s = (o.status || "Order Confirmed").toLowerCase();
    return s.includes("order confirmed") || s.includes("confirm") || s.includes("pending");
  });

  const paymentCompletedOrders = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return s.includes("payment") && !s.includes("cancel") && !s.includes("deliver");
  });

  const packingOrders = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return s.includes("pack") && !s.includes("payment") && !s.includes("cancel") && !s.includes("deliver");
  });

  const inTransitOrders = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return s.includes("transit") || s.includes("dispatch") || s.includes("ship");
  });

  const deliveredOrders = orders.filter((o) => {
    const s = (o.status || "").toLowerCase();
    return s.includes("deliver");
  });

  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Extract Top Selling Products from actual order records
  const topSellingProducts = useMemo(() => {
    const counter: Record<string, { name: string; qty: number; total: number }> = {};

    orders.forEach((o) => {
      if (!o.items) return;
      const lines = o.items.split("\n");
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        // Format can be "1000 Wala x 2 Pkt = Rs.320" or just product name
        const match = trimmed.match(/^(.*?)\s+x\s+(\d+)/i);
        if (match && match[1] && match[2]) {
          const name = match[1].trim();
          const qty = parseInt(match[2], 10) || 1;
          if (!counter[name]) counter[name] = { name, qty: 0, total: 0 };
          counter[name].qty += qty;
        } else {
          const name = trimmed;
          if (!counter[name]) counter[name] = { name, qty: 0, total: 0 };
          counter[name].qty += 1;
        }
      });
    });

    return Object.values(counter)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // Recent 5 orders
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="surface-royal rounded-xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="cart-sheen-overlay" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Diwali 2026 Direct Sivakasi Portal</span>
            </div>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
              Welcome back to {settings.name} Admin
            </h2>
            <p className="mt-1 text-sm text-primary-foreground/90 max-w-xl">
              Factory price list with {settings.discount}% off discount. Monitor real-time orders, manage product
              rates, and track shipments directly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="btn-gold hover:btn-gold-hover px-4 py-2.5 text-xs flex items-center gap-1.5 shadow"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Product</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("orders")}
              className="px-4 py-2.5 text-xs font-semibold rounded-md border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="h-4 w-4 text-amber-300" />
              <span>Live Orders ({liveOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="rounded-xl border border-gold/60 bg-card p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Total Revenue
            </span>
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-primary">
              <DollarSign className="h-4 w-4 text-primary" />
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-display text-primary">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>{settings.discount}% factory pricing discount</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Total Orders
            </span>
            <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-display text-primary">
            {orders.length}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-amber-700 font-semibold">{liveOrders.length} active live</span>
            <span>&middot;</span>
            <span className="text-emerald-700 font-semibold">
              {deliveredOrders.length} delivered
            </span>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Today's Orders
            </span>
            <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary">
              <Calendar className="h-4 w-4 text-primary" />
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-display text-primary">
            {todayOrders.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground font-semibold">
            Today's Sales: ₹{todaySales.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Products & Categories */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Active Catalog
            </span>
            <span className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-primary">
              <Package className="h-4 w-4 text-primary" />
            </span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-display text-primary">
            {products.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Across {categories.length} categories
          </div>
        </div>
      </div>

      {/* Order Pipeline & Top Selling Crackers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Status Distribution */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-primary">Order Pipeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status across customer orders
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/80 border border-blue-100">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">Order Confirmed</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200/80 text-blue-800">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50/80 border border-violet-100">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-semibold text-violet-900">Payment Completed</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-200/80 text-violet-800">
                  {paymentCompletedOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-900">Packaging Finished</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200/80 text-indigo-800">
                  {packingOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 border border-amber-100">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-900">Shipped</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/80 text-amber-800">
                  {inTransitOrders.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/80 border border-green-100">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-900">Delivered</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-200/80 text-green-800">
                  {deliveredOrders.length}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("orders")}
            className="mt-4 w-full py-2 text-xs font-semibold text-primary hover:text-accent-foreground border border-input rounded-md bg-secondary hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Manage All Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Top Selling Products from real order records */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-primary">Top Selling Products</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Most popular items ordered by customers
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("products")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View Full Catalog →
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {topSellingProducts.length > 0 ? (
              topSellingProducts.map((p, idx) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-accent/20 text-primary font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-foreground">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                      {p.qty} ordered
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No order line items recorded yet. Top selling items will rank dynamically as orders arrive.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="cat-bar px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-amber-300" />
            <span className="font-display font-bold text-sm tracking-wide text-white">
              Recent Live Enquiries & Orders
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab("orders")}
            className="text-xs font-semibold text-amber-200 hover:text-white flex items-center gap-1"
          >
            <span>View All ({orders.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-3 sm:p-4">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading recent orders...
            </div>
          )}

          {!isLoading && recentOrders.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No orders received yet. New website enquiries will appear here automatically.
            </div>
          )}

          {!isLoading && recentOrders.length > 0 && (
            <div className="divide-y divide-border">
              {recentOrders.map((o, idx) => {
                const waLink = o.mobile
                  ? `https://wa.me/${waNumber(o.mobile)}?text=${encodeURIComponent(
                      `Vanakkam ${o.name}! 🙏 This is ${settings.name || SHOP.name} Sivakasi regarding your order of ₹${o.totalAmount}.`,
                    )}`
                  : null;

                const status = o.status || "Order Confirmed";
                const isDelivered = status.toLowerCase().includes("deliver");
                const isInTransit = status.toLowerCase().includes("transit") || status.toLowerCase().includes("dispatch");
                const isPacking = status.toLowerCase().includes("pack");

                return (
                  <div
                    key={`${o.timestamp}-${idx}`}
                    className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0 hover:bg-secondary/40 rounded-lg px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-primary">
                          {o.name || "Customer"}
                        </span>
                        <span className="text-xs font-bold text-foreground">₹{o.totalAmount}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDelivered
                              ? "bg-green-100 text-green-700"
                              : isInTransit
                                ? "bg-amber-100 text-amber-700"
                                : isPacking
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{o.timestamp}</span>
                        <span>&middot;</span>
                        <span>{o.mobile || "No Mobile"}</span>
                        <span>&middot;</span>
                        <span>{o.district || o.state || "India"}</span>
                        <span>&middot;</span>
                        <span className="text-primary font-medium">{o.totalQty} items</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-[#25D366] text-white hover:opacity-90 flex items-center gap-1 shadow-sm"
                        >
                          WhatsApp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectOrder) onSelectOrder(o);
                          onNavigateTab("orders");
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded border border-input bg-card hover:bg-muted text-foreground"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
