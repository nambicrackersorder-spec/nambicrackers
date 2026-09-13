import { useState } from "react";
import { Minus, Plus, X, Image as ImageIcon } from "lucide-react";
import type { Category, Product } from "@/data/products";
import { productImageUrl } from "@/lib/product-image";

const GIFT_BOX_CLOUDINARY_IDS: Record<string, string> = {
  Kids: "Kids",
  "Lolly Pop": "Lolly_pop_27_items",
  "Little Hero": "Little_hero_33_items",
  Heritage: "Heritage_36_items",
  "Knight Warrior": "Knight_warrior_39_items",
  Luxury: "Luxury_42_items",
  Divine: "Divine_54_items",
  Hathi: "Hathi_80_items",
  "Kids Zone": "Kids_Zone_30_Items",
  Classical: "Classical_40_Items",
  "Elegant Party": "Elegant_Party_50_Items",
  "Celebration Gift Box": "Celebration_box",
};

const productImageUrlForTable = (product: Product) => {
  const cloudinaryId = GIFT_BOX_CLOUDINARY_IDS[product.name];
  return cloudinaryId
    ? `https://res.cloudinary.com/qnlmwgwy/image/upload/f_auto,q_auto/${cloudinaryId}`
    : productImageUrl(product);
};

export function QtyControl({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const btn = compact ? "h-6 w-6 max-[360px]:h-4 max-[360px]:w-4" : "h-8 w-8";
  return (
    <div className="flex items-center justify-center gap-1 max-[360px]:gap-0">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(0, value - 1))}
        className={`flex ${btn} shrink-0 items-center justify-center rounded border border-input bg-background`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0"
        className={`${compact ? "w-7 py-0.5 text-xs max-[360px]:w-5" : "w-12 py-1 text-base"} rounded border border-input bg-background px-0.5 text-center outline-none focus:border-accent`}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className={`flex ${btn} shrink-0 items-center justify-center rounded border border-input bg-background`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

// Keep every column visible; the product name absorbs the remaining width.
const ROW =
  "grid grid-cols-[44px_minmax(48px,1fr)_32px_32px_40px_82px] items-center gap-1 max-[360px]:grid-cols-[36px_minmax(24px,1fr)_26px_28px_48px_58px] max-[360px]:gap-0 sm:grid-cols-[64px_minmax(90px,1fr)_56px_48px_60px_110px] sm:gap-2 lg:grid-cols-[80px_minmax(120px,1fr)_90px_70px_90px_160px]";
const TEXT_ONLY_ROW =
  "grid grid-cols-[minmax(48px,1fr)_32px_32px_40px_82px] items-center gap-1 max-[360px]:grid-cols-[minmax(24px,1fr)_26px_28px_48px_58px] max-[360px]:gap-0 sm:grid-cols-[minmax(90px,1fr)_56px_48px_60px_110px] sm:gap-2 lg:grid-cols-[minmax(120px,1fr)_90px_70px_90px_160px]";

const formatPrice = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: value % 1 ? 2 : 0 });
function ProductDetailModal({
  product,
  onClose,
  hideImage,
}: {
  product: Product;
  onClose: () => void;
  hideImage: boolean;
}) {
  const imageUrl = productImageUrlForTable(product);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold">{product.name}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!hideImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="mt-3 h-48 w-full rounded-lg border border-border object-cover"
          />
        ) : !hideImage ? (
          <div className="mt-3 flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
            Image unavailable
          </div>
        ) : null}
        <p className="mt-3 text-sm leading-snug text-muted-foreground">{product.tamil}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-muted p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Price</div>
            <div className="line-through">Rs {product.rate}</div>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Unit</div>
            <div className="font-medium">{product.unit}</div>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Offer</div>
            <div className="font-bold text-primary">Rs {product.price}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductTable({
  cat,
  qty,
  setValue,
}: {
  cat: Category;
  qty: Record<number, number>;
  setValue: (id: number, v: number) => void;
}) {
  const [selected, setSelected] = useState<Product | null>(null);
  const hideImages = ["Paper Bombs", "MINI DIGITAL", "MEGA DIGITAL"].includes(cat.name);
  const showImageColumn = true;
  const caseOnly = cat.products.some((product) => product.caseOnly);
  const rowClass = showImageColumn ? ROW : TEXT_ONLY_ROW;

  return (
    <div className="overflow-hidden rounded-b-md border border-t-0 border-border bg-card">
      {caseOnly && (
        <div className="border-b border-border bg-accent/25 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-primary">
          ONLY CASE ORDERS
        </div>
      )}
      <div
        className={`${rowClass} border-b border-border bg-secondary px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground max-[360px]:px-1 sm:px-3 sm:text-[10px] lg:text-xs`}
      >
        {showImageColumn && <span className="text-center">Image</span>}
        <span className="text-center">Product Name</span>
        <span className="text-center">Price</span>
        <span className="text-center">Unit</span>
        <span className="text-center leading-[1.05] max-[360px]:whitespace-nowrap">Discount</span>
        <span className="text-center leading-[1.05] max-[360px]:break-all">Quantity</span>
      </div>

      {cat.products.map((p) => {
        const n = qty[p.id] ?? 0;
        const imageUrl = productImageUrlForTable(p);
        return (
          <div
            key={p.id}
            className={`${rowClass} border-t border-border px-2 py-2 first:border-t-0 max-[360px]:px-1 sm:px-3 sm:py-2.5`}
          >
            {showImageColumn && (
              <button
                type="button"
                onClick={() => setSelected(p)}
                aria-label={`View details of ${p.name}`}
                className="mx-auto block"
              >
                {(p.showImage || !hideImages) && imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={p.name}
                    loading="lazy"
                    className="h-12 w-12 rounded border border-border object-cover max-[360px]:h-9 max-[360px]:w-9 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                  />
                ) : p.showImage ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-border bg-muted max-[360px]:h-9 max-[360px]:w-9 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                    <ImageIcon className="h-6 w-6 text-muted-foreground max-[360px]:h-4 max-[360px]:w-4 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                  </div>
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-border bg-muted px-1 text-center text-[8px] leading-tight text-muted-foreground max-[360px]:h-9 max-[360px]:w-9 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                    No image
                  </span>
                )}
              </button>
            )}

            <div className="min-w-0 text-center">
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="w-full text-[11px] font-semibold leading-tight sm:text-sm"
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="w-full truncate text-[9px] text-muted-foreground sm:text-xs"
              >
                {p.tamil}
              </button>
              {p.caseOnly && (
                <div className="mt-1 text-[9px] leading-tight text-muted-foreground sm:text-xs">
                  <div>Per box: {formatPrice(p.rate)}</div>
                  <div>{p.caseQuantity} boxes per case</div>
                  <div>Original per case: {formatPrice(p.caseValue ?? 0)}</div>
                </div>
              )}
            </div>

            <span className="text-center text-[10px] text-muted-foreground line-through sm:text-sm">
              {p.caseOnly ? formatPrice(p.caseValue ?? p.rate) : p.rate}
            </span>
            <span className="text-center text-[9px] text-muted-foreground sm:text-xs">
              {p.unit}
            </span>
            <span className="text-center text-[12px] font-bold text-primary sm:text-base">
              {p.price}
            </span>
            <span className="flex justify-center">
              <QtyControl value={n} onChange={(v) => setValue(p.id, v)} compact />
            </span>
          </div>
        );
      })}

      {selected && (
        <ProductDetailModal
          product={selected}
          hideImage={hideImages && !selected.showImage}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
