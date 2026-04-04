import { Head, Html, Main, NextScript } from "next/document";
import { APP_NAME, FAVICON_PATH, LOGO_PATH } from "../lib/site";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content={APP_NAME} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="color-scheme" content="light" />
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        <link rel="icon" href={FAVICON_PATH} sizes="any" />
        <link rel="shortcut icon" href={FAVICON_PATH} />
        <link rel="apple-touch-icon" href={LOGO_PATH} sizes="512x512" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#1A3A2A" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
