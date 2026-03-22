import type { AppProps } from "next/app";
import AppOverlays from "../components/ui/AppOverlays";
import { PrototypeUIProvider } from "../context/PrototypeUIContext";
import { TenantSessionProvider } from "../context/TenantSessionContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TenantSessionProvider>
      <PrototypeUIProvider>
        <Component {...pageProps} />
        <AppOverlays />
      </PrototypeUIProvider>
    </TenantSessionProvider>
  );
}
