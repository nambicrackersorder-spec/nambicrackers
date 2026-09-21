import { useEffect, useState } from "react";
import {
  CATEGORIES as BASE_CATEGORIES,
  ALL_PRODUCTS as BASE_ALL_PRODUCTS,
  BASE_PRODUCT_IMAGE_MAP,
  type Product as OriginalProduct,
  type Category as OriginalCategory,
} from "@/data/products";
import { SHOP as DEFAULT_SHOP, APPS_SCRIPT_URL as DEFAULT_APPS_SCRIPT_URL } from "@/config";

export interface Product extends OriginalProduct {
  active?: boolean;
  isDemo?: boolean;
  hasCustomPrice?: boolean;
}

export interface Category {
  id?: string;
  name: string;
  products: Product[];
  hideImages?: boolean;
  priceIsFinal?: boolean;
  active?: boolean;
  order?: number;
  isDemo?: boolean;
}

export interface ShopSettings {
  name: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  address: string;
  minOrder: number;
  discount: number;
  scriptUrl: string;
}

const STORAGE_KEY_CATALOG = "nambi_catalog_v2";
const STORAGE_KEY_ORDER_STATUS = "nambi_order_status_v2";
const STORAGE_KEY_SETTINGS = "nambi_settings_v2";
const STORAGE_KEY_CLEARED_DEMO_ORDERS = "nambi_cleared_demo_orders_v2";

export const DEFAULT_SETTINGS: ShopSettings = {
  name: DEFAULT_SHOP.name,
  phone: DEFAULT_SHOP.phone,
  phoneDisplay: DEFAULT_SHOP.phoneDisplay,
  email: DEFAULT_SHOP.email,
  address: DEFAULT_SHOP.address,
  minOrder: DEFAULT_SHOP.minOrder,
  discount: DEFAULT_SHOP.discount,
  scriptUrl: DEFAULT_APPS_SCRIPT_URL,
};

interface CatalogState {
  categories: Category[];
  products: Product[];
}

// Memory caches
let cachedCatalog: CatalogState | null = null;
let cachedOrderStatus: Record<string, string> | null = null;
let cachedSettings: ShopSettings | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/* =========================================================================
   Settings Persistent Store
   ========================================================================= */

function loadSettingsFromStorage(): ShopSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          name: typeof parsed.name === "string" && parsed.name ? parsed.name : DEFAULT_SETTINGS.name,
          phone: typeof parsed.phone === "string" && parsed.phone ? parsed.phone : DEFAULT_SETTINGS.phone,
          phoneDisplay: typeof parsed.phoneDisplay === "string" && parsed.phoneDisplay ? parsed.phoneDisplay : DEFAULT_SETTINGS.phoneDisplay,
          email: typeof parsed.email === "string" && parsed.email ? parsed.email : DEFAULT_SETTINGS.email,
          address: typeof parsed.address === "string" && parsed.address ? parsed.address : DEFAULT_SETTINGS.address,
          minOrder: typeof parsed.minOrder === "number" && !isNaN(parsed.minOrder) ? parsed.minOrder : DEFAULT_SETTINGS.minOrder,
          discount: typeof parsed.discount === "number" && !isNaN(parsed.discount) ? parsed.discount : DEFAULT_SETTINGS.discount,
          scriptUrl: typeof parsed.scriptUrl === "string" && parsed.scriptUrl ? parsed.scriptUrl : DEFAULT_SETTINGS.scriptUrl,
        };
      }
    }
  } catch (err) {
    console.warn("Could not parse saved settings from localStorage, using defaults", err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettingsToStorage(settings: ShopSettings) {
  cachedSettings = settings;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      window.dispatchEvent(new Event("nambi_settings_updated"));
    } catch (err) {
      console.error("Failed to save settings to localStorage", err);
    }
  }
  notifyListeners();
}

export function getSettings(): ShopSettings {
  if (!cachedSettings) {
    cachedSettings = loadSettingsFromStorage();
  }
  return cachedSettings;
}

export function updateSettings(partial: Partial<ShopSettings>): ShopSettings {
  const current = getSettings();
  const updated: ShopSettings = {
    ...current,
    ...partial,
  };
  saveSettingsToStorage(updated);
  return updated;
}

