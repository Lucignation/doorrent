import { useEffect } from "react";
import { API_BASE_URL } from "../../lib/api";
import { flushOfflineMutations } from "../../lib/offline-store";

export default function OfflineSyncBridge() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const flush = () => {
      void flushOfflineMutations(API_BASE_URL);
    };

    flush();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        flush();
      }
    };

    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        flush();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
