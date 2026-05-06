import type { BankrollPoint } from '@/lib/types';

const W = 1100;
const H = 280;
const P = { top: 18, right: 24, bottom: 28, left: 56 };

function pathFor(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function EquityChart({
  curve,
  initialBankroll = 5000,
}: {
  curve: BankrollPoint[];
  initialBankroll?: number;
}) {
  if (curve.length === 0) {
    return (
      <div className="text-text-faint font-mono text-[11px] uppercase tracking-[0.1em] py-12 text-center">
        Loading…
      </div>
    );
  }

  const flats = curve.map((c) => c.flat);
  const pcts = curve.map((c) => c.pct);
  const allValues = [...flats, ...pcts, initialBankroll];
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const pad = (dataMax - dataMin) * 0.1 || 100;
  const yMin = Math.floor((dataMin - pad) / 100) * 100;
  const yMax = Math.ceil((dataMax + pad) / 100) * 100;

  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  const xScale = (i: number) => P.left + (i / Math.max(curve.length - 1, 1)) * innerW;
  const yScale = (v: number) => P.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const flatPoints = curve.map((c, i) => ({ x: xScale(i), y: yScale(c.flat) }));
  const pctPoints = curve.map((c, i) => ({ x: xScale(i), y: yScale(c.pct) }));
  const baselineY = yScale(initialBankroll);

  const flatPath = pathFor(flatPoints);
  const pctPath = pathFor(pctPoints);
  const flatArea = `${flatPath} L ${flatPoints.at(-1)!.x.toFixed(1)} ${(P.top + innerH).toFixed(1)} L ${flatPoints[0].x.toFixed(1)} ${(P.top + innerH).toFixed(1)} Z`;

  const endpoint = flatPoints.at(-1)!;
  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);
  const xTickEvery = Math.max(1, Math.floor(curve.length / 6));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Bankroll equity chart">
        <defs>
          <linearGradient id="b-equity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y axis ticks + dashed grid */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={P.left}
              x2={W - P.right}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="var(--color-border-soft)"
              strokeWidth={1}
            />
            <text
              x={P.left - 10}
              y={yScale(v) + 4}
              fontFamily="var(--font-mono)"
              fontSize={11}
              fill="var(--color-text-faint)"
              textAnchor="end"
            >
              ${(v / 1000).toFixed(1)}k
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {curve.map((c, i) => {
          if (i % xTickEvery !== 0 && i !== curve.length - 1) return null;
          return (
            <text
              key={c.date}
              x={xScale(i)}
              y={H - 8}
              fontFamily="var(--font-mono)"
              fontSize={10}
              fill="var(--color-text-faint)"
              textAnchor="middle"
            >
              {c.date.slice(5)}
            </text>
          );
        })}

        {/* Break-even baseline */}
        <line
          x1={P.left}
          x2={W - P.right}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--color-text-faint)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        <text
          x={W - P.right - 4}
          y={baselineY - 6}
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="var(--color-text-faint)"
          textAnchor="end"
        >
          break-even
        </text>

        {/* Filled area under flat curve */}
        <path d={flatArea} fill="url(#b-equity-fill)" />

        {/* 2% bankroll (amber) */}
        <path d={pctPath} fill="none" stroke="var(--color-amber)" strokeWidth={1.5} strokeOpacity={0.7} />

        {/* Flat (green) */}
        <path d={flatPath} fill="none" stroke="var(--color-green)" strokeWidth={2} />

        {/* Endpoint glow */}
        <circle cx={endpoint.x} cy={endpoint.y} r={6} fill="var(--color-green)" opacity={0.18} />
        <circle cx={endpoint.x} cy={endpoint.y} r={3.5} fill="var(--color-green)" />
      </svg>

      <div className="flex justify-end gap-4 mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px" style={{ background: 'var(--color-green)' }} />
          Flat $100
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-px" style={{ background: 'var(--color-amber)' }} />
          2% bankroll
        </span>
      </div>
    </div>
  );
}
