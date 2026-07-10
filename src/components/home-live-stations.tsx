"use client";

import { useEffect, useMemo, useState } from "react";

import { FavoriteButton } from "@/components/favorite-button";
import { StationRowLink } from "@/components/station-row-link";
import {
  prioritizedStationNames,
  stationComparisonRows,
  stationLinkMap,
} from "@/lib/site-data";
import {
  loadStations,
  STATIONS_CHANGED_EVENT,
  type Station,
} from "@/lib/station-storage";

type HomeStationRow = {
  name: string;
  badge: string;
  group: string;
  entry: string;
  packageType: string;
  price: string;
  multiplier: string;
  verdict: string;
  note: string;
  url: string;
};

const fallbackRows: HomeStationRow[] = stationComparisonRows.map((row) => ({
  ...row,
  url: stationLinkMap[row.name] ?? "",
}));

let pendingStations: Promise<Station[]> | null = null;

function stationToHomeRow(station: Station): HomeStationRow {
  return {
    name: station.name,
    badge: station.badge,
    group: station.groupName || station.entry,
    entry: station.entry,
    packageType: station.packageType,
    price: station.price,
    multiplier: station.multiplier,
    verdict: station.verdict,
    note: station.note,
    url: station.url || stationLinkMap[station.name] || "",
  };
}

function loadSharedStations() {
  if (!pendingStations) {
    pendingStations = loadStations().finally(() => {
      pendingStations = null;
    });
  }
  return pendingStations;
}

function useHomeStationRows() {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await loadSharedStations();
        if (!cancelled) {
          setStations(data);
          setFailed(false);
        }
      } catch (error) {
        console.error("[HomeLiveStations] Failed to load stations:", error);
        if (!cancelled) {
          setStations(null);
          setFailed(true);
        }
      }
    }

    refresh();
    window.addEventListener(STATIONS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STATIONS_CHANGED_EVENT, refresh);
    };
  }, []);

  return useMemo(() => {
    const liveRows = stations?.map(stationToHomeRow) ?? [];
    const rows = liveRows.length > 0 ? liveRows : fallbackRows;
    return {
      rows,
      failed,
      isFallback: liveRows.length === 0,
    };
  }, [failed, stations]);
}

function getLowRateCount(rows: HomeStationRow[]) {
  return rows.filter((row) => {
    const value = Number(row.multiplier.match(/(\d+(?:\.\d+)?)x/)?.[1] ?? Number.NaN);
    return Number.isFinite(value) && value <= 0.15;
  }).length;
}

function getTrialReadyCount(rows: HomeStationRow[]) {
  return rows.filter(
    (row) =>
      row.badge.includes("试用") ||
      row.badge.includes("免费") ||
      row.note.includes("注册送") ||
      row.price.includes("免费"),
  ).length;
}

function getTopRows(rows: HomeStationRow[]) {
  const preferred = prioritizedStationNames
    .map((name) => rows.find((row) => row.name === name))
    .filter((row): row is HomeStationRow => Boolean(row));

  return preferred.length > 0 ? preferred : rows.slice(0, 4);
}

function getMoreRows(rows: HomeStationRow[]) {
  const topNames = new Set(getTopRows(rows).map((row) => row.name));
  return rows.filter((row) => !topNames.has(row.name));
}

export function LiveStationStats() {
  const { rows, isFallback } = useHomeStationRows();

  return (
    <div className="home-flow-tight mt-7 grid gap-3 sm:grid-cols-3">
      <div className="home-card-sheen home-soft-panel rounded-[20px] border px-4 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          收录站点
        </p>
        <p className="mt-2 text-3xl font-black">{rows.length}</p>
        {isFallback ? (
          <p className="mt-1 text-xs text-[var(--color-muted)]">离线兜底</p>
        ) : null}
      </div>
      <div className="home-card-sheen home-soft-panel rounded-[20px] border px-4 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          低倍率样本
        </p>
        <p className="mt-2 text-3xl font-black">{getLowRateCount(rows)}</p>
      </div>
      <div className="home-card-sheen home-soft-panel rounded-[20px] border px-4 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          可先试用
        </p>
        <p className="mt-2 text-3xl font-black">{getTrialReadyCount(rows)}</p>
      </div>
    </div>
  );
}

