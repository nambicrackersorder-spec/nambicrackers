import { useEffect, useState, useCallback } from "react";
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
  _shopSettings?: ShopSettings;
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

// Memory caches (Temporary client cache; backend is the authoritative source of truth)
let cachedCatalog: CatalogState | null = null;
let cachedOrderStatus: Record<string, string> | null = null;
let cachedSettings: ShopSettings | null = null;
let remoteCatalogSyncStarted = false;
let isSyncingRemote = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/* =========================================================================
   URL & Helpers
   ========================================================================= */

function getCatalogSyncUrl(overrideSettings?: ShopSettings) {
  const url = (DEFAULT_APPS_SCRIPT_URL || overrideSettings?.scriptUrl || getSettings().scriptUrl || "").trim();
  return url ? `${url}${url.includes("?") ? "&" : "?"}` : "";
}

/* =========================================================================
   Settings Persistent Store (Backend is Truth, localStorage is Cache)
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
          phoneDisplay:
            typeof parsed.phoneDisplay === "string" && parsed.phoneDisplay
              ? parsed.phoneDisplay
              : DEFAULT_SETTINGS.phoneDisplay,
          email: typeof parsed.email === "string" && parsed.email ? parsed.email : DEFAULT_SETTINGS.email,
          address: typeof parsed.address === "string" && parsed.address ? parsed.address : DEFAULT_SETTINGS.address,
          minOrder: typeof parsed.minOrder === "number" && !isNaN(parsed.minOrder) ? parsed.minOrder : DEFAULT_SETTINGS.minOrder,
          discount: typeof parsed.discount === "number" && !isNaN(parsed.discount) ? parsed.discount : DEFAULT_SETTINGS.discount,
          // Central deployed Apps Script URL is authoritative; local cache serves as fallback only
          scriptUrl: DEFAULT_APPS_SCRIPT_URL || (typeof parsed.scriptUrl === "string" && parsed.scriptUrl ? parsed.scriptUrl : DEFAULT_SETTINGS.scriptUrl),
        };
      }
    }
  } catch (err) {
    console.warn("Could not parse saved settings from localStorage, using defaults", err);
  }
  return { ...DEFAULT_SETTINGS };
}

function commitSettingsToClientCache(settings: ShopSettings) {
  cachedSettings = settings;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
      window.dispatchEvent(new Event("nambi_settings_updated"));
    } catch (err) {
      console.error("Failed to write settings to local cache", err);
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

/**
 * Persists ShopSettings permanently to Backend first, then updates local cache.
 */
export async function saveSettingsToServer(settings: ShopSettings): Promise<{ success: boolean; error?: string }> {
  const payloadSettings: ShopSettings = {
    ...settings,
    scriptUrl: DEFAULT_APPS_SCRIPT_URL || settings.scriptUrl || DEFAULT_SETTINGS.scriptUrl,
  };
  const url = getCatalogSyncUrl(payloadSettings);
  if (!url || typeof window === "undefined") {
    commitSettingsToClientCache(payloadSettings);
    return { success: true };
  }

  try {
    // 1. Native saveSettings endpoint
    const nativeBody = new URLSearchParams({
      action: "saveSettings",
      settings: JSON.stringify(payloadSettings),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: nativeBody,
    });

    const data = await response.json().catch(() => ({}));
    if (data && data.success === false) {
      throw new Error(data.error || "Backend rejected settings save");
    }

    // 2. Also sync to catalog payload so both storage representations stay synchronized
    try {
      const currentState = getCatalogState();
      const categoriesWithSettings = currentState.categories.map((c, idx) => {
        if (idx === 0) {
          return { ...c, _shopSettings: payloadSettings };
        }
        return c;
      });

      const catBody = new URLSearchParams({
        action: "saveCatalog",
        catalog: JSON.stringify({
          categories: categoriesWithSettings,
          settings: payloadSettings,
        }),
      });

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: catBody,
      });
    } catch (eCat) {
      // Non-blocking fallback
    }

    // CONFIRMED SUCCESS -> Update local cache and state
    commitSettingsToClientCache(payloadSettings);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to persist settings to backend:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function updateSettings(
  partial: Partial<ShopSettings>,
): Promise<{ success: boolean; error?: string; settings: ShopSettings }> {
  const current = getSettings();
  const updated: ShopSettings = {
    ...current,
    ...partial,
  };
  const result = await saveSettingsToServer(updated);
  if (!result.success) {
    return {
      success: false,
      ...(result.error ? { error: result.error } : {}),
      settings: current,
    };
  }
  return { success: true, settings: updated };
}

