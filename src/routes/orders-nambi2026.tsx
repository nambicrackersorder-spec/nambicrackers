import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APPS_SCRIPT_URL, SHOP } from "@/config";

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

const STATUSES = ["Confirmed", "Payment Completed", "Shipped", "Delivered"] as const;
type OrderStatus = (typeof STATUSES)[number];

const STATUS_STYLES: Record<OrderStatus, string> = {
  Confirmed: "border-amber-200 bg-amber-50 text-amber-800",
  "Payment Completed": "border-indigo-200 bg-indigo-50 text-indigo-800",
  Shipped: "border-blue-200 bg-blue-50 text-blue-800",
  Delivered: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

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
  const {
    data: orders,
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 30000,
  });
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "updateStatus", orderId, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not update status");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const totalRevenue = (orders ?? []).reduce(
    (sum, o) => sum + (Number(String(o.totalAmount).replace(/[^\d.]/g, "")) || 0),
    0,
  );

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
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{orders?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
          {STATUSES.map((status) => (
            <span key={status} className={`rounded-full border px-3 py-1 ${STATUS_STYLES[status]}`}>
              {status}:{" "}
              {(orders ?? []).filter((order) => (order.status || "Confirmed") === status).length}
            </span>
          ))}
        </div>

        {isLoading && <p className="py-16 text-center text-muted-foreground">Loading orders…</p>}
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
            const status = (
              STATUSES.includes((o.status || "Confirmed") as OrderStatus) ? o.status : "Confirmed"
            ) as OrderStatus;
            const waText = encodeURIComponent(
              `Vanakkam ${o.name}! 🙏 This is ${SHOP.name} (Sivakasi). We received your order of ₹${o.totalAmount} (${o.totalQty} items). We will confirm delivery shortly. Thank you!`,
            );
            const waLink = o.mobile ? `https://wa.me/${waNumber(o.mobile)}?text=${waText}` : null;
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
                key={`${o.timestamp}-${i}`}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      {o.name || "Customer"}
                      <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                        ₹{o.totalAmount}
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">{o.timestamp}</p>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                    <select
                      value={status}
                      disabled={statusMutation.isPending}
                      onChange={(event) =>
                        statusMutation.mutate({
                          orderId: o.orderId,
                          status: event.target.value as OrderStatus,
                        })
                      }
                      aria-label={`Update status for ${o.orderId}`}
                      className={`col-span-2 w-full rounded-md border px-3 py-2 text-sm font-semibold outline-none sm:col-span-1 sm:w-auto ${STATUS_STYLES[status]}`}
                    >
                      {STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full rounded-md bg-[#25D366] px-3 py-2 text-center text-sm font-semibold text-white shadow hover:opacity-90 sm:w-auto"
                      >
                        WhatsApp
                      </a>
                    )}
                    {mailLink && (
                      <a
                        href={mailLink}
                        className="w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground shadow hover:opacity-90 sm:w-auto"
                      >
                        Email
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <p>📱 {o.mobile || "—"}</p>
                    <p>✉️ {o.email || "—"}</p>
                    <p>
                      📍 {o.address}, {o.district}, {o.state} - {o.pincode}
                    </p>
                    <p className="font-semibold">Total Qty: {o.totalQty}</p>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm leading-relaxed">
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