export function LiveFeaturedLead() {
  const { rows, failed } = useHomeStationRows();
  const featuredLead = getTopRows(rows)[0];

  if (!featuredLead) return null;

  return (
    <>
      {failed ? (
        <p className="mt-4 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">
          正式榜单暂时加载失败，当前显示静态兜底。
        </p>
      ) : null}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">{featuredLead.name}</h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            {featuredLead.note}
          </p>
        </div>
        <span className="home-chip rounded-full px-3 py-1 text-xs font-bold">
          {featuredLead.badge}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="home-info-tile rounded-[18px] border px-4 py-4">
          <p className="text-xs text-[var(--color-muted)]">价格 / 倍率</p>
          <p className="mt-2 text-lg font-black">{featuredLead.price}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-brand-deep)]">
            {featuredLead.multiplier}
          </p>
        </div>
        <div className="home-info-tile rounded-[18px] border px-4 py-4">
          <p className="text-xs text-[var(--color-muted)]">一句判断</p>
          <p className="mt-2 text-sm leading-7 text-[var(--color-ink)]">
            {featuredLead.verdict}
          </p>
        </div>
      </div>
    </>
  );
}

export function LiveStationSummaryChips() {
  const { rows } = useHomeStationRows();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="home-chip rounded-full px-3 py-1 text-xs font-bold">
        已收录 {rows.length} 个站点
      </span>
      <span className="home-chip rounded-full px-3 py-1 text-xs font-bold">
        {getLowRateCount(rows)} 个低倍率样本
      </span>
      <span className="home-chip rounded-full px-3 py-1 text-xs font-bold">
        {getTrialReadyCount(rows)} 个可先试用
      </span>
    </div>
  );
}

export function LiveTopStationRows() {
  const { rows } = useHomeStationRows();

  return (
    <>
      {getTopRows(rows).map((row, index) => (
        <StationRowLink
          key={row.name}
          href={row.url}
          className="stagger-in grid cursor-pointer gap-4 border-b border-[var(--color-line)] py-5 transition hover:[background-color:var(--color-hover)] md:grid-cols-[0.55fr_1fr_0.95fr_0.75fr_1.35fr] md:items-start"
        >
          <div className="flex min-w-0 items-center justify-between gap-3 md:block">
            <span className="text-sm font-bold text-[var(--color-muted)] md:pt-1">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] md:hidden">
              {row.badge}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black">{row.name}</h3>
              <FavoriteButton stationName={row.name} />
              <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)] md:inline">
                {row.badge}
              </span>
            </div>
            <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{row.price}</p>
            <p className="mt-2 truncate text-sm leading-6 text-[var(--color-brand-deep)]">{row.entry}</p>
          </div>
          <p className="min-w-0 truncate pt-1 text-base font-black">{row.multiplier}</p>
          <div className="min-w-0">
            <p className="truncate text-base font-black">{row.verdict}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">{row.note}</p>
          </div>
        </StationRowLink>
      ))}
    </>
  );
}

export function LiveMoreStationRows() {
  const { rows } = useHomeStationRows();

  return (
    <>
      {getMoreRows(rows).map((row) => {
        const baseClasses =
          "stagger-in card-lift grid gap-3 border-b border-[var(--color-line)] py-5 transition md:grid-cols-[0.9fr_0.9fr_0.6fr_1.4fr]";
        const linkClasses = `${baseClasses} cursor-pointer hover:[background-color:var(--color-hover)]`;
        const plainClasses = `${baseClasses} hover:[background-color:var(--color-hover)]`;

        const content = (
          <>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black">{row.name}</h3>
                <FavoriteButton stationName={row.name} />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                  {row.badge}
                </span>
              </div>
              <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate font-black">{row.price}</p>
              <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">
                {row.packageType}
              </p>
            </div>
            <p className="min-w-0 truncate font-black">{row.multiplier}</p>
            <p className="min-w-0 text-sm leading-6 text-[var(--color-muted)] line-clamp-2">{row.note}</p>
          </>
        );

        return row.url ? (
          <StationRowLink
            key={`${row.name}-extended`}
            className={linkClasses}
            href={row.url}
          >
            {content}
          </StationRowLink>
        ) : (
          <article
            key={`${row.name}-extended`}
            className={plainClasses}
          >
            {content}
          </article>
        );
      })}
    </>
  );
}

