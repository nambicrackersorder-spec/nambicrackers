import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { APPS_SCRIPT_URL, SHOP } from "@/config";
import type { Product } from "@/data/products";
import { invoiceBase64, makeOrderId, type InvoiceData } from "@/lib/invoice";
import { QtyControl } from "./ProductTable";
import { CrackerLoader } from "./CrackerLoader";
import { productImageUrl } from "@/lib/product-image";

export type CartLine = Product & { qty: number };

type Props = {
  lines: CartLine[];
  setQty: (id: number, qty: number) => void;
  clear: () => void;
  onClose: () => void;
  onDone: (data: InvoiceData) => void;
};

const EMPTY = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
};

export function Cart({ lines, setQty, clear, onClose, onDone }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const closedByBack = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Mobile hardware / gesture back closes the cart instead of leaving the site.
  useEffect(() => {
    const cartId = `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ cartId }, "");
    const onPop = () => {
      // Ignore pops that land back on our own entry (dev double-mount).
      if (window.history.state?.cartId === cartId) return;
      closedByBack.current = true;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedByBack.current && window.history.state?.cartId === cartId) {
        // Swallow the popstate caused by our own cleanup.
        const skip = (e: PopStateEvent) => e.stopImmediatePropagation();
        window.addEventListener("popstate", skip, { capture: true, once: true });
        window.history.back();
      }
    };
  }, [onClose]);

  const mrpTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const netTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const discount = mrpTotal - netTotal;
  const belowMin = netTotal < SHOP.minOrder;

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildData = (): InvoiceData => ({
    orderId: makeOrderId(),
    date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    ...form,
    lines: lines.map((l) => ({
      name: l.name,
      unit: l.unit,
      qty: l.qty,
      price: l.price,
      rate: l.rate,
    })),
    mrpTotal,
    discount,
    netTotal,
    totalQty,
  });

  const validate = () => {
    if (!form.name.trim()) return "Please fill the delivery details";
    if (!/^\d{10}$/.test(form.mobile.trim())) return "Please fill the delivery details";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Please fill the delivery details";
    if (!form.address.trim()) return "Please fill the delivery details";
    if (!form.city.trim()) return "Please fill the delivery details";
    if (!form.district.trim()) return "Please fill the delivery details";
    if (!form.state.trim()) return "Please fill the delivery details";
    if (!/^\d{6}$/.test(form.pincode.trim())) return "Please fill the delivery details";
    if (belowMin) return `Minimum order value is Rs ${SHOP.minOrder}.`;
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setError("");

    const data = buildData();
    setSending(true);
    try {
      const pdf = await invoiceBase64(data);
      const body = new URLSearchParams({
        orderId: data.orderId,
        ...form,
        items: lines
          .map((l) => `${l.name} x ${l.qty} ${l.unit} = Rs.${l.qty * l.price}`)
          .join("\n"),
        totalQty: String(totalQty),
        mrpTotal: String(mrpTotal),
        discountAmount: String(discount),
        totalAmount: String(netTotal),
        pdf,
      });
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      clear();
      onDone(data);
    } catch {
      setError("Could not send your order. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const field = (label: string, key: keyof typeof EMPTY, type = "text") => (
    <input
      key={key}
      type={type}
      value={form[key]}
      onChange={set(key)}
      placeholder={label}
      className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-accent"
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/60 animate-in fade-in duration-200">
      <form
        onSubmit={submit}
        className="slide-in-right relative flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
      >
        {sending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85">
            <CrackerLoader variant="order" label="Lighting up your order..." />
          </div>
        )}
        <div className="surface-royal flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold">Cart</h2>
          <button type="button" onClick={onClose} aria-label="Close cart">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-accent/80 py-1.5 text-center text-xs font-semibold text-ink">
          Packing Charges Free
        </div>

        {/* Scrollable items + form */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {lines.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">Your cart is empty.</p>
          )}

          {lines.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
              >
                Clear Cart <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {lines.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
              >
                {productImageUrl(l) ? (
                  <img
                    src={productImageUrl(l) ?? undefined}
                    alt={l.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted px-1 text-center text-[8px] text-muted-foreground">
                    No image
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Price : {l.price} &middot; Qty : {l.qty}
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    Total Rs {(l.qty * l.price).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <QtyControl value={l.qty} onChange={(v) => setQty(l.id, v)} compact />
                  <button
                    type="button"
                    onClick={() => setQty(l.id, 0)}
                    aria-label={`Remove ${l.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div ref={formRef} className="mt-5 space-y-3">
            <h3 className="text-center text-lg font-bold">Submit your details</h3>
            <p className="text-center text-xs font-semibold text-muted-foreground">
              Minimum Order Value {SHOP.minOrder}
            </p>
            {field("Enter Name", "name")}
            {field("Mobile Number", "mobile", "tel")}
            {field("Email ID", "email", "email")}
            {field("Delivery Address", "address")}
            {field("City", "city")}
            {field("District", "district")}
            {field("State", "state")}
            {field("Pincode", "pincode")}
          </div>
        </div>

        {/* Sticky bottom summary + actions */}
        <div className="border-t border-border bg-background px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.3)]">
          <div className="rounded-xl border border-gold/60 bg-secondary px-4 py-3 text-sm shadow-sm">
            <div className="flex justify-between py-0.5">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">Rs {mrpTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between py-0.5 text-green-700">
              <span className="font-medium">Discount</span>
              <span className="font-semibold">- Rs {discount.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t-2 border-gold pt-2">
              <span className="font-display text-base font-bold uppercase tracking-wide text-primary">
                Total
              </span>
              <span className="text-xl font-extrabold text-primary">
                Rs {netTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || lines.length === 0}
            className={`mt-3 w-full rounded-md px-4 py-3.5 text-sm font-bold disabled:opacity-60 ${
              belowMin
                ? "border border-gold bg-white text-primary"
                : "btn-gold hover:btn-gold-hover"
            }`}
          >
            {sending
              ? "Placing Order..."
              : belowMin
                ? `Place order Min.${SHOP.minOrder}`
                : "Place Order"}
          </button>
        </div>

        {/* Centered error popup */}
        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/50 px-6">
            <div className="w-full max-w-xs rounded-xl border border-gold bg-white p-6 text-center shadow-2xl">
              <p className="text-base font-semibold text-primary">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  if (error === "Please fill the delivery details") {
                    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="btn-gold hover:btn-gold-hover mt-5 w-full rounded-md px-4 py-2.5 text-sm font-bold"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
