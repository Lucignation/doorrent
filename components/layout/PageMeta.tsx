import Head from "next/head";
import {
  APP_DESCRIPTION,
  DEFAULT_ROBOTS,
  APP_NAME,
  FAVICON_PATH,
  LOGO_PATH,
  SHARE_IMAGE_ALT,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_PATH,
  SHARE_IMAGE_TYPE,
  SHARE_IMAGE_WIDTH,
  buildAppUrl,
} from "../../lib/site";
import type { StructuredData } from "../../lib/seo";

interface PageMetaProps {
  title: string;
  description?: string;
  urlPath?: string;
  imagePath?: string;
  imageAlt?: string;
  robots?: string;
  type?: "website" | "article";
  structuredData?: StructuredData | StructuredData[];
}

export default function PageMeta({
  title,
  description = APP_DESCRIPTION,
  urlPath = "",
  imagePath = SHARE_IMAGE_PATH,
  imageAlt = SHARE_IMAGE_ALT,
  robots = DEFAULT_ROBOTS,
  type = "website",
  structuredData,
}: PageMetaProps) {
  const canonicalUrl = buildAppUrl(urlPath || "");
  const imageUrl = buildAppUrl(imagePath);
  const structuredDataItems = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="application-name" content={APP_NAME} />
      <meta name="apple-mobile-web-app-title" content={APP_NAME} />
      <meta name="author" content={APP_NAME} />
      <meta name="theme-color" content="#1A3A2A" />
      <link rel="icon" href={FAVICON_PATH} sizes="any" />
      <link rel="shortcut icon" href={FAVICON_PATH} />
      <link rel="apple-touch-icon" href={LOGO_PATH} sizes="512x512" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en-NG" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={APP_NAME} />
      <meta property="og:locale" content="en_NG" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:type" content={SHARE_IMAGE_TYPE} />
      <meta property="og:image:width" content={`${SHARE_IMAGE_WIDTH}`} />
      <meta property="og:image:height" content={`${SHARE_IMAGE_HEIGHT}`} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />
      {structuredDataItems.map((item, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </Head>
  );
}
