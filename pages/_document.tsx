import { Head, Html, Main, NextScript } from "next/document";
import { APP_NAME, FAVICON_PATH, LOGO_PATH } from "../lib/site";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content={APP_NAME} />
        <link rel="icon" href={FAVICON_PATH} sizes="any" />
        <link rel="shortcut icon" href={FAVICON_PATH} />
        <link rel="apple-touch-icon" href={LOGO_PATH} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
