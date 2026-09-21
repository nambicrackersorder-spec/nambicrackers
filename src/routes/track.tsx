import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  Search,
  Truck,
  PackageCheck,
  Layers,
  Ban,
  Clock,
} from "lucide-react";
import { APPS_SCRIPT_URL, SHOP } from "@/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CrackerLoader } from "@/components/CrackerLoader";
import { useOrderStatusMap, useSettings } from "@/lib/catalog-store";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Nambi Crackers" },
      {
        name: "description",
        content:
          "Track your Nambi Crackers order by order ID or mobile number to see confirmation, dispatch and delivery status.",
      },
      { property: "og:title", content: "Track Your Order — Nambi Crackers" },
      {
        property: "og:description",
        content:
          "Check the live delivery status of your Nambi Crackers order by order ID or mobile number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.nambicrackers.in/track" }],
  }),
  component: TrackPage,
});

type TrackResult = {
  orderId: string;
  name: string;
  timestamp: string;
  totalQty: string;
  totalAmount: string;
  status: string;
  items: string;
};

const STEPS = [
  { key: "Order Confirmed", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "Payment Completed", label: "Payment Completed", icon: Layers },
  { key: "Packaging Finished", label: "Packaging Finished", icon: PackageCheck },
  { key: "Shipped", label: "Shipped / In Transit", icon: Truck },
  { key: "Delivered", label: "Delivered", icon: PackageCheck },
];

function getStepIndex(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return 4;
  if (s.includes("transit") || s.includes("dispatch") || s.includes("ship")) return 3;
  if (s.includes("pack") || s.includes("packaging")) return 2;
  if (s.includes("payment")) return 1;
  return 0;
}

function TrackPage() {
  const { settings } = useSettings();
  const { statusMap } = useOrderStatusMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawResults, setRawResults] = useState<TrackResult[] | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return setError("Please enter your order ID or mobile number.");
    setError("");
    setLoading(true);
    setRawResults(null);
    try {
      const endpoint = settings.scriptUrl || APPS_SCRIPT_URL;
      const res = await fetch(`${endpoint}?action=track&query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Lookup failed");
      const orders = (data.orders ?? []) as TrackResult[];
      setRawResults(orders);
      if (orders.length === 0) setError("No order found for that order ID or mobile number.");
    } catch {
      setError("Could not check your order right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const results = useMemo(() => {
    if (!rawResults) return null;
    return rawResults.map((o, idx) => {
      const key = o.orderId || `${o.timestamp}-${idx}`;
      const overriddenStatus =
        (o.orderId && statusMap[o.orderId]) ||
        statusMap[key] ||
        (o.timestamp && statusMap[`${o.timestamp}-${o.name || ""}`]) ||
        o.status ||
        "Order Confirmed";
      return {
        ...o,
        status: overriddenStatus,
      };
    });
  }, [rawResults, statusMap]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-center font-display text-2xl font-bold text-primary sm:text-3xl">
          Track Your Order
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the order ID from your invoice (example NC-1234) or the mobile number you ordered
          with.
        </p>

        <form onSubmit={search} className="mx-auto mt-6 flex max-w-lg gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID or mobile number"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-gold hover:btn-gold-hover flex items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {loading ? "Checking..." : "Track"}
          </button>
        </form>

        {loading && (
          <div className="mt-10 flex justify-center">
            <CrackerLoader variant="track" label="Fetching your order status..." />
          </div>
        )}

        {error && (
          <p className="mx-auto mt-4 max-w-lg rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 space-y-5">
          {(results ?? []).map((o) => {
            const isCancelled = (o.status || "").toLowerCase().includes("cancel");
            const currentStep = getStepIndex(o.status || "Order Confirmed");

            return (
              <article
                key={o.orderId}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{o.orderId}</h2>
                    <p className="text-xs text-muted-foreground">
                      {o.name} &middot; {o.timestamp}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold">Rs {o.totalAmount}</p>
                    <p className="text-xs text-muted-foreground">{o.totalQty} items</p>
                  </div>
                </div>

                {isCancelled ? (
                  <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-center gap-2 text-sm font-semibold">
                    <Ban className="h-5 w-5 text-red-600" />
                    <span>This order has been marked as Cancelled.</span>
                  </div>
                ) : (
                  <ol className="mt-5 space-y-4">
                    {STEPS.map((s, i) => {
                      const done = i <= currentStep;
                      const Icon = done ? s.icon : Circle;
                      return (
                        <li key={s.key} className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              done
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`text-sm ${done ? "font-bold text-primary" : "text-muted-foreground"}`}
                          >
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <details className="mt-4 pt-2 border-t border-border">
                  <summary className="cursor-pointer text-xs font-semibold text-primary">
                    View Ordered Items
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/80 p-3 text-xs border border-border leading-relaxed font-sans">
                    {o.items}
                  </pre>
                </details>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Need help? Call {settings.phoneDisplay || SHOP.phoneDisplay} or WhatsApp us.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
