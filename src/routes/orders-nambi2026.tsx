import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APPS_SCRIPT_URL, SHOP } from "@/config";

export const Route = createFileRoute("/orders-nambi2026")({
  head: () => ({
    meta: [
      { title: "Live Orders Dashboard — Nambi Crackers" },
      { name: "description", content: "Live view of all Nambi Crackers orders received from the website." },
      { property: "og:title", content: "Live Orders Dashboard — Nambi Crackers" },
      { property: "og:description", content: "Live view of all Nambi Crackers orders received from the website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersDashboard,
});

type Order = {
  timestamp: string;
  orderId: string;
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
};

const STATUS_OPTIONS = ["Confirmed", "In Transit", "Delivered"] as const;

const parseOrderItems = (items: string) =>
  items
    .split(/\|\s*|\n/)
    .map((item) => item.trim())
    .filter(Boolean);

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=list`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to load orders");
  return data.orders as Order[];
}

function waNumber(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function OrdersDashboard() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading, error, refetch, isFetching, dataUpdatedAt } =
    useQuery({
      queryKey: ["orders"],
      queryFn: fetchOrders,
      refetchInterval: 30000,
    });

  const totalRevenue = (orders ?? []).reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

  const statusCounts = {
    Confirmed: (orders ?? []).filter((o) => (o.status || "Confirmed") === "Confirmed").length,
    "In Transit": (orders ?? []).filter((o) => (o.status || "Confirmed") === "In Transit").length,
    Delivered: (orders ?? []).filter((o) => (o.status || "Confirmed") === "Delivered").length,
  };

  const updateStatus = async (orderId: string, status: string) => {
    const response = await fetch(`${APPS_SCRIPT_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", orderId, status }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Status update failed");
    queryClient.setQueryData<Order[]>(["orders"], (current) =>
      (current ?? []).map((order) =>
        order.orderId === orderId ? { ...order, status } : order,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide sm:text-2xl">
              📋 Live Orders — {SHOP.name}
            </h1>
            <p className="text-xs opacity-90">
              Auto-refreshes every 30s
              {dataUpdatedAt > 0 &&
                ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-IN")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow hover:opacity-90"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              to="/"
              className="rounded-md border border-primary-foreground/40 px-4 py-2 text-sm font-semibold hover:bg-primary-foreground/10"
            >
              ← Shop
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{orders?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">₹{totalRevenue.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{statusCounts.Confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{statusCounts.Delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>

        {isLoading && (
          <p className="py-16 text-center text-muted-foreground">Loading orders…</p>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load orders. Make sure you pasted the latest Code.gs and deployed a
            <strong> new version</strong> of the web app.
            <br />
            <span className="text-xs opacity-80">{String(error)}</span>
          </div>
        )}
        {orders && orders.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">
            No orders yet — new orders will appear here automatically.
          </p>
        )}

        <div className="space-y-4">
          {(orders ?? []).map((o, i) => {
            const currentStatus = o.status || "Confirmed";
            const itemRows = parseOrderItems(o.items);
            const waText = encodeURIComponent(
              `Vanakkam ${o.name}! 🙏 This is ${SHOP.name} (Sivakasi). We received your order of ₹${o.totalAmount} (${o.totalQty} items). We will confirm delivery shortly. Thank you!`,
            );
            const waLink = o.mobile
              ? `https://wa.me/${waNumber(o.mobile)}?text=${waText}`
              : null;
            const mailSubject = encodeURIComponent(
              `${SHOP.name} — Order Confirmation (₹${o.totalAmount})`,
            );
            const mailBody = encodeURIComponent(
              `Vanakkam ${o.name},\n\nThank you for your order with ${SHOP.name}.\n\nOrder Items:\n${o.items}\n\nTotal Qty: ${o.totalQty}\nTotal Amount: ₹${o.totalAmount}\n\nDelivery Address:\n${o.address}, ${o.district}, ${o.state} - ${o.pincode}\n\nWe will contact you shortly to confirm.\n\n— ${SHOP.name}\n${SHOP.address}\nPh: ${SHOP.phoneDisplay}`,
            );
            const mailLink = o.email
              ? `mailto:${o.email}?subject=${mailSubject}&body=${mailBody}`
              : null;

            return (
              <article
                key={`${o.orderId || o.timestamp}-${i}`}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-primary">{o.name || "Customer"}</h2>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        ₹{o.totalAmount}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.timestamp} • {o.orderId || "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-[#25D366] px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
                      >
                        WhatsApp
                      </a>
                    )}
                    {mailLink && (
                      <a
                        href={mailLink}
                        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1.8fr]">
                  <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Delivery status
                      </p>
                      <select
                        value={currentStatus}
                        onChange={async (event) => {
                          const nextStatus = event.target.value;
                          try {
                            await updateStatus(o.orderId || o.name, nextStatus);
                          } catch (error) {
                            console.error(error);
                          }
                        }}
                        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-foreground">
                      <p>📱 {o.mobile || "—"}</p>
                      <p>✉️ {o.email || "—"}</p>
                      <p>
                        📍 {o.address || "—"}, {o.district || "—"}, {o.state || "—"} - {o.pincode || "—"}
                      </p>
                    </div>
                    <div className="rounded-md bg-background px-2.5 py-2 font-medium text-primary">
                      Total Qty: {o.totalQty}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Items</p>
                      <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {currentStatus}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {itemRows.map((item, idx) => (
                        <li
                          key={`${o.orderId || o.name}-${idx}`}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
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
      </main>
    </div>
  );
}
