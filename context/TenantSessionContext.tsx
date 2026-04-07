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
import { clearOfflineMutationQueue, setUnauthorizedHandler, clearUnauthorizedHandler } from "../lib/api";

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
  workspaceSlug?: string | null;
  branding?: WorkspaceBranding;
  plan?: "basic" | "pro" | "enterprise";
  planKey?: string | null;
  subscriptionModel?: string | null;
  capabilities?: LandlordCapabilities;
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
  role: "landlord" | "team_member";
  teamRole?: string | null;
  companyName: string;
  workspaceMode?: "SOLO_LANDLORD" | "PROPERTY_MANAGER_COMPANY" | "ESTATE_ADMIN";
  workspaceSlug?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  fullName: string;
  plan?: "basic" | "pro" | "enterprise";
  planKey?: string | null;
  subscriptionModel?: string | null;
  subscriptionInterval?: string | null;
  capabilities?: LandlordCapabilities;
  branding?: WorkspaceBranding;
  forcePasswordChangeRequired?: boolean;
  forcePasswordChangeExpiresAt?: string | null;
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

export interface ResidentPortalIdentity {
  id: string;
  role: "resident";
  fullName: string;
  email: string;
  phone?: string | null;
  residentType: string;
  status: string;
  houseNumber: string;
  block?: string | null;
  residenceId: string;
  accessCode: string;
  exitCode: string;
  profileQrToken: string;
  workspaceSlug?: string | null;
  estateName?: string | null;
  branding?: WorkspaceBranding;
}

export interface ResidentPortalSession {
  token: string;
  expiresAt: string;
  resident: ResidentPortalIdentity;
}

interface TenantSessionValue {
  isHydrated: boolean;
  tenantSession: TenantPortalSession | null;
  landlordSession: LandlordPortalSession | null;
  adminSession: AdminPortalSession | null;
  caretakerSession: CaretakerPortalSession | null;
  residentSession: ResidentPortalSession | null;
  saveTenantSession: (session: TenantPortalSession, options?: { persist?: boolean }) => void;
  saveLandlordSession: (
    session: LandlordPortalSession,
    options?: { persist?: boolean },
  ) => void;
  saveAdminSession: (session: AdminPortalSession, options?: { persist?: boolean }) => void;
  saveCaretakerSession: (
    session: CaretakerPortalSession,
    options?: { persist?: boolean },
  ) => void;
  saveResidentSession: (session: ResidentPortalSession, options?: { persist?: boolean }) => void;
  clearTenantSession: () => void;
  clearLandlordSession: () => void;
  clearAdminSession: () => void;
  clearCaretakerSession: () => void;
  clearResidentSession: () => void;
  clearAllSessions: () => void;
}

const TENANT_SESSION_STORAGE_KEY = "doorrent.tenant.session";
const LANDLORD_SESSION_STORAGE_KEY = "doorrent.landlord.session";
const ADMIN_SESSION_STORAGE_KEY = "doorrent.admin.session";
const CARETAKER_SESSION_STORAGE_KEY = "doorrent.caretaker.session";
const RESIDENT_SESSION_STORAGE_KEY = "doorrent.resident.session";
export const TENANT_LAST_EMAIL_STORAGE_KEY = "doorrent.tenant.last-email";

const TenantSessionContext = createContext<TenantSessionValue | null>(null);
type StorageMode = "persistent" | "session";
type LoadedSessionResult<T> = {
  session: T;
  persist: boolean;
};

function isExpired(expiresAt: string) {
  return Number.isNaN(new Date(expiresAt).getTime()) || new Date(expiresAt) <= new Date();
}

function loadStoredTenantSession() {
  return loadStoredSession<TenantPortalSession>(TENANT_SESSION_STORAGE_KEY, "tenant");
}

function getStorage(mode: StorageMode) {
  if (typeof window === "undefined") {
    return null;
  }

  return mode === "persistent" ? window.localStorage : window.sessionStorage;
}

function removeStoredKeyEverywhere(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {}

  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

function persistSession<T>(key: string, session: T, persist: boolean) {
  const primaryStorage = getStorage(persist ? "persistent" : "session");
  const secondaryStorage = getStorage(persist ? "session" : "persistent");

  try {
    primaryStorage?.setItem(key, JSON.stringify(session));
  } catch {}

  try {
    secondaryStorage?.removeItem(key);
  } catch {}
}

function loadStoredSession<T extends { token: string; expiresAt: string }>(
  key: string,
  identityKey: "tenant" | "landlord" | "superAdmin" | "caretaker" | "resident",
): LoadedSessionResult<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sources: Array<{ persist: boolean; storage: Storage | null }> = [
    { persist: false, storage: window.sessionStorage },
    { persist: true, storage: window.localStorage },
  ];

  for (const source of sources) {
    if (!source.storage) {
      continue;
    }

    let raw: string | null = null;

    try {
      raw = source.storage.getItem(key);
    } catch {
      raw = null;
    }

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as T & Record<string, unknown>;

      if (!parsed?.token || !parsed?.[identityKey] || isExpired(parsed.expiresAt)) {
        source.storage.removeItem(key);
        continue;
      }

      return {
        session: parsed,
        persist: source.persist,
      };
    } catch {
      source.storage.removeItem(key);
    }
  }

  return null;
}

