"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const TAB_ORDER = ["/", "/guides", "/stations", "/community", "/drops", "/profile", "/models", "/admin", "/user", "/legacy"];

function getNavIndex(path: string): number {
  for (let i = 0; i < TAB_ORDER.length; i++) {
    const t = TAB_ORDER[i];
    if (t === "/" ? path === "/" : path.startsWith(t)) return i;
  }
  return -1;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  const direction = useMemo<"forward" | "back">(() => {
    const fromIdx = getNavIndex(prevPath);
    const toIdx = getNavIndex(pathname);
    return fromIdx >= 0 && toIdx >= 0 && toIdx < fromIdx ? "back" : "forward";
  }, [pathname, prevPath]);

  useEffect(() => {
    setPrevPath(pathname);
  }, [pathname]);

  const xEnter = direction === "forward" ? "30%" : "-30%";
  const xExit = direction === "forward" ? "-30%" : "30%";

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: xEnter }}
        animate={{ opacity: 1, x: "0%" }}
        exit={{ opacity: 0, x: xExit }}
        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}