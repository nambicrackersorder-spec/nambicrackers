import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  TrendingUp,
  Settings,
  Store,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  LogOut,
  UserCheck,
} from "lucide-react";
import { SHOP } from "@/config";
import { useSettings } from "@/lib/catalog-store";

export type AdminTab =
  "dashboard" | "products" | "categories" | "orders" | "analytics" | "settings";

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
  orderCount?: number;
  adminId?: string;
  onLogout?: () => void;
}

const NAV_ITEMS: {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "orders", label: "Live Orders", icon: ShoppingBag },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AdminLayout({
  currentTab,
  onTabChange,
  children,
  orderCount = 0,
  adminId,
  onLogout,
}: AdminLayoutProps) {
  const { settings } = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border bg-card">
        {/* Brand Header */}
        <div className="surface-royal p-4 flex items-center gap-3 shadow-md">
          <img
            src="/logo.png"
            alt="Nambi Crackers Logo"
            className="h-10 w-10 shrink-0 rounded-full object-contain border border-gold/40"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold uppercase tracking-wider text-white">
              {settings.name}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-200">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin Control Panel</span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Management
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-amber-300" : "text-muted-foreground"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.id === "orders" && orderCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      active ? "bg-amber-300 text-ink" : "bg-primary/15 text-primary"
                    }`}
                  >
                    {orderCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border bg-secondary/50 space-y-2">
          {adminId && (
            <div className="px-2.5 py-1.5 rounded-md bg-card border border-border flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-medium text-foreground truncate">{adminId}</span>
            </div>
          )}

          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground transition-colors"
          >
            <Store className="h-3.5 w-3.5 text-primary" />
            <span>Open Customer Shop</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
          </Link>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-md border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout Admin</span>
            </button>
          )}

          <div className="px-2 text-[10px] text-muted-foreground text-center">
            {settings.address.split(",")[0]} &middot; {settings.discount}% OFF Portal
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Mobile Top Header */}
        <header className="surface-royal sticky top-0 z-30 flex md:hidden items-center justify-between px-4 py-3 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Nambi Crackers"
              className="h-8 w-8 rounded-full object-contain"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-white">
                {settings.name} Admin
              </p>
              <p className="text-[10px] text-amber-200 font-medium">Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white/15 text-white hover:bg-white/25 flex items-center gap-1"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Shop</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn-gold p-1.5 rounded-md flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-out Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-ink/60 md:hidden flex flex-col justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="bg-card w-4/5 max-w-xs h-full flex flex-col shadow-2xl border-r border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="surface-royal p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span className="font-display font-bold text-white text-sm">
                    Admin Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white hover:text-amber-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${
                            active ? "text-amber-300" : "text-muted-foreground"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.id === "orders" && orderCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            active ? "bg-amber-300 text-ink" : "bg-primary/15 text-primary"
                          }`}
                        >
                          {orderCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-border bg-secondary space-y-2">
                {adminId && (
                  <div className="px-3 py-2 rounded-md bg-card border border-border flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">{adminId}</span>
                  </div>
                )}
                <Link
                  to="/"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-input bg-card font-semibold text-xs"
                >
                  <Store className="h-4 w-4 text-primary" />
                  Customer Shop Frontend
                </Link>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-destructive/30 bg-destructive/10 text-destructive font-semibold text-xs"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout Admin
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Desktop Context Bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-card/70 backdrop-blur">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Admin Portal
            </span>
            <h2 className="text-lg font-bold font-display text-primary capitalize">
              {currentTab === "orders" ? "Live Orders Management" : `${currentTab} Overview`}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent-foreground border border-gold/40">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Sivakasi Live Hub
            </span>
            <Link
              to="/"
              className="btn-gold hover:btn-gold-hover px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            >
              <Store className="h-3.5 w-3.5" />
              Visit Store
            </Link>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center gap-1.5 transition-colors"
                title="Logout from Admin Dashboard"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Tab Content View */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-border bg-card/95 backdrop-blur px-2 py-1 flex justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded transition-colors relative ${
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-primary scale-110" : ""}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.id === "orders" && orderCount > 0 && (
                <span className="absolute -top-0.5 right-1 h-3.5 w-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {orderCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
