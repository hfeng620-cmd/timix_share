"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { SystemMonitorModal } from "@/components/system-monitor-modal";

type SystemMonitorContextValue = {
  isMonitorOpen: boolean;
  openMonitor: () => void;
  closeMonitor: () => void;
};

const SystemMonitorContext = createContext<SystemMonitorContextValue>({
  isMonitorOpen: false,
  openMonitor: () => undefined,
  closeMonitor: () => undefined,
});

export function SystemMonitorProvider({ children }: { children: ReactNode }) {
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);

  const openMonitor = useCallback(() => setIsMonitorOpen(true), []);
  const closeMonitor = useCallback(() => setIsMonitorOpen(false), []);

  const value = useMemo(
    () => ({
      isMonitorOpen,
      openMonitor,
      closeMonitor,
    }),
    [closeMonitor, isMonitorOpen, openMonitor],
  );

  return (
    <SystemMonitorContext.Provider value={value}>
      {children}
      <SystemMonitorModal open={isMonitorOpen} onClose={closeMonitor} />
    </SystemMonitorContext.Provider>
  );
}

export function useSystemMonitor() {
  return useContext(SystemMonitorContext);
}
