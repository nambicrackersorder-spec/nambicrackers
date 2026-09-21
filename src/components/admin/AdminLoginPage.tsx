import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Store,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { useSettings } from "@/lib/catalog-store";

interface AdminLoginPageProps {
  onLoginSuccess?: () => void;
}

export function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const { login } = useAdminAuth();
  const { settings } = useSettings();

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(adminId, password);
      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMessage(result.error || "Invalid Admin ID or Password.");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred during authentication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-[#180909] to-slate-900 text-foreground px-4 py-8 relative overflow-hidden">
      {/* Background ambient festival glow decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between z-10">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 hover:text-amber-300 transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur"
        >
          <Store className="h-3.5 w-3.5 text-amber-400" />
          <span>Customer Shop</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <span>Encrypted Portal</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="max-w-md w-full mx-auto my-auto z-10 py-6">
        <div className="bg-card/95 backdrop-blur-xl border border-gold/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Logo & Brand Header */}
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <img
                src="/logo.png"
                alt="Nambi Crackers"
                className="h-16 w-16 mx-auto rounded-full object-contain border-2 border-gold/60 shadow-lg p-0.5 bg-background/50"
              />
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              </span>
            </div>

            <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground tracking-wide uppercase">
              {settings.name || "Nambi Crackers"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Admin Management System</span>
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin ID / Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-id-input"
                className="block text-xs font-bold text-foreground uppercase tracking-wider"
              >
                Admin ID / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="admin-id-input"
                  type="text"
                  required
                  autoComplete="username"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter Your Email Address"
                  className="w-full rounded-xl border border-input bg-background/80 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-bold text-foreground uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="admin-password-input"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-input bg-background/80 pl-10 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold hover:btn-gold-hover w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99] disabled:opacity-70 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee & Notice */}
          <div className="pt-2 border-t border-border/80 text-center space-y-1 text-[11px] text-muted-foreground">
            <p>Protected Sivakasi Factory Management System</p>
            <p className="text-[10px] text-muted-foreground/70">
              Credentials are authenticated with PBKDF2 cryptography.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="text-center text-xs text-muted-foreground/60 z-10">
        &copy; {new Date().getFullYear()} {settings.name || "Nambi Crackers"}. All Rights Reserved.
      </footer>
    </div>
  );
}
