'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/primitives/Nav';
import { MTabs } from '@/components/primitives/MTabs';
import { Pill } from '@/components/primitives/Pill';
import { Surface } from '@/components/primitives/Surface';
import { Dot } from '@/components/primitives/Dot';
import { PickCard, PickCardSkeleton } from '@/components/PickCard';
import { MarketsTable } from '@/components/MarketsTable';
import {
  fetchMarketStats,
  fetchPicksByDate,
  fetchSeasonSummary,
  todayISO,
} from '@/lib/data';
import type { MarketStat, Pick, SeasonSummaryRow } from '@/lib/types';

const SEASON = 2026;

const STEPS = [
  ['01', 'Scout the arm', 'Every pitch from every game. Velocity, movement, outcomes — the full scouting report.'],
  ['02', 'Set the lineup', 'GLM + XGBoost ensemble projects expected stat lines for every starter and batter.'],
  ['03', 'Read the count', 'Analytical CDF computes true probability against the posted line. We wait for our pitch.'],
  ['04', 'Shop the line', 'Every pick compares odds across 10+ sportsbooks. Best price, every time.'],
];

export default function LandingPage() {
  const [topPick, setTopPick] = useState<Pick | null>(null);
  const [summary, setSummary] = useState<SeasonSummaryRow | null>(null);
  const [markets, setMarkets] = useState<MarketStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [picks, sumRow, marketsRow] = await Promise.all([
          fetchPicksByDate(SEASON, todayISO()).catch(() => []),
          fetchSeasonSummary(SEASON).catch(() => null),
          fetchMarketStats(SEASON).catch(() => []),
        ]);
        if (cancelled) return;
        setTopPick(picks[0] ?? null);
        setSummary(sumRow);
        setMarkets(marketsRow);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const winRate = summary?.summary?.win_rate ?? null;
  const flatRoi = summary?.summary?.flat?.return_pct ?? summary?.summary?.bet_roi ?? null;

  return (
    <>
      <Nav />
      <main className="pb-24 md:pb-12">
        {/* HERO */}
        <section className="px-7 md:px-12 py-10 md:py-16 border-b border-border">
          <div className="grid md:grid-cols-[3fr_2fr] gap-10 items-end max-w-[1280px] mx-auto">
            <div>
              <Pill color="var(--color-green)" border="var(--color-green-dim)" bg="rgba(34, 224, 122, 0.06)">
                <Dot c="var(--color-green)" size={5} pulse />
                Today&apos;s top call · live now
              </Pill>
              <h1 className="font-sans font-bold text-[44px] md:text-[76px] leading-[0.98] tracking-[-0.025em] text-text mt-6 md:mt-8">
                Find the edges
                <br />
                the books miss.
              </h1>
              <p className="font-serif italic text-[18px] md:text-[22px] text-text-dim mt-5 max-w-[36ch] leading-snug">
                Statistical models trained on millions of pitches. Seven markets, all profitable. One pick at a
                time.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Link
                  href="/picks"
                  className="px-5 py-3 bg-green text-black rounded-md text-[14px] font-semibold no-underline hover:opacity-90 transition-opacity"
                >
                  See today&apos;s picks →
                </Link>
                <Link
                  href="/track-record"
                  className="px-5 py-3 border border-border text-text rounded-md text-[14px] font-medium no-underline hover:bg-surface transition-colors"
                >
                  Track record
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-10 border border-border rounded-[10px] overflow-hidden bg-border">
                <StatCell label="Win rate" value={winRate != null ? `${winRate.toFixed(1)}%` : '—'} />
                <StatCell
                  label="Flat ROI"
                  value={flatRoi != null ? `${flatRoi >= 0 ? '+' : ''}${flatRoi.toFixed(1)}%` : '—'}
                  green={flatRoi != null && flatRoi >= 0}
                />
                <StatCell label="Markets" value="7" />
                <StatCell label="Backtest" value="2025" />
              </div>
            </div>

            <div className="md:max-w-md">
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-faint mb-2">
                Today&apos;s top call
              </div>
              {loading ? (
                <PickCardSkeleton />
              ) : topPick ? (
                <PickCard pick={topPick} />
              ) : (
                <Surface className="p-6 text-text-dim text-[13px]">
                  No picks for {todayISO()}. The models found no edges worth swinging at.
                </Surface>
              )}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-7 md:px-12 py-12 md:py-16 border-b border-border">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-sans font-bold text-[28px] md:text-[38px] tracking-[-0.02em]">How it works</h2>
            <p className="text-text-dim text-[14px] mt-2 max-w-[60ch]">
              A transparent, data-driven approach to MLB player props.
            </p>
            <div className="grid md:grid-cols-4 gap-5 mt-9">
              {STEPS.map(([num, title, body]) => (
                <Surface key={num} className="p-5">
                  <span className="font-mono text-[28px] font-bold text-green tracking-[-0.04em]">{num}</span>
                  <div className="text-[18px] font-bold mt-3">{title}</div>
                  <p className="text-[13px] text-text-dim mt-2 leading-relaxed">{body}</p>
                </Surface>
              ))}
            </div>
          </div>
        </section>

        {/* MARKETS */}
        <section className="px-7 md:px-12 py-12 md:py-16">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-sans font-bold text-[28px] md:text-[38px] tracking-[-0.02em]">Seven markets</h2>
            <p className="text-text-dim text-[14px] mt-2 max-w-[60ch]">
              5 pitcher props + 2 batter props across out-of-sample backtests.
            </p>
            <div className="mt-8">
              <MarketsTable markets={markets} />
            </div>
          </div>
        </section>

        <footer className="px-7 md:px-12 py-10 border-t border-border text-text-faint text-[11px] font-mono uppercase tracking-[0.1em]">
          <div className="max-w-[1280px] mx-auto flex flex-wrap gap-3 justify-between">
            <span>© 2026 Glick&apos;s Picks · B</span>
            <Link href="/" className="text-text-dim no-underline hover:text-text">A site →</Link>
          </div>
        </footer>
      </main>
      <MTabs />
    </>
  );
}

function StatCell({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="bg-surface px-5 py-4 flex flex-col">
      <span className={`font-mono text-[26px] font-semibold ${green ? 'text-green' : 'text-text'}`}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-faint mt-1">{label}</span>
    </div>
  );
}
