import { NextResponse, type NextRequest } from "next/server";

import { isMainlandChinaIp } from "@/lib/cn-ip-access";

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-country-code",
] as const;

function requestCountry(request: NextRequest) {
  for (const header of COUNTRY_HEADERS) {
    const country = request.headers.get(header)?.trim().toUpperCase();
    if (country) return country;
  }

  return null;
}

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

function isMainlandRequest(request: NextRequest) {
  return (
    requestCountry(request) === "CN" ||
    isMainlandChinaIp(requestIp(request))
  );
}

function isMainlandAllowedPath(pathname: string) {
  return (
    pathname === "/guides" ||
    pathname.startsWith("/guides/") ||
    pathname === "/restricted" ||
    pathname.startsWith("/restricted/")
  );
}

function forbiddenApiResponse() {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: COUNTRY_HEADERS.join(", "),
  };

  return NextResponse.json(
    { error: "Access denied" },
    { status: 403, headers },
  );
}

export function proxy(request: NextRequest) {
  if (
    process.env.CN_ACCESS_MODE === "off" ||
    !isMainlandRequest(request) ||
    isMainlandAllowedPath(request.nextUrl.pathname)
  ) {
    return NextResponse.next();
  }

  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.headers.get("accept")?.includes("application/json")
  ) {
    return forbiddenApiResponse();
  }

  const restrictedUrl = request.nextUrl.clone();
  restrictedUrl.pathname = "/restricted";
  restrictedUrl.search = "";

  return NextResponse.redirect(restrictedUrl, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: COUNTRY_HEADERS.join(", "),
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
