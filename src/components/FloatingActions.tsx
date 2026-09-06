import { Phone, ShoppingCart } from "lucide-react";
import { SHOP } from "@/config";

export function FloatingActions({
  totalQty,
  onCart,
}: {
  totalQty?: number;
  onCart?: () => void;
}) {
  return (
    <>
      {/* Left side: WhatsApp on top, Call below — vertically centered like the reference */}
      <div className="fixed bottom-28 left-0 z-40 flex flex-col gap-2.5 pl-2 sm:bottom-24 sm:pl-3">

        <a
          href={`https://wa.me/91${SHOP.phone}`}
          target="_blank"
          rel="noopener"
          aria-label="Chat on WhatsApp"
          className="float-bob flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] shadow-xl"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
            <path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.45 1.34 4.95L2 22l5.3-1.39a9.9 9.9 0 0 0 4.74 1.2h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm5.8 14.05c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11-.42-.11-.96-.29-1.65-.59-2.9-1.25-4.79-4.17-4.94-4.37-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.15.31-.29.48l-.44.51c-.14.14-.29.3-.12.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.26.09 1.68.79 1.97.94.29.14.48.21.55.33.07.12.07.69-.17 1.37Z" />
          </svg>
        </a>
        <a
          href={`tel:+91${SHOP.phone}`}
          aria-label="Call us"
          className="float-bob-delay flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl"
        >
          <Phone className="h-5 w-5" />
        </a>
      </div>

      {/* Cart: gold button with sheen sweep, cut at the right screen edge */}
      {onCart && (
        <button
          onClick={onCart}
          aria-label="Open cart"
          className="cart-shine cart-pulse fixed right-0 top-[7.5rem] z-40 flex h-13 w-13 items-center justify-center rounded-l-xl border-y-2 border-l-2 border-white p-3 pr-4 text-ink shadow-2xl"
        >
          <span className="cart-sheen-overlay" aria-hidden="true" />
          <ShoppingCart className="h-5 w-5 drop-shadow-sm" />
          {!!totalQty && totalQty > 0 && (
            <span className="absolute -left-2 -top-2 flex h-5 min-w-5 animate-bounce items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-md">
              {totalQty}
            </span>
          )}
        </button>
      )}
    </>
  );
}
