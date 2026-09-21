import { useEffect, useState, useCallback } from "react";

export interface StoredAdminAuth {
  adminId: string;
  salt: string;
  hash: string;
  iterations: number;
  updatedAt?: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  loginAt: number;
  expiresAt: number;
}

// Initial Sample Admin Credentials
// Admin ID: admin@nambicrackers.com
// Initial Password: Admin@12345 (Cryptographically hashed with PBKDF2 100,000 iterations)
const INITIAL_SALT = "8fd60b02ac1a15493d6ccbe9749bde7a";
const INITIAL_HASH = "ddbe3d325b99415659239829336a7c06a9f5ce23e1e4d518ebe0ee121e8fdf68";
const INITIAL_ADMIN_ID = "admin@nambicrackers.com";
const PBKDF2_ITERATIONS = 100000;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const STORAGE_KEY_AUTH = "nambi_admin_auth_v2";
const STORAGE_KEY_SESSION = "nambi_admin_session_v2";

/* =========================================================================
   Cryptographic Helpers (Web Crypto API)
   ========================================================================= */

function getCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error("Web Crypto API is not supported in this environment");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateRandomHex(byteCount = 16): string {
  const cryptoObj = getCrypto();
  const bytes = new Uint8Array(byteCount);
  cryptoObj.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashPassword(
  password: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

/* =========================================================================
   Admin Credentials Storage & Verification
   ========================================================================= */

export function getStoredAuth(): StoredAdminAuth {
  if (typeof window === "undefined") {
    return {
      adminId: INITIAL_ADMIN_ID,
      salt: INITIAL_SALT,
      hash: INITIAL_HASH,
      iterations: PBKDF2_ITERATIONS,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.adminId === "string" &&
        typeof parsed.salt === "string" &&
        typeof parsed.hash === "string"
      ) {
        return {
          adminId: parsed.adminId.trim().toLowerCase(),
          salt: parsed.salt,
          hash: parsed.hash,
          iterations: Number(parsed.iterations) || PBKDF2_ITERATIONS,
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch (err) {
    console.warn("Could not parse saved admin auth, fallback to initial setup", err);
  }

  return {
    adminId: INITIAL_ADMIN_ID,
    salt: INITIAL_SALT,
    hash: INITIAL_HASH,
    iterations: PBKDF2_ITERATIONS,
  };
}

export function saveStoredAuth(auth: StoredAdminAuth): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
  } catch (err) {
    console.error("Failed to save admin auth to localStorage", err);
  }
}

/* =========================================================================
   Session Management
   ========================================================================= */

export function getActiveSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY_SESSION) ||
      localStorage.getItem(STORAGE_KEY_SESSION);

    if (raw) {
      const parsed: AdminSession = JSON.parse(raw);
      if (parsed && parsed.token && parsed.expiresAt > Date.now()) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Invalid session data", err);
  }
  return null;
}

export function setSession(adminId: string): AdminSession {
  const token = generateRandomHex(32);
  const now = Date.now();
  const session: AdminSession = {
    token,
    adminId,
    loginAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  if (typeof window !== "undefined") {
    const raw = JSON.stringify(session);
    try {
      sessionStorage.setItem(STORAGE_KEY_SESSION, raw);
      localStorage.setItem(STORAGE_KEY_SESSION, raw);
    } catch (err) {
      console.error("Failed to write admin session", err);
    }
  }

  notifyAuthChange();
  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch (err) {
      console.error("Failed to clear admin session", err);
    }
  }
  notifyAuthChange();
}

/* =========================================================================
   Auth State Listener for Reactive UI Updates
   ========================================================================= */

const authListeners = new Set<() => void>();

function notifyAuthChange() {
  authListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("Auth listener error", e);
    }
  });
}

/* =========================================================================
   Authentication Operations
   ========================================================================= */

export async function loginAdmin(
  adminIdInput: string,
  passwordInput: string,
): Promise<{ success: boolean; error?: string; adminId?: string }> {
  const trimmedId = (adminIdInput || "").trim().toLowerCase();
  const password = passwordInput || "";

  if (!trimmedId) {
    return { success: false, error: "Please enter your Admin ID or Email." };
  }
  if (!password) {
    return { success: false, error: "Please enter your Password." };
  }

  const stored = getStoredAuth();
  if (trimmedId !== stored.adminId.toLowerCase()) {
    return { success: false, error: "Invalid Admin ID/Email or Password." };
  }

  try {
    const computedHash = await hashPassword(password, stored.salt, stored.iterations);
    if (computedHash !== stored.hash) {
      return { success: false, error: "Invalid Admin ID/Email or Password." };
    }

    setSession(stored.adminId);
    return { success: true, adminId: stored.adminId };
  } catch (err) {
    console.error("Login verification error", err);
    return { success: false, error: "Authentication verification failed. Please try again." };
  }
}

export async function updateAdminCredentials(
  currentPasswordInput: string,
  newAdminIdInput: string,
  newPasswordInput: string,
): Promise<{ success: boolean; error?: string }> {
  const currentPassword = currentPasswordInput || "";
  const newAdminId = (newAdminIdInput || "").trim().toLowerCase();
  const newPassword = newPasswordInput || "";

  if (!currentPassword) {
    return { success: false, error: "Please provide your current password." };
  }
  if (!newAdminId) {
    return { success: false, error: "New Admin ID / Email cannot be empty." };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }

  const stored = getStoredAuth();
  const currentHash = await hashPassword(currentPassword, stored.salt, stored.iterations);

  if (currentHash !== stored.hash) {
    return { success: false, error: "Current password is incorrect. Please try again." };
  }

  // Generate new cryptographic salt and hash
  const newSalt = generateRandomHex(16);
  const newHash = await hashPassword(newPassword, newSalt, PBKDF2_ITERATIONS);

  const updatedAuth: StoredAdminAuth = {
    adminId: newAdminId,
    salt: newSalt,
    hash: newHash,
    iterations: PBKDF2_ITERATIONS,
    updatedAt: new Date().toISOString(),
  };

  saveStoredAuth(updatedAuth);
  // Refresh active session with the new Admin ID
  setSession(newAdminId);

  return { success: true };
}

/* =========================================================================
   React Hook: useAdminAuth
   ========================================================================= */

export function useAdminAuth() {
  const [session, setSessionState] = useState<AdminSession | null>(getActiveSession);
  const [currentAuth, setCurrentAuthState] = useState<StoredAdminAuth>(getStoredAuth);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setSessionState(getActiveSession());
    setCurrentAuthState(getStoredAuth());
    setIsInitializing(false);

    const handleUpdate = () => {
      setSessionState(getActiveSession());
      setCurrentAuthState(getStoredAuth());
    };

    authListeners.add(handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      authListeners.delete(handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const login = useCallback(async (adminId: string, pass: string) => {
    const res = await loginAdmin(adminId, pass);
    if (res.success) {
      setSessionState(getActiveSession());
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const changeCredentials = useCallback(
    async (currentPass: string, newId: string, newPass: string) => {
      const res = await updateAdminCredentials(currentPass, newId, newPass);
      if (res.success) {
        setSessionState(getActiveSession());
        setCurrentAuthState(getStoredAuth());
      }
      return res;
    },
    [],
  );

  return {
    isAuthenticated: Boolean(session && session.expiresAt > Date.now()),
    adminId: session?.adminId || currentAuth.adminId,
    isInitializing,
    login,
    logout,
    changeCredentials,
    activeSession: session,
  };
}
