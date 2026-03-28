import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  PUBLIC_APP_ORIGIN,
  isAllowedFrontendHost,
  normalizeBrowserHost,
} from "./lib/frontend-security";

export function middleware(request: NextRequest) {
  const requestHost = normalizeBrowserHost(request.headers.get("host"));

  if (requestHost && !isAllowedFrontendHost(requestHost)) {
    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      PUBLIC_APP_ORIGIN,
    );
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
