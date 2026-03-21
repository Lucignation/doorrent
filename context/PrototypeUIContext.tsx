import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ModalId, ToastTone } from "../types/app";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface PrototypeUIValue {
  activeModal: ModalId | null;
  toasts: ToastItem[];
  openModal: (modal: ModalId) => void;
  closeModal: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
}

const PrototypeUIContext = createContext<PrototypeUIValue | null>(null);

export function PrototypeUIProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(0);

  const openModal = useCallback((modal: ModalId) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "default") => {
    nextToastId.current += 1;
    const toast: ToastItem = { id: nextToastId.current, message, tone };
    setToasts((items) => [...items, toast]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== toast.id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!activeModal) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ activeModal, toasts, openModal, closeModal, showToast }),
    [activeModal, closeModal, openModal, showToast, toasts],
  );

  return <PrototypeUIContext.Provider value={value}>{children}</PrototypeUIContext.Provider>;
}

export function usePrototypeUI() {
  const context = useContext(PrototypeUIContext);

  if (!context) {
    throw new Error("usePrototypeUI must be used within PrototypeUIProvider");
  }

  return context;
}
