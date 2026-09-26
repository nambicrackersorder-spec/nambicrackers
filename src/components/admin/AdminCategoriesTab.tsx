import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  ChevronDown,
  ChevronUp,
  Layers,
  ImageOff,
  Eye,
  EyeOff,
  Sparkles,
  Package,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useCatalog, type Category, type Product } from "@/lib/catalog-store";

interface AdminCategoriesTabProps {
  categories: Category[];
  onAddCategory: (categoryName: string) => Promise<{ success: boolean; error?: string }> | void;
  onUpdateCategory?: (
    oldName: string,
    updated: { name?: string; active?: boolean; hideImages?: boolean },
  ) => Promise<{ success: boolean; error?: string }> | void;
  onDeleteCategory?: (categoryName: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onReorderCategory?: (categoryName: string, direction: "up" | "down") => Promise<{ success: boolean; error?: string }> | void;
  onSelectCategoryFilter?: (categoryName: string) => void;
}

export function AdminCategoriesTab({
  categories: initialCategories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategory,
  onSelectCategoryFilter,
}: AdminCategoriesTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editHideImages, setEditHideImages] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { reorderProduct } = useCatalog();

  // Warning modal for blocked category deletion
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  const toggleExpand = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await onAddCategory(newCatName.trim());
      if (res && res.success === false) {
        setSaveError(res.error || "Failed to create category on server.");
        return;
      }
      setNewCatName("");
      setIsAddModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditActive(cat.active !== false);
    setEditHideImages(!!cat.hideImages);
    setSaveError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;
    if (onUpdateCategory) {
      setIsSaving(true);
      setSaveError(null);
      try {
        const res = await onUpdateCategory(editingCategory.name, {
          name: editName.trim(),
          active: editActive,
          hideImages: editHideImages,
        });
        if (res && res.success === false) {
          setSaveError(res.error || "Failed to update category on server.");
          return;
        }
        setEditingCategory(null);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.products.length > 0) {
      setDeleteWarning(
        `This category contains ${cat.products.length} products. Please move or update those products before deleting the category.`,
      );
      return;
    }

    if (window.confirm(`Are you sure you want to remove the category "${cat.name}"?`)) {
      if (onDeleteCategory) {
        const res = await onDeleteCategory(cat.name);
        if (res && !res.success && res.error) {
          setDeleteWarning(res.error);
        }
      }
    }
  };

  const totalProducts = initialCategories.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-primary sm:text-2xl">
            Category Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize {initialCategories.length} product sections, reorder displays, and manage category availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="btn-gold hover:btn-gold-hover px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 shadow"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total Categories
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">
            {initialCategories.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Active on Store
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-emerald-700">
            {initialCategories.filter((c) => c.active !== false).length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total Listed Items
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-primary">{totalProducts}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase">
            Case Only Categories
          </div>
          <div className="mt-1 text-2xl font-bold font-display text-amber-700">
            {initialCategories.filter((c) => c.products.some((p) => p.caseOnly)).length}
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {initialCategories.map((cat, idx) => {
          const isOpen = expanded[cat.name] ?? false;
          const caseOnlyCount = cat.products.filter((p) => p.caseOnly).length;
          const totalCategoryMRP = cat.products.reduce((s, p) => s + p.rate, 0);
          const totalCategoryOffer = cat.products.reduce((s, p) => s + p.price, 0);
          const isActive = cat.active !== false;

          return (
            <div
              key={cat.name}
              className={`rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all ${
                !isActive ? "opacity-70 bg-muted/20" : ""
              }`}
            >
              {/* Category Header Bar with royal gradient */}
              <div className="cat-bar w-full px-4 py-3 flex items-center justify-between gap-3 text-left">
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.name)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                >
                  <FolderTree className="h-4 w-4 text-amber-300 shrink-0" />
                  <span className="font-display font-bold text-sm sm:text-base tracking-wide text-white truncate">
                    {cat.name}
                  </span>
                  {!isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-600 text-white">
                      Hidden
                    </span>
                  )}
                  {caseOnlyCount > 0 && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-ink">
                      Case Orders
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Reorder Buttons */}
                  {onReorderCategory && (
                    <div className="flex items-center bg-black/20 rounded p-0.5 border border-white/10">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onReorderCategory(cat.name, "up")}
                        className="p-1 text-white hover:text-amber-300 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === initialCategories.length - 1}
                        onClick={() => onReorderCategory(cat.name, "down")}
                        className="p-1 text-white hover:text-amber-300 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Edit Category"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(cat.name)}
                    className="p-1 text-white hover:text-amber-200"
                  >
                    <span className="text-xs font-semibold text-amber-200 mr-1.5">
                      {cat.products.length} Products
                    </span>
                    <ChevronDown
                      className={`inline-block h-4 w-4 text-white transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sub-header meta bar */}
              <div className="px-4 py-2 border-b border-border bg-secondary/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>
                    Total MRP: <strong className="text-foreground">₹{totalCategoryMRP}</strong>
                  </span>
                  <span>&middot;</span>
                  <span>
                    Offer Total:{" "}
                    <strong className="text-primary font-bold">₹{totalCategoryOffer}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {cat.hideImages && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <ImageOff className="h-3 w-3" /> Text-only display
                    </span>
                  )}
                  {onSelectCategoryFilter && (
                    <button
                      type="button"
                      onClick={() => onSelectCategoryFilter(cat.name)}
                      className="text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Filter in Products Tab
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Products list inside Category */}
              {isOpen && (
                <div className="p-3 sm:p-4 bg-background/50">
                  {cat.products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {cat.products.map((p, productIndex) => (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-lg border border-border bg-card shadow-xs flex items-center justify-between gap-2 ${
                            p.active === false ? "opacity-60 bg-muted/20" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-foreground truncate">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {p.tamil}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px]">
                              <span className="line-through text-muted-foreground">₹{p.rate}</span>
                              <span className="font-bold text-primary">₹{p.price}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {p.unit}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {p.caseOnly && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800">
                                Case
                              </span>
                            )}
                            <div className="flex items-center rounded border border-border bg-secondary">
                              <button
                                type="button"
                                onClick={() => reorderProduct(cat.name, p.id, "up")}
                                disabled={productIndex === 0}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Move product up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => reorderProduct(cat.name, p.id, "down")}
                                disabled={productIndex === cat.products.length - 1}
                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                title="Move product down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-xs text-muted-foreground">
                      No products assigned to this category yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning Modal for Deletion Safety */}
      {deleteWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setDeleteWarning(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-400 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-display font-bold text-base text-foreground">
                Cannot Delete Category
              </h3>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed">{deleteWarning}</p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteWarning(null)}
                className="btn-gold hover:btn-gold-hover px-5 py-2 text-xs font-bold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setEditingCategory(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/60 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-lg text-primary">Edit Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-secondary/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-accent"
                  />
                  <span className="text-xs font-bold text-foreground">
                    Active (Visible on Customer Store)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHideImages}
                    onChange={(e) => setEditHideImages(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-accent"
                  />
                  <span className="text-xs text-muted-foreground">
                    Hide thumbnail images for items in this category
                  </span>
                </label>
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setEditingCategory(null);
                    setSaveError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-gold hover:btn-gold-hover px-5 py-2 text-xs font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSaving ? "Saving to Server..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => {
            setIsAddModalOpen(false);
            setSaveError(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gold/60 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-lg text-primary">Create New Category</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSaveError(null);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category Title *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Multi Colour Shots, Mega Night Crackers"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSaveError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-gold hover:btn-gold-hover px-5 py-2 text-xs font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <Sparkles className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSaving ? "Saving to Server..." : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
