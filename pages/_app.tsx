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

  const openCrispChat = () => {
    if (typeof window === "undefined") {
      return;
    }

    const crisp = ((window as typeof window & { $crisp?: Array<unknown[]> }).$crisp ??=
      []);

    if (!Array.isArray(crisp)) {
      return;
    }

    crisp.push(["config", "hide:on:away", [false]]);
    crisp.push(["config", "hide:vacation", [false]]);
    crisp.push(["do", "chat:show"]);
    crisp.push(["do", "chat:open"]);
  };

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
            <button
              type="button"
              className="marketing-crisp-launcher"
              aria-label="Chat with DoorRent"
              onClick={openCrispChat}
            >
              <span className="marketing-crisp-launcher__dot" aria-hidden="true" />
              Chat with us
            </button>
          </>
        ) : null}
        <OfflineSyncBridge />
        <Component {...pageProps} />
        <AppOverlays />
        <style jsx global>{`
          .marketing-crisp-launcher {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 180;
            display: none;
            align-items: center;
            gap: 10px;
            padding: 14px 18px;
            border: 1px solid rgba(200, 169, 110, 0.3);
            border-radius: 999px;
            background: rgba(13, 58, 43, 0.94);
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 20px 48px rgba(5, 15, 11, 0.34);
            backdrop-filter: blur(10px);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .marketing-crisp-launcher:hover {
            transform: translateY(-1px);
            box-shadow: 0 24px 54px rgba(5, 15, 11, 0.4);
          }

          .marketing-crisp-launcher__dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #c8a96e;
            box-shadow: 0 0 0 6px rgba(200, 169, 110, 0.16);
            flex-shrink: 0;
          }

          @media (min-width: 768px) {
            .marketing-crisp-launcher {
              display: inline-flex;
            }
          }
        `}</style>
      </PrototypeUIProvider>
    </TenantSessionProvider>
  );
}