export function TenantSessionProvider({ children }: { children: ReactNode }) {
  const [tenantSession, setTenantSession] = useState<TenantPortalSession | null>(null);
  const [landlordSession, setLandlordSession] = useState<LandlordPortalSession | null>(
    null,
  );
  const [adminSession, setAdminSession] = useState<AdminPortalSession | null>(null);
  const [caretakerSession, setCaretakerSession] =
    useState<CaretakerPortalSession | null>(null);
  const [residentSession, setResidentSession] = useState<ResidentPortalSession | null>(null);
  const [tenantSessionPersistent, setTenantSessionPersistent] = useState(true);
  const [landlordSessionPersistent, setLandlordSessionPersistent] = useState(true);
  const [adminSessionPersistent, setAdminSessionPersistent] = useState(true);
  const [caretakerSessionPersistent, setCaretakerSessionPersistent] = useState(true);
  const [residentSessionPersistent, setResidentSessionPersistent] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storedTenant = loadStoredTenantSession();
    const storedLandlord = loadStoredSession<LandlordPortalSession>(
      LANDLORD_SESSION_STORAGE_KEY,
      "landlord",
    );
    const storedAdmin = loadStoredSession<AdminPortalSession>(
      ADMIN_SESSION_STORAGE_KEY,
      "superAdmin",
    );
    const storedCaretaker = loadStoredSession<CaretakerPortalSession>(
      CARETAKER_SESSION_STORAGE_KEY,
      "caretaker",
    );
    const storedResident = loadStoredSession<ResidentPortalSession>(
      RESIDENT_SESSION_STORAGE_KEY,
      "resident",
    );

    setTenantSession(storedTenant?.session ?? null);
    setTenantSessionPersistent(storedTenant?.persist ?? true);
    setLandlordSession(storedLandlord?.session ?? null);
    setLandlordSessionPersistent(storedLandlord?.persist ?? true);
    setAdminSession(storedAdmin?.session ?? null);
    setAdminSessionPersistent(storedAdmin?.persist ?? true);
    setCaretakerSession(storedCaretaker?.session ?? null);
    setCaretakerSessionPersistent(storedCaretaker?.persist ?? true);
    setResidentSession(storedResident?.session ?? null);
    setResidentSessionPersistent(storedResident?.persist ?? true);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      if (typeof window === "undefined") return;

      const path = window.location.pathname;

      if (path.startsWith("/estate")) {
        setLandlordSession(null);
        setLandlordSessionPersistent(true);
        removeStoredKeyEverywhere(LANDLORD_SESSION_STORAGE_KEY);
        void clearOfflineMutationQueue();
        window.location.href = "/estate/login";
      } else if (path.startsWith("/landlord")) {
        setLandlordSession(null);
        setLandlordSessionPersistent(true);
        removeStoredKeyEverywhere(LANDLORD_SESSION_STORAGE_KEY);
        void clearOfflineMutationQueue();
        window.location.href = "/landlord/login";
      } else if (path.startsWith("/caretaker")) {
        setCaretakerSession(null);
        setCaretakerSessionPersistent(true);
        removeStoredKeyEverywhere(CARETAKER_SESSION_STORAGE_KEY);
        void clearOfflineMutationQueue();
        window.location.href = "/caretaker/login";
      } else if (path.startsWith("/resident")) {
        setResidentSession(null);
        setResidentSessionPersistent(true);
        removeStoredKeyEverywhere(RESIDENT_SESSION_STORAGE_KEY);
        void clearOfflineMutationQueue();
        window.location.href = "/resident/login";
      } else {
        setTenantSession(null);
        setTenantSessionPersistent(true);
        removeStoredKeyEverywhere(TENANT_SESSION_STORAGE_KEY);
        void clearOfflineMutationQueue();
        window.location.href = "/login";
      }
    }

    setUnauthorizedHandler(handleUnauthorized);

    return () => {
      clearUnauthorizedHandler();
    };
  }, []);

  const saveTenantSession = useCallback(
    (session: TenantPortalSession, options?: { persist?: boolean }) => {
      const persist = options?.persist ?? tenantSessionPersistent;
      setTenantSession(session);
      setTenantSessionPersistent(persist);
      persistSession(TENANT_SESSION_STORAGE_KEY, session, persist);

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(TENANT_LAST_EMAIL_STORAGE_KEY, session.tenant.email);
        } catch {}
      }
    },
    [tenantSessionPersistent],
  );

  const saveLandlordSession = useCallback(
    (session: LandlordPortalSession, options?: { persist?: boolean }) => {
      const persist = options?.persist ?? landlordSessionPersistent;
      setLandlordSession(session);
      setLandlordSessionPersistent(persist);
      persistSession(LANDLORD_SESSION_STORAGE_KEY, session, persist);
    },
    [landlordSessionPersistent],
  );

  const saveAdminSession = useCallback(
    (session: AdminPortalSession, options?: { persist?: boolean }) => {
      const persist = options?.persist ?? adminSessionPersistent;
      setAdminSession(session);
      setAdminSessionPersistent(persist);
      persistSession(ADMIN_SESSION_STORAGE_KEY, session, persist);
    },
    [adminSessionPersistent],
  );

  const saveCaretakerSession = useCallback(
    (session: CaretakerPortalSession, options?: { persist?: boolean }) => {
      const persist = options?.persist ?? caretakerSessionPersistent;
      setCaretakerSession(session);
      setCaretakerSessionPersistent(persist);
      persistSession(CARETAKER_SESSION_STORAGE_KEY, session, persist);
    },
    [caretakerSessionPersistent],
  );

  const clearTenantSession = useCallback(() => {
    setTenantSession(null);
    setTenantSessionPersistent(true);
    removeStoredKeyEverywhere(TENANT_SESSION_STORAGE_KEY);

    void clearOfflineMutationQueue();
  }, []);

  const clearLandlordSession = useCallback(() => {
    setLandlordSession(null);
    setLandlordSessionPersistent(true);
    removeStoredKeyEverywhere(LANDLORD_SESSION_STORAGE_KEY);

    void clearOfflineMutationQueue();
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminSession(null);
    setAdminSessionPersistent(true);
    removeStoredKeyEverywhere(ADMIN_SESSION_STORAGE_KEY);

    void clearOfflineMutationQueue();
  }, []);

  const clearCaretakerSession = useCallback(() => {
    setCaretakerSession(null);
    setCaretakerSessionPersistent(true);
    removeStoredKeyEverywhere(CARETAKER_SESSION_STORAGE_KEY);

    void clearOfflineMutationQueue();
  }, []);

  const saveResidentSession = useCallback(
    (session: ResidentPortalSession, options?: { persist?: boolean }) => {
      const persist = options?.persist ?? residentSessionPersistent;
      setResidentSession(session);
      setResidentSessionPersistent(persist);
      persistSession(RESIDENT_SESSION_STORAGE_KEY, session, persist);
    },
    [residentSessionPersistent],
  );

  const clearResidentSession = useCallback(() => {
    setResidentSession(null);
    setResidentSessionPersistent(true);
    removeStoredKeyEverywhere(RESIDENT_SESSION_STORAGE_KEY);
    void clearOfflineMutationQueue();
  }, []);

  const clearAllSessions = useCallback(() => {
    clearTenantSession();
    clearLandlordSession();
    clearAdminSession();
    clearCaretakerSession();
    clearResidentSession();
  }, [
    clearAdminSession,
    clearCaretakerSession,
    clearLandlordSession,
    clearResidentSession,
    clearTenantSession,
  ]);

  const value = useMemo(
    () => ({
      isHydrated,
      tenantSession,
      landlordSession,
      adminSession,
      caretakerSession,
      residentSession,
      saveTenantSession,
      saveLandlordSession,
      saveAdminSession,
      saveCaretakerSession,
      saveResidentSession,
      clearTenantSession,
      clearLandlordSession,
      clearAdminSession,
      clearCaretakerSession,
      clearResidentSession,
      clearAllSessions,
    }),
    [
      adminSession,
      caretakerSession,
      clearAdminSession,
      clearAllSessions,
      clearCaretakerSession,
      clearLandlordSession,
      clearResidentSession,
      clearTenantSession,
      isHydrated,
      landlordSession,
      residentSession,
      saveAdminSession,
      saveCaretakerSession,
      saveLandlordSession,
      saveResidentSession,
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

export function useResidentPortalSession() {
  const context = useContext(TenantSessionContext);

  if (!context) {
    throw new Error("useResidentPortalSession must be used within TenantSessionProvider");
  }

  return context;
}
