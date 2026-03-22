import Head from "next/head";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_URL,
  FAVICON_PATH,
  LOGO_PATH,
} from "../../lib/site";

interface PageMetaProps {
  title: string;
  description?: string;
  urlPath?: string;
}

export default function PageMeta({
  title,
  description = APP_DESCRIPTION,
  urlPath = "",
}: PageMetaProps) {
  const canonicalUrl = `${APP_URL}${urlPath || ""}`;
  const imageUrl = `${APP_URL}${LOGO_PATH}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="application-name" content={APP_NAME} />
      <meta name="theme-color" content="#1A3A2A" />
      <link rel="icon" href={FAVICON_PATH} sizes="any" />
      <link rel="shortcut icon" href={FAVICON_PATH} />
      <link rel="apple-touch-icon" href={LOGO_PATH} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={`${APP_NAME} logo`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`${APP_NAME} logo`} />
    </Head>
  );
}
