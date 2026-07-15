"use client";

import { usePathname } from "next/navigation";

/**
 * A quiet, image-free backdrop for every interior page.
 *
 * The landing page keeps its own presentation. All other routes share a
 * theme-aware solid surface with only a very subtle top tint, so content is
 * easier to scan and the background never competes with it.
 */
export function SiteBackground() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return <div aria-hidden="true" className="site-plain-background" />;
}
