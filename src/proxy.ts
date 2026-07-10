import { NextResponse, type NextRequest } from "next/server";

import { isMainlandChinaIp } from "@/lib/cn-ip-access";

function requestIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

function isMainlandRequest(request: NextRequest) {
  return isMainlandChinaIp(requestIp(request));
}

function isRestrictedPath(pathname: string) {
  return pathname === "/restricted" || pathname.startsWith("/restricted/");
}

function isMainlandAllowedPath(pathname: string) {
  return (
    pathname === "/guides" ||
    pathname.startsWith("/guides/") ||
    isRestrictedPath(pathname)
  );
}

function forbiddenApiResponse() {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
  };

  return NextResponse.json(
    { error: "Access denied" },
    { status: 403, headers },
  );
}

export function proxy(request: NextRequest) {
  const restrictionEnabled = process.env.CN_ACCESS_MODE !== "off";
  const mainlandRequest = restrictionEnabled && isMainlandRequest(request);

  if (isRestrictedPath(request.nextUrl.pathname) && !mainlandRequest) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";

    return NextResponse.redirect(homeUrl, {
      status: 307,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  if (
    !mainlandRequest ||
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
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf)$).*)",
  ],
};
