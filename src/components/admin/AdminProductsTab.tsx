import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  Package,
  Layers,
  Power,
  Eye,
  EyeOff,
  Upload,
  Link,
  AlertCircle,
} from "lucide-react";
import type { Product, Category } from "@/lib/catalog-store";
import { useSettings } from "@/lib/catalog-store";
import { productImageUrl } from "@/lib/product-image";
import { BASE_PRODUCT_IMAGE_MAP } from "@/data/products";

interface AdminProductsTabProps {
  products: Product[];
  categories: Category[];
  initialCategoryFilter?: string;
  onAddProduct: (product: Product, categoryName: string) => void;
  onUpdateProduct: (product: Product, categoryName: string) => void;
  onDeleteProduct: (productId: number) => void;
  onToggleProductActive?: (productId: number) => void;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export function AdminProductsTab({
  products: initialProducts,
  categories: initialCategories,
  initialCategoryFilter = "all",
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onToggleProductActive,
  isAddModalOpen = false,
  onCloseAddModal,
}: AdminProductsTabProps) {
  const { settings } = useSettings();
  const discountPercent = settings.discount ?? 90;
  const discountFactor = Math.max(0, (100 - discountPercent) / 100);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter);
  const [filterCaseOnly, setFilterCaseOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingProduct, setEditingProduct] = useState<{
    product: Product;
    categoryName: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State for Add / Edit
  const [formName, setFormName] = useState("");
  const [formTamil, setFormTamil] = useState("");
  const [formCategory, setFormCategory] = useState(
    initialCategories[0]?.name || "One Sound Crackers",
  );
  const [formRate, setFormRate] = useState<number>(100);
  const [formPrice, setFormPrice] = useState<number>(Math.round(100 * discountFactor));
  const [formUnit, setFormUnit] = useState("1 Pkt");
  const [formImage, setFormImage] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [imageError, setImageError] = useState(false);
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [formCaseOnly, setFormCaseOnly] = useState(false);
  const [formCaseQty, setFormCaseQty] = useState<number>(10);
  const [formCaseValue, setFormCaseValue] = useState<number>(1000);
  const [formCasePrice, setFormCasePrice] = useState<number>(100);

  const handleOpenCreate = React.useCallback(() => {
    setFormName("");
    setFormTamil("");
    setFormCategory(initialCategories[0]?.name || "One Sound Crackers");
    setFormRate(100);
    setFormPrice(Math.round(100 * discountFactor));
    setFormUnit("1 Pkt");
    setFormImage("");
    setImageInputMode("upload");
    setImageError(false);
    setFileUploadLoading(false);
    setFormActive(true);
    setFormCaseOnly(false);
    setFormCaseQty(10);
    setFormCaseValue(1000);
    setFormCasePrice(Math.round(1000 * discountFactor));
    setIsCreating(true);
    setEditingProduct(null);
  }, [initialCategories, discountFactor]);

  // Sync external add modal trigger
  React.useEffect(() => {
    if (isAddModalOpen) {
      handleOpenCreate();
    }
  }, [isAddModalOpen, handleOpenCreate]);

  const handleOpenEdit = (product: Product) => {
    const cat = initialCategories.find((c) => c.products.some((p) => p.id === product.id));
    const catName = cat?.name || initialCategories[0]?.name || "One Sound Crackers";

    const existingImg =
      product.image ??
      (product.showImage !== false && product.name ? BASE_PRODUCT_IMAGE_MAP[product.name] : "") ??
      "";

    setFormName(product.name);
    setFormTamil(product.tamil);
    setFormCategory(catName);
    setFormRate(product.rate);
    setFormPrice(product.price);
    setFormUnit(product.unit);
    setFormImage(existingImg);
    setImageInputMode(
      existingImg && (existingImg.startsWith("http") || existingImg.startsWith("/"))
        ? "url"
        : "upload",
    );
    setImageError(false);
    setFileUploadLoading(false);
    setFormActive(product.active !== false);
    setFormCaseOnly(!!product.caseOnly);
    setFormCaseQty(product.caseQuantity || 10);
    setFormCaseValue(product.caseValue || product.rate * 10);
    setFormCasePrice(product.casePrice || product.price * 10);
    setEditingProduct({ product, categoryName: catName });
    setIsCreating(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (.jpg, .jpeg, .png, .webp, .gif).");
      return;
    }

    setFileUploadLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/webp", 0.85);
            setFormImage(compressed);
            setImageError(false);
            setFileUploadLoading(false);
            return;
          }
        }
        setFormImage(rawDataUrl);
        setImageError(false);
        setFileUploadLoading(false);
      };
      img.onerror = () => {
        setFormImage(rawDataUrl);
        setImageError(false);
        setFileUploadLoading(false);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormImage("");
    setImageError(false);
  };

  const handleRateChange = (rate: number) => {
    setFormRate(rate);
    // Auto-compute discount offer price using dynamic settings
    setFormPrice(Math.round(rate * discountFactor));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const finalImage = formImage.trim() ? formImage.trim() : null;
    const showImage = Boolean(finalImage);
    const hasCustomPrice = formPrice !== Math.round(formRate * discountFactor);

    if (isCreating) {
      const newProduct: Product = {
        id: Date.now(),
        name: formName.trim(),
        tamil: formTamil.trim() || formName.trim(),
        rate: formRate,
        price: formPrice,
        unit: formUnit.trim() || "1 Pkt",
        slug: formName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image: finalImage,
        showImage,
        active: formActive,
        isDemo: false,
        hasCustomPrice,
        caseOnly: formCaseOnly,
        ...(formCaseOnly
          ? {
              caseQuantity: formCaseQty,
              caseValue: formCaseValue,
              casePrice: formCasePrice,
            }
          : {}),
      };
      onAddProduct(newProduct, formCategory);
      setIsCreating(false);
      if (onCloseAddModal) onCloseAddModal();
    } else if (editingProduct) {
      const updated: Product = {
        ...editingProduct.product,
        name: formName.trim(),
        tamil: formTamil.trim() || formName.trim(),
        rate: formRate,
        price: formPrice,
        unit: formUnit.trim() || "1 Pkt",
        slug: formName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image: finalImage,
        showImage,
        active: formActive,
        hasCustomPrice,
        caseOnly: formCaseOnly,
        ...(formCaseOnly
          ? {
              caseQuantity: formCaseQty,
              caseValue: formCaseValue,
              casePrice: formCasePrice,
            }
          : {}),
      };
      onUpdateProduct(updated, formCategory);
      setEditingProduct(null);
    }
  };

  // Filter products
  const q = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || (p.tamil && p.tamil.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "all" ||
        initialCategories
          .find((c) => c.name === selectedCategory)
          ?.products.some((prod) => prod.id === p.id);

      const matchesCase = !filterCaseOnly || p.caseOnly;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.active !== false) ||
        (statusFilter === "inactive" && p.active === false);

      return matchesSearch && matchesCat && matchesCase && matchesStatus;
    });
  }, [initialProducts, initialCategories, q, selectedCategory, filterCaseOnly, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-primary sm:text-2xl">
            Product Catalogue & Pricing
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage {initialProducts.length} crackers, update rates, {discountPercent}% discount prices, active/inactive status, and case requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-gold hover:btn-gold-hover px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 shadow"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by English or Tamil name..."
              className="w-full rounded-md border border-input bg-background px-3.5 py-2.5 pl-9 text-sm outline-none focus:border-accent"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="all">All Categories ({initialCategories.length})</option>
              {initialCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.products.length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2.5 rounded-md text-xs font-semibold border capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Case Only Toggle */}
          <button
            type="button"
            onClick={() => setFilterCaseOnly(!filterCaseOnly)}
            className={`px-3 py-2.5 rounded-md text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              filterCaseOnly
                ? "bg-accent text-accent-foreground border-accent"
                : "border-input bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Case Only</span>
          </button>
        </div>

        {/* Results summary pill */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-primary">{filteredProducts.length}</strong> of{" "}
            {initialProducts.length} products
          </span>
          {selectedCategory !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className="text-primary hover:underline font-semibold"
            >
              Clear Category Filter
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="cat-bar px-4 py-3 flex items-center justify-between">
          <span className="font-display font-bold text-sm tracking-wide text-white">
            {selectedCategory === "all" ? "All Crackers Inventory" : selectedCategory}
          </span>
          <span className="text-xs text-amber-200 font-semibold">
            {filteredProducts.length} Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-3 text-center w-16">Image</th>
                <th className="p-3">Product Name / Tamil</th>
                <th className="p-3 text-center w-24">Original Rate</th>
                <th className="p-3 text-center w-20">Unit</th>
                <th className="p-3 text-center w-28">Offer Price ({discountPercent}% OFF)</th>
                <th className="p-3 text-center w-24">Status</th>
                <th className="p-3 text-center w-24">Type</th>
                <th className="p-3 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => {
                const imgUrl = productImageUrl(product);
                const isActive = product.active !== false;

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-secondary/40 transition-colors ${!isActive ? "opacity-60 bg-muted/20" : ""}`}
                  >
                    {/* Image Thumbnail */}
                    <td className="p-3 text-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={product.name}
                          loading="lazy"
                          className="h-11 w-11 rounded border border-border object-cover mx-auto shadow-xs"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded border border-dashed border-border bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </td>

                    {/* Product Name & Tamil */}
                    <td className="p-3 min-w-[180px]">
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <span>{product.name}</span>
                        {product.isDemo && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-700 font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{product.tamil || "—"}</div>
                      {product.caseOnly && (
                        <div className="mt-1 text-[11px] text-amber-800 font-medium">
                          Case: {product.caseQuantity} boxes &middot; ₹{product.casePrice}
                        </div>
                      )}
                    </td>

                    {/* Rate */}
                    <td className="p-3 text-center text-muted-foreground line-through text-xs sm:text-sm">
                      ₹{product.rate}
                    </td>

                    {/* Unit */}
                    <td className="p-3 text-center text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted font-medium">
                        {product.unit}
                      </span>
                    </td>

                    {/* Offer Price */}
                    <td className="p-3 text-center">
                      <span className="font-bold text-base text-primary">₹{product.price}</span>
                    </td>

                    {/* Active / Inactive Status */}
                    <td className="p-3 text-center">
                      {onToggleProductActive ? (
                        <button
                          type="button"
                          onClick={() => onToggleProductActive(product.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 mx-auto ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                          }`}
                          title={isActive ? "Click to deactivate" : "Click to activate"}
                        >
                          {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </button>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>

                    {/* Case / Normal Badge */}
                    <td className="p-3 text-center">
                      {product.caseOnly ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Case
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border">
                          Retail
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-md hover:bg-secondary text-primary transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(`Are you sure you want to delete "${product.name}"?`)
                            ) {
                              onDeleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground text-sm">
                    No products matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {(isCreating || editingProduct) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 overflow-y-auto"
          onClick={() => {
            setIsCreating(false);
            setEditingProduct(null);
            if (onCloseAddModal) onCloseAddModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gold/60 bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-lg text-primary">
                  {isCreating ? "Add New Cracker" : "Edit Cracker Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingProduct(null);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Product Name (English) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 1000 Wala, 2 3/4 Kuruvi"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              {/* Tamil Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tamil Name (தமிழ் பெயர்)
                </label>
                <input
                  type="text"
                  value={formTamil}
                  onChange={(e) => setFormTamil(e.target.value)}
                  placeholder="e.g. 1000 வாலா, குருவி பட்டாசு"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              {/* Category & Unit in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    {initialCategories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Unit Packing *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. 1 Pkt, 1 Box, 1 Case, 1 Pcs"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Rate & Offer Price */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary border border-border">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Original Rate (MRP) ₹
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formRate}
                    onChange={(e) => handleRateChange(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Before {discountPercent}% discount
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Offer Price ({discountPercent}% OFF) ₹
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-primary outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                    Customer billed price
                  </span>
                </div>
              </div>

              {/* Product Image Manager */}
              <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Product Image</span>
                  </label>

                  {/* Mode Toggle */}
                  <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        imageInputMode === "upload"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Upload className="h-3 w-3" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        imageInputMode === "url"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Link className="h-3 w-3" />
                      <span>Image URL</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  {/* Input Controls (2 cols) */}
                  <div className="sm:col-span-2 space-y-2">
                    {imageInputMode === "upload" ? (
                      <div>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-3 bg-background/50 hover:bg-background cursor-pointer transition-colors text-center">
                          <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                          <span className="text-xs font-semibold text-foreground">
                            {fileUploadLoading ? "Processing image..." : "Choose an image or drag & drop"}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            Supports PNG, JPG, JPEG, WEBP, GIF
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileChange}
                          />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={formImage}
                          onChange={(e) => {
                            setFormImage(e.target.value);
                            setImageError(false);
                          }}
                          placeholder="https://example.com/image.jpg or Cloudinary path"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Paste any valid public image link (.jpg, .png, .webp, https://...)
                        </p>
                      </div>
                    )}

                    {/* Remove image or replace actions */}
                    {formImage && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove Image</span>
                        </button>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {formImage.startsWith("data:") ? "Local file loaded" : formImage}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live Preview Box (1 col) */}
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-border bg-background">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Live Preview
                    </div>
                    {(() => {
                      const previewSrc = formImage
                        ? formImage.startsWith("http") ||
                          formImage.startsWith("data:") ||
                          formImage.startsWith("blob:") ||
                          formImage.startsWith("/")
                          ? formImage
                          : productImageUrl({ image: formImage, name: formName, slug: "" }) || formImage
                        : null;

                      if (previewSrc && !imageError) {
                        return (
                          <div className="relative group">
                            <img
                              src={previewSrc}
                              alt="Preview"
                              onError={() => setImageError(true)}
                              className="h-20 w-20 rounded-lg border border-border object-cover shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              title="Remove Image"
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow hover:bg-red-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      }
                      if (imageError) {
                        return (
                          <div className="h-20 w-20 rounded-lg border border-dashed border-red-300 bg-red-50 flex flex-col items-center justify-center text-center p-1 text-red-600">
                            <AlertCircle className="h-5 w-5 mb-0.5" />
                            <span className="text-[9px] font-medium leading-tight">Failed to load</span>
                          </div>
                        );
                      }
                      return (
                        <div className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted flex flex-col items-center justify-center text-muted-foreground text-center p-1">
                          <ImageIcon className="h-6 w-6 mb-0.5 opacity-50" />
                          <span className="text-[9px]">No image</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Active Toggle & Case Only */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-accent"
                    />
                    <span className="text-xs font-bold text-foreground">
                      Product Active on Customer Website
                    </span>
                  </label>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      formActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {formActive ? "Visible" : "Hidden"}
                  </span>
                </div>

                <div className="border-t border-border pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCaseOnly}
                      onChange={(e) => setFormCaseOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-accent"
                    />
                    <span className="text-xs font-bold text-foreground">
                      This is a Case-Only order (Bulk)
                    </span>
                  </label>
                </div>

                {formCaseOnly && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Boxes per case
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formCaseQty}
                        onChange={(e) => setFormCaseQty(Number(e.target.value))}
                        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Case MRP ₹
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formCaseValue}
                        onChange={(e) => setFormCaseValue(Number(e.target.value))}
                        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">
                        Case Offer ₹
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formCasePrice}
                        onChange={(e) => setFormCasePrice(Number(e.target.value))}
                        className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-bold text-primary outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingProduct(null);
                    if (onCloseAddModal) onCloseAddModal();
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold hover:btn-gold-hover px-5 py-2 text-xs font-bold shadow"
                >
                  {isCreating ? "Save & Add Product" : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