export function resetSettingsToDefault(): ShopSettings {
  saveSettingsToStorage({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS };
}

/* =========================================================================
   Catalog Persistent Store
   ========================================================================= */

/**
 * Initializes catalog from localStorage or defaults to real base products & categories.
 * Preserves all real products & categories untouched.
 */
function loadCatalogFromStorage(): CatalogState {
  if (typeof window === "undefined") {
    return {
      categories: BASE_CATEGORIES.map((c, i) => ({
        ...c,
        active: true,
        order: i,
        isDemo: false,
        products: c.products.map((p) => ({
          ...p,
          active: true,
          isDemo: false,
          image: p.image || BASE_PRODUCT_IMAGE_MAP[p.name] || null,
        })),
      })),
      products: BASE_ALL_PRODUCTS.map((p) => ({
        ...p,
        active: true,
        isDemo: false,
        image: p.image || BASE_PRODUCT_IMAGE_MAP[p.name] || null,
      })),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    if (raw) {
      const parsed = JSON.parse(raw) as { categories: Category[] };
      if (parsed && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        // Hydrate base catalog images on any products that don't have explicit custom/removed status
        const categories = parsed.categories.map((c) => ({
          ...c,
          products: c.products.map((p) => {
            const baseImg = BASE_PRODUCT_IMAGE_MAP[p.name];
            const isExplicitlyRemoved = p.image === null && p.showImage === false;
            const hasCustomImage = typeof p.image === "string" && p.image.trim() !== "";
            return {
              ...p,
              image: isExplicitlyRemoved
                ? null
                : hasCustomImage
                  ? p.image
                  : baseImg ?? null,
              showImage: isExplicitlyRemoved
                ? false
                : (p.showImage ?? (p.image || baseImg ? true : undefined)),
            };
          }),
        }));
        const products = categories.flatMap((c) => c.products);
        return {
          categories,
          products,
        };
      }
    }
  } catch (err) {
    console.warn("Could not parse saved catalog from localStorage, falling back to base catalog", err);
  }

  // Base fallback initialized with real catalog (182 products, 26 categories)
  const initialCategories: Category[] = BASE_CATEGORIES.map((c, i) => ({
    ...c,
    active: true,
    order: i,
    isDemo: false,
    products: c.products.map((p) => ({
      ...p,
      active: true,
      isDemo: false,
      image: p.image || BASE_PRODUCT_IMAGE_MAP[p.name] || null,
    })),
  }));

  const initialProducts = initialCategories.flatMap((c) => c.products);

  const initial = {
    categories: initialCategories,
    products: initialProducts,
  };

  saveCatalogToStorage(initial);
  return initial;
}

function saveCatalogToStorage(state: CatalogState) {
  cachedCatalog = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY_CATALOG,
        JSON.stringify({ categories: state.categories }),
      );
      window.dispatchEvent(new Event("nambi_catalog_updated"));
    } catch (err) {
      console.error("Failed to save catalog to localStorage", err);
    }
  }
  notifyListeners();
}

function getCatalogState(): CatalogState {
  if (!cachedCatalog) {
    cachedCatalog = loadCatalogFromStorage();
  }
  return cachedCatalog;
}

/* =========================================================================
   Order Status Persistent Store
   ========================================================================= */

function loadOrderStatusFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDER_STATUS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not load order status map", e);
  }
  return {};
}

function saveOrderStatusToStorage(map: Record<string, string>) {
  cachedOrderStatus = map;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_ORDER_STATUS, JSON.stringify(map));
      window.dispatchEvent(new Event("nambi_order_status_updated"));
    } catch (e) {
      console.error("Failed to save order status map", e);
    }
  }
  notifyListeners();
}

export function getOrderStatusMap(): Record<string, string> {
  if (!cachedOrderStatus) {
    cachedOrderStatus = loadOrderStatusFromStorage();
  }
  return cachedOrderStatus;
}

export function setOrderStatus(orderIdentifier: string, newStatus: string) {
  const current = { ...getOrderStatusMap() };
  current[orderIdentifier] = newStatus;
  saveOrderStatusToStorage(current);
}

/* =========================================================================
   Catalog CRUD Mutations (Used by Admin, Observed by Customer & Admin)
   ========================================================================= */

