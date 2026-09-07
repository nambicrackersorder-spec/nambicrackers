import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingActions } from "@/components/FloatingActions";
import { ProductTable } from "@/components/ProductTable";
import { CATEGORIES, ALL_PRODUCTS } from "@/data/products";
import { Cart, type CartLine } from "@/components/Cart";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Sparklers, Flower Pots & Sky Shots Online India | Nambi Crackers" },
      {
        name: "description",
        content:
          "Buy sparklers, flower pots, sky shots, rockets and gift box crackers online in India from Nambi Crackers, Sivakasi.",
      },
      { property: "og:title", content: "Sparklers, Flower Pots & Sky Shots Online India | Nambi Crackers" },
      {
        property: "og:description",
        content: "Explore crackers categories with 90% off MRP and delivery across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.nambicrackers.in/categories" }],
  }),
  component: Categories,
});

function Categories() {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showCart, setShowCart] = useState(false);
  const [done, setDone] = useState<InvoiceData | null>(null);

  const lines: CartLine[] = useMemo(
    () =>
      ALL_PRODUCTS.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ ...p, qty: qty[p.id] ?? 0 })),
    [qty],
  );

  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const netTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const setValue = (id: number, v: number) =>
    setQty((s) => ({ ...s, [id]: Number.isFinite(v) && v > 0 ? Math.floor(v) : 0 }));

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-2 py-6 sm:px-4">
        <h1 className="px-2 text-2xl font-bold text-primary sm:text-3xl">Categories</h1>
        <p className="mt-2 px-2 text-sm text-muted-foreground">
          Tap a category to reveal its products and add them to your cart.
        </p>

        <div className="mt-5">
          {CATEGORIES.map((cat) => {
            const isOpen = open[cat.name] ?? false;
            return (
              <section key={cat.name} className="mb-3">
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [cat.name]: !isOpen }))}
                  aria-expanded={isOpen}
                  className="cat-bar flex w-full items-center justify-between gap-2 rounded-md px-3 py-3 text-sm font-bold sm:text-base"
                >
                  <span className="text-left">{cat.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold opacity-80">
                      {cat.products.length} items
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen && <ProductTable cat={cat} qty={qty} setValue={setValue} />}
              </section>
            );
          })}
        </div>
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
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Enquiry Number
              </div>
              <div className="text-2xl font-bold text-green-700">{done.orderId}</div>
              <div className="mt-1 text-sm">Total: Rs {done.netTotal}</div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Our team will verify your enquiry and contact you via email or WhatsApp with payment
              and delivery details. The invoice has been emailed to you. Please check your spam or
              junk folder if you do not see it.
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
