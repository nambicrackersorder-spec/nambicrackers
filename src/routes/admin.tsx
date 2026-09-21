import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { APPS_SCRIPT_URL, SHOP } from "@/config";
import {
  useCatalog,
  useOrderStatusMap,
  useSettings,
  filterRealOrders,
  type Product,
  type Category,
} from "@/lib/catalog-store";
import { AdminLayout, type AdminTab } from "@/components/admin/AdminLayout";
import { AdminDashboardTab, type OrderRecord } from "@/components/admin/AdminDashboardTab";
import { AdminProductsTab } from "@/components/admin/AdminProductsTab";
import { AdminCategoriesTab } from "@/components/admin/AdminCategoriesTab";
import { AdminOrdersTab } from "@/components/admin/AdminOrdersTab";
import { AdminAnalyticsTab } from "@/components/admin/AdminAnalyticsTab";
import { AdminSettingsTab } from "@/components/admin/AdminSettingsTab";
import { AdminLoginPage } from "@/components/admin/AdminLoginPage";
import { useAdminAuth } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control Panel — Nambi Crackers Sivakasi" },
      {
        name: "description",
        content: "Nambi Crackers Sivakasi administration, orders and inventory control.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

async function fetchLiveOrders(scriptUrl: string): Promise<OrderRecord[]> {
  try {
    const url = scriptUrl || APPS_SCRIPT_URL;
    const res = await fetch(`${url}?action=list`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to load orders");
    return (data.orders ?? []) as OrderRecord[];
  } catch (err) {
    console.warn("Could not fetch remote orders, fallback to mock/empty", err);
    throw err;
  }
}

function AdminPage() {
  const { isAuthenticated, isInitializing, adminId, logout } = useAdminAuth();
  const [currentTab, setCurrentTab] = useState<AdminTab>("dashboard");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("all");

  const { settings } = useSettings();

  const {
    categories,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategory,
  } = useCatalog();

  const { statusMap, setOrderStatus } = useOrderStatusMap();

  // Live Orders Query
  const {
    data: fetchedOrders,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-orders", settings.scriptUrl],
    queryFn: () => fetchLiveOrders(settings.scriptUrl),
    refetchInterval: 30000,
    retry: 1,
  });

  const rawOrders: OrderRecord[] = (fetchedOrders ?? []).map((o, idx) => {
    const orderKey = o.orderId || `${o.timestamp}-${idx}`;
    return {
      ...o,
      status:
        statusMap[orderKey] ||
        (o.orderId && statusMap[o.orderId]) ||
        (o.timestamp && statusMap[`${o.timestamp}-${o.name || ""}`]) ||
        statusMap[String(idx)] ||
        o.status ||
        "Confirmed",
    };
  });

  const orders: OrderRecord[] = filterRealOrders(rawOrders);

  // Active in-progress orders (Confirmed, Payment Completed, Shipped)
  const activeLiveOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = (o.status || "Confirmed").toLowerCase();
      return !s.includes("deliver") && !s.includes("cancel");
    });
  }, [orders]);

  const handleUpdateOrderStatus = async (
    orderIdentifier: string | number,
    newStatus: string,
    order?: OrderRecord,
  ) => {
    const orderId = typeof orderIdentifier === "string" ? (order?.orderId || orderIdentifier) : undefined;

    if (orderId && settings.scriptUrl) {
      try {
        const url = `${settings.scriptUrl}?action=updateStatus&orderId=${encodeURIComponent(String(orderId))}&status=${encodeURIComponent(newStatus)}`;
        await fetch(url);
      } catch (err) {
        console.warn("Could not sync order status to Apps Script", err);
      }
    }

    if (typeof orderIdentifier === "number") {
      const target = orders[orderIdentifier];
      if (target) {
        if (target.orderId) setOrderStatus(target.orderId, newStatus);
        if (target.timestamp) setOrderStatus(`${target.timestamp}-${target.name || ""}`, newStatus);
        setOrderStatus(`${target.timestamp}-${orderIdentifier}`, newStatus);
        setOrderStatus(String(orderIdentifier), newStatus);
      }
    } else {
      if (order?.orderId) setOrderStatus(order.orderId, newStatus);
      if (order?.timestamp) setOrderStatus(`${order.timestamp}-${order.name || ""}`, newStatus);
      setOrderStatus(String(orderIdentifier), newStatus);
    }
  };

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return (
    <AdminLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      orderCount={activeLiveOrders.length}
      adminId={adminId}
      onLogout={logout}
    >
      {currentTab === "dashboard" && (
        <AdminDashboardTab
          orders={orders}
          isLoading={isLoading}
          onNavigateTab={setCurrentTab}
          onOpenAddProduct={() => {
            setCurrentTab("products");
            setIsAddProductOpen(true);
          }}
        />
      )}

      {currentTab === "products" && (
        <AdminProductsTab
          products={products}
          categories={categories}
          initialCategoryFilter={productCategoryFilter}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onDeleteProduct={deleteProduct}
          onToggleProductActive={toggleProductActive}
          isAddModalOpen={isAddProductOpen}
          onCloseAddModal={() => setIsAddProductOpen(false)}
        />
      )}

      {currentTab === "categories" && (
        <AdminCategoriesTab
          categories={categories}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          onReorderCategory={reorderCategory}
          onSelectCategoryFilter={(catName) => {
            setProductCategoryFilter(catName);
            setCurrentTab("products");
          }}
        />
      )}

      {currentTab === "orders" && (
        <AdminOrdersTab
          orders={orders}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          refetch={refetch}
          dataUpdatedAt={dataUpdatedAt}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}

      {currentTab === "analytics" && (
        <AdminAnalyticsTab orders={orders} categories={categories} products={products} />
      )}

      {currentTab === "settings" && (
        <AdminSettingsTab orders={orders} />
      )}
    </AdminLayout>
  );
}