export function addProductToStore(product: Product, categoryName: string) {
  const state = getCatalogState();
  let foundCat = false;

  const updatedCategories = state.categories.map((cat) => {
    if (cat.name.toLowerCase() === categoryName.trim().toLowerCase()) {
      foundCat = true;
      return {
        ...cat,
        products: [product, ...cat.products],
      };
    }
    return cat;
  });

  // If category didn't exist, create it
  if (!foundCat) {
    updatedCategories.push({
      name: categoryName.trim(),
      products: [product],
      active: true,
      order: updatedCategories.length,
      isDemo: false,
    });
  }

  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

export function updateProductInStore(updated: Product, targetCategoryName?: string) {
  const state = getCatalogState();
  let targetFound = false;

  // First remove product from all categories, then insert into target category
  const updatedCategories = state.categories.map((cat) => {
    const hasProduct = cat.products.some((p) => p.id === updated.id);
    const isTarget = targetCategoryName
      ? cat.name.toLowerCase() === targetCategoryName.trim().toLowerCase()
      : hasProduct;

    if (isTarget) {
      targetFound = true;
      if (hasProduct) {
        return {
          ...cat,
          products: cat.products.map((p) => (p.id === updated.id ? updated : p)),
        };
      } else {
        // Moved to this category
        return {
          ...cat,
          products: [...cat.products, updated],
        };
      }
    } else if (hasProduct) {
      // Removed from old category
      return {
        ...cat,
        products: cat.products.filter((p) => p.id !== updated.id),
      };
    }
    return cat;
  });

  if (targetCategoryName && !targetFound) {
    updatedCategories.push({
      name: targetCategoryName.trim(),
      products: [updated],
      active: true,
      order: updatedCategories.length,
      isDemo: false,
    });
  }

  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

export function deleteProductFromStore(productId: number) {
  const state = getCatalogState();
  const updatedCategories = state.categories.map((cat) => ({
    ...cat,
    products: cat.products.filter((p) => p.id !== productId),
  }));
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

export function toggleProductActiveInStore(productId: number) {
  const state = getCatalogState();
  const updatedCategories = state.categories.map((cat) => ({
    ...cat,
    products: cat.products.map((p) =>
      p.id === productId ? { ...p, active: p.active === false ? true : false } : p,
    ),
  }));
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

export function addCategoryToStore(categoryName: string) {
  const state = getCatalogState();
  if (state.categories.some((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase())) {
    return; // Already exists
  }
  const newCat: Category = {
    name: categoryName.trim(),
    products: [],
    active: true,
    order: state.categories.length,
    isDemo: false,
  };
  const updatedCategories = [...state.categories, newCat];
  saveCatalogToStorage({ categories: updatedCategories, products: state.products });
}

export function updateCategoryInStore(
  oldName: string,
  updated: { name?: string; active?: boolean; hideImages?: boolean },
) {
  const state = getCatalogState();
  const updatedCategories = state.categories.map((cat) => {
    if (cat.name.toLowerCase() === oldName.trim().toLowerCase()) {
      return {
        ...cat,
        name: updated.name !== undefined ? updated.name.trim() : cat.name,
        active: updated.active !== undefined ? updated.active : cat.active,
        hideImages: updated.hideImages !== undefined ? updated.hideImages : cat.hideImages,
      };
    }
    return cat;
  });
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

export function deleteCategoryFromStore(categoryName: string): { success: boolean; error?: string } {
  const state = getCatalogState();
  const cat = state.categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (!cat) return { success: false, error: "Category not found" };

  if (cat.products.length > 0) {
    return {
      success: false,
      error: `This category contains ${cat.products.length} products. Please move or update those products before deleting the category.`,
    };
  }

  const updatedCategories = state.categories.filter(
    (c) => c.name.toLowerCase() !== categoryName.trim().toLowerCase(),
  );
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
  return { success: true };
}

export function reorderCategoryInStore(categoryName: string, direction: "up" | "down") {
  const state = getCatalogState();
  const idx = state.categories.findIndex(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (idx === -1) return;

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= state.categories.length) return;

  const categoriesCopy = [...state.categories];
  const [removed] = categoriesCopy.splice(idx, 1);
  categoriesCopy.splice(targetIdx, 0, removed);

  const reindexed = categoriesCopy.map((c, i) => ({ ...c, order: i }));
  saveCatalogToStorage({ categories: reindexed, products: state.products });
}

export function reorderProductInCategory(categoryName: string, productId: number, direction: "up" | "down") {
  const state = getCatalogState();
  const targetCategory = state.categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (!targetCategory) return;

  const idx = targetCategory.products.findIndex((p) => p.id === productId);
  if (idx === -1) return;

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= targetCategory.products.length) return;

  const productList = [...targetCategory.products];
  const [removed] = productList.splice(idx, 1);
  productList.splice(targetIdx, 0, removed);

  const updatedCategories = state.categories.map((cat) =>
    cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      ? { ...cat, products: productList }
      : cat,
  );

  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: updatedCategories, products: updatedProducts });
}

/* =========================================================================
   Catalog Price Calculation Helper
   ========================================================================= */

export function resolveProductOfferPrice(
  product: Product,
  category: Category | { priceIsFinal?: boolean },
  discountPercent: number,
): number {
  if (category.priceIsFinal) {
    return product.rate;
  }
  if (product.caseOnly && typeof product.casePrice === "number" && product.casePrice > 0) {
    return product.casePrice;
  }
  if (product.hasCustomPrice && typeof product.price === "number") {
    return product.price;
  }
  if (product.name === "Icone" && !product.hasCustomPrice) return 298;
  if (product.name === "Orion" && !product.hasCustomPrice) return 170;
  if (product.name === "Zulu Fountain" && !product.hasCustomPrice) return 160;

  const discountFactor = Math.max(0, (100 - discountPercent) / 100);
  return Math.round(product.rate * discountFactor);
}

/* =========================================================================
   Demo Order Tracking & Filtering Store
   ========================================================================= */

export function getClearedDemoOrderIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLEARED_DEMO_ORDERS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    console.warn("Could not load cleared demo orders", e);
  }
  return new Set();
}

export function saveClearedDemoOrderIds(ids: Set<string>) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY_CLEARED_DEMO_ORDERS,
        JSON.stringify(Array.from(ids)),
      );
      window.dispatchEvent(new Event("nambi_orders_reset"));
    } catch (e) {
      console.error("Failed to save cleared demo orders", e);
    }
  }
  notifyListeners();
}

