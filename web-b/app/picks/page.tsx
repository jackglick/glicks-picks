'use client';

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/primitives/Nav';
import { MTabs } from '@/components/primitives/MTabs';
import { Pill } from '@/components/primitives/Pill';
import { Dot } from '@/components/primitives/Dot';
import { Surface } from '@/components/primitives/Surface';
import { PickCard, PickCardSkeleton } from '@/components/PickCard';
import { fetchPicksByDate, todayISO } from '@/lib/data';
import { formatGameTime, marketLabel } from '@/lib/format';
import type { Pick } from '@/lib/types';

const SEASONS = [2024, 2025, 2026];

type Sort = 'edge' | 'time' | 'player';

function groupByGameTime(picks: Pick[]): { time: string; picks: Pick[] }[] {
  const map = new Map<string, Pick[]>();
  for (const p of picks) {
    const key = p.game_time ?? 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()]
    .map(([time, picks]) => ({ time, picks }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export default function PicksPage() {
  const [season, setSeason] = useState(2026);
  const [date, setDate] = useState(todayISO());
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>('edge');
  const [marketFilters, setMarketFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPicksByDate(season, date)
      .then((rows) => {
        if (!cancelled) setPicks(rows);
      })
      .catch(() => {
        if (!cancelled) setPicks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [season, date]);

  const allMarkets = useMemo(() => Array.from(new Set(picks.map((p) => p.market))).sort(), [picks]);

  const filtered = useMemo(() => {
    const visible = marketFilters.size === 0 ? picks : picks.filter((p) => marketFilters.has(p.market));
    const sorted = [...visible];
    if (sort === 'edge') sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    if (sort === 'time') sorted.sort((a, b) => (a.game_time ?? '').localeCompare(b.game_time ?? ''));
    if (sort === 'player') sorted.sort((a, b) => a.player.localeCompare(b.player));
    return sorted;
  }, [picks, sort, marketFilters]);

  const groups = sort === 'time' ? groupByGameTime(filtered) : null;

  return (
    <>
      <Nav livePickCount={picks.length} />
      <main className="pb-24 md:pb-12">
        {/* PAGE HEADER */}
        <section className="px-7 md:px-12 pt-8 md:pt-10 pb-6 border-b border-border">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-sans font-bold text-[28px] md:text-[40px] tracking-[-0.02em]">
                  Today&apos;s picks
                </h1>
                <Pill color="var(--color-green)" border="var(--color-green-dim)" bg="rgba(34,224,122,0.06)">
                  <Dot c="var(--color-green)" size={5} pulse />
                  LIVE
                </Pill>
              </div>
              <p className="text-text-dim text-[13px] mt-2 font-mono">
                {date} · {picks.length} picks
              </p>
            </div>
            <div className="flex gap-1 border border-border rounded-md overflow-hidden bg-surface">
              {SEASONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setSeason(y)}
                  className={`px-4 py-2 font-mono text-[12px] ${
                    season === y ? 'bg-green text-black' : 'text-text-dim hover:text-text'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FILTER STRIP */}
        <section className="px-7 md:px-12 py-3 border-b border-border bg-bg-2">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="bg-surface border border-border rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-text"
              aria-label="Sort picks"
            >
              <option value="edge">Sort: Edge</option>
              <option value="time">Sort: Time</option>
              <option value="player">Sort: Player A–Z</option>
            </select>
            <div className="flex gap-1.5 flex-wrap">
              {allMarkets.map((m) => {
                const active = marketFilters.has(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const next = new Set(marketFilters);
                      if (active) next.delete(m);
                      else next.add(m);
                      setMarketFilters(next);
                    }}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase tracking-[0.06em] border ${
                      active
                        ? 'bg-green text-black border-green'
                        : 'bg-surface text-text-dim border-border hover:text-text'
                    }`}
                  >
                    {marketLabel(m)}
                  </button>
                );
              })}
            </div>
            <span className="ml-auto font-mono text-[11px] text-text-faint">
              {filtered.length} / {picks.length}
            </span>
          </div>
        </section>

        {/* PICKS */}
        <section className="px-7 md:px-12 py-8 md:py-10">
          <div className="max-w-[1280px] mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <PickCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Surface className="p-10 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint">No picks</div>
                <div className="text-text-dim mt-2 text-[14px]">
                  No picks on this date. The models found no edges worth swinging at.
                </div>
              </Surface>
            ) : groups ? (
              <div className="space-y-10">
                {groups.map(({ time, picks }) => (
                  <div key={time}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-faint">
                        {formatGameTime(time) || time}
                      </span>
                      <span className="flex-1 h-px bg-border-soft" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {picks.map((p, i) => (
                        <PickCard key={`${p.player}-${p.market}-${i}`} pick={p} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p, i) => (
                  <PickCard key={`${p.player}-${p.market}-${i}`} pick={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <MTabs />
    </>
  );
}
