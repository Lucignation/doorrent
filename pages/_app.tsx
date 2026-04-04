import type { AppProps } from "next/app";
import { useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/router";
import OfflineSyncBridge from "../components/system/OfflineSyncBridge";
import AppOverlays from "../components/ui/AppOverlays";
import { PrototypeUIProvider } from "../context/PrototypeUIContext";
import { TenantSessionProvider } from "../context/TenantSessionContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const shouldLoadCrisp =
    !/^\/(landlord|tenant|caretaker|admin)(\/|$)/.test(router.pathname) &&
    !/^\/agreement(\/|$)/.test(router.pathname);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const crisp = (window as typeof window & { $crisp?: Array<unknown[]> }).$crisp;

    if (!Array.isArray(crisp)) {
      return;
    }

    crisp.push(["config", "hide:on:away", [false]]);
    crisp.push(["config", "hide:vacation", [false]]);
    crisp.push(["do", shouldLoadCrisp ? "chat:show" : "chat:hide"]);
  }, [shouldLoadCrisp]);

  return (
    <TenantSessionProvider>
      <PrototypeUIProvider>
        {shouldLoadCrisp ? (
          <>
            <Script id="crisp-chat-config" strategy="afterInteractive">
              {`window.$crisp=window.$crisp||[];window.CRISP_WEBSITE_ID="253c7d70-9d38-452e-a086-76c013b18c88";`}
            </Script>
            <Script
              id="crisp-chat-loader"
              src="https://client.crisp.chat/l.js"
              strategy="afterInteractive"
            />
          </>
        ) : null}
        <OfflineSyncBridge />
        <Component {...pageProps} />
        <AppOverlays />
      </PrototypeUIProvider>
    </TenantSessionProvider>
  );
}
