import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingActions } from "@/components/FloatingActions";
import { ProductTable } from "@/components/ProductTable";
import { CATEGORIES, ALL_PRODUCTS } from "@/data/products";
import { SHOP } from "@/config";
import { Cart, type CartLine } from "@/components/Cart";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buy Crackers Online India | Nambi Crackers Sivakasi 90% Off" },
      {
        name: "description",
        content:
          "Buy crackers online in India from Nambi Crackers, Sivakasi. Full 2026 price list with 90% off MRP, safe packing and pan-India delivery.",
      },
      { property: "og:title", content: "Buy Crackers Online India | Nambi Crackers Sivakasi" },
      {
        property: "og:description",
        content:
          "Crackers discount at 90%. Browse the full price list and order online from Sivakasi for delivery across India.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.nambicrackers.in/" }],
  }),
  component: Index,
});

function Index() {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [done, setDone] = useState<InvoiceData | null>(null);

  const lines: CartLine[] = useMemo(
    () =>
      ALL_PRODUCTS.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ ...p, qty: qty[p.id] ?? 0 })),
    [qty],
  );

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const netTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const q = query.trim().toLowerCase();
  const categories = q
    ? CATEGORIES.map((c) => ({
        ...c,
        products: c.products.filter(
          (p) => p.name.toLowerCase().includes(q) || p.tamil.includes(query.trim()),
        ),
      })).filter((c) => c.products.length)
    : CATEGORIES;

  const setValue = (id: number, v: number) =>
    setQty((s) => ({ ...s, [id]: Number.isFinite(v) && v > 0 ? Math.floor(v) : 0 }));

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />

      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-7 text-center">
          <img
            src="/logo.png"
            alt="Nambi Crackers Sivakasi"
            className="mx-auto h-28 w-28 rounded-full object-contain sm:h-36 sm:w-36"
          />
          <h1 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">
            Crackers Discount at 90%
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{SHOP.address}</p>
          <p className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
            Minimum order Rs {SHOP.minOrder}
          </p>
        </div>
      </section>

      <div className="sticky top-[56px] z-20 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Here"
          className="mx-auto block w-full max-w-5xl rounded-md border border-input bg-card px-3 py-2.5 text-base outline-none focus:border-accent"
        />
      </div>

      <main className="mx-auto max-w-5xl px-2 py-4 sm:px-4">
        {categories.map((cat) => {
          const slug = cat.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
          return (
            <section key={cat.name} id={`cat-${slug}`} className="mb-5 scroll-mt-32">
              <div className="cat-bar rounded-t-md px-3 py-3 text-sm font-bold sm:text-base">
                {cat.name}
              </div>
              <ProductTable cat={cat} qty={qty} setValue={setValue} />
            </section>
          );
        })}

        {categories.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">No products found.</p>
        )}
      </main>

      <SiteFooter />

      <FloatingActions totalQty={totalQty} onCart={() => setShowCart(true)} />

      {/* Bottom order bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-2.5 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 leading-tight">
            <div className="text-xs text-muted-foreground">Total Items {totalQty}</div>
            <div className="text-lg font-bold text-primary">Total Price: Rs {netTotal}</div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="btn-gold hover:btn-gold-hover ml-auto px-6 py-3 text-sm"
          >
            Order Now
          </button>
        </div>
      </div>

      {showCart && (
        <Cart
          lines={lines}
          setQty={setValue}
          clear={() => setQty({})}
          onClose={() => setShowCart(false)}
          onDone={(data) => {
            setShowCart(false);
            setDone(data);
          }}
        />
      )}

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-bold">Enquiry Submitted Successfully!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you! Your enquiry has been received.
            </p>
            <div className="mt-4 rounded-xl border border-gold/60 bg-secondary px-4 py-4">
              <div className="text-xs text-muted-foreground">
                Order ID: <span className="font-semibold text-primary">{done.orderId}</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-2xl font-extrabold text-primary">
                Rs {done.netTotal.toLocaleString("en-IN")}
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Our team will verify your enquiry and contact you via email or WhatsApp with payment
              and delivery details. The invoice has been emailed to you.
            </p>
            <button
              onClick={() => downloadInvoice(done)}
              className="btn-gold hover:btn-gold-hover mt-5 w-full py-3 text-sm"
            >
              Download Invoice PDF
            </button>
            <button
              onClick={() => setDone(null)}
              className="mt-2 w-full rounded-md border border-input py-2.5 text-sm font-semibold"
            >
              Shop More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