export function isDemoOrder(o: {
  orderId?: string;
  name?: string;
  mobile?: string;
  items?: string;
  isDemo?: boolean;
  timestamp?: string;
}): boolean {
  if (!o) return false;
  if (o.isDemo === true || String(o.isDemo) === "true") return true;

  const id = o.orderId || "";
  const name = (o.name || "").toLowerCase();
  const mobile = (o.mobile || "").replace(/\D/g, "");
  const items = (o.items || "").trim();

  // Explicit demo or test prefix
  if (id.startsWith("DEMO-") || id.startsWith("TEST-")) return true;

  // Demo / test indicators in name
  if (
    name.includes("demo") ||
    name.includes("test order") ||
    name.includes("sample order")
  ) {
    return true;
  }

  // Blank dummy rows in spreadsheet
  if (!name.trim() && !mobile && !items) return true;

  // Cleared demo orders recorded during admin reset
  const clearedSet = getClearedDemoOrderIds();
  if (id && clearedSet.has(id)) return true;
  if (o.timestamp && clearedSet.has(`${o.timestamp}-${o.name || ""}`)) return true;

  return false;
}

export function filterRealOrders<
  T extends {
    orderId?: string;
    name?: string;
    mobile?: string;
    items?: string;
    isDemo?: boolean;
    timestamp?: string;
  },
>(orders: T[]): T[] {
  return (orders || []).filter((o) => !isDemoOrder(o));
}

/* =========================================================================
   Admin Demo Data Reset Action
   ========================================================================= */

/**
 * Removes strictly demo/test data.
 * Real products, real categories, real customer orders are never touched.
 */
export function resetAdminDemoData(currentOrders?: Array<{
  orderId?: string;
  name?: string;
  mobile?: string;
  items?: string;
  isDemo?: boolean;
  timestamp?: string;
}>): {
  removedDemoProducts: number;
  removedDemoCategories: number;
  removedDemoStatuses: number;
  removedDemoOrders: number;
} {
  const state = getCatalogState();
  let removedDemoProducts = 0;
  let removedDemoCategories = 0;

  // Filter out any products or categories explicitly marked with isDemo === true
  const cleanedCategories = state.categories
    .filter((c) => {
      if (c.isDemo === true) {
        removedDemoCategories += 1;
        return false;
      }
      return true;
    })
    .map((c) => {
      const remainingProducts = c.products.filter((p) => {
        if (p.isDemo === true) {
          removedDemoProducts += 1;
          return false;
        }
        return true;
      });
      return {
        ...c,
        products: remainingProducts,
      };
    });

  const cleanedProducts = cleanedCategories.flatMap((c) => c.products);
  saveCatalogToStorage({ categories: cleanedCategories, products: cleanedProducts });

  // Clean demo order status keys if prefixed with "DEMO-" or "test"
  const currentStatuses = getOrderStatusMap();
  const cleanedStatuses: Record<string, string> = {};
  let removedDemoStatuses = 0;
  Object.entries(currentStatuses).forEach(([k, v]) => {
    if (k.startsWith("DEMO-") || k.includes("test")) {
      removedDemoStatuses += 1;
    } else {
      cleanedStatuses[k] = v;
    }
  });
  saveOrderStatusToStorage(cleanedStatuses);

  // Clear demo orders from current orders list
  const clearedSet = getClearedDemoOrderIds();
  let removedDemoOrders = 0;

  if (Array.isArray(currentOrders)) {
    currentOrders.forEach((o, idx) => {
      if (isDemoOrder(o)) {
        removedDemoOrders += 1;
        if (o.orderId) clearedSet.add(o.orderId);
        if (o.timestamp) clearedSet.add(`${o.timestamp}-${o.name || ""}`);
        clearedSet.add(`order-${idx}`);
      }
    });
  }

  saveClearedDemoOrderIds(clearedSet);

  return {
    removedDemoProducts,
    removedDemoCategories,
    removedDemoStatuses,
    removedDemoOrders,
  };
}