export async function resetSettingsToDefault(): Promise<{ success: boolean; error?: string }> {
  return await saveSettingsToServer({ ...DEFAULT_SETTINGS });
}

/* =========================================================================
   Catalog Persistent Store (Backend is Truth, localStorage is Cache)
   ========================================================================= */

/**
 * Initializes catalog from local cache or fallback.
 * NOTE: NEVER sends fallback to the server on load (prevents reverse synchronization bugs).
 */
function loadCatalogFromStorage(): CatalogState {
  if (typeof window === "undefined") {
    return getBaseCatalogFallback();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    if (raw) {
      const parsed = JSON.parse(raw) as { categories: Category[] };
      if (parsed && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        const categories: Category[] = parsed.categories.map((c) => {
          const products: Product[] = c.products.map((p) => {
            const baseImg = BASE_PRODUCT_IMAGE_MAP[p.name];
            const isExplicitlyRemoved = p.image === null && p.showImage === false;
            const hasCustomImage = typeof p.image === "string" && p.image.trim() !== "";
            const finalImg = isExplicitlyRemoved ? null : hasCustomImage ? p.image : baseImg ?? null;
            const showImg = isExplicitlyRemoved ? false : Boolean(p.showImage ?? (finalImg !== null));
            return {
              ...p,
              image: finalImg,
              showImage: showImg,
              active: p.active !== false,
            };
          });
          return {
            ...c,
            products,
          };
        });
        const products = categories.flatMap((c) => c.products);
        return { categories, products };
      }
    }
  } catch (err) {
    console.warn("Could not parse saved catalog from localStorage, falling back to base catalog", err);
  }

  return getBaseCatalogFallback();
}

function getBaseCatalogFallback(): CatalogState {
  const categories: Category[] = BASE_CATEGORIES.map((c, i) => ({
    ...c,
    active: true,
    order: i,
    isDemo: false,
    products: c.products.map((p) => ({
      ...p,
      active: true,
      isDemo: false,
      image: p.image || BASE_PRODUCT_IMAGE_MAP[p.name] || null,
      showImage: Boolean(p.image || BASE_PRODUCT_IMAGE_MAP[p.name]),
    })),
  }));

  const products = categories.flatMap((c) => c.products);
  return { categories, products };
}

function commitCatalogToClientCache(state: CatalogState) {
  cachedCatalog = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY_CATALOG,
        JSON.stringify({ categories: state.categories }),
      );
      window.dispatchEvent(new Event("nambi_catalog_updated"));
    } catch (err) {
      console.error("Failed to write catalog to local cache", err);
    }
  }
  notifyListeners();
}

export function getCatalogState(): CatalogState {
  if (!cachedCatalog) {
    cachedCatalog = loadCatalogFromStorage();
  }
  return cachedCatalog;
}

let backgroundSyncTimer: ReturnType<typeof setTimeout> | null = null;
let isSavingCatalogToServer = false;
let pendingCatalogSyncState: CatalogState | null = null;

