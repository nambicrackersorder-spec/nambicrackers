import type { Product } from "@/data/products";

export function productImageUrl(product: Pick<Product, "image" | "slug">) {
  if (!product.image) return null;

  return `/products/${product.slug}.jpg`;
}