/* =========================================================================
   React Hooks for Single Source of Truth
   ========================================================================= */

function subscribe(callback: () => void) {
  listeners.add(callback);

  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEY_CATALOG ||
      e.key === STORAGE_KEY_ORDER_STATUS ||
      e.key === STORAGE_KEY_SETTINGS ||
      e.key === STORAGE_KEY_CLEARED_DEMO_ORDERS
    ) {
      cachedCatalog = null;
      cachedOrderStatus = null;
      cachedSettings = null;
      callback();
    }
  };

  const onCustomCatalog = () => {
    callback();
  };

  const onCustomStatus = () => {
    callback();
  };

  const onCustomSettings = () => {
    callback();
  };

  const onOrdersReset = () => {
    callback();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    window.addEventListener("nambi_catalog_updated", onCustomCatalog);
    window.addEventListener("nambi_order_status_updated", onCustomStatus);
    window.addEventListener("nambi_settings_updated", onCustomSettings);
    window.addEventListener("nambi_orders_reset", onOrdersReset);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nambi_catalog_updated", onCustomCatalog);
      window.removeEventListener("nambi_order_status_updated", onCustomStatus);
      window.removeEventListener("nambi_settings_updated", onCustomSettings);
      window.removeEventListener("nambi_orders_reset", onOrdersReset);
    }
  };
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>(getCatalogState);
  const [currentSettings, setCurrentSettings] = useState<ShopSettings>(getSettings);

  useEffect(() => {
    // Sync initial state on mount (client-side)
    setState(getCatalogState());
    setCurrentSettings(getSettings());
    return subscribe(() => {
      setState({ ...getCatalogState() });
      setCurrentSettings(getSettings());
    });
  }, []);

  const discount = currentSettings.discount ?? 90;

  // Dynamically attach resolved offer price to all categories and products based on current discount
  const resolvedCategories = state.categories.map((c) => ({
    ...c,
    products: c.products.map((p) => ({
      ...p,
      price: resolveProductOfferPrice(p, c, discount),
    })),
  }));

  const resolvedProducts = resolvedCategories.flatMap((c) => c.products);

  // Filtered lists for customer website (only active categories & products)
  const activeCategories = resolvedCategories
    .filter((c) => c.active !== false)
    .map((c) => ({
      ...c,
      products: c.products.filter((p) => p.active !== false),
    }))
    .filter((c) => c.products.length > 0);

  const activeProducts = activeCategories.flatMap((c) => c.products);

  return {
    categories: resolvedCategories, // Full list for Admin with dynamic prices
    products: resolvedProducts,     // Full list for Admin with dynamic prices
    activeCategories,               // Customer website visible list
    activeProducts,                 // Customer website visible list
    addProduct: addProductToStore,
    updateProduct: updateProductInStore,
    deleteProduct: deleteProductFromStore,
    toggleProductActive: toggleProductActiveInStore,
    addCategory: addCategoryToStore,
    updateCategory: updateCategoryInStore,
    deleteCategory: deleteCategoryFromStore,
    reorderCategory: reorderCategoryInStore,
    reorderProduct: reorderProductInCategory,
    resetDemoData: resetAdminDemoData,
  };
}

export function useOrderStatusMap() {
  const [statusMap, setStatusMap] = useState<Record<string, string>>(getOrderStatusMap);

  useEffect(() => {
    setStatusMap(getOrderStatusMap());
    return subscribe(() => {
      setStatusMap({ ...getOrderStatusMap() });
    });
  }, []);

  return {
    statusMap,
    setOrderStatus,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<ShopSettings>(getSettings);

  useEffect(() => {
    setSettings(getSettings());
    return subscribe(() => {
      setSettings({ ...getSettings() });
    });
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings: resetSettingsToDefault,
  };
}