export async function persistCatalogDirectlyToServer(
  state: CatalogState,
  customSettings?: ShopSettings,
): Promise<{ success: boolean; error?: string }> {
  const currentSettings = customSettings || getSettings();
  const url = getCatalogSyncUrl(currentSettings);
  if (!url || typeof window === "undefined") {
    return { success: true };
  }

  try {
    const categoriesWithSettings = state.categories.map((c, idx) => {
      if (idx === 0) {
        return { ...c, _shopSettings: currentSettings };
      }
      return c;
    });

    const body = new URLSearchParams({
      action: "saveCatalog",
      catalog: JSON.stringify({
        categories: categoriesWithSettings,
        settings: currentSettings,
      }),
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json().catch(() => ({}));
    if (data && data.success === false) {
      throw new Error(data.error || "Backend rejected catalog save");
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Failed to persist catalog to backend:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export function scheduleCatalogBackgroundSync(state: CatalogState) {
  pendingCatalogSyncState = state;

  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer);
  }

  backgroundSyncTimer = setTimeout(async () => {
    backgroundSyncTimer = null;
    await processPendingCatalogSync();
  }, 350);
}

async function processPendingCatalogSync() {
  if (isSavingCatalogToServer || !pendingCatalogSyncState) {
    return;
  }

  const stateToSend = pendingCatalogSyncState;
  pendingCatalogSyncState = null;
  isSavingCatalogToServer = true;

  try {
    await persistCatalogDirectlyToServer(stateToSend);
  } catch (err) {
    console.error("Background catalog sync error:", err);
  } finally {
    isSavingCatalogToServer = false;
    if (pendingCatalogSyncState) {
      void processPendingCatalogSync();
    }
  }
}

/**
 * Sends catalog permanently to Backend and returns confirmation.
 * Also commits to local cache immediately so the UI is instantaneous.
 */
export async function saveCatalogToServer(
  state: CatalogState,
  customSettings?: ShopSettings,
): Promise<{ success: boolean; error?: string }> {
  // Commit to local cache immediately so UI is optimistic and instant
  commitCatalogToClientCache(state);

  // Clear any pending debounced sync since we are doing an immediate direct save
  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer);
    backgroundSyncTimer = null;
  }
  pendingCatalogSyncState = null;

  return await persistCatalogDirectlyToServer(state, customSettings);
}

/**
 * Loads the latest data from the backend source of truth and synchronizes client cache.
 */
export async function loadCatalogFromServer(): Promise<boolean> {
  const url = getCatalogSyncUrl();
  if (!url || typeof window === "undefined" || isSyncingRemote) return false;

  isSyncingRemote = true;
  try {
    const response = await fetch(`${url}action=catalog`);
    const data = await response.json();
    if (!data || !data.success) {
      return false;
    }

    let loadedAny = false;

    // 1. Process any backend settings returned in payload or attached to categories
    const backendSettings: ShopSettings | undefined =
      data.settings || (Array.isArray(data.categories) && data.categories[0]?._shopSettings);

    if (backendSettings && typeof backendSettings === "object") {
      const mergedSettings: ShopSettings = {
        name: typeof backendSettings.name === "string" && backendSettings.name ? backendSettings.name : DEFAULT_SETTINGS.name,
        phone: typeof backendSettings.phone === "string" && backendSettings.phone ? backendSettings.phone : DEFAULT_SETTINGS.phone,
        phoneDisplay:
          typeof backendSettings.phoneDisplay === "string" && backendSettings.phoneDisplay
            ? backendSettings.phoneDisplay
            : DEFAULT_SETTINGS.phoneDisplay,
        email: typeof backendSettings.email === "string" && backendSettings.email ? backendSettings.email : DEFAULT_SETTINGS.email,
        address:
          typeof backendSettings.address === "string" && backendSettings.address
            ? backendSettings.address
            : DEFAULT_SETTINGS.address,
        minOrder:
          typeof backendSettings.minOrder === "number" && !isNaN(backendSettings.minOrder)
            ? backendSettings.minOrder
            : DEFAULT_SETTINGS.minOrder,
        discount:
          typeof backendSettings.discount === "number" && !isNaN(backendSettings.discount)
            ? backendSettings.discount
            : DEFAULT_SETTINGS.discount,
        scriptUrl:
          DEFAULT_APPS_SCRIPT_URL ||
          (typeof backendSettings.scriptUrl === "string" && backendSettings.scriptUrl
            ? backendSettings.scriptUrl
            : DEFAULT_SETTINGS.scriptUrl),
      };
      commitSettingsToClientCache(mergedSettings);
      loadedAny = true;
    }

    // 2. Process categories & products
    if (Array.isArray(data.categories) && data.categories.length > 0) {
      const categories: Category[] = (data.categories as Category[]).map((c) => {
        const products: Product[] = (c.products || []).map((p) => {
          const baseImg = BASE_PRODUCT_IMAGE_MAP[p.name];
          const isExplicitlyRemoved = p.image === null && p.showImage === false;
          const hasCustomImage = typeof p.image === "string" && p.image.trim() !== "";
          const finalImg = isExplicitlyRemoved ? null : hasCustomImage ? p.image : baseImg ?? null;
          const showImg = isExplicitlyRemoved ? false : Boolean(p.showImage ?? (finalImg !== null));
          return {
            ...p,
            image: finalImg,
            showImage: showImg,
            active: p.active !== false,
          };
        });
        return {
          ...c,
          products,
        };
      });

      const state: CatalogState = { categories, products: categories.flatMap((category) => category.products) };
      commitCatalogToClientCache(state);
      loadedAny = true;
    }

    return loadedAny;
  } catch (err) {
    console.warn("Could not load latest catalog from Apps Script backend, using client cache", err);
    return false;
  } finally {
    isSyncingRemote = false;
  }
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
   Catalog CRUD Mutations (Admin -> Backend First -> Local Cache -> Customer)
   ========================================================================= */

export async function addProductToStore(
  product: Product,
  categoryName: string,
): Promise<{ success: boolean; error?: string }> {
  console.log("[NAMBI-ADD-PRODUCT-DIAG] (3) addProductToStore() executed with:", {
    productName: product.name,
    productId: product.id,
    categoryName,
  });

  const currentSettings = getSettings();
  const url = (DEFAULT_APPS_SCRIPT_URL || currentSettings.scriptUrl).trim();

  console.log("[NAMBI-ADD-PRODUCT-DIAG] (4 & 5) Backend script URL resolution:", {
    scriptUrlFromSettings: currentSettings.scriptUrl,
    DEFAULT_APPS_SCRIPT_URL,
    resolvedUrl: url,
    isBrowser: typeof window !== "undefined",
  });

  // If in non-browser or offline environment without backend URL, update local cache only
  if (!url || typeof window === "undefined") {
    console.warn("[NAMBI-ADD-PRODUCT-DIAG] (4-FAIL) No script URL found or running in SSR. Updating local cache only.");
    const state = getCatalogState();
    let foundCat = false;

    const updatedCategories: Category[] = state.categories.map((cat) => {
      if (cat.name.toLowerCase() === categoryName.trim().toLowerCase()) {
        foundCat = true;
        return {
          ...cat,
          products: [product, ...cat.products],
        };
      }
      return cat;
    });

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
    commitCatalogToClientCache({ categories: updatedCategories, products: updatedProducts });
    return { success: true };
  }

  try {
    // 1. Send POST request directly to the dedicated Apps Script addProduct endpoint
    const body = new URLSearchParams({
      action: "addProduct",
      categoryName: categoryName.trim(),
      product: JSON.stringify(product),
    });

    console.log("[NAMBI-ADD-PRODUCT-DIAG] (6 & 7) POST request created and dispatching fetch:", {
      url,
      method: "POST",
      actionParam: "addProduct",
      categoryName: categoryName.trim(),
      payloadSize: body.toString().length,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    console.log("[NAMBI-ADD-PRODUCT-DIAG] (8) HTTP Response status received:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const rawText = await response.text();
    console.log("[NAMBI-ADD-PRODUCT-DIAG] (9) Raw response text from Apps Script:", rawText);

    let data: any = {};
    try {
      data = JSON.parse(rawText);
      console.log("[NAMBI-ADD-PRODUCT-DIAG] (10) Parsed JSON response object:", data);
    } catch (parseErr) {
      console.error("[NAMBI-ADD-PRODUCT-DIAG] (10-ERR) Failed to parse JSON response:", parseErr);
      return { success: false, error: "Invalid JSON response from server: " + rawText.slice(0, 200) };
    }

    if (!data || data.success === false) {
      const errorMsg = data?.error || "Backend rejected product addition";
      console.error("[NAMBI-ADD-PRODUCT-DIAG] (10-REJECTED) Backend returned error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    // 2. Only after confirmed successful backend save to Products sheet, update local cache
    const savedProduct: Product =
      data.product && typeof data.product === "object"
        ? { ...product, ...data.product }
        : product;

    console.log("[NAMBI-ADD-PRODUCT-DIAG] (10-SUCCESS) Product confirmed saved on backend, updating local state:", {
      hasReturnedProduct: Boolean(data.product),
      savedProduct,
    });

    const state = getCatalogState();
    let foundCat = false;

    const updatedCategories: Category[] = state.categories.map((cat) => {
      if (cat.name.toLowerCase() === categoryName.trim().toLowerCase()) {
        foundCat = true;
        return {
          ...cat,
          products: [savedProduct, ...cat.products.filter((p) => p.id !== savedProduct.id)],
        };
      }
      return cat;
    });

    if (!foundCat) {
      updatedCategories.push({
        name: categoryName.trim(),
        products: [savedProduct],
        active: true,
        order: updatedCategories.length,
        isDemo: false,
      });
    }

    const updatedProducts = updatedCategories.flatMap((c) => c.products);
    const newState = { categories: updatedCategories, products: updatedProducts };
    commitCatalogToClientCache(newState);

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[NAMBI-ADD-PRODUCT-DIAG] (FETCH-EXCEPTION) Exception during addProduct:", errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

export async function updateProductInStore(
  updated: Product,
  targetCategoryName?: string,
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  let targetFound = false;

  const updatedCategories: Category[] = state.categories.map((cat) => {
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
        return {
          ...cat,
          products: [...cat.products, updated],
        };
      }
    } else if (hasProduct) {
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
  return await saveCatalogToServer({ categories: updatedCategories, products: updatedProducts });
}

export async function deleteProductFromStore(
  productId: number,
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  const updatedCategories: Category[] = state.categories.map((cat) => ({
    ...cat,
    products: cat.products.filter((p) => p.id !== productId),
  }));
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  return await saveCatalogToServer({ categories: updatedCategories, products: updatedProducts });
}

export async function toggleProductActiveInStore(
  productId: number,
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  const updatedCategories: Category[] = state.categories.map((cat) => ({
    ...cat,
    products: cat.products.map((p) =>
      p.id === productId ? { ...p, active: p.active === false ? true : false } : p,
    ),
  }));
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  const newState = { categories: updatedCategories, products: updatedProducts };
  commitCatalogToClientCache(newState);
  scheduleCatalogBackgroundSync(newState);
  return { success: true };
}

export async function addCategoryToStore(
  categoryName: string,
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  if (state.categories.some((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase())) {
    return { success: true };
  }
  const newCat: Category = {
    name: categoryName.trim(),
    products: [],
    active: true,
    order: state.categories.length,
    isDemo: false,
  };
  const updatedCategories = [...state.categories, newCat];
  return await saveCatalogToServer({ categories: updatedCategories, products: state.products });
}

export async function updateCategoryInStore(
  oldName: string,
  updated: { name?: string; active?: boolean; hideImages?: boolean },
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  const updatedCategories: Category[] = state.categories.map((cat) => {
    if (cat.name.toLowerCase() === oldName.trim().toLowerCase()) {
      const newName = updated.name !== undefined ? updated.name.trim() : cat.name;
      const newActive = updated.active !== undefined ? updated.active : cat.active;
      const newHideImages = updated.hideImages !== undefined ? updated.hideImages : cat.hideImages;
      return {
        ...cat,
        name: newName,
        ...(newActive !== undefined ? { active: newActive } : {}),
        ...(newHideImages !== undefined ? { hideImages: newHideImages } : {}),
      };
    }
    return cat;
  });
  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  return await saveCatalogToServer({ categories: updatedCategories, products: updatedProducts });
}

export async function deleteCategoryFromStore(
  categoryName: string,
): Promise<{ success: boolean; error?: string }> {
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
  return await saveCatalogToServer({ categories: updatedCategories, products: updatedProducts });
}

export async function reorderCategoryInStore(
  categoryName: string,
  direction: "up" | "down",
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  const idx = state.categories.findIndex(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (idx === -1) return { success: true };

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= state.categories.length) return { success: true };

  const categoriesCopy = [...state.categories];
  const removed = categoriesCopy[idx];
  if (!removed) return { success: true };

  categoriesCopy.splice(idx, 1);
  categoriesCopy.splice(targetIdx, 0, removed);

  const reindexed: Category[] = categoriesCopy.map((c, i) => ({ ...c, order: i }));
  const newState = { categories: reindexed, products: state.products };

  // 1. Instant optimistic update to UI and cache (< 1ms)
  commitCatalogToClientCache(newState);

  // 2. Debounced background sync to backend
  scheduleCatalogBackgroundSync(newState);

  return { success: true };
}

export async function reorderProductInCategory(
  categoryName: string,
  productId: number,
  direction: "up" | "down",
): Promise<{ success: boolean; error?: string }> {
  const state = getCatalogState();
  const targetCategory = state.categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (!targetCategory) return { success: true };

  const idx = targetCategory.products.findIndex((p) => p.id === productId);
  if (idx === -1) return { success: true };

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= targetCategory.products.length) return { success: true };

  const productList = [...targetCategory.products];
  const removed = productList[idx];
  if (!removed) return { success: true };

  productList.splice(idx, 1);
  productList.splice(targetIdx, 0, removed);

  const updatedCategories: Category[] = state.categories.map((cat) =>
    cat.name.toLowerCase() === categoryName.trim().toLowerCase()
      ? { ...cat, products: productList }
      : cat,
  );

  const updatedProducts = updatedCategories.flatMap((c) => c.products);
  const newState = { categories: updatedCategories, products: updatedProducts };

  // 1. Instant optimistic update to UI and cache (< 1ms)
  commitCatalogToClientCache(newState);

  // 2. Debounced background sync to backend
  scheduleCatalogBackgroundSync(newState);

  return { success: true };
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

export async function resetAdminDemoData(currentOrders?: Array<{
  orderId?: string;
  name?: string;
  mobile?: string;
  items?: string;
  isDemo?: boolean;
  timestamp?: string;
}>): Promise<{
  removedDemoProducts: number;
  removedDemoCategories: number;
  removedDemoStatuses: number;
  removedDemoOrders: number;
  success: boolean;
  error?: string;
}> {
  const state = getCatalogState();
  let removedDemoProducts = 0;
  let removedDemoCategories = 0;

  const cleanedCategories: Category[] = state.categories
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
  const saveResult = await saveCatalogToServer({ categories: cleanedCategories, products: cleanedProducts });

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
    success: saveResult.success,
    ...(saveResult.error ? { error: saveResult.error } : {}),
  };
}

/* =========================================================================
   React Hooks for Real Backend Single Source of Truth
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

  const refreshCatalog = useCallback(async () => {
    await loadCatalogFromServer();
  }, []);

  useEffect(() => {
    setState(getCatalogState());
    setCurrentSettings(getSettings());
    if (!remoteCatalogSyncStarted) {
      remoteCatalogSyncStarted = true;
      loadCatalogFromServer().then((success) => {
        if (!success) {
          remoteCatalogSyncStarted = false;
        }
      });
    }
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
    refreshCatalog,
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
