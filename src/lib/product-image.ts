import type { Product } from "@/data/products";

const nambiImages = import.meta.glob("../../Nambi-img/**/*.{jpeg,jpg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const normalizeAssetKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const nambiImageAliases: Record<string, string> = {
  "gift-box/30-items": "Gift Box/Kids Zone (30 Items)",
  "gift-box/40-items": "Gift Box/Classical (40 Items)",
  "gift-box/50-items": "Gift Box/Elegant Party (50 Items)",
  "gift-box/celebration-box": "Gift Box/VIP Celebration Gift Box",
};

export function productImageUrl(product: Pick<Product, "image" | "slug">) {
  if (!product.image) return null;

  const imageKey = normalizeAssetKey(nambiImageAliases[product.image] ?? product.image);
  const imageEntry = Object.entries(nambiImages).find(([path]) => {
    const assetKey = normalizeAssetKey(path.replace(/^.*Nambi-img[\\/]/, "").replace(/\.[^.]+$/, ""));
    return assetKey === imageKey;
  });

  return imageEntry?.[1] ?? null;
}
