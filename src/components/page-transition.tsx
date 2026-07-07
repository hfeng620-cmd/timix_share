"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

const TAB_ORDER = ["/", "/stations", "/community", "/models", "/profile", "/drops", "/guides", "/admin", "/user", "/legacy"];

function getNavIndex(path: string): number {
  for (let i = 0; i < TAB_ORDER.length; i++) {
    const t = TAB_ORDER[i];
    if (t === "/" ? path === "/" : path.startsWith(t)) return i;
  }
  return -1;
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const direction = useRef<"forward" | "back">("forward");

  if (prevPath.current !== pathname) {
    const fromIdx = getNavIndex(prevPath.current);
    const toIdx = getNavIndex(pathname);
    direction.current =
      fromIdx >= 0 && toIdx >= 0 && toIdx < fromIdx ? "back" : "forward";
    prevPath.current = pathname;
  }

  const xEnter = direction.current === "forward" ? "30%" : "-30%";
  const xExit = direction.current === "forward" ? "-30%" : "30%";

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
