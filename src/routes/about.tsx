import { createFileRoute } from "@tanstack/react-router";
import { SHOP } from "@/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingActions } from "@/components/FloatingActions";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Nambi Crackers | Sivakasi Fireworks Supplier" },
      {
        name: "description",
        content:
          "Nambi Crackers is based in Sivakasi and now delivers across India, with safe packing, tracked shipments and direct factory pricing.",
      },
      { property: "og:title", content: "About Nambi Crackers | Sivakasi Fireworks Supplier" },
      {
        property: "og:description",
        content:
          "Quality Sivakasi crackers from the home of fireworks, delivered across India with safe packing and real pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.nambicrackers.in/about" }],
  }),
  component: About,
});

function About() {
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Does Nambi Crackers deliver outside Tamil Nadu?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Nambi Crackers is based in Sivakasi and delivers across India for confirmed orders, with safe packing and order tracking for each shipment.",
        },
      },
      {
        "@type": "Question",
        name: "What is the minimum order value?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The minimum order value is ₹3,000. Orders are handled as direct enquiry confirmation and billing through the shop.",
        },
      },
      {
        "@type": "Question",
        name: "How much discount do you offer on crackers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nambi Crackers offers up to 90% off MRP on our Sivakasi firework price list.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}
      />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">About Us</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground">
          Nambi Crackers is based in Sivakasi, the home of Indian fireworks, and we now deliver
          across India — from Tamil Nadu to every state — for all festivals and celebrations. Fast,
          safe, and fully tracked shipping to your doorstep, anywhere in the country.
        </p>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          Every item we sell comes directly from licensed Sivakasi manufacturers, so you always pay
          factory rates without middlemen. Each order is checked by hand before packing, and you
          receive a clear invoice with an order ID so you can track your parcel from confirmation to
          delivery.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Best Price", d: "Direct factory rates with 90% off MRP - no hidden charges." },
            { t: "Safe Packing", d: "Every parcel is checked by hand and packed for a safe journey." },
            { t: "Fast Delivery", d: "Pan-India delivery with order tracking and confirmed dispatch." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-bold text-primary">{c.t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-gold/60 bg-card p-5">
          <h2 className="font-bold text-primary">Why Customers Trust Us</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li>Licensed Sivakasi supplier with a real shop address you can visit.</li>
            <li>Transparent pricing - MRP, discount and total shown before you order.</li>
            <li>Invoice with a unique order ID emailed to you for every order.</li>
            <li>Order status you can check any time on our tracking page.</li>
            <li>Friendly support on phone and WhatsApp before and after delivery.</li>
          </ul>
        </div>

        <div className="mt-8 rounded-xl bg-secondary p-5">
          <h2 className="font-bold text-primary">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground">Does Nambi Crackers deliver outside Tamil Nadu?</h3>
              <p className="mt-1">Yes. Nambi Crackers is based in Sivakasi and delivers across India for confirmed orders, with safe packing and order tracking.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">What is the minimum order value?</h3>
              <p className="mt-1">The minimum order value is ₹3,000. Orders are handled as direct enquiry confirmation and billing through the shop.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">How much discount do you offer?</h3>
              <p className="mt-1">Nambi Crackers offers up to 90% off MRP on our Sivakasi firework price list.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-secondary p-5">
          <h2 className="font-bold text-primary">Visit Our Shop</h2>
          <p className="mt-1 text-sm text-muted-foreground">{SHOP.address}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {SHOP.phoneDisplay} &middot; {SHOP.email}
          </p>
        </div>
      </main>
      <SiteFooter />
      <FloatingActions />
    </div>
  );
}
