import type { ReactNode } from "react";
import type { LandlordCapabilities } from "../lib/landlord-access";
import type { WorkspaceBranding } from "../lib/branding";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearOfflineMutationQueue } from "../lib/api";

export interface TenantPortalIdentity {
  id: string;
  role: "tenant";
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  propertyName: string;
  unitNumber: string | null;
  unitType?: string | null;
  landlordCompany: string;
  landlordName: string;
  branding?: WorkspaceBranding;
  billingFrequency?: string;
  billingFrequencyLabel?: string;
  billingCyclePrice?: number;
  billingCyclePriceFormatted?: string;
  billingSchedule?: string;
  annualRent?: number;
  annualRentFormatted?: string;
  monthlyEquivalent?: number;
  monthlyEquivalentFormatted?: string;
  leaseTotal?: number;
  leaseTotalFormatted?: string;
  currentDue?: number;
  currentDueFormatted?: string;
  totalPaidThisLease?: number;
  totalPaidThisLeaseFormatted?: string;
  leaseStart?: string;
  leaseEnd?: string;
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
  plan?: "basic" | "full_service";
  planKey?: string | null;
  subscriptionModel?: string | null;
  subscriptionInterval?: string | null;
  capabilities?: LandlordCapabilities;
  branding?: WorkspaceBranding;
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

export interface CaretakerPortalIdentity {
  id: string;
  role: "caretaker";
  organizationName: string;
  contactName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  serviceType?: string | null;
  assignmentsCount?: number;
  landlordCount?: number;
  scopedPropertyCount?: number;
}

export interface CaretakerPortalSession {
  token: string;
  expiresAt: string;
  caretaker: CaretakerPortalIdentity;
}

interface TenantSessionValue {
  isHydrated: boolean;
  tenantSession: TenantPortalSession | null;
  landlordSession: LandlordPortalSession | null;
  adminSession: AdminPortalSession | null;
  caretakerSession: CaretakerPortalSession | null;
  saveTenantSession: (session: TenantPortalSession) => void;
  saveLandlordSession: (session: LandlordPortalSession) => void;
  saveAdminSession: (session: AdminPortalSession) => void;
  saveCaretakerSession: (session: CaretakerPortalSession) => void;
  clearTenantSession: () => void;
  clearLandlordSession: () => void;
  clearAdminSession: () => void;
  clearCaretakerSession: () => void;
  clearAllSessions: () => void;
}

const TENANT_SESSION_STORAGE_KEY = "doorrent.tenant.session";
const LANDLORD_SESSION_STORAGE_KEY = "doorrent.landlord.session";
const ADMIN_SESSION_STORAGE_KEY = "doorrent.admin.session";
const CARETAKER_SESSION_STORAGE_KEY = "doorrent.caretaker.session";
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
  identityKey: "tenant" | "landlord" | "superAdmin" | "caretaker",
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
  const [caretakerSession, setCaretakerSession] =
    useState<CaretakerPortalSession | null>(null);
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
    setCaretakerSession(
      loadStoredSession<CaretakerPortalSession>(
        CARETAKER_SESSION_STORAGE_KEY,
        "caretaker",
      ),
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

  const saveCaretakerSession = useCallback((session: CaretakerPortalSession) => {
    setCaretakerSession(session);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CARETAKER_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    }
  }, []);

  const clearTenantSession = useCallback(() => {
    setTenantSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TENANT_SESSION_STORAGE_KEY);
    }

    void clearOfflineMutationQueue();
  }, []);

  const clearLandlordSession = useCallback(() => {
    setLandlordSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LANDLORD_SESSION_STORAGE_KEY);
    }

    void clearOfflineMutationQueue();
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }

    void clearOfflineMutationQueue();
  }, []);

  const clearCaretakerSession = useCallback(() => {
    setCaretakerSession(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CARETAKER_SESSION_STORAGE_KEY);
    }

    void clearOfflineMutationQueue();
  }, []);

  const clearAllSessions = useCallback(() => {
    clearTenantSession();
    clearLandlordSession();
    clearAdminSession();
    clearCaretakerSession();
  }, [
    clearAdminSession,
    clearCaretakerSession,
    clearLandlordSession,
    clearTenantSession,
  ]);

  const value = useMemo(
    () => ({
      isHydrated,
      tenantSession,
      landlordSession,
      adminSession,
      caretakerSession,
      saveTenantSession,
      saveLandlordSession,
      saveAdminSession,
      saveCaretakerSession,
      clearTenantSession,
      clearLandlordSession,
      clearAdminSession,
      clearCaretakerSession,
      clearAllSessions,
    }),
    [
      adminSession,
      caretakerSession,
      clearAdminSession,
      clearAllSessions,
      clearCaretakerSession,
      clearLandlordSession,
      clearTenantSession,
      isHydrated,
      landlordSession,
      saveAdminSession,
      saveCaretakerSession,
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

export function useCaretakerPortalSession() {
  const context = useContext(TenantSessionContext);

  if (!context) {
    throw new Error("useCaretakerPortalSession must be used within TenantSessionProvider");
  }

  return context;
}
