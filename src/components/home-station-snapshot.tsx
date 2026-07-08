"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { stationComparisonRows } from "@/lib/site-data";
import {
  loadStations,
  STATIONS_CHANGED_EVENT,
  type Station,
} from "@/lib/station-storage";

type SnapshotRow = {
  name: string;
  rate: string;
  price: string;
  status: string;
  tag: string;
};

const fallbackRows: SnapshotRow[] = stationComparisonRows.map((row) => ({
  name: row.name,
  rate: row.multiplier,
  price: row.price,
  status: row.status,
  tag: row.badge,
}));

function stationToSnapshotRow(station: Station): SnapshotRow {
  return {
    name: station.name,
    rate: station.multiplier || "待补",
    price: station.price || station.packageType || "待补",
    status: station.status || station.verdict || "待观察",
    tag: station.badge || station.groupName || "收录",
  };
}

export function HomeStationSnapshot() {
  const [stations, setStations] = useState<Station[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await loadStations();
        if (!cancelled) setStations(data);
      } catch {
        if (!cancelled) setStations(null);
      }
    }

    void refresh();
    window.addEventListener(STATIONS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STATIONS_CHANGED_EVENT, refresh);
    };
  }, []);

  const rows = useMemo(() => {
    const liveRows = stations?.map(stationToSnapshotRow) ?? [];
    return (liveRows.length > 0 ? liveRows : fallbackRows).slice(0, 5);
  }, [stations]);

  return (
    <div className="divide-y divide-white/[0.06]">
      {rows.map((row, index) => (
        <Link
          key={`${row.name}-${index}`}
          href="/stations"
          className="grid grid-cols-[30px_minmax(0,1.05fr)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.035] sm:px-5"
        >
          <span className="font-mono text-xs text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white">{row.name}</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                {row.tag}
              </span>
            </span>
            <span className="mt-1 block truncate text-xs text-zinc-500">{row.status}</span>
          </span>
          <span className="hidden truncate text-xs text-zinc-500 sm:block">{row.price}</span>
          <span className="font-mono text-sm font-bold text-emerald-300">{row.rate}</span>
        </Link>
      ))}
    </div>
  );
}
