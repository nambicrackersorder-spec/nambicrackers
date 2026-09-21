import type { Product } from "@/data/products";
import { BASE_PRODUCT_IMAGE_MAP } from "@/data/products";
import { CLOUDINARY_CLOUD_NAME } from "@/config";

let nambiImages: Record<string, string> = {};
try {
  nambiImages = import.meta.glob("../../Nambi-img/**/*.{jpeg,jpg,png,webp}", {
    eager: true,
    import: "default",
    query: "?url",
  });
} catch {
  nambiImages = {};
}

const normalizeAssetKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.(jpeg|jpg|png|webp)$/i, "")
    .replace(/[^a-z0-9]+/g, "");

const nambiImageAliases: Record<string, string> = {
  "gift-box/30-items": "Gift Box/Kids Zone (30 Items)",
  "gift-box/40-items": "Gift Box/Classical (40 Items)",
  "gift-box/50-items": "Gift Box/Elegant Party (50 Items)",
  "gift-box/celebration-box": "Gift Box/VIP Celebration Gift Box",
};

export const GIFT_BOX_CLOUDINARY_IDS: Record<string, string> = {
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

export function productImageUrl(product: {
  image?: string | null;
  slug?: string;
  name?: string;
  showImage?: boolean;
}): string | null {
  if (!product) return null;

  // Explicitly removed image
  if (product.image === null && product.showImage === false) {
    return null;
  }

  // 1. Direct explicit image reference if present
  let imageRef = product.image;

  // 2. If imageRef is missing and showImage is not false, fall back to base catalog image
  if (!imageRef && product.showImage !== false && product.name) {
    imageRef = BASE_PRODUCT_IMAGE_MAP[product.name] ?? null;
  }

  if (!imageRef) {
    // Check if product has a Gift Box Cloudinary ID
    if (product.name && GIFT_BOX_CLOUDINARY_IDS[product.name]) {
      const cloudinaryId = GIFT_BOX_CLOUDINARY_IDS[product.name];
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${cloudinaryId}`;
    }
    if (product.slug) {
      const slugKey = product.slug.replace("tensy", "teensy");
      return `/products/${slugKey}.jpg`;
    }
    return null;
  }

  // 3. Direct URLs, Data URIs, Blob URLs, or local root paths
  if (
    imageRef.startsWith("http://") ||
    imageRef.startsWith("https://") ||
    imageRef.startsWith("data:image/") ||
    imageRef.startsWith("blob:") ||
    imageRef.startsWith("/")
  ) {
    return imageRef;
  }

  // 4. Cloudinary paths
  if (imageRef.startsWith("Digital/")) {
    const publicId = imageRef.replace(/^Digital\//, "");
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${encodeURI(publicId)}`;
  }

  if (imageRef.startsWith("Gift Box/")) {
    const publicId = imageRef
      .replace(/^Gift Box\//, "")
      .replace(/\.(jpeg|jpg|png|webp)$/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "_");
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${encodeURI(publicId)}`;
  }

  // 5. Gift Box Cloudinary fallback by name
  if (product.name && GIFT_BOX_CLOUDINARY_IDS[product.name]) {
    const cloudinaryId = GIFT_BOX_CLOUDINARY_IDS[product.name];
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${cloudinaryId}`;
  }

  // 6. Bundled local assets in Nambi-img
  if (typeof nambiImages === "object" && nambiImages !== null) {
    const imageKey = normalizeAssetKey(nambiImageAliases[imageRef] ?? imageRef);
    const imageEntry = Object.entries(nambiImages).find(([path]) => {
      const assetKey = normalizeAssetKey(
        path.replace(/^.*Nambi-img[\\/]/, "").replace(/\.[^.]+$/, ""),
      );
      return assetKey === imageKey;
    });

    if (imageEntry?.[1]) {
      return imageEntry[1];
    }

    // Fallback by product name key
    if (product.name) {
      const nameKey = normalizeAssetKey(product.name);
      const nameEntry = Object.entries(nambiImages).find(([path]) => {
        const assetKey = normalizeAssetKey(
          path.replace(/^.*Nambi-img[\\/]/, "").replace(/\.[^.]+$/, ""),
        );
        return assetKey === nameKey || assetKey.includes(nameKey);
      });
      if (nameEntry?.[1]) {
        return nameEntry[1];
      }
    }
  }

  // 7. Static public /products/ fallback
  if (product.slug) {
    const slugKey = product.slug.replace("tensy", "teensy");
    return `/products/${slugKey}.jpg`;
  }

  return null;
}
