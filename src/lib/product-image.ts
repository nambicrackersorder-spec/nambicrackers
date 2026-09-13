import type { Product } from "@/data/products";
import { CLOUDINARY_CLOUD_NAME } from "@/config";

const nambiImages = import.meta.glob("../../Nambi-img/**/*.{jpeg,jpg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const normalizeAssetKey = (value: string) =>
  value.toLowerCase().replace(/\.(jpeg|jpg|png|webp)$/i, "").replace(/[^a-z0-9]+/g, "");

const nambiImageAliases: Record<string, string> = {
  "gift-box/30-items": "Gift Box/Kids Zone (30 Items)",
  "gift-box/40-items": "Gift Box/Classical (40 Items)",
  "gift-box/50-items": "Gift Box/Elegant Party (50 Items)",
  "gift-box/celebration-box": "Gift Box/VIP Celebration Gift Box",
};

export function productImageUrl(product: Pick<Product, "image" | "slug">) {
  if (!product.image) return null;

  if (product.image.startsWith("Digital/")) {
    const publicId = product.image.replace(/^Digital\//, "");
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${encodeURI(publicId)}`;
  }

  if (product.image.startsWith("Gift Box/")) {
    const publicId = product.image
      .replace(/^Gift Box\//, "")
      .replace(/\.(jpeg|jpg|png|webp)$/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_");
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${encodeURI(publicId)}`;
  }

  const imageKey = normalizeAssetKey(nambiImageAliases[product.image] ?? product.image);
  const imageEntry = Object.entries(nambiImages).find(([path]) => {
    const assetKey = normalizeAssetKey(path.replace(/^.*Nambi-img[\\/]/, "").replace(/\.[^.]+$/, ""));
    return assetKey === imageKey;
  });

  return imageEntry?.[1] ?? null;
}
