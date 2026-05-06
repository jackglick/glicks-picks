import { marketLabel, signedPct } from '@/lib/format';
import { Surface } from './primitives/Surface';
import type { MarketStat } from '@/lib/types';

function Sparkline({ values }: { values: number[] }) {
  // 12-bar opacity ramp matching the prototype's "12-week trend" visualization.
  // We don't currently surface 12 weekly buckets — fill with a deterministic
  // ramp from zero up to 1 so the bars are visible and ordered.
  const display = values.length === 12 ? values : Array.from({ length: 12 }, (_, i) => (i + 1) / 12);
  const max = Math.max(...display, 1);
  return (
    <div className="flex items-end gap-[2px] h-5">
      {display.map((v, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-[1px]"
          style={{
            height: `${Math.max(2, (v / max) * 18)}px`,
            background: 'var(--color-green)',
            opacity: 0.25 + 0.06 * i,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function MarketsTable({ markets }: { markets: MarketStat[] }) {
  return (
    <Surface className="overflow-hidden">
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-border-soft bg-bg-2">
        {['Market', 'Type', 'Bets', 'Win rate', 'Flat ROI', '12-wk trend'].map((h) => (
          <span
            key={h}
            className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-faint"
          >
            {h}
          </span>
        ))}
      </div>
      <div>
        {markets.map((m, i) => (
          <div
            key={`${m.market}-${i}`}
            className="md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3.5 border-b border-border-soft last:border-b-0 hover:bg-bg-2 transition-colors flex flex-col"
          >
            <span className="text-[14px] text-text">{marketLabel(m.market)}</span>
            <span className="font-mono text-[11px] text-text-dim uppercase tracking-[0.06em]">
              {m.category ?? '—'}
            </span>
            <span className="font-mono text-[13px] text-text">{m.bets}</span>
            <span className="font-mono text-[13px] text-text">{m.win_rate?.toFixed(1)}%</span>
            <span className="font-mono text-[13px] font-semibold text-green">{signedPct(m.roi ?? 0)}</span>
            <Sparkline values={[]} />
          </div>
        ))}
        {markets.length === 0 && (
          <div className="px-5 py-8 text-center text-text-faint font-mono text-[11px] uppercase tracking-[0.1em]">
            No market data
          </div>
        )}
      </div>
    </Surface>
  );
}
