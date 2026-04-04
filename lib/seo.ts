import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_URL,
  LOGO_PATH,
  PUBLIC_SITE_PATHS,
  buildAppUrl,
} from "./site";

export interface StructuredData {
  [key: string]: unknown;
}

export function buildOrganizationStructuredData(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: APP_URL,
    logo: buildAppUrl(LOGO_PATH),
    areaServed: "NG",
    knowsAbout: [
      "Property management",
      "Rent collection",
      "Tenant management",
      "Lease agreements",
      "Receipts",
      "Portfolio reporting",
    ],
  };
}

export function buildWebsiteStructuredData(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: APP_URL,
    description: APP_DESCRIPTION,
    inLanguage: "en-NG",
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      url: APP_URL,
      logo: buildAppUrl(LOGO_PATH),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${APP_URL}/marketplace?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSoftwareApplicationStructuredData(): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    url: APP_URL,
    image: buildAppUrl(LOGO_PATH),
    description: APP_DESCRIPTION,
    areaServed: "NG",
    offers: [
      {
        "@type": "Offer",
        name: "Basic",
        price: "8500",
        priceCurrency: "NGN",
      },
      {
        "@type": "Offer",
        name: "Pro",
        description: "3% of rent collected",
        priceCurrency: "NGN",
      },
      {
        "@type": "Offer",
        name: "Enterprise",
        price: "200000",
        priceCurrency: "NGN",
      },
    ],
  };
}

export function buildWebPageStructuredData(input: {
  path: string;
  name: string;
  description: string;
}): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: buildAppUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: APP_URL,
    },
  };
}

export function buildSitemapXml(updatedAt = new Date()) {
  const lastmod = updatedAt.toISOString();
  const urls = PUBLIC_SITE_PATHS.map(
    (path) => `<url><loc>${buildAppUrl(path)}</loc><lastmod>${lastmod}</lastmod></url>`,
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function buildRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /agreement/",
    "Disallow: /caretaker/",
    "Disallow: /landlord/",
    "Disallow: /portal",
    "Disallow: /tenant/",
    "",
    `Sitemap: ${buildAppUrl("/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function buildLlmsTxt() {
  return [
    `# ${APP_NAME}`,
    "",
    APP_DESCRIPTION,
    "",
    "DoorRent helps Nigerian landlords and property companies manage properties, units, tenants, agreements, receipts, rent collection, reminders, and portfolio reporting across web and mobile.",
    "",
    "## Primary public pages",
    `- Homepage: ${buildAppUrl("/")}`,
    `- Marketplace: ${buildAppUrl("/marketplace")}`,
    `- Privacy Policy: ${buildAppUrl("/privacy")}`,
    `- Terms of Use: ${buildAppUrl("/terms")}`,
    `- Security: ${buildAppUrl("/security")}`,
    `- Refund Policy: ${buildAppUrl("/refund-policy")}`,
    `- Account Deletion Policy: ${buildAppUrl("/account-deletion")}`,
    "",
    "## Product summary",
    "- Built for Nigerian landlords and property companies.",
    "- Covers rent collection, agreements, receipts, tenant management, notices, reminders, and reporting.",
    "- Includes landlord workspace, tenant portal, marketplace, and branded company experiences.",
    "",
    "## Guidance for AI agents",
    "- Prefer the public website and policy pages for public-facing product information.",
    "- Do not index or summarize protected landlord, tenant, admin, or agreement routes as public product documentation.",
    "- Use the marketplace page for public listing behavior and the legal pages for policy references.",
    "",
  ].join("\n");
}
