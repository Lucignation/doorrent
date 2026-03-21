import type { AppProps } from "next/app";
import PrototypeOverlays from "../components/ui/PrototypeOverlays";
import { PrototypeUIProvider } from "../context/PrototypeUIContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PrototypeUIProvider>
      <Component {...pageProps} />
      <PrototypeOverlays />
    </PrototypeUIProvider>
  );
}
