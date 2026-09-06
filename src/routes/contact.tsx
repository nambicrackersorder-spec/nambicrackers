import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";
import { SHOP } from "@/config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FloatingActions } from "@/components/FloatingActions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Nambi Crackers Sivakasi | Call or WhatsApp" },
      {
        name: "description",
        content:
          "Contact Nambi Crackers in Sivakasi for crackers enquiries, pricing, delivery details and order confirmation.",
      },
      { property: "og:title", content: "Contact Nambi Crackers Sivakasi" },
      {
        property: "og:description",
        content: "Call, WhatsApp or email Nambi Crackers for your crackers enquiry or Diwali order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.nambicrackers.in/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">Contact Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We are happy to help with pricing, bulk orders and delivery details.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a
            href={`tel:+91${SHOP.phone}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Phone className="mt-0.5 h-5 w-5 text-primary" />
            <span>
              <span className="block font-semibold">Call</span>
              <span className="text-sm text-muted-foreground">{SHOP.phoneDisplay}</span>
            </span>
          </a>
          <a
            href={`https://wa.me/91${SHOP.phone}`}
            target="_blank"
            rel="noopener"
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Phone className="mt-0.5 h-5 w-5 text-[#25D366]" />
            <span>
              <span className="block font-semibold">WhatsApp</span>
              <span className="text-sm text-muted-foreground">{SHOP.phoneDisplay}</span>
            </span>
          </a>
          <a
            href={`mailto:${SHOP.email}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Mail className="mt-0.5 h-5 w-5 text-primary" />
            <span>
              <span className="block font-semibold">Email</span>
              <span className="text-sm text-muted-foreground">{SHOP.email}</span>
            </span>
          </a>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <span>
              <span className="block font-semibold">Shop Address</span>
              <span className="text-sm text-muted-foreground">{SHOP.address}</span>
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-secondary p-5 text-sm text-muted-foreground">
          Minimum order value is Rs {SHOP.minOrder}. Orders are treated as enquiries and confirmed
          over call or WhatsApp.
        </div>
      </main>
      <SiteFooter />
      <FloatingActions />
    </div>
  );
}
