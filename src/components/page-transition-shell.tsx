"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PageTransitionShellProps = {
  children: React.ReactNode;
};

export function PageTransitionShell({ children }: PageTransitionShellProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      previousPathnameRef.current = pathname;
      return;
    }

    previousPathnameRef.current = pathname;
    setIsTransitioning(true);

    const timer = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 760);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div className={`route-shell ${isTransitioning ? "route-shell--transitioning" : ""}`}>
      <div aria-hidden="true" className="route-transition-veil" />
      <div key={pathname} className="route-stage page-enter route-stage--enter">
        {children}
      </div>
    </div>
  );
}
