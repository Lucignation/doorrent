const DEFAULT_APP_ORIGIN = "https://usedoorrent.com";
const DEFAULT_API_ORIGIN = "https://doorrent-api.onrender.com";

function normalizeOrigin(value, fallback) {
  try {
    return new URL((value || fallback).trim()).origin;
  } catch {
    return fallback;
  }
}

const isProduction = process.env.NODE_ENV === "production";
const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_ORIGIN);
const appHost = new URL(appOrigin).host;
const rootDomain =
  (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").trim().toLowerCase() ||
  (appHost.endsWith(".vercel.app") ? "usedoorrent.com" : appHost || "usedoorrent.com");
const apiOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_API_BASE_URL, DEFAULT_API_ORIGIN);

const connectSrc = ["'self'", apiOrigin];
const scriptSrc = ["'self'", "'unsafe-inline'"];

if (isProduction) {
  connectSrc.push(`https://${rootDomain}`, `https://*.${rootDomain}`);
} else {
  connectSrc.push(
    "http://localhost:*",
    "http://127.0.0.1:*",
    "ws://localhost:*",
    "ws://127.0.0.1:*",
    "https://*.vercel.app",
  );
  scriptSrc.push("'unsafe-eval'");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https:",
  `connect-src ${connectSrc.join(" ")}`,
  "img-src 'self' https: data: blob:",
  "font-src 'self' https: data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "child-src 'self'",
  "frame-src 'none'",
  "manifest-src 'self'",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const globalSecurityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
];

if (isProduction) {
  globalSecurityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const sensitiveRouteHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, max-age=0, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: globalSecurityHeaders,
      },
      {
        source: "/portal",
        headers: sensitiveRouteHeaders,
      },
      {
        source: "/tenant/:path*",
        headers: sensitiveRouteHeaders,
      },
      {
        source: "/caretaker/:path*",
        headers: sensitiveRouteHeaders,
      },
      {
        source: "/landlord/:path*",
        headers: sensitiveRouteHeaders,
      },
      {
        source: "/admin/:path*",
        headers: sensitiveRouteHeaders,
      },
      {
        source: "/agreement/:path*",
        headers: sensitiveRouteHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
