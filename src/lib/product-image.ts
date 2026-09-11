import type { Product } from "@/data/products";

export function productImageUrl(product: Pick<Product, "image" | "slug">) {
  if (!product.image) return null;

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;

  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_800/nambi-crackers/${product.image}.jpg`;
}
