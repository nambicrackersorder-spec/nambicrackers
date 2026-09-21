import React, { useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  DollarSign,
  ShoppingBag,
  MapPin,
  Sparkles,
  Award,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import type { OrderRecord } from "./AdminDashboardTab";
import type { Category, Product } from "@/lib/catalog-store";
import { useCatalog } from "@/lib/catalog-store";

interface AdminAnalyticsTabProps {
  orders: OrderRecord[];
  categories?: Category[];
  products?: Product[];
}

const BRAND_COLORS = [
  "#781d28", // Royal maroon / primary
  "#d97706", // Gold / amber
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#2563eb", // Royal blue
  "#7c3aed", // Purple
  "#dc2626", // Crimson
];

export function AdminAnalyticsTab({
  orders,
  categories: propCategories,
  products: propProducts,
}: AdminAnalyticsTabProps) {
  const { categories: hookCategories, products: hookProducts } = useCatalog();
  const currentCategories = propCategories || hookCategories;
  const currentProducts = propProducts || hookProducts;

  const totalRevenue = orders.reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Real Category Distribution from active catalog
  const categoryStats = useMemo(() => {
    return currentCategories
      .map((c) => ({
        name: c.name.length > 18 ? `${c.name.slice(0, 16)}...` : c.name,
        fullName: c.name,
        count: c.products.length,
        estimatedValue: c.products.reduce((s, p) => s + p.price, 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [currentCategories]);

  // Real Order Status Breakdown
  const statusCounts = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        const s = o.status || "Order Confirmed";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [orders]);

  const pieData = useMemo(() => {
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [statusCounts]);

  // Real Geographic Distribution from orders
  const topLocations = useMemo(() => {
    const locationCounts = orders.reduce(
      (acc, o) => {
        const loc = o.district?.trim() || o.state?.trim() || "Tamil Nadu";
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [orders]);

  // Real Day-of-Week Revenue aggregation from actual orders
  const revenueHistory = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTotals: Record<string, number> = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
    };

    orders.forEach((o) => {
      const amount = Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0;
      if (!o.timestamp) {
        dayTotals.Mon += amount;
        return;
      }
      try {
        const d = new Date(o.timestamp);
        if (!isNaN(d.getTime())) {
          const dayName = days[d.getDay()];
          if (dayName) dayTotals[dayName] += amount;
        } else {
          // If unparseable, distribute proportionally to Monday
          dayTotals.Mon += amount;
        }
      } catch {
        dayTotals.Mon += amount;
      }
    });

    // Return chronological Mon -> Sun
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      sales: dayTotals[day] || 0,
    }));
  }, [orders]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold font-display text-primary sm:text-2xl">
          Sales & Catalogue Analytics
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time performance metrics, customer geographical breakdown, and product distribution.
        </p>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gold/60 bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total Sales Value
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
            90% Off Sivakasi direct
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Average Basket Size
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            ₹{avgOrderValue.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {orders.length} total customer {orders.length === 1 ? "order" : "orders"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total Products
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            {currentProducts.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            In {currentCategories.length} categories
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Delivery Reach
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            {topLocations.length > 0 ? `${topLocations.length} Regions` : "Pan-India"}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">
            All states & districts
          </div>
        </div>
      </div>

      {/* Charts Row 1: Weekly Revenue & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary">
                Weekly Revenue Activity
              </h3>
              <p className="text-xs text-muted-foreground">Actual enquiry sales volume (₹)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent-foreground border border-gold/40">
              Live Orders
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#781d28" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `₹${val / 1000}k` : `₹${val}`)}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `₹${Number(value || 0).toLocaleString("en-IN")}`,
                    "Sales",
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#781d28"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-primary">Order Fulfillment</h3>
            <p className="text-xs text-muted-foreground">Proportion of order pipeline</p>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: "No Orders", value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.length > 0 ? (
                      pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BRAND_COLORS[index % BRAND_COLORS.length]}
                        />
                      ))
                    ) : (
                      <Cell fill="#e5e7eb" />
                    )}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
            {pieData.length > 0 ? (
              pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }}
                  />
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="font-bold text-foreground ml-auto">{item.value}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-xs text-muted-foreground py-1">
                No order status records yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Category Product Counts & Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category breakdown bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <h3 className="font-display font-bold text-base text-primary">
            Catalogue Products per Category
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Total variety offered in each cracker section
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryStats.slice(0, 8)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(value: any) => [`${value} items`, "Count"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#781d28" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Delivery Locations */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-display font-bold text-base text-primary">Top Customer Regions</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Highest ordering districts & states</p>

          <div className="space-y-3">
            {topLocations.length > 0 ? (
              topLocations.map((loc, idx) => (
                <div
                  key={loc.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/70 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-accent/20 text-primary font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                      {loc.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-card text-primary border border-border">
                    {loc.count} {loc.count === 1 ? "order" : "orders"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No location data yet. Orders will build regional stats automatically.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
