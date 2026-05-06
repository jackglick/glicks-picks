'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/primitives/Nav';
import { MTabs } from '@/components/primitives/MTabs';
import { Pill } from '@/components/primitives/Pill';
import { Surface } from '@/components/primitives/Surface';
import { EquityChart } from '@/components/EquityChart';
import { fetchBankrollCurve, fetchMarketStats, fetchSeasonSummary } from '@/lib/data';
import { marketLabel, signedPct } from '@/lib/format';
import type { BankrollPoint, MarketStat, SeasonSummaryRow } from '@/lib/types';

const SEASONS = [2024, 2025, 2026];

export default function TrackRecordPage() {
  const [season, setSeason] = useState(2026);
  const [summary, setSummary] = useState<SeasonSummaryRow | null>(null);
  const [markets, setMarkets] = useState<MarketStat[]>([]);
  const [curve, setCurve] = useState<BankrollPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchSeasonSummary(season).catch(() => null),
      fetchMarketStats(season).catch(() => []),
      fetchBankrollCurve(season).catch(() => []),
    ]).then(([s, m, c]) => {
      if (cancelled) return;
      setSummary(s);
      setMarkets(m);
      setCurve(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [season]);

  const s = summary?.summary;
  const wins = s?.wins ?? 0;
  const losses = s?.losses ?? 0;
  const winRate = s?.win_rate ?? 0;
  const flatRet = s?.flat?.return_pct ?? 0;
  const pctRet = s?.pct?.return_pct ?? 0;
  const initialBankroll = s?.initial_bankroll ?? 5000;

  return (
    <>
      <Nav />
      <main className="pb-24 md:pb-12">
        {/* HEADER */}
        <section className="px-7 md:px-12 pt-8 md:pt-10 pb-6 border-b border-border">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-sans font-bold text-[28px] md:text-[40px] tracking-[-0.02em]">
                  Track record
                </h1>
                <Pill color="var(--color-amber)">v1.1 (live)</Pill>
              </div>
              <p className="text-text-dim text-[13px] mt-2">
                Out-of-sample backtest archive across player-prop markets
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

        {/* SUMMARY 4-UP */}
        <section className="px-7 md:px-12 py-8">
          <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-px border border-border rounded-[10px] overflow-hidden bg-border">
            <StatTile label="Record" value={`${wins}-${losses}`} />
            <StatTile label="Win rate" value={loading ? '—' : `${winRate.toFixed(1)}%`} />
            <StatTile
              label="Flat return"
              value={loading ? '—' : `${flatRet >= 0 ? '+' : ''}${flatRet.toFixed(1)}%`}
              green={flatRet >= 0}
            />
            <StatTile
              label="2% return"
              value={loading ? '—' : `${pctRet >= 0 ? '+' : ''}${pctRet.toFixed(1)}%`}
              green={pctRet >= 0}
            />
          </div>
        </section>

        {/* EQUITY CHART */}
        <section className="px-7 md:px-12 pb-10">
          <div className="max-w-[1280px] mx-auto">
            <Surface className="p-5 md:p-7">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-sans font-bold text-[18px] tracking-[-0.01em]">Bankroll equity</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint">
                  ${initialBankroll.toLocaleString()} starting bankroll
                </span>
              </div>
              <EquityChart curve={curve} initialBankroll={initialBankroll} />
            </Surface>
          </div>
        </section>

        {/* BY-MARKET */}
        <section className="px-7 md:px-12 pb-12">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-sans font-bold text-[20px] tracking-[-0.01em] mb-4">By market</h2>
            <Surface className="overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-border-soft bg-bg-2 font-mono text-[9px] uppercase tracking-[0.1em] text-text-faint">
                <span>Market</span>
                <span>Type</span>
                <span>Bets</span>
                <span>Record</span>
                <span>Win %</span>
                <span>Flat ROI</span>
              </div>
              {markets.map((m, i) => (
                <div
                  key={`${m.market}-${i}`}
                  className="md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 border-b border-border-soft last:border-b-0 hover:bg-bg-2 flex flex-col"
                >
                  <span className="text-[14px] text-text">{marketLabel(m.market)}</span>
                  <span className="font-mono text-[11px] text-text-dim uppercase tracking-[0.06em]">
                    {m.category ?? '—'}
                  </span>
                  <span className="font-mono text-[13px]">{m.bets}</span>
                  <span className="font-mono text-[13px]">
                    {m.wins}-{m.losses}
                  </span>
                  <span className="font-mono text-[13px]">{m.win_rate?.toFixed(1)}%</span>
                  <span className="font-mono text-[13px] font-semibold text-green">{signedPct(m.roi ?? 0)}</span>
                </div>
              ))}
              {markets.length === 0 && !loading && (
                <div className="px-5 py-8 text-center text-text-faint font-mono text-[11px] uppercase tracking-[0.1em]">
                  No market data
                </div>
              )}
            </Surface>
          </div>
        </section>
      </main>
      <MTabs />
    </>
  );
}

function StatTile({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="bg-surface px-5 py-5 flex flex-col">
      <span className={`font-mono text-[36px] md:text-[44px] font-bold leading-none ${green ? 'text-green' : 'text-text'}`}>
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-faint mt-2">{label}</span>
    </div>
  );
}
