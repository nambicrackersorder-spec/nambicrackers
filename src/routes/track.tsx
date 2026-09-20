import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Search, Truck, PackageCheck } from "lucide-react";
import { APPS_SCRIPT_URL, SHOP } from "@/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CrackerLoader } from "@/components/CrackerLoader";

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
        content: "Check the live delivery status of your Nambi Crackers order by order ID or mobile number.",
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

const parseOrderItems = (items: string) =>
  items
    .split(/\|\s*|\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const STEPS = [
  { key: "Confirmed", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "In Transit", label: "In Transit", icon: Truck },
  { key: "Delivered", label: "Delivered", icon: PackageCheck },
];

function TrackPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TrackResult[] | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return setError("Please enter your order ID or mobile number.");
    setError("");
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(
        `${APPS_SCRIPT_URL}?action=track&query=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Lookup failed");
      const orders = (data.orders ?? []) as TrackResult[];
      setResults(orders);
      if (orders.length === 0)
        setError("No order found for that order ID or mobile number.");
    } catch {
      setError("Could not check your order right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-center font-display text-2xl font-bold text-primary sm:text-3xl">
          Track Your Order
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the order ID from your invoice (example NC-1234) or the mobile
          number you ordered with.
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
            const current = Math.max(
              0,
              STEPS.findIndex((s) => s.key === (o.status || "Confirmed")),
            );
            const itemRows = parseOrderItems(o.items);
            return (
              <article
                key={o.orderId}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="border-b border-border bg-muted/40 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Order ID
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-primary">{o.orderId}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.name} &middot; {o.timestamp}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Total
                      </p>
                      <p className="mt-1 text-2xl font-bold text-primary">₹{o.totalAmount}</p>
                      <p className="text-xs text-muted-foreground">{o.totalQty} items</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Order status</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {o.status || "Confirmed"}
                    </span>
                  </div>

                  <ol className="space-y-3">
                    {STEPS.map((s, i) => {
                      const done = i <= current;
                      const Icon = done ? s.icon : Circle;
                      return (
                        <li key={s.key} className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`text-sm ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                          >
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">View items</p>
                      <span className="text-xs text-muted-foreground">{itemRows.length} items</span>
                    </div>
                    <ul className="space-y-2">
                      {itemRows.map((item, idx) => (
                        <li
                          key={`${o.orderId}-${idx}`}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Need help? Call {SHOP.phoneDisplay} or WhatsApp us.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
