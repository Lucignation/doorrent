import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface TenantPortalIdentity {
  id: string;
  role: "tenant";
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  propertyName: string;
  unitNumber: string | null;
  landlordCompany: string;
  landlordName: string;
}

export interface TenantPortalSession {
  token: string;
  expiresAt: string;
  tenant: TenantPortalIdentity;
}

export interface LandlordPortalIdentity {
  id: string;
  role: "landlord";
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  fullName: string;
}

export interface LandlordPortalSession {
  token: string;
  expiresAt: string;
  landlord: LandlordPortalIdentity;
}

export interface AdminPortalIdentity {
  id: string;
  role: "super_admin";
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

export interface AdminPortalSession {
  token: string;
  expiresAt: string;
  superAdmin: AdminPortalIdentity;
}

interface TenantSessionValue {
  isHydrated: boolean;
  tenantSession: TenantPortalSession | null;
  landlordSession: LandlordPortalSession | null;
  adminSession: AdminPortalSession | null;
  saveTenantSession: (session: TenantPortalSession) => void;
  saveLandlordSession: (session: LandlordPortalSession) => void;
  saveAdminSession: (session: AdminPortalSession) => void;
  clearTenantSession: () => void;
  clearLandlordSession: () => void;
  clearAdminSession: () => void;
  clearAllSessions: () => void;
}

const TENANT_SESSION_STORAGE_KEY = "doorrent.tenant.session";
const LANDLORD_SESSION_STORAGE_KEY = "doorrent.landlord.session";
const ADMIN_SESSION_STORAGE_KEY = "doorrent.admin.session";
export const TENANT_LAST_EMAIL_STORAGE_KEY = "doorrent.tenant.last-email";

const TenantSessionContext = createContext<TenantSessionValue | null>(null);

function isExpired(expiresAt: string) {
  return Number.isNaN(new Date(expiresAt).getTime()) || new Date(expiresAt) <= new Date();
}

function loadStoredTenantSession() {
  return loadStoredSession<TenantPortalSession>(TENANT_SESSION_STORAGE_KEY, "tenant");
}

function loadStoredSession<T extends { token: string; expiresAt: string }>(
  key: string,
  identityKey: "tenant" | "landlord" | "superAdmin",
) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as T & Record<string, unknown>;

    if (!parsed?.token || !parsed?.[identityKey] || isExpired(parsed.expiresAt)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function TenantSessionProvider({ children }: { children: ReactNode }) {
  const [tenantSession, setTenantSession] = useState<TenantPortalSession | null>(null);
  const [landlordSession, setLandlordSession] = useState<LandlordPortalSession | null>(
    null,
  );
  const [adminSession, setAdminSession] = useState<AdminPortalSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setTenantSession(loadStoredTenantSession());
    setLandlordSession(
      loadStoredSession<LandlordPortalSession>(
        LANDLORD_SESSION_STORAGE_KEY,
        "landlord",
      ),
    );
    setAdminSession(
      loadStoredSession<AdminPortalSession>(ADMIN_SESSION_STORAGE_KEY, "superAdmin"),
    );
    setIsHydrated(true);
  }, []);

  const saveTenantSession = useCallback((session: TenantPortalSession) => {
    setTenantSession(session);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(TENANT_SESSION_STORAGE_KEY, JSON.stringify(session));
      window.localStorage.setItem(TENANT_LAST_EMAIL_STORAGE_KEY, session.tenant.email);
    }
  }, []);

  const saveLandlordSession = useCallback((session: LandlordPortalSession) => {
    setLandlordSession(session);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LANDLORD_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    }
  }, []);

  const saveAdminSession = useCallback((session: AdminPortalSession) => {
    setAdminSession(session);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, []);

  const clearTenantSession = useCallback(() => {
    setTenantSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TENANT_SESSION_STORAGE_KEY);
    }
  }, []);

  const clearLandlordSession = useCallback(() => {
    setLandlordSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LANDLORD_SESSION_STORAGE_KEY);
    }
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
  }, []);

  const clearAllSessions = useCallback(() => {
    clearTenantSession();
    clearLandlordSession();
    clearAdminSession();
  }, [clearAdminSession, clearLandlordSession, clearTenantSession]);

  const value = useMemo(
    () => ({
      isHydrated,
      tenantSession,
      landlordSession,
      adminSession,
      saveTenantSession,
      saveLandlordSession,
      saveAdminSession,
      clearTenantSession,
      clearLandlordSession,
      clearAdminSession,
      clearAllSessions,
    }),
    [
      adminSession,
      clearAdminSession,
      clearAllSessions,
      clearLandlordSession,
      clearTenantSession,
      isHydrated,
      landlordSession,
      saveAdminSession,
      saveLandlordSession,
      saveTenantSession,
      tenantSession,
    ],
  );

  return (
    <TenantSessionContext.Provider value={value}>
      {children}
    </TenantSessionContext.Provider>
  );
}

export function useTenantPortalSession() {
  const context = useContext(TenantSessionContext);

  if (!context) {
    throw new Error("useTenantPortalSession must be used within TenantSessionProvider");
  }

  return context;
}

export function useLandlordPortalSession() {
  const context = useContext(TenantSessionContext);

  if (!context) {
    throw new Error("useLandlordPortalSession must be used within TenantSessionProvider");
  }

  return context;
}

export function useAdminPortalSession() {
  const context = useContext(TenantSessionContext);

  if (!context) {
    throw new Error("useAdminPortalSession must be used within TenantSessionProvider");
  }

  return context;
}
